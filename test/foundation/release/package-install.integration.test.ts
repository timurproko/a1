import crossSpawn from "cross-spawn";
import { access, copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadValidationCandidate } from "./package-candidate-fixture.js";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
let root = "";
let prefix = "";
let candidate: Awaited<ReturnType<typeof loadValidationCandidate>>;

beforeAll(async () => {
  candidate = await loadValidationCandidate();
  root = await mkdtemp(resolve(tmpdir(), "a1-package-install-"));
  prefix = resolve(root, "prefix");
  const installed = await runAsync(npm, ["install", "--global", "--prefix", prefix, candidate.path, "--ignore-scripts", "--no-audit", "--no-fund"], root);
  expect(installed.status, installed.stderr).toBe(0);
}, 600_000);

afterAll(async () => {
  if (root) await removeFixtureRoot(root);
}, 15_000);

describe("clean installation of the exact candidate", () => {
  it("installs only the authoritative a1 command and package identity", async () => {
    const packageRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
    const manifest = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8")) as {
      name: string; version: string; bin: Record<string, string>; dependencies: Record<string, string>;
    };
    expect(manifest).toMatchObject({
      name: "@timurproko/a1",
      version: candidate.manifest.version,
      bin: { "a1": "bin/cli.js" },
    });
    expect(Object.keys(manifest.bin)).toEqual(["a1"]);
    expect(manifest.dependencies["@earendil-works/pi-coding-agent"]).toMatch(/^\d+\.\d+\.\d+$/);

    const identityJson = JSON.parse(await readFile(resolve(packageRoot, "dist", "product-identity.json"), "utf8")) as { packageName: string };
    const identityModule = await import(pathToFileURL(resolve(packageRoot, "dist", "product-identity.js")).href) as {
      PRODUCT_IDENTITY: { packageName: string; commandName: string };
    };
    expect(identityJson.packageName).toBe("@timurproko/a1");
    expect(identityModule.PRODUCT_IDENTITY).toMatchObject({ packageName: "@timurproko/a1", commandName: "a1" });
    expect(Object.isFrozen(identityModule.PRODUCT_IDENTITY)).toBe(true);

    const bin = process.platform === "win32" ? prefix : resolve(prefix, "bin");
    await expect(access(resolve(bin, process.platform === "win32" ? "a1.cmd" : "a1"))).resolves.toBeUndefined();
    await expect(access(resolve(bin, process.platform === "win32" ? "addone.cmd" : "addone"))).rejects.toThrow();
  });

  it("materializes the published minimal inventory into one reusable dependency layer", async () => {
    const { materializeRelease } = await import("../../../src/foundation/release/index.js");
    const packageRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
    const repaired = await runAsync(process.execPath, [resolve(packageRoot, "bin", "sync-pi-tui-proxy.js")], root);
    expect(repaired.status, repaired.stderr).toBe(0);
    const operations: Array<{ operation: string; path: string; bytes: number }> = [];
    const dataDir = resolve(root, "layered-data");
    const release = await materializeRelease(packageRoot, dataDir, { onOperation: event => operations.push(event) });
    const second = await materializeRelease(packageRoot, dataDir, { onOperation: event => operations.push(event) });

    expect(release.dependencyLayers).toHaveLength(1);
    expect(second.dependencyLayers).toEqual(release.dependencyLayers);
    expect(operations.some(event => event.operation === "layer-write")).toBe(true);
    expect(operations.some(event => event.operation === "layer-reuse")).toBe(true);
    expect(release.files.some(file => file.path.startsWith("node_modules/"))).toBe(false);
    const layerManifest = JSON.parse(await readFile(resolve(dataDir, "dependency-layers", release.dependencyLayers![0]!.layerId, "dependency-layer-manifest.json"), "utf8")) as {
      files: Array<{ path: string }>; inventory: { excludedFiles: number; excludedBytes: number };
    };
    expect(layerManifest.files.some(file => /\.d\.(?:ts|mts|cts)$|\.map$/.test(file.path))).toBe(false);
    expect(layerManifest.inventory.excludedFiles).toBeGreaterThan(0);
    expect(layerManifest.inventory.excludedBytes).toBeGreaterThan(0);

    const identity = await import(pathToFileURL(resolve(packageRoot, "bin", "module-identity.js")).href) as {
      inspectPiTuiModuleIdentity(root: string): { kind: string };
    };
    expect(identity.inspectPiTuiModuleIdentity(release.releaseRoot)).toMatchObject({ kind: "unified" });
  }, 600_000);

  it("drains a production-shaped historical backlog through the exact packaged private worker", async () => {
    const packageRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
    const dataDir = resolve(root, "cleanup-data");
    const runtimeDir = resolve(root, "cleanup-runtime");
    const releases = await createPackagedCleanupBacklog(dataDir, 42, 128);
    const environment = {
      ...process.env,
      A1_DATA_DIR: dataDir,
      A1_RUNTIME_DIR: runtimeDir,
      A1_RELEASE_CLEANUP_RUN_ID: "exact-package-cleanup",
      A1_RELEASE_CLEANUP_HOLDS: JSON.stringify([{ authority: "migration", releaseId: releases[39]!.releaseId }]),
    };

    const before = await treeUsage(resolve(dataDir, "releases"));
    const cleanup = await runAsync(process.execPath, [resolve(packageRoot, "bin", "release-cleanup.js")], root, environment);
    expect(cleanup.status, cleanup.stderr).toBe(0);
    const state = JSON.parse(await readFile(resolve(dataDir, "release-state.json"), "utf8")) as {
      releases: Record<string, unknown>;
      cleanup: { pending: Record<string, unknown>; workerRuns: Array<{ runId: string; status: string; completed: number }> };
    };
    const remainingRoots = (await readdir(resolve(dataDir, "releases"))).filter(name => !name.startsWith("."));

    expect(Object.keys(state.releases).sort()).toEqual([releases[39]!.releaseId, releases[40]!.releaseId, releases[41]!.releaseId].sort());
    const after = await treeUsage(resolve(dataDir, "releases"));
    expect(Object.keys(state.cleanup.pending)).toHaveLength(0);
    expect(remainingRoots.sort()).toEqual(Object.keys(state.releases).sort());
    expect(after.files).toBeLessThan(before.files);
    expect(after.bytes).toBeLessThan(before.bytes);
    expect(state.cleanup.workerRuns.find(run => run.runId === "exact-package-cleanup")).toMatchObject({ status: "completed", completed: 39 });
  }, 120_000);

  it("leaves durable scheduled evidence when the exact private entry cannot import its runtime", async () => {
    const packageRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
    const brokenRoot = resolve(root, "broken-cleanup-package");
    const dataDir = resolve(root, "broken-cleanup-data");
    const releases = await createPackagedCleanupBacklog(dataDir, 3, 1);
    await mkdir(resolve(brokenRoot, "bin"), { recursive: true });
    await copyFile(resolve(packageRoot, "bin", "release-cleanup.js"), resolve(brokenRoot, "bin", "release-cleanup.js"));
    const statePath = resolve(dataDir, "release-state.json");
    const state = JSON.parse(await readFile(statePath, "utf8")) as any;
    const obsolete = state.releases[releases[0]!.releaseId];
    delete state.releases[releases[0]!.releaseId];
    state.references.retention = [releases[1]!.releaseId, releases[2]!.releaseId];
    state.cleanup.pending[releases[0]!.releaseId] = {
      release: obsolete,
      stage: "detached",
      trashPath: null,
      attempts: 0,
      lastAttemptAt: null,
      lastError: null,
    };
    state.cleanup.workerRuns = [{
      runId: "broken-import",
      status: "scheduled",
      scheduledAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      pid: null,
      batches: 0,
      attempted: 0,
      completed: 0,
      remaining: 1,
      error: null,
    }];
    await writeFile(statePath, JSON.stringify(state, null, 2));

    const result = await runAsync(process.execPath, [resolve(brokenRoot, "bin", "release-cleanup.js")], root, {
      ...process.env,
      A1_DATA_DIR: dataDir,
      A1_RUNTIME_DIR: resolve(dataDir, "runtime"),
      A1_RELEASE_CLEANUP_RUN_ID: "broken-import",
    });
    const preserved = JSON.parse(await readFile(statePath, "utf8")) as typeof state;

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Cannot find module|cannot find module|ERR_MODULE_NOT_FOUND/);
    expect(preserved.cleanup.pending[releases[0]!.releaseId]).toBeDefined();
    expect(preserved.cleanup.workerRuns[0]).toMatchObject({ runId: "broken-import", status: "scheduled", attempted: 0 });
  });

  it.runIf(process.platform === "win32")("gates post-update, no-live-supervisor, and warm startup for both exact packaged profiles", async () => {
    const { certifyMaterializedRelease, CohortStateStore, materializeRelease, releaseVerifiedIdleOwner, startSupervisor, waitForVerifiedEndpoint, warmMaterializedRelease } = await import("../../../src/foundation/release/index.js");
    const { resolveCohortEndpoint, resolveProductPaths } = await import("../../../src/foundation/lifecycle/index.js");
    const { assertStartupPerformanceBudget } = await import("../../../src/foundation/startup/index.js");
    const { PRODUCT_IDENTITY } = await import("../../../src/product-identity.js");
    await expectWindowsDefenderProtection();
    const packageRoot = resolve(prefix, "node_modules", "@timurproko", "a1");
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
    const release = await materializeRelease(packageRoot, dataDir);
    const state = new CohortStateStore(dataDir);
    await state.recordCandidate(release);
    await state.approve(release.releaseId, await certifyMaterializedRelease(release, dataDir));
    await state.activate(release.releaseId);
    await warmMaterializedRelease(release, environment);
    await startSupervisor(release, environment);
    const paths = resolveProductPaths(environment);
    const cohort = resolveCohortEndpoint(paths, release.releaseId, environment);
    await waitForVerifiedEndpoint(cohort.endpointMetadataPath, release, 8_000);
    try {
      for (const profileId of ["a1", "pi"] as const) {
        const postUpdate = await captureReadyLaunch(packageRoot, environment, profileId, "post-update");
        assertStartupPerformanceBudget({ profileId, launchKind: "post-update", events: postUpdate });
        await stopPackagedSupervisor(cohort.endpointMetadataPath, dataDir, releaseVerifiedIdleOwner);

        const restarted = await captureReadyLaunch(packageRoot, environment, profileId, "no-live-supervisor");
        assertStartupPerformanceBudget({ profileId, launchKind: "no-live-supervisor", events: restarted });
        const phases = restarted.map(event => event.phase);
        expect(phases).toEqual(expect.arrayContaining([
          "durable-validation-start", "durable-validation-complete", "replacement-supervisor-start", "replacement-supervisor-ready",
        ]));
        const validationStart = restarted.find(event => event.phase === "durable-validation-start")!;
        const validationComplete = restarted.find(event => event.phase === "durable-validation-complete")!;
        expect(validationComplete.fileReadOperations - validationStart.fileReadOperations).toBeLessThan(64);

        const warm = await captureReadyLaunch(packageRoot, environment, profileId, "warm");
        assertStartupPerformanceBudget({ profileId, launchKind: "warm", events: warm });
      }
    } finally {
      await stopPackagedSupervisor(cohort.endpointMetadataPath, dataDir, releaseVerifiedIdleOwner).catch(() => {});
    }
  }, 600_000);
});

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
  try {
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
  } finally {
    child.stdin?.write("\u0003");
    await new Promise(resolvePromise => setTimeout(resolvePromise, 250));
    if (child.exitCode === null && child.pid) crossSpawn.sync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    if (child.exitCode === null) {
      await Promise.race([
        new Promise<void>(resolvePromise => child.once("close", () => resolvePromise())),
        new Promise<void>(resolvePromise => setTimeout(resolvePromise, 2_000)),
      ]);
    }
  }
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
  const result = await runAsync("powershell.exe", [
    "-NoProfile",
    "-Command",
    "(Get-MpComputerStatus).RealTimeProtectionEnabled",
  ], root);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim()).toBe("True");
}

async function createPackagedCleanupBacklog(dataDir: string, count: number, payloadFilesPerRelease: number) {
  const releasesRoot = resolve(dataDir, "releases");
  await mkdir(releasesRoot, { recursive: true });
  const releases = [] as Array<{
    releaseId: string;
    releaseRoot: string;
    packageVersion: string;
    contentDigest: string;
    approval: "approved";
    materializedAt: string;
    certifiedAt: string;
    diagnosticsPath: string;
  }>;
  for (let index = 0; index < count; index += 1) {
    const packageVersion = `1.0.${index}`;
    const identity = (index + 1).toString(16).padStart(20, "0");
    const contentDigest = (index + 1).toString(16).padStart(64, "0");
    const releaseId = `${packageVersion}-${identity}`;
    const releaseRoot = resolve(releasesRoot, releaseId);
    await mkdir(resolve(releaseRoot, "node_modules", "fixture"), { recursive: true });
    await Promise.all(Array.from({ length: payloadFilesPerRelease }, async (_, file) => {
      await writeFile(resolve(releaseRoot, "node_modules", "fixture", `${file}.js`), `export default ${file};`);
    }));
    await writeFile(resolve(releaseRoot, ".a1-release.json"), JSON.stringify({ releaseId, packageVersion, contentDigest }));
    const diagnosticsPath = resolve(dataDir, `certification-${releaseId}.json`);
    await writeFile(diagnosticsPath, JSON.stringify({ releaseId }));
    releases.push({
      releaseId,
      releaseRoot,
      packageVersion,
      contentDigest,
      approval: "approved",
      materializedAt: new Date(0).toISOString(),
      certifiedAt: new Date(0).toISOString(),
      diagnosticsPath,
    });
  }
  const active = releases.at(-1)!;
  const rollback = releases.at(-2)!;
  await writeFile(resolve(dataDir, "release-state.json"), JSON.stringify({
    schema: "a1-release-cohort-v1",
    revision: 1,
    releases: Object.fromEntries(releases.map(release => [release.releaseId, release])),
    references: {
      active: active.releaseId,
      pending: null,
      approved: active.releaseId,
      rollback: rollback.releaseId,
      retention: releases.map(release => release.releaseId),
    },
    cleanup: { pending: {}, diagnostics: [] },
    activation: { state: "idle", reason: null, blockerGenerationIds: [], updatedAt: new Date(0).toISOString() },
  }, null, 2));
  return releases;
}

async function treeUsage(root: string): Promise<{ files: number; bytes: number }> {
  const pending = [root];
  let files = 0;
  let bytes = 0;
  while (pending.length > 0) {
    const directory = pending.pop()!;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else {
        files += 1;
        bytes += (await stat(path)).size;
      }
    }
  }
  return { files, bytes };
}

function runAsync(command: string, arguments_: readonly string[], cwd: string, environment: NodeJS.ProcessEnv = process.env) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolvePromise, rejectPromise) => {
    const child = crossSpawn(command, [...arguments_], { cwd, env: environment, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr?.on("data", chunk => { stderr += chunk.toString(); });
    child.once("error", rejectPromise);
    child.once("close", status => resolvePromise({ status, stdout, stderr }));
  });
}

async function removeFixtureRoot(path: string): Promise<void> {
  if (process.platform !== "win32") {
    await rm(path, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
    return;
  }
  const cleanup = crossSpawn.sync(process.execPath, [
    "-e",
    "require('node:fs/promises').rm(process.argv[1], { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }).catch(() => { process.exitCode = 1; })",
    path,
  ], { windowsHide: true, stdio: "ignore", timeout: 5_000 });
  if (cleanup.status !== 0 || cleanup.error) process.stderr.write(`Deferred locked Windows fixture cleanup: ${path}\n`);
}
