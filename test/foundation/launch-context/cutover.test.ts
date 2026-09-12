import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRIVATE_LAUNCH_CONTRACT, readLaunchContext } from "../../../src/foundation/launch-context/index.js";
import { CohortStateStore, certifyMaterializedRelease, materializeRelease, runBootstrap, startSupervisor, warmMaterializedRelease, type MaterializedRelease } from "../../../src/foundation/release/index.js";
import { readUpdateRecoveryCapsule } from "../../../src/foundation/release/update-recovery.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture(contract: string | undefined, warmupKeys: "current" | "superseded" = "current") {
  const root = await mkdtemp(resolve(tmpdir(), "neutral-cutover-")); roots.push(root);
  const packageRoot = resolve(root, "package"), dataDir = resolve(root, "data"), home = resolve(root, "home");
  await mkdir(resolve(packageRoot, "bin"), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: "1.0.0", files: ["bin"], ...(contract === undefined ? {} : { privateLaunchContract: contract }) }));
  await writeFile(resolve(packageRoot, "bin", "supervisor.js"), "process.exit(0);");
  await writeFile(resolve(packageRoot, "bin", "guardian.js"), "process.exit(0);");
  const prefix = warmupKeys === "current" ? "LAUNCH_CONTEXT_" : "A1_";
  const warmupKey = warmupKeys === "current" ? "LAUNCH_CONTEXT_WARMUP" : "A1_IMMUTABLE_WARMUP";
  await writeFile(resolve(packageRoot, "bin", "warmup.js"), `
    if (!process.env.${prefix}RELEASE_ROOT || !process.env.${prefix}RELEASE_ID
      || !process.env.${prefix}RELEASE_DIGEST || process.env.${warmupKey} !== "1") throw new Error("missing expected context");
  `);
  const protectedPaths = [resolve(root, "config", "settings.json"), resolve(dataDir, "history", "a1.sqlite3"), resolve(home, ".a1", "agent", "sessions", "session.jsonl")];
  for (const path of protectedPaths) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, "protected-user-data"); }
  const assertProtected = async () => {
    for (const path of protectedPaths) expect(await readFile(path, "utf8")).toBe("protected-user-data");
  };
  return { root, packageRoot, dataDir, assertProtected };
}

describe("private-contract negotiation across an upgrade", () => {
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
    await expect(warmMaterializedRelease(release, {}, 5_000)).resolves.toBeUndefined();
    await value.assertProtected();
  });

  it("accepts a handoff written by a launcher that predates the contract", () => {
    const environment = {
      A1_RELEASE_ROOT: "/releases/1.0.0-aaaaaaaaaaaaaaaaaaaa",
      A1_RELEASE_ID: "1.0.0-aaaaaaaaaaaaaaaaaaaa",
      A1_RELEASE_DIGEST: "a".repeat(64),
      A1_RELEASE_LAYERS: "dependencies-".padEnd(45, "b"),
      A1_LAUNCH_PROFILE: "a1",
      A1_IMMUTABLE_WARMUP: "1",
    };
    expect(readLaunchContext(environment, "warmup", "linux")).toMatchObject({ releaseId: "1.0.0-aaaaaaaaaaaaaaaaaaaa", launchProfile: "a1", immutableWarmup: "1" });
    // Invariant: a current key is authority wherever both are present.
    expect(readLaunchContext({ ...environment, LAUNCH_CONTEXT_RELEASE_ID: "2.0.0-cccccccccccccccccccc" }, "release", "linux").releaseId).toBe("2.0.0-cccccccccccccccccccc");
  });

  it("treats an absent dependency-layer list as an empty one", () => {
    const context = readLaunchContext({
      LAUNCH_CONTEXT_RELEASE_ROOT: "/releases/1.0.0-aaaaaaaaaaaaaaaaaaaa",
      LAUNCH_CONTEXT_RELEASE_ID: "1.0.0-aaaaaaaaaaaaaaaaaaaa",
      LAUNCH_CONTEXT_RELEASE_DIGEST: "a".repeat(64),
    }, "release", "linux");
    expect(context.releaseLayers).toBe("");
  });

  it("starts and warms a retained pre-cutover release under its own key set", async () => {
    const value = await fixture(PRIVATE_LAUNCH_CONTRACT, "superseded");
    const release = await materializeRelease(value.packageRoot, value.dataDir);
    const { launchContract: _contract, ...retained } = release;
    await expect(warmMaterializedRelease(retained, {}, 5_000)).resolves.toBeUndefined();
    await expect(startSupervisor(retained, {})).resolves.toMatchObject({ releaseId: retained.releaseId });
    const store = new CohortStateStore(value.dataDir);
    await store.recordCandidate(retained);
    await store.approve(retained.releaseId, "fixture-certification");
    await expect(store.activate(retained.releaseId)).resolves.toMatchObject({ references: expect.objectContaining({ active: retained.releaseId }) });
    await value.assertProtected();
  });

  it("heals a pre-cutover active record by materializing the installed release", async () => {
    const value = await fixture(PRIVATE_LAUNCH_CONTRACT);
    const release = await materializeRelease(value.packageRoot, value.dataDir);
    const { launchContract: _contract, ...unsupported } = release;
    const store = new CohortStateStore(value.dataDir);
    await store.recordCandidate(unsupported);
    const snapshot = await store.read();
    await writeFile(store.path, JSON.stringify({ ...snapshot, references: { ...snapshot.references, active: unsupported.releaseId } }));
    const scheduleMaintenance = vi.fn(async () => {});
    const environment = { A1_DATA_DIR: value.dataDir, A1_CONFIG_DIR: resolve(value.root, "config"), A1_RUNTIME_DIR: resolve(value.root, "runtime") };
    // Rationale: the fixture supervisor exits immediately, so the launch cannot complete; what matters
    // is that a stale record no longer stops the launch before reconciliation runs.
    await expect(runBootstrap({ packageRoot: value.packageRoot, environment, scheduleMaintenance })).rejects.not.toThrow(/Unsupported private launch contract/);
    expect(scheduleMaintenance).toHaveBeenCalled();
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
