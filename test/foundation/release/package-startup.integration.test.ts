import crossSpawn from "cross-spawn";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createValidationPhaseRecorder } from "../../../scripts/release/validation-phase.mjs";
import { loadValidationCandidate } from "./package-candidate-fixture.js";
import { cleanupExactCandidate, installExactCandidate, runFixtureCommand } from "./package-install-fixture.js";

const phases = createValidationPhaseRecorder("package-startup");
// Invariant: every value other than "record" enforces, so an unconfigured local run and a
// misspelled channel both keep failing on an overrun instead of silently recording it.
const enforcement = process.env.STARTUP_BUDGET_ENFORCEMENT === "record" ? "record" : "fail";
let root = "";
let prefix = "";
let candidate: Awaited<ReturnType<typeof loadValidationCandidate>>;
interface StartupModuleGraph {
  readonly artifactSha256: string;
  readonly artifactBytes: number;
  readonly loadedFiles: number;
  readonly evaluatedBytes: number;
  readonly groups: readonly { readonly group: string; readonly files: number; readonly evaluatedBytes: number }[];
}
const startupMeasurements: Array<{
  profileId: "a1" | "pi";
  launchKind: "post-update" | "no-live-supervisor" | "warm";
  elapsedMs: number;
  budgetMs: number;
  releaseId: string | null;
  dependencyLayerIds: readonly string[];
  moduleGraph: StartupModuleGraph;
  phases: Array<{ phase: string; durationMs: number }>;
}> = [];
const budgetViolations: Array<{ message: string; profileId: string; launchKind: string; elapsedMs: number; budgetMs: number }> = [];

beforeAll(async () => {
  ({ candidate, root, prefix } = await installExactCandidate(phases, "a1-package-startup-"));
}, 600_000);

afterAll(async () => {
  try {
    const resultPath = process.env.STARTUP_PERFORMANCE_RESULT;
    if (resultPath && startupMeasurements.length > 0) {
      await mkdir(dirname(resolve(resultPath)), { recursive: true });
      await writeFile(resolve(resultPath), `${JSON.stringify({
        schema: "a1-startup-performance-evidence-v1",
        nodeVersion: process.version,
        candidateVersion: candidate.manifest.version,
        automaticRetries: 0,
        enforcement,
        budgetViolations,
        measurements: startupMeasurements,
      }, null, 2)}\n`);
    }
  } finally {
    await cleanupExactCandidate(phases, root);
  }
}, 15_000);

describe("fresh first-attempt startup of the exact candidate", () => {
  it.runIf(process.platform === "win32")("gates post-update, no-live-supervisor, and warm startup for both exact packaged profiles", async () => {
    const { certifyMaterializedRelease, CohortStateStore, materializeRelease, releaseVerifiedIdleOwner, startSupervisor, waitForVerifiedEndpoint, warmMaterializedRelease } = await import("../../../src/foundation/release/index.js");
    const { resolveCohortEndpoint, resolveProductPaths } = await import("../../../src/foundation/lifecycle/index.js");
    const { PRODUCT_IDENTITY } = await import("../../../src/product-identity.js");
    const { cliCapabilities } = await import("../../../src/cli/index.js");
    await phases.run("defender-prerequisite", () => expectWindowsDefenderProtection());
    const packageRoot = resolve(prefix, "node_modules", "@timurproko", "a1");
    // Compatibility: the packed entry derives its commands from the packed version, so a stable
    // candidate deliberately answers `a1 pi` with a quiet no-op. Measure exactly the profiles the
    // candidate advertises; launching one it is required to refuse reads as a startup failure.
    const { developmentComparison } = cliCapabilities(candidate.manifest.version);
    const profiles = developmentComparison ? (["a1", "pi"] as const) : (["a1"] as const);
    const startupModuleGraph = await loadStartupModuleGraph(packageRoot);
    const dataDir = resolve(root, "startup-data");
    const runtimeDir = resolve(root, "startup-runtime");
    const configDir = resolve(root, "startup-config");
    const homeDir = resolve(root, "startup-home");
    const databasePath = resolve(root, "startup.sqlite3");
    const environment: NodeJS.ProcessEnv = {
      ...process.env,
      [PRODUCT_IDENTITY.environment.dataDir]: dataDir,
      [PRODUCT_IDENTITY.environment.runtimeDir]: runtimeDir,
      [PRODUCT_IDENTITY.environment.configDir]: configDir,
      [PRODUCT_IDENTITY.environment.databasePath]: databasePath,
      HOME: homeDir,
      USERPROFILE: homeDir,
    };
    delete environment.NODE_COMPILE_CACHE;
    await phases.run("startup-cold-state", async () => {
      for (const path of [dataDir, runtimeDir, configDir, homeDir, databasePath]) {
        await expect(accessPath(path)).resolves.toBe(false);
      }
      expect(environment.NODE_COMPILE_CACHE).toBeUndefined();
    });
    const release = await phases.run("startup-materialization", () => materializeRelease(packageRoot, dataDir));
    const state = new CohortStateStore(dataDir);
    await phases.run("startup-record-candidate", () => state.recordCandidate(release));
    await phases.run("startup-certification", async () => {
      await state.approve(release.releaseId, await certifyMaterializedRelease(release, dataDir));
    });
    await phases.run("startup-activation", () => state.activate(release.releaseId));
    await phases.run("startup-declared-warmup", () => warmMaterializedRelease(release, environment));
    const startup = await phases.run("startup-supervisor-spawn", () => startSupervisor(release, environment));
    const paths = resolveProductPaths(environment);
    const cohort = resolveCohortEndpoint(paths, release.releaseId, environment);
    await phases.run("startup-supervisor-ready", () => waitForVerifiedEndpoint(cohort.endpointMetadataPath, release, 8_000, startup));
    try {
      for (const profileId of profiles) {
        const postUpdate = await captureReadyLaunch(packageRoot, environment, profileId, "post-update");
        await recordStartupMeasurement(profileId, "post-update", postUpdate, startupModuleGraph);
        await gateStartupBudget({ profileId, launchKind: "post-update", events: postUpdate, moduleGraph: startupModuleGraph });
        await phases.run(`supervisor-stop-${profileId}`, () => stopPackagedSupervisor(cohort.endpointMetadataPath, dataDir, releaseVerifiedIdleOwner));

        const restarted = await captureReadyLaunch(packageRoot, environment, profileId, "no-live-supervisor");
        await recordStartupMeasurement(profileId, "no-live-supervisor", restarted, startupModuleGraph);
        await gateStartupBudget({ profileId, launchKind: "no-live-supervisor", events: restarted, moduleGraph: startupModuleGraph });
        const observedPhases = restarted.map(event => event.phase);
        expect(observedPhases).toEqual(expect.arrayContaining([
          "durable-validation-start", "durable-validation-complete", "replacement-supervisor-start", "replacement-supervisor-ready",
        ]));
        const validationStart = restarted.find(event => event.phase === "durable-validation-start")!;
        const validationComplete = restarted.find(event => event.phase === "durable-validation-complete")!;
        expect(validationComplete.fileReadOperations - validationStart.fileReadOperations).toBeLessThan(64);

        const warm = await captureReadyLaunch(packageRoot, environment, profileId, "warm");
        await recordStartupMeasurement(profileId, "warm", warm, startupModuleGraph);
        await gateStartupBudget({ profileId, launchKind: "warm", events: warm, moduleGraph: startupModuleGraph });
      }
      // Invariant: a recording channel still proves that every declared scenario produced an
      // input-ready measurement; only the timing verdict is downgraded to a warning.
      expect(startupMeasurements.length).toBe(profiles.length * 3);
      // Invariant: the profile a stable build withholds must be proven absent rather than skipped,
      // so the boundary that made this gate unpassable stays covered on the channel that enforces it.
      if (!developmentComparison) await phases.run("stable-comparison-profile-withheld", async () => {
        const refused = await captureQuietLaunch(packageRoot, environment);
        expect(refused, "stable a1 pi must exit quietly without launching").toEqual({ exitCode: 0, stdout: "", stderr: "", traced: false });
      });
    } finally {
      await phases.cleanup("supervisor-final-stop", () => stopPackagedSupervisor(cohort.endpointMetadataPath, dataDir, releaseVerifiedIdleOwner)).catch(() => {});
    }
  }, 600_000);
});

async function gateStartupBudget(
  evidence: Parameters<typeof import("../../../src/foundation/startup/index.js")["evaluateStartupPerformanceBudget"]>[0],
): Promise<void> {
  const { evaluateStartupPerformanceBudget, formatStartupBudgetViolation } = await import("../../../src/foundation/startup/index.js");
  const violation = evaluateStartupPerformanceBudget(evidence);
  if (!violation) return;
  const message = formatStartupBudgetViolation(violation);
  budgetViolations.push({
    message,
    profileId: violation.profileId,
    launchKind: violation.launchKind,
    elapsedMs: violation.elapsedMs,
    budgetMs: violation.budgetMs,
  });
  process.stdout.write(`::warning::${message}\n`);
  if (enforcement === "fail") throw new Error(message);
}

async function recordStartupMeasurement(
  profileId: "a1" | "pi",
  launchKind: "post-update" | "no-live-supervisor" | "warm",
  events: readonly { phase: string; elapsedMs: number; releaseId: string | null; dependencyLayerIds: readonly string[] }[],
  moduleGraph: StartupModuleGraph,
): Promise<void> {
  const { resolveStartupBudgetMs } = await import("../../../src/foundation/startup/index.js");
  const budgetMs = resolveStartupBudgetMs(launchKind);
  const ordered = [...events].sort((left, right) => left.elapsedMs - right.elapsedMs);
  const elapsedMs = ordered.findLast(event => event.phase === "first-input-ready-render")?.elapsedMs ?? Number.POSITIVE_INFINITY;
  const measurements = ordered.map((event, index) => ({
    phase: event.phase,
    durationMs: event.elapsedMs - (ordered[index - 1]?.elapsedMs ?? 0),
  }));
  const ready = ordered.findLast(event => event.phase === "first-input-ready-render");
  startupMeasurements.push({
    profileId,
    launchKind,
    elapsedMs,
    budgetMs,
    releaseId: ready?.releaseId ?? null,
    dependencyLayerIds: ready?.dependencyLayerIds ?? [],
    moduleGraph,
    phases: measurements,
  });
  process.stdout.write(`[startup-budget] node=${process.version} profile=${profileId} kind=${launchKind} elapsed=${Math.round(elapsedMs)}ms budget=${budgetMs}ms\n`);
}

async function loadStartupModuleGraph(packageRoot: string): Promise<StartupModuleGraph> {
  const manifest = JSON.parse(await readFile(resolve(packageRoot, "dist", "integrations", "pi", "startup-public.manifest.json"), "utf8")) as {
    output: { sha256: string; bytes: number };
    totals: { loadedFiles: number; evaluatedBytes: number };
    inputs: Array<{ group: string; evaluatedBytes: number }>;
  };
  const groups = new Map<string, { files: number; evaluatedBytes: number }>();
  for (const input of manifest.inputs.filter(input => input.evaluatedBytes > 0)) {
    const current = groups.get(input.group) ?? { files: 0, evaluatedBytes: 0 };
    groups.set(input.group, { files: current.files + 1, evaluatedBytes: current.evaluatedBytes + input.evaluatedBytes });
  }
  return {
    artifactSha256: manifest.output.sha256,
    artifactBytes: manifest.output.bytes,
    loadedFiles: manifest.totals.loadedFiles,
    evaluatedBytes: manifest.totals.evaluatedBytes,
    groups: [...groups].map(([group, value]) => ({ group, ...value })).sort((left, right) => left.group.localeCompare(right.group)),
  };
}

async function captureReadyLaunch(
  packageRoot: string,
  environment: NodeJS.ProcessEnv,
  profileId: "a1" | "pi",
  launchKind: "post-update" | "no-live-supervisor" | "warm",
) {
  const { parseStartupTrace } = await import("../../../src/foundation/startup/index.js");
  const { PRODUCT_IDENTITY } = await import("../../../src/product-identity.js");
  const tracePath = resolve(root, `startup-${profileId}-${launchKind}.jsonl`);
  await rm(tracePath, { force: true });
  const child = crossSpawn(process.execPath, [resolve(packageRoot, "bin", "cli.js"), ...(profileId === "pi" ? ["pi"] : [])], {
    cwd: root,
    env: { ...environment, [PRODUCT_IDENTITY.environment.startupTrace]: tracePath },
    windowsHide: true,
  });
  let stderr = "";
  child.stderr?.on("data", chunk => { stderr += chunk.toString(); });
  const deadline = Date.now() + 15_000;
  return phases.runWithCleanup(`launch-observation-${profileId}-${launchKind}`, async () => {
    while (Date.now() < deadline) {
      const source = await readFile(tracePath, "utf8").catch(() => "");
      if (source) {
        try {
          const events = parseStartupTrace(source);
          if (events.some(event => event.phase === "first-input-ready-render")) return events;
        } catch {}
      }
      if (child.exitCode !== null) throw new Error(`exact ${profileId} launch exited before first render: ${stderr}`);
      await new Promise(resolvePromise => setTimeout(resolvePromise, 40));
    }
    throw new Error(`exact ${profileId} launch did not become input-ready within 15000ms: ${stderr}`);
  }, `launch-exit-${profileId}-${launchKind}`, async () => {
    // Rationale: Ctrl+D is the empty-editor exit. Ctrl+C only clears the editor,
    // so forcing the wrapper tree immediately afterward can strand the supervisor's
    // launch instance in uncertain reconciliation on Defender-enabled Windows.
    child.stdin?.write("\u0004");
    if (child.exitCode === null) {
      await Promise.race([
        new Promise<void>(resolvePromise => child.once("close", () => resolvePromise())),
        new Promise<void>(resolvePromise => setTimeout(resolvePromise, 2_000)),
      ]);
    }
    if (child.exitCode === null && child.pid) crossSpawn.sync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    if (child.exitCode === null) {
      await Promise.race([
        new Promise<void>(resolvePromise => child.once("close", () => resolvePromise())),
        new Promise<void>(resolvePromise => setTimeout(resolvePromise, 2_000)),
      ]);
    }
  });
}

/**
 * Observes the profile a non-prerelease build withholds. The packed entry still initializes the
 * startup trace before dispatch, so absence is proven by the missing input-ready frame and the
 * silent successful exit rather than by a missing trace file.
 */
async function captureQuietLaunch(packageRoot: string, environment: NodeJS.ProcessEnv) {
  const { parseStartupTrace } = await import("../../../src/foundation/startup/index.js");
  const { PRODUCT_IDENTITY } = await import("../../../src/product-identity.js");
  const tracePath = resolve(root, "startup-pi-withheld.jsonl");
  await rm(tracePath, { force: true });
  const child = crossSpawn(process.execPath, [resolve(packageRoot, "bin", "cli.js"), "pi"], {
    cwd: root,
    env: { ...environment, [PRODUCT_IDENTITY.environment.startupTrace]: tracePath },
    windowsHide: true,
  });
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", chunk => { stdout += chunk.toString(); });
  child.stderr?.on("data", chunk => { stderr += chunk.toString(); });
  const exitCode = await new Promise<number | null>((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      if (child.pid) crossSpawn.sync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      rejectPromise(new Error("withheld a1 pi did not exit within 15000ms"));
    }, 15_000);
    child.once("error", error => { clearTimeout(timer); rejectPromise(error); });
    child.once("close", code => { clearTimeout(timer); resolvePromise(code); });
  });
  const source = await readFile(tracePath, "utf8").catch(() => "");
  let traced = false;
  try { traced = parseStartupTrace(source).some(event => event.phase === "first-input-ready-render"); } catch { traced = false; }
  return { exitCode, stdout, stderr, traced };
}

async function stopPackagedSupervisor(
  endpointMetadataPath: string,
  dataDir: string,
  releaseVerifiedIdleOwner: typeof import("../../../src/foundation/release/index.js")["releaseVerifiedIdleOwner"],
): Promise<void> {
  const deadline = Date.now() + 5_000;
  let owner: Parameters<typeof releaseVerifiedIdleOwner>[0] | null = null;
  while (Date.now() < deadline) {
    owner = JSON.parse(await readFile(endpointMetadataPath, "utf8")) as Parameters<typeof releaseVerifiedIdleOwner>[0];
    if (owner.ownership.liveInstanceIds.length === 0) break;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 40));
  }
  if (!owner || owner.ownership.liveInstanceIds.length !== 0) throw new Error("exact-package supervisor did not become idle");
  expect(await releaseVerifiedIdleOwner(owner, dataDir)).toBe(true);
}

async function accessPath(path: string): Promise<boolean> {
  return access(path).then(() => true).catch(() => false);
}

async function expectWindowsDefenderProtection(): Promise<void> {
  const result = await runFixtureCommand("powershell.exe", ["-NoProfile", "-Command", "(Get-MpComputerStatus).RealTimeProtectionEnabled"], root);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim()).toBe("True");
}
