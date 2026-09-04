import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CohortStateStore,
  dependencyLayerCertificationPath,
  discoverReleasePayload,
  generateDependencyRuntimePayload,
  materializeRelease,
  RUNTIME_PAYLOAD_INVENTORY,
  selectPublishedDependencyRuntimePayload,
  readMaterializedRelease,
  runBoundedReleaseCleanup,
  verifyMaterializedRelease,
  type ReleaseContentOperationEvent,
  type RuntimePayloadInventory,
} from "../../../src/foundation/release/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("certified immutable dependency layers", () => {
  it("generates deterministic conservative runtime inventory", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-runtime-inventory-"));
    roots.push(root);
    const packageRoot = await fixturePackage(root, "package", "1.0.0", "import 'fixture-dependency';", "dependency");
    const payload = await discoverReleasePayload(packageRoot);
    const productPaths = payload.paths.filter(path => !path.startsWith("node_modules/"));
    const first = await generateDependencyRuntimePayload(payload.packageRoot, payload.paths, productPaths);
    const second = await generateDependencyRuntimePayload(payload.packageRoot, payload.paths, productPaths);

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.paths).toContain("node_modules/fixture-dependency/dist/index.js");
    expect(first.inventory.exclusions).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: expect.stringMatching(/index\.d\.ts$/), reason: "type-declaration" }),
      expect.objectContaining({ path: expect.stringMatching(/index\.js\.map$/), reason: "source-map" }),
    ]));
  });

  it("applies published classifications across relocated dependency topology", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-runtime-topology-"));
    roots.push(root);
    const sourceRoot = await fixturePackage(root, "source", "1.0.0", "import 'fixture-dependency';", "dependency");
    const source = await discoverReleasePayload(sourceRoot);
    const generated = await generateDependencyRuntimePayload(source.packageRoot, source.paths, source.paths.filter(path => !path.startsWith("node_modules/")));

    const installedRoot = await fixturePackage(root, "installed", "1.0.0", "product", "dependency");
    const holderRoot = resolve(installedRoot, "node_modules", "holder");
    await mkdir(resolve(holderRoot, "node_modules"), { recursive: true });
    await writeFile(resolve(holderRoot, "package.json"), JSON.stringify({ name: "holder", version: "1.0.0" }));
    await writeFile(resolve(holderRoot, "unknown.d.ts"), "export declare const unknown: string;");
    await rename(resolve(installedRoot, "node_modules", "fixture-dependency"), resolve(holderRoot, "node_modules", "fixture-dependency"));
    await writeFile(resolve(installedRoot, RUNTIME_PAYLOAD_INVENTORY), JSON.stringify({
      schema: generated.inventory.schema,
      entryPoints: ["dist/app.js"],
      declaredAssets: [],
      ...generated,
    }));
    const installedPaths = [
      "node_modules/holder/package.json",
      "node_modules/holder/unknown.d.ts",
      "node_modules/holder/node_modules/fixture-dependency/package.json",
      "node_modules/holder/node_modules/fixture-dependency/dist/index.js",
      "node_modules/holder/node_modules/fixture-dependency/dist/index.d.ts",
      "node_modules/holder/node_modules/fixture-dependency/dist/index.js.map",
    ];
    const selected = await selectPublishedDependencyRuntimePayload(installedRoot, installedPaths);

    expect(selected.paths).toContain("node_modules/holder/node_modules/fixture-dependency/dist/index.js");
    expect(selected.paths).toContain("node_modules/holder/package.json");
    expect(selected.paths.some(path => /index\.d\.ts$|index\.js\.map$/.test(path))).toBe(false);
    expect(selected.inventory).toMatchObject({ includedFiles: 3, excludedFiles: 3 });
  });

  it("reuses unchanged dependency content while product identity changes", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-layer-reuse-"));
    roots.push(root);
    const dataDir = resolve(root, "data");
    const firstPackage = await fixturePackage(root, "first", "1.0.0", "product one", "dependency");
    const secondPackage = await fixturePackage(root, "second", "1.0.1", "product two", "dependency");
    const firstOperations: ReleaseContentOperationEvent[] = [];
    const secondOperations: ReleaseContentOperationEvent[] = [];
    let inventory: RuntimePayloadInventory | null = null;

    const first = await materializeRelease(firstPackage, dataDir, {
      onOperation: event => firstOperations.push(event),
      onRuntimeInventory: value => { inventory = value; },
    });
    const second = await materializeRelease(secondPackage, dataDir, { onOperation: event => secondOperations.push(event) });

    expect(first.dependencyLayers).toHaveLength(1);
    expect(second.dependencyLayers).toEqual(first.dependencyLayers);
    expect(first.releaseId).not.toBe(second.releaseId);
    expect(firstOperations.some(event => event.operation === "layer-write")).toBe(true);
    expect(secondOperations.some(event => event.operation === "layer-write")).toBe(false);
    expect(secondOperations.filter(event => event.operation === "layer-reuse")).not.toHaveLength(0);
    expect(inventory).toMatchObject({ excludedFiles: 2, uncertaintyRetainedFiles: expect.any(Number) });
    expect((await lstat(resolve(first.releaseRoot, "node_modules"))).isSymbolicLink()).toBe(true);
    await expect(readMaterializedRelease(second.releaseRoot)).resolves.toMatchObject({ releaseId: second.releaseId });
  });

  it("derives a different layer and release identity when dependency bytes change", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-layer-change-"));
    roots.push(root);
    const dataDir = resolve(root, "data");
    const first = await materializeRelease(await fixturePackage(root, "first", "1.0.0", "same", "dependency one"), dataDir);
    const second = await materializeRelease(await fixturePackage(root, "second", "1.0.0", "same", "dependency two"), dataDir);

    expect(first.dependencyLayers?.[0]?.layerId).not.toBe(second.dependencyLayers?.[0]?.layerId);
    expect(first.releaseId).not.toBe(second.releaseId);
  });

  it("cleans interrupted layer candidates and converges concurrent winners", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-layer-concurrency-"));
    roots.push(root);
    const packageRoot = await fixturePackage(root, "package", "1.0.0", "product", "dependency");
    const failedData = resolve(root, "failed-data");
    await expect(materializeRelease(packageRoot, failedData, {
      writeCandidateFile: async () => { throw new Error("injected layer write failure"); },
    })).rejects.toThrow(/injected layer write failure/);
    expect((await readdir(resolve(failedData, "dependency-layers"))).some(name => name.startsWith(".candidate-"))).toBe(false);

    const dataDir = resolve(root, "concurrent-data");
    const [left, right] = await Promise.all([
      materializeRelease(packageRoot, dataDir),
      materializeRelease(packageRoot, dataDir),
    ]);
    expect(left.releaseId).toBe(right.releaseId);
    expect(left.dependencyLayers).toEqual(right.dependencyLayers);
    await expect(readFile(dependencyLayerCertificationPath(dataDir, left.dependencyLayers![0]!.layerId), "utf8")).resolves.toContain(left.dependencyLayers![0]!.contentDigest);
  });

  it("fully verifies an uncertified existing layer before reuse", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-layer-uncertified-"));
    roots.push(root);
    const dataDir = resolve(root, "data");
    const packageRoot = await fixturePackage(root, "package", "1.0.0", "product", "dependency");
    const first = await materializeRelease(packageRoot, dataDir);
    const reference = first.dependencyLayers![0]!;
    await rm(dependencyLayerCertificationPath(dataDir, reference.layerId));

    await expect(materializeRelease(packageRoot, dataDir)).resolves.toMatchObject({ releaseId: first.releaseId });
    await expect(readFile(dependencyLayerCertificationPath(dataDir, reference.layerId), "utf8")).resolves.toContain(reference.contentDigest);
  });

  it("preserves a layer through its final retained release reference", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-layer-retention-"));
    roots.push(root);
    const dataDir = resolve(root, "data");
    const release = await materializeRelease(await fixturePackage(root, "package", "1.0.0", "product", "dependency"), dataDir);
    const reference = release.dependencyLayers![0]!;
    const layerRoot = resolve(dataDir, "dependency-layers", reference.layerId);
    const store = new CohortStateStore(dataDir);
    await store.recordCandidate(release);
    await store.approve(release.releaseId, resolve(dataDir, `certification-${release.releaseId}.json`));
    await store.activate(release.releaseId);

    await runBoundedReleaseCleanup(dataDir, undefined, { transactionStore: { read: async () => null } });
    await expect(lstat(layerRoot)).resolves.toBeTruthy();

    await store.update(state => ({
      ...state,
      references: { active: null, pending: null, approved: null, rollback: null, retention: [] },
    }));
    await runBoundedReleaseCleanup(dataDir, undefined, { transactionStore: { read: async () => null } });
    await expect(lstat(layerRoot)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails closed for a tampered layer and an arbitrary dependency binding", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-layer-tamper-"));
    roots.push(root);
    const dataDir = resolve(root, "data");
    const release = await materializeRelease(await fixturePackage(root, "package", "1.0.0", "product", "dependency"), dataDir);
    const reference = release.dependencyLayers![0]!;
    const layerFile = resolve(dataDir, "dependency-layers", reference.layerId, "node_modules", "fixture-dependency", "dist", "index.js");
    await chmod(layerFile, 0o600);
    await writeFile(layerFile, "tampered bytes");
    await expect(verifyMaterializedRelease(release.releaseRoot)).rejects.toThrow(/immutable payload file|dependency layer file/);
    await writeFile(layerFile, "dependency");
    await chmod(layerFile, 0o400);

    const outside = resolve(root, "outside");
    await mkdir(outside);
    const binding = resolve(release.releaseRoot, "node_modules");
    await unlink(binding);
    await symlink(outside, binding, process.platform === "win32" ? "junction" : "dir");
    await expect(verifyMaterializedRelease(release.releaseRoot)).rejects.toThrow(/unexpected content/);
  });
});

async function fixturePackage(root: string, name: string, version: string, product: string, dependency: string): Promise<string> {
  const packageRoot = resolve(root, name);
  const dependencyRoot = resolve(packageRoot, "node_modules", "fixture-dependency");
  await mkdir(resolve(packageRoot, "dist"), { recursive: true });
  await mkdir(resolve(dependencyRoot, "dist"), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({
    name: "@timurproko/a1",
    version,
    files: ["dist"],
    dependencies: { "fixture-dependency": "1.0.0" },
  }));
  await writeFile(resolve(packageRoot, "dist", "app.js"), product);
  await writeFile(resolve(dependencyRoot, "package.json"), JSON.stringify({ name: "fixture-dependency", version: "1.0.0", main: "dist/index.js", files: ["dist"] }));
  await writeFile(resolve(dependencyRoot, "dist", "index.js"), dependency);
  await writeFile(resolve(dependencyRoot, "dist", "index.d.ts"), "export declare const value: string;");
  await writeFile(resolve(dependencyRoot, "dist", "index.js.map"), "{}");
  return packageRoot;
}
