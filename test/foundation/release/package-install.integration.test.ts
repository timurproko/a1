import crossSpawn from "cross-spawn";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
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
  if (root) await rm(root, { recursive: true, force: true });
}, 60_000);

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

  it.runIf(process.platform === "win32")("gates post-update and warm startup for both exact packaged profiles", async () => {
    const { certifyMaterializedRelease, CohortStateStore, materializeRelease, releaseVerifiedIdleOwner, startSupervisor, waitForVerifiedEndpoint, warmMaterializedRelease } = await import("../../../src/foundation/release/index.js");
    const { resolveCohortEndpoint, resolveProductPaths } = await import("../../../src/foundation/lifecycle/index.js");
    const { assertStartupPerformanceBudget } = await import("../../../src/foundation/startup/index.js");
    const { PRODUCT_IDENTITY } = await import("../../../src/product-identity.js");
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
        const warm = await captureReadyLaunch(packageRoot, environment, profileId, "warm");
        assertStartupPerformanceBudget({ profileId, launchKind: "warm", events: warm });
      }
    } finally {
      const owner = JSON.parse(await readFile(cohort.endpointMetadataPath, "utf8")) as Parameters<typeof releaseVerifiedIdleOwner>[0];
      await releaseVerifiedIdleOwner(owner, dataDir).catch(() => {});
    }
  }, 600_000);
});

async function captureReadyLaunch(
  packageRoot: string,
  environment: NodeJS.ProcessEnv,
  profileId: "a1" | "pi",
  launchKind: "post-update" | "warm",
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
  }
}

function runAsync(command: string, arguments_: readonly string[], cwd: string) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolvePromise, rejectPromise) => {
    const child = crossSpawn(command, [...arguments_], { cwd, env: process.env, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr?.on("data", chunk => { stderr += chunk.toString(); });
    child.once("error", rejectPromise);
    child.once("close", status => resolvePromise({ status, stdout, stderr }));
  });
}
