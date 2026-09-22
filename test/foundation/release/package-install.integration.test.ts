import crossSpawn from "cross-spawn";
import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadValidationCandidate } from "./package-candidate-fixture.js";
import { cleanupExactCandidate, installExactCandidate } from "./package-install-fixture.js";
import { createValidationPhaseRecorder } from "../../../scripts/release/validation-phase.mjs";

const phases = createValidationPhaseRecorder("package-install");
let root = "";
let prefix = "";
let candidate: Awaited<ReturnType<typeof loadValidationCandidate>>;

beforeAll(async () => {
  ({ candidate, root, prefix } = await installExactCandidate(phases, "a1-package-install-"));
}, 600_000);

afterAll(async () => {
  await cleanupExactCandidate(phases, root);
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

  it("restores the platform launcher set when exact-package replacement is cancelled", async () => {
    const installedRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
    const releaseModule = await import(pathToFileURL(resolve(installedRoot, "dist", "foundation", "release", "index.js")).href) as typeof import("../../../src/foundation/release/index.js");
    const fixtureRoot = resolve(root, "cancelled-update");
    const dataDir = resolve(fixtureRoot, "data");
    const globalRoot = process.platform === "win32" ? resolve(fixtureRoot, "npm", "node_modules") : resolve(fixtureRoot, "prefix", "lib", "node_modules");
    const packageRoot = resolve(globalRoot, "@timurproko", "a1");
    const activePrefix = resolve(fixtureRoot, "active-npm");
    const activeGlobalRoot = process.platform === "win32" ? resolve(activePrefix, "node_modules") : resolve(activePrefix, "lib", "node_modules");
    const npmCli = resolve(activeGlobalRoot, "npm", "bin", "npm-cli.js");
    const priorReleaseId = "1.0.0-aaaaaaaaaaaaaaaaaaaa";
    const priorReleaseRoot = resolve(dataDir, "releases", priorReleaseId);
    const launchers = releaseModule.updateLauncherPaths(globalRoot);
    await mkdir(resolve(packageRoot, "bin"), { recursive: true });
    await mkdir(dirname(npmCli), { recursive: true });
    await mkdir(resolve(priorReleaseRoot, "bin"), { recursive: true });
    await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: "1.0.0" }));
    await writeFile(resolve(packageRoot, "bin", "cli.js"), "// prior package");
    await writeFile(resolve(priorReleaseRoot, "bin", "cli.js"), "// prior immutable release");
    await writeFile(resolve(priorReleaseRoot, ".a1-release.json"), JSON.stringify({ launchContract: "neutral-launch-v1", releaseId: priorReleaseId, contentDigest: "a".repeat(64) }));
    for (const launcher of launchers) { await mkdir(dirname(launcher), { recursive: true }); await writeFile(launcher, "prior launcher"); }
    await writeFile(npmCli, `
      const { rm } = require("node:fs/promises");
      const launchers = ${JSON.stringify(launchers)};
      (async () => {
        for (const launcher of launchers) await rm(launcher, { force: true });
        await new Promise(resolvePromise => setTimeout(resolvePromise, 10000));
      })();
    `);
    const transaction = {
      schema: "a1-update-journal-v1" as const,
      transactionId: "22222222-2222-4222-8222-222222222222",
      channel: "next" as const,
      targetVersion: "1.1.0",
      packageRoot,
      priorActiveReleaseId: priorReleaseId,
      phase: "ownership-released" as const,
      status: "active" as const,
      error: null,
      startedAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
    const replacementOptions = {
      dataDir,
      globalRoot,
      npmCliRoot: activeGlobalRoot,
      packageRoot,
      transaction,
      priorRelease: { releaseId: priorReleaseId, releaseRoot: priorReleaseRoot, contentDigest: "a".repeat(64) },
      output: { stderr: (_message: string) => {} },
      environment: { ...process.env, npm_execpath: npmCli },
      timeoutMs: 15_000,
    };
    const prepared = await releaseModule.prepareUpdateRecoveryCapsule(replacementOptions);
    const capsuleDocument = JSON.parse(await readFile(prepared.manifestPath, "utf8")) as Record<string, unknown>;
    await writeFile(prepared.manifestPath, JSON.stringify({ ...capsuleDocument, resultPath: resolve(root, "outside-result.json") }));
    await expect(releaseModule.readUpdateRecoveryCapsule(prepared.manifestPath)).rejects.toThrow(/sidecar paths/);
    await writeFile(prepared.manifestPath, JSON.stringify(capsuleDocument));

    const result = await releaseModule.runProtectedPackageReplacement({
      ...replacementOptions,
      workerSpawner: async (entry, manifestPath, environment) => {
        const child = crossSpawn(process.execPath, [entry, "--worker", manifestPath], { detached: true, stdio: "ignore", windowsHide: true, env: environment });
        await new Promise<void>((resolvePromise, rejectPromise) => { child.once("spawn", resolvePromise); child.once("error", rejectPromise); });
        child.unref();
        setTimeout(async () => {
          const capsule = await releaseModule.readUpdateRecoveryCapsule(manifestPath);
          await writeFile(capsule.cancellationPath, JSON.stringify({ schema: "a1-update-recovery-v1", transactionId: capsule.transactionId, signal: "SIGINT" }));
        }, 150).unref();
      },
    });

    expect(result).toMatchObject({ cancelled: true, launcherDisposition: "recovery" });
    for (const launcher of launchers) await expect(readFile(launcher, "utf8")).resolves.toContain("recovery.js");
  }, 30_000);

  it("keeps the exact packaged recovery guardian alive after updater loss", async () => {
    const installedRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
    const releaseModuleUrl = pathToFileURL(resolve(installedRoot, "dist", "foundation", "release", "index.js")).href;
    const releaseModule = await import(releaseModuleUrl) as typeof import("../../../src/foundation/release/index.js");
    const fixtureRoot = resolve(root, "lost-updater");
    const dataDir = resolve(fixtureRoot, "data");
    const globalRoot = process.platform === "win32" ? resolve(fixtureRoot, "npm", "node_modules") : resolve(fixtureRoot, "prefix", "lib", "node_modules");
    const packageRoot = resolve(globalRoot, "@timurproko", "a1");
    const activePrefix = resolve(fixtureRoot, "active-npm");
    const activeGlobalRoot = process.platform === "win32" ? resolve(activePrefix, "node_modules") : resolve(activePrefix, "lib", "node_modules");
    const npmCli = resolve(activeGlobalRoot, "npm", "bin", "npm-cli.js");
    const priorReleaseId = "1.0.0-bbbbbbbbbbbbbbbbbbbb";
    const priorReleaseRoot = resolve(dataDir, "releases", priorReleaseId);
    const launchers = releaseModule.updateLauncherPaths(globalRoot);
    await mkdir(resolve(packageRoot, "bin"), { recursive: true });
    await mkdir(dirname(npmCli), { recursive: true });
    await mkdir(resolve(priorReleaseRoot, "bin"), { recursive: true });
    await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: "1.0.0" }));
    await writeFile(resolve(packageRoot, "bin", "cli.js"), "// prior package");
    await writeFile(resolve(priorReleaseRoot, "bin", "cli.js"), "// prior immutable release");
    await writeFile(resolve(priorReleaseRoot, ".a1-release.json"), JSON.stringify({ launchContract: "neutral-launch-v1", releaseId: priorReleaseId, contentDigest: "b".repeat(64) }));
    for (const launcher of launchers) { await mkdir(dirname(launcher), { recursive: true }); await writeFile(launcher, "prior launcher"); }
    await writeFile(npmCli, `
      const { chmod, mkdir, rm, writeFile } = require("node:fs/promises");
      const { dirname, resolve } = require("node:path");
      const packageRoot = ${JSON.stringify(packageRoot)};
      const launchers = ${JSON.stringify(launchers)};
      (async () => {
        for (const launcher of launchers) await rm(launcher, { force: true });
        await new Promise(resolvePromise => setTimeout(resolvePromise, 1000));
        await mkdir(resolve(packageRoot, "bin"), { recursive: true });
        await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", privateLaunchContract: "neutral-launch-v1", version: "1.1.0" }));
        await writeFile(resolve(packageRoot, "bin", "cli.js"), "// target");
        for (const launcher of launchers) {
          await mkdir(dirname(launcher), { recursive: true });
          await writeFile(launcher, "node_modules/@timurproko/a1/bin/cli.js");
          await chmod(launcher, 0o755);
        }
      })();
    `);
    const transaction = {
      schema: "a1-update-journal-v1" as const,
      transactionId: "33333333-3333-4333-8333-333333333333",
      channel: "next" as const,
      targetVersion: "1.1.0",
      packageRoot,
      priorActiveReleaseId: priorReleaseId,
      phase: "ownership-released" as const,
      status: "active" as const,
      error: null,
      startedAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
    const serializable = {
      dataDir,
      globalRoot,
      npmCliRoot: activeGlobalRoot,
      packageRoot,
      transaction,
      priorRelease: { releaseId: priorReleaseId, releaseRoot: priorReleaseRoot, contentDigest: "b".repeat(64) },
      environment: { ...process.env, npm_execpath: npmCli },
      timeoutMs: 30_000,
    };
    const prepared = await releaseModule.prepareUpdateRecoveryCapsule({ ...serializable, output: { stderr: () => {} } });
    const script = `
      const { runProtectedPackageReplacement } = await import(${JSON.stringify(releaseModuleUrl)});
      await runProtectedPackageReplacement({ ...${JSON.stringify(serializable)}, output: { stderr() {} } });
    `;
    const updater = crossSpawn(process.execPath, ["--input-type=module", "-e", script], { cwd: root, stdio: "ignore", windowsHide: true });
    await waitForPath(prepared.capsule.ownerPath, 10_000);
    updater.kill("SIGKILL");
    await new Promise(resolvePromise => updater.once("close", resolvePromise));
    await waitForPath(prepared.capsule.resultPath, 20_000);

    const result = JSON.parse(await readFile(prepared.capsule.resultPath, "utf8")) as { launcherDisposition: string };
    expect(result.launcherDisposition).toBe("target");
    for (const launcher of launchers) {
      const metadata = await stat(launcher);
      expect(metadata.isFile()).toBe(true);
      if (process.platform !== "win32") expect(metadata.mode & 0o111).not.toBe(0);
      await expect(readFile(launcher, "utf8")).resolves.toContain("node_modules/@timurproko/a1/bin/cli.js");
    }
  }, 30_000);

  it("materializes the published minimal inventory into one reusable dependency layer", async () => {
    const { materializeRelease } = await import("../../../src/foundation/release/index.js");
    const packageRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
    const operations: Array<{ operation: string; path: string; bytes: number }> = [];
    const dataDir = resolve(root, "layered-data");
    const release = await phases.run("layer-materialization", () => materializeRelease(packageRoot, dataDir, { onOperation: event => operations.push(event) }));
    const second = await phases.run("layer-reuse", () => materializeRelease(packageRoot, dataDir, { onOperation: event => operations.push(event) }));

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

    // Invariant: identity is decided by the resolver hook the release's own entries install, so the
    // proof runs in a fresh process that installs it for the release root, as launch does.
    const identityProbe = [
      `const { installPinnedPiTuiResolver } = await import(${JSON.stringify(pathToFileURL(resolve(release.releaseRoot, "bin", "module-resolver.js")).href)});`,
      `installPinnedPiTuiResolver(${JSON.stringify(release.releaseRoot)});`,
      `const { inspectPiTuiModuleIdentity } = await import(${JSON.stringify(pathToFileURL(resolve(release.releaseRoot, "bin", "module-identity.js")).href)});`,
      `process.stdout.write(JSON.stringify(inspectPiTuiModuleIdentity(${JSON.stringify(release.releaseRoot)})));`,
    ].join("\n");
    const identity = await runAsync(process.execPath, ["--input-type=module", "--eval", identityProbe], root);
    expect(identity.status, identity.stderr).toBe(0);
    expect(JSON.parse(identity.stdout)).toMatchObject({ kind: "unified" });
  }, 600_000);

  it("drains a production-shaped historical backlog through the exact packaged private worker", async () => {
    const packageRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
    const dataDir = resolve(root, "cleanup-data");
    const runtimeDir = resolve(root, "cleanup-runtime");
    const releases = await phases.run("backlog-setup", () => createPackagedCleanupBacklog(dataDir, 42, 128));
    const environment = {
      ...process.env,
      A1_DATA_DIR: dataDir,
      A1_RUNTIME_DIR: runtimeDir,
      RELEASE_CLEANUP_RUN_ID: "exact-package-cleanup",
      RELEASE_CLEANUP_HOLDS: JSON.stringify([{ authority: "migration", releaseId: releases[39]!.releaseId }]),
    };

    const before = await phases.run("backlog-before-inventory", () => treeUsage(resolve(dataDir, "releases")));
    await phases.run("backlog-worker", async () => {
      const cleanup = await runAsync(process.execPath, [resolve(packageRoot, "bin", "release-cleanup.js")], root, environment);
      expect(cleanup.status, cleanup.stderr).toBe(0);
    });
    const state = JSON.parse(await readFile(resolve(dataDir, "release-state.json"), "utf8")) as {
      releases: Record<string, unknown>;
      cleanup: { pending: Record<string, unknown>; workerRuns: Array<{ runId: string; status: string; completed: number }> };
    };
    const remainingRoots = (await readdir(resolve(dataDir, "releases"))).filter(name => !name.startsWith("."));

    expect(Object.keys(state.releases).sort()).toEqual([releases[39]!.releaseId, releases[40]!.releaseId, releases[41]!.releaseId].sort());
    const after = await phases.run("backlog-after-inventory", () => treeUsage(resolve(dataDir, "releases")));
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
      RELEASE_CLEANUP_RUN_ID: "broken-import",
    });
    const preserved = JSON.parse(await readFile(statePath, "utf8")) as typeof state;

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Cannot find module|cannot find module|ERR_MODULE_NOT_FOUND/);
    expect(preserved.cleanup.pending[releases[0]!.releaseId]).toBeDefined();
    expect(preserved.cleanup.workerRuns[0]).toMatchObject({ runId: "broken-import", status: "scheduled", attempted: 0 });
  });

});

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

async function waitForPath(path: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await access(path).then(() => true).catch(() => false)) return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
  }
  throw new Error(`timed out waiting for ${path}`);
}
