import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRIVATE_LAUNCH_CONTRACT } from "../../../src/foundation/launch-context/index.js";
import { CohortStateStore, certifyMaterializedRelease, materializeRelease, runBootstrap, startSupervisor, warmMaterializedRelease, type MaterializedRelease } from "../../../src/foundation/release/index.js";
import { readUpdateRecoveryCapsule } from "../../../src/foundation/release/update-recovery.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture(contract: string | undefined) {
  const root = await mkdtemp(resolve(tmpdir(), "neutral-cutover-")); roots.push(root);
  const packageRoot = resolve(root, "package"), dataDir = resolve(root, "data"), home = resolve(root, "home");
  await mkdir(resolve(packageRoot, "bin"), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: "1.0.0", files: ["bin"], ...(contract === undefined ? {} : { privateLaunchContract: contract }) }));
  await writeFile(resolve(packageRoot, "bin", "supervisor.js"), "process.exit(0);");
  await writeFile(resolve(packageRoot, "bin", "guardian.js"), "process.exit(0);");
  await writeFile(resolve(packageRoot, "bin", "warmup.js"), `
    if (!process.env.LAUNCH_CONTEXT_RELEASE_ROOT || !process.env.LAUNCH_CONTEXT_RELEASE_ID
      || !process.env.LAUNCH_CONTEXT_RELEASE_DIGEST || process.env.LAUNCH_CONTEXT_WARMUP !== "1") throw new Error("missing current context");
  `);
  const protectedPaths = [resolve(root, "config", "settings.json"), resolve(dataDir, "history", "a1.sqlite3"), resolve(home, ".a1", "agent", "sessions", "session.jsonl")];
  for (const path of protectedPaths) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, "protected-user-data"); }
  const assertProtected = async () => {
    for (const path of protectedPaths) expect(await readFile(path, "utf8")).toBe("protected-user-data");
  };
  return { root, packageRoot, dataDir, assertProtected };
}

describe("clean private-contract cutover", () => {
  it("rejects a package without current metadata before materializing or deleting state", async () => {
    const value = await fixture(undefined);
    await expect(materializeRelease(value.packageRoot, value.dataDir)).rejects.toThrow(/Unsupported private launch contract/);
    expect(await readdir(value.dataDir)).toEqual(["history"]);
    await value.assertProtected();
  });

  it("materializes, certifies, activates, and warms a current-contract release", async () => {
    const value = await fixture(PRIVATE_LAUNCH_CONTRACT);
    const release = await materializeRelease(value.packageRoot, value.dataDir);
    expect(release.launchContract).toBe(PRIVATE_LAUNCH_CONTRACT);
    const store = new CohortStateStore(value.dataDir);
    await store.recordCandidate(release);
    await store.approve(release.releaseId, await certifyMaterializedRelease(release, value.dataDir));
    await store.activate(release.releaseId);
    await expect(warmMaterializedRelease(release, {}, 2_000)).resolves.toBeUndefined();
    await value.assertProtected();
  });

  it("rejects retained launch, warmup, activation, and rollback targets without the contract", async () => {
    const value = await fixture(PRIVATE_LAUNCH_CONTRACT);
    const release = await materializeRelease(value.packageRoot, value.dataDir);
    const { launchContract: _contract, ...unsupported } = release;
    await expect(startSupervisor(unsupported, {})).rejects.toThrow(/Unsupported private launch contract/);
    await expect(warmMaterializedRelease(unsupported, {})).rejects.toThrow(/Unsupported private launch contract/);
    const store = new CohortStateStore(value.dataDir);
    await store.recordCandidate(unsupported);
    await store.approve(unsupported.releaseId, "fixture-certification");
    await expect(store.activate(unsupported.releaseId)).rejects.toThrow(/Unsupported private launch contract/);
    const snapshot = await store.read();
    await writeFile(store.path, JSON.stringify({ ...snapshot, references: { ...snapshot.references, rollback: unsupported.releaseId } }));
    await expect(store.rollback(true)).rejects.toThrow(/Unsupported private launch contract/);
    expect((await store.read()).references.active).toBeNull();
    await value.assertProtected();
  });

  it("rejects stale active state before sweeping endpoints or scheduling cleanup", async () => {
    const value = await fixture(PRIVATE_LAUNCH_CONTRACT);
    const release = await materializeRelease(value.packageRoot, value.dataDir);
    const { launchContract: _contract, ...unsupported } = release;
    const store = new CohortStateStore(value.dataDir);
    await store.recordCandidate(unsupported);
    const snapshot = await store.read();
    const state = { ...snapshot, references: { ...snapshot.references, active: unsupported.releaseId } };
    await writeFile(store.path, JSON.stringify(state));
    const scheduleMaintenance = vi.fn(async () => {});
    const environment = { A1_DATA_DIR: value.dataDir, A1_CONFIG_DIR: resolve(value.root, "config"), A1_RUNTIME_DIR: resolve(value.root, "runtime") };
    await expect(runBootstrap({ packageRoot: value.packageRoot, environment, scheduleMaintenance })).rejects.toThrow(/Unsupported private launch contract/);
    expect(scheduleMaintenance).not.toHaveBeenCalled();
    expect(JSON.parse(await readFile(store.path, "utf8"))).toEqual(state);
    await value.assertProtected();
  });

  it("does not translate or execute an obsolete recovery capsule", async () => {
    const value = await fixture(PRIVATE_LAUNCH_CONTRACT);
    const capsule = resolve(value.root, "capsule.json");
    await writeFile(capsule, JSON.stringify({ schema: "a1-update-recovery-v1", recoveryEntry: "never-execute" }));
    const before = await readFile(capsule, "utf8");
    await expect(readUpdateRecoveryCapsule(capsule)).rejects.toThrow(/Unsupported private launch contract/);
    expect(await readFile(capsule, "utf8")).toBe(before);
    await value.assertProtected();
  });

  it("binds contract identity into the certified content digest", async () => {
    const value = await fixture(PRIVATE_LAUNCH_CONTRACT);
    const release = await materializeRelease(value.packageRoot, value.dataDir);
    const manifestPath = resolve(release.releaseRoot, ".a1-release.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as MaterializedRelease;
    expect(manifest.launchContract).toBe(PRIVATE_LAUNCH_CONTRACT);
    const { createReleaseIdentity } = await import("../../../src/foundation/release/release.js");
    const wrong = createReleaseIdentity(manifest.packageRoot, manifest.packageVersion, manifest.files, manifest.dependencyLayers, "different-contract");
    expect(wrong.contentDigest).not.toBe(manifest.contentDigest);
  });
});
