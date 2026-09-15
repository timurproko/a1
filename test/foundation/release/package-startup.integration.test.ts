import crossSpawn from "cross-spawn";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createValidationPhaseRecorder } from "../../../scripts/release/validation-phase.mjs";
import { loadValidationCandidate } from "./package-candidate-fixture.js";
import { cleanupExactCandidate, installExactCandidate, runFixtureCommand } from "./package-install-fixture.js";

const phases = createValidationPhaseRecorder("package-startup");
let root = "";
let prefix = "";
let candidate: Awaited<ReturnType<typeof loadValidationCandidate>>;
const startupMeasurements: Array<{
  profileId: "a1" | "pi";
  launchKind: "post-update" | "no-live-supervisor" | "warm";
  elapsedMs: number;
  phases: Array<{ phase: string; durationMs: number }>;
}> = [];

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
    const { assertStartupPerformanceBudget } = await import("../../../src/foundation/startup/index.js");
    const { PRODUCT_IDENTITY } = await import("../../../src/product-identity.js");
    await phases.run("defender-prerequisite", () => expectWindowsDefenderProtection());
    const packageRoot = resolve(prefix, "node_modules", "@timurproko", "a1");
    // Invariant: the old combined file repaired this proxy in an earlier identity/layer
    // scenario. The split startup owner does the declared repair itself without launching.
    await phases.run("startup-proxy-synchronization", async () => {
      const repaired = await runFixtureCommand(process.execPath, [resolve(packageRoot, "bin", "sync-pi-tui-proxy.js")], root);
      expect(repaired.status, repaired.stderr).toBe(0);
    });
    const dataDir = resolve(root, "startup-data");
    const runtimeDir = resolve(root, "startup-runtime");
    const environment = {
      ...process.env,
      [PRODUCT_IDENTITY.environment.dataDir]: dataDir,
      [PRODUCT_IDENTITY.environment.runtimeDir]: runtimeDir,
      [PRODUCT_IDENTITY.environment.configDir]: resolve(root, "startup-config"),
      [PRODUCT_IDENTITY.environment.databasePath]: resolve(root, "startup.sqlite3"),
      HOME: resolve(root, "startup-home"),
      USERPROFILE: resolve(root, "startup-home"),
    };
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
      for (const profileId of ["a1", "pi"] as const) {
        const postUpdate = await captureReadyLaunch(packageRoot, environment, profileId, "post-update");
        recordStartupMeasurement(profileId, "post-update", postUpdate);
        assertStartupPerformanceBudget({ profileId, launchKind: "post-update", events: postUpdate });
        await phases.run(`supervisor-stop-${profileId}`, () => stopPackagedSupervisor(cohort.endpointMetadataPath, dataDir, releaseVerifiedIdleOwner));

        const restarted = await captureReadyLaunch(packageRoot, environment, profileId, "no-live-supervisor");
        recordStartupMeasurement(profileId, "no-live-supervisor", restarted);
        assertStartupPerformanceBudget({ profileId, launchKind: "no-live-supervisor", events: restarted });
        const observedPhases = restarted.map(event => event.phase);
        expect(observedPhases).toEqual(expect.arrayContaining([
          "durable-validation-start", "durable-validation-complete", "replacement-supervisor-start", "replacement-supervisor-ready",
        ]));
        const validationStart = restarted.find(event => event.phase === "durable-validation-start")!;
        const validationComplete = restarted.find(event => event.phase === "durable-validation-complete")!;
        expect(validationComplete.fileReadOperations - validationStart.fileReadOperations).toBeLessThan(64);

        const warm = await captureReadyLaunch(packageRoot, environment, profileId, "warm");
        recordStartupMeasurement(profileId, "warm", warm);
        assertStartupPerformanceBudget({ profileId, launchKind: "warm", events: warm });
      }
    } finally {
      await phases.cleanup("supervisor-final-stop", () => stopPackagedSupervisor(cohort.endpointMetadataPath, dataDir, releaseVerifiedIdleOwner)).catch(() => {});
    }
  }, 600_000);
});

function recordStartupMeasurement(
  profileId: "a1" | "pi",
  launchKind: "post-update" | "no-live-supervisor" | "warm",
  events: readonly { phase: string; elapsedMs: number }[],
): void {
  const ordered = [...events].sort((left, right) => left.elapsedMs - right.elapsedMs);
  const elapsedMs = ordered.findLast(event => event.phase === "first-input-ready-render")?.elapsedMs ?? Number.POSITIVE_INFINITY;
  const measurements = ordered.map((event, index) => ({
    phase: event.phase,
    durationMs: event.elapsedMs - (ordered[index - 1]?.elapsedMs ?? 0),
  }));
  startupMeasurements.push({ profileId, launchKind, elapsedMs, phases: measurements });
  process.stdout.write(`[startup-budget] node=${process.version} profile=${profileId} kind=${launchKind} elapsed=${Math.round(elapsedMs)}ms\n`);
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

async function expectWindowsDefenderProtection(): Promise<void> {
  const result = await runFixtureCommand("powershell.exe", ["-NoProfile", "-Command", "(Get-MpComputerStatus).RealTimeProtectionEnabled"], root);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim()).toBe("True");
}
