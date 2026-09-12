import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CohortStateStore, certifyMaterializedRelease, dependencyLayerCertificationPath,
  legacyDependencyLayerCertificationPath, materializeRelease, readCertifiedDependencyLayer,
  readRestartCertifiedRelease, restartSealDigest, runBoundedReleaseCleanup,
} from "../../../src/foundation/release/index.js";
import { dependencyCertificationProtection } from "../../../src/foundation/release/dependency-certification-retention.js";

vi.mock("node:fs/promises", async importOriginal => ({ ...await importOriginal<typeof fs>() }));
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});
const noTransaction = { read: async () => null };

describe("dependency certification directory migration", () => {
  it("writes only the canonical layout and preserves valid evidence during reuse and verification", async () => {
    const fixture = await certifiedFixture();
    expect(fixture.canonical).toBe(resolve(fixture.dataDir, "dependency-certifications", `${fixture.layer.layerId}.json`));
    await expect(fs.lstat(fixture.legacy)).rejects.toMatchObject({ code: "ENOENT" });
    const before = await fs.lstat(fixture.canonical, { bigint: true });
    const reused = await materializeRelease(fixture.packageRoot, fixture.dataDir);
    await certifyMaterializedRelease(reused, fixture.dataDir);
    const after = await fs.lstat(fixture.canonical, { bigint: true });
    expect(after.ctimeNs).toBe(before.ctimeNs);
    expect(after.mode & 0o222n).toBe(0n);
    expect(reused.dependencyLayers).toEqual(fixture.release.dependencyLayers);
    await expect(readRestartCertifiedRelease(fixture.record, fixture.dataDir)).resolves.toMatchObject({ releaseId: reused.releaseId });
  });

  it("copies legacy evidence without payload reads or changing the old sealed file", async () => {
    const fixture = await legacyFixture();
    const source = await fs.readFile(fixture.legacy, "utf8");
    const metadata = await fs.lstat(fixture.legacy, { bigint: true });
    const reads = vi.spyOn(fs, "readFile");
    await readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId, fixture.layer);
    expect(reads.mock.calls.some(([path]) => String(path).includes("node_modules"))).toBe(false);
    expect(JSON.parse(await fs.readFile(fixture.canonical, "utf8"))).toEqual(JSON.parse(source));
    expect((await fs.lstat(fixture.legacy, { bigint: true })).ctimeNs).toBe(metadata.ctimeNs);
    await expect(readRestartCertifiedRelease(fixture.record, fixture.dataDir)).resolves.toMatchObject({ releaseId: fixture.release.releaseId });
  });

  it.each(["schema", "layerId", "contentDigest", "platform", "platformPolicy"])("does not migrate mismatched %s evidence", async field => {
    const fixture = await legacyFixture();
    const document = JSON.parse(await fs.readFile(fixture.legacy, "utf8"));
    await writeReadonly(fixture.legacy, { ...document, [field]: "incorrect" });
    await expect(readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId, fixture.layer)).rejects.toThrow(/differs/);
    await expect(fs.lstat(fixture.canonical)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("never hides a damaged or unreadable canonical record behind valid legacy evidence", async () => {
    const fixture = await legacyFixture();
    await fs.writeFile(fixture.canonical, "broken JSON");
    await expect(readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId)).rejects.toThrow();
    expect(await fs.readFile(fixture.canonical, "utf8")).toBe("broken JSON");
    await fs.rm(fixture.canonical);
    await fs.copyFile(fixture.legacy, fixture.canonical);
    const original = fs.readFile;
    vi.spyOn(fs, "readFile").mockImplementation((...args: Parameters<typeof fs.readFile>) => {
      if (String(args[0]) === fixture.canonical) return Promise.reject(Object.assign(new Error("denied"), { code: "EACCES" }));
      return original(...args);
    });
    await expect(readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId)).rejects.toThrow("denied");
  });

  it("retries interrupted publication and converges concurrent migration without rewriting the winner", async () => {
    const fixture = await legacyFixture();
    const originalRename = fs.rename;
    const rename = vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (String(to) === fixture.canonical) throw Object.assign(new Error("sharing violation"), { code: "EPERM" });
      return originalRename(from, to);
    });
    await expect(readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId)).rejects.toThrow("sharing violation");
    await expect(fs.lstat(fixture.legacy)).resolves.toBeTruthy();
    await expect(fs.lstat(fixture.canonical)).rejects.toMatchObject({ code: "ENOENT" });
    rename.mockRestore();
    // Concurrency: model a killed publisher's lease and incomplete private temporary file.
    await fs.mkdir(`${fixture.canonical}.lock`);
    await fs.writeFile(resolve(`${fixture.canonical}.lock`, "owner.json"), JSON.stringify({ pid: 999_999, token: "11111111-1111-4111-8111-111111111111" }));
    const partial = `${fixture.canonical}.999999.interrupted.tmp`;
    await fs.writeFile(partial, "partial");
    await Promise.all(Array.from({ length: 4 }, () => readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId)));
    const before = await fs.lstat(fixture.canonical, { bigint: true });
    await readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId);
    expect((await fs.lstat(fixture.canonical, { bigint: true })).ctimeNs).toBe(before.ctimeNs);
    expect(await fs.readFile(partial, "utf8")).toBe("partial");
    await expect(readRestartCertifiedRelease(fixture.record, fixture.dataDir)).resolves.toBeTruthy();
  });

  it("coordinates independent publishers recovering the same abandoned lease", async () => {
    const fixture = await legacyFixture();
    await fs.mkdir(`${fixture.canonical}.lock`);
    await fs.writeFile(resolve(`${fixture.canonical}.lock`, "owner.json"), JSON.stringify({ pid: 999_999, token: "22222222-2222-4222-8222-222222222222" }));
    const moduleUrl = new URL("../../../src/foundation/release/dependency-layer.ts", import.meta.url).href;
    const program = `const { readCertifiedDependencyLayer } = await import(${JSON.stringify(moduleUrl)}); await readCertifiedDependencyLayer(${JSON.stringify(fixture.dataDir)}, ${JSON.stringify(fixture.layer.layerId)});`;
    await Promise.all(Array.from({ length: 3 }, () => promisify(execFile)(process.execPath, ["--import", "tsx", "--input-type=module", "-e", program])));
    expect(JSON.parse(await fs.readFile(fixture.canonical, "utf8"))).toEqual(JSON.parse(await fs.readFile(fixture.legacy, "utf8")));
    expect((await fs.lstat(fixture.canonical)).mode & 0o222).toBe(0);
    await expect(readRestartCertifiedRelease(fixture.record, fixture.dataDir)).resolves.toBeTruthy();
  }, 15_000);

  it("validates rather than overwrites a conflicting winner published after legacy lookup", async () => {
    const fixture = await legacyFixture();
    const original = fs.readFile;
    let published = false;
    vi.spyOn(fs, "readFile").mockImplementation(async (...args: Parameters<typeof fs.readFile>) => {
      const result = await original(...args);
      if (String(args[0]) === fixture.legacy && !published) {
        published = true;
        await fs.writeFile(fixture.canonical, "conflicting winner");
        await fs.chmod(fixture.canonical, 0o400);
      }
      return result;
    });
    await expect(readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId)).rejects.toThrow();
    expect(await fs.readFile(fixture.canonical, "utf8")).toBe("conflicting winner");
    await expect(readRestartCertifiedRelease(fixture.record, fixture.dataDir)).resolves.toBeTruthy();
  });

  it("keeps the authenticated-parent platform upgrade narrow in either layout", async () => {
    const fixture = await legacyFixture();
    const { platform: _platform, platformPolicy: _policy, ...document } = JSON.parse(await fs.readFile(fixture.legacy, "utf8"));
    await writeReadonly(fixture.legacy, document);
    await expect(readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId)).rejects.toThrow(/differs/);
    await readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId, fixture.layer, { allowLegacyParentCertification: true });
    expect(JSON.parse(await fs.readFile(fixture.canonical, "utf8")).platform).toBe(process.platform);
    expect(JSON.parse(await fs.readFile(fixture.legacy, "utf8"))).toEqual(document);
  });

  it("rejects traversal and refuses linked directories without touching their targets", async () => {
    const fixture = await legacyFixture();
    expect(() => dependencyLayerCertificationPath(fixture.dataDir, "../../outside")).toThrow(/identity/);
    expect(() => legacyDependencyLayerCertificationPath(fixture.dataDir, "../outside")).toThrow(/identity/);
    const outside = resolve(fixture.root, "outside");
    await fs.mkdir(outside);
    const sentinel = resolve(outside, `${fixture.layer.layerId}.json`);
    await fs.copyFile(fixture.legacy, sentinel);
    const source = await fs.readFile(sentinel, "utf8");
    await fs.rm(resolve(fixture.dataDir, "dependency-certifications"), { recursive: true });
    await fs.symlink(outside, resolve(fixture.dataDir, "dependency-certifications"), process.platform === "win32" ? "junction" : "dir");
    await expect(readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId)).rejects.toThrow(/non-link/);
    await expect(materializeRelease(fixture.packageRoot, fixture.dataDir)).rejects.toThrow(/non-link/);
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });
    expect(await fs.readFile(sentinel, "utf8")).toBe(source);
  });

  it.skipIf(process.platform === "win32")("refuses linked canonical and legacy record files", async () => {
    const fixture = await legacyFixture();
    const outside = resolve(fixture.root, "outside.json");
    await fs.copyFile(fixture.legacy, outside);
    await fs.symlink(outside, fixture.canonical);
    await expect(readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId)).rejects.toThrow(/regular file/);
    await fs.unlink(fixture.canonical);
    await fs.rm(fixture.legacy);
    await fs.symlink(outside, fixture.legacy);
    await expect(readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId)).rejects.toThrow(/regular file/);
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });
    await expect(fs.lstat(outside)).resolves.toBeTruthy();
  });
});

describe("dependency certification retention integration", () => {
  it("preserves old rollback/live evidence, seals new releases canonically, then removes the legacy duplicate", async () => {
    const fixture = await legacyFixture();
    const oldMetadata = await fs.lstat(fixture.legacy, { bigint: true });
    await fs.writeFile(resolve(fixture.packageRoot, "bin", "supervisor.js"), "updated supervisor");
    const next = await materializeRelease(fixture.packageRoot, fixture.dataDir);
    const diagnostics = await certifyMaterializedRelease(next, fixture.dataDir);
    await fixture.store.recordCandidate(next);
    await fixture.store.approve(next.releaseId, diagnostics);
    await fixture.store.activate(next.releaseId);
    const newDocument = JSON.parse(await fs.readFile(diagnostics, "utf8"));
    expect(newDocument.restartSeal.dependencyLayers[0].certification.path).toBe(fixture.canonical);
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });
    expect((await fs.lstat(fixture.legacy, { bigint: true })).ctimeNs).toBe(oldMetadata.ctimeNs);
    await expect(readRestartCertifiedRelease(fixture.record, fixture.dataDir)).resolves.toBeTruthy();
    await expect(readRestartCertifiedRelease(next, fixture.dataDir)).resolves.toBeTruthy();
    await fixture.store.update(state => ({ ...state, references: { ...state.references, rollback: null } }));
    // Invariant: a live-cohort hold still pins the old release after rollback is cleared.
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, {
      transactionStore: noTransaction, externalHolds: [{ authority: "agent", releaseId: fixture.release.releaseId }],
    });
    await expect(fs.lstat(fixture.legacy)).resolves.toBeTruthy();
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });
    await expect(fs.lstat(fixture.legacy)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.lstat(fixture.canonical)).resolves.toBeTruthy();
    await expect(readRestartCertifiedRelease(next, fixture.dataDir)).resolves.toBeTruthy();
  });

  it("preserves uncertain old consumers and active transactions", async () => {
    const fixture = await certifiedFixture();
    await fs.copyFile(fixture.canonical, fixture.legacy);
    await fs.chmod(fixture.legacy, 0o400);
    await fs.rm(fixture.record.diagnosticsPath);
    expect((await dependencyCertificationProtection(fixture.dataDir)).legacyRequired.has(fixture.layer.layerId)).toBe(true);
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });
    await expect(fs.lstat(fixture.legacy)).resolves.toBeTruthy();
    await certifyMaterializedRelease(fixture.release, fixture.dataDir);
    const transactionStore = { read: async () => ({ status: "active", priorActiveReleaseId: fixture.release.releaseId }) as any };
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore });
    await expect(fs.lstat(fixture.legacy)).resolves.toBeTruthy();
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });
    await expect(fs.lstat(fixture.legacy)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("retries sharing failures and removes both layouts only after the final reference is gone", async () => {
    const fixture = await legacyFixture();
    await readCertifiedDependencyLayer(fixture.dataDir, fixture.layer.layerId);
    await fixture.store.update(state => ({ ...state, references: { active: null, pending: null, approved: null, rollback: null, retention: [] } }));
    const remove = vi.fn<typeof fs.rm>(async (path, options) => {
      if (String(path) === fixture.legacy) throw Object.assign(new Error("sharing violation"), { code: "EPERM" });
      return fs.rm(path, options);
    });
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction, operations: { remove } });
    await expect(fs.lstat(fixture.legacy)).resolves.toBeTruthy();
    expect((await fixture.store.read()).cleanup.diagnostics.some(item => item.error.includes("sharing violation"))).toBe(true);
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });
    await expect(fs.lstat(fixture.legacy)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.lstat(fixture.canonical)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rechecks transaction protection before certification deletion", async () => {
    const fixture = await certifiedFixture();
    await fs.copyFile(fixture.canonical, fixture.legacy);
    let reads = 0;
    const transactionStore = { read: async () => {
      reads += 1;
      return reads < 3 ? null : { status: "active", priorActiveReleaseId: fixture.release.releaseId } as any;
    } };
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore });
    await expect(fs.lstat(fixture.legacy)).resolves.toBeTruthy();
  });

  it("bounds orphan certificate cleanup and does not let one locked record starve others", async () => {
    const fixture = await certifiedFixture();
    const directory = resolve(fixture.dataDir, "dependency-certifications");
    const orphans = ["a", "b", "c"].map(value => resolve(directory, `dependencies-${value.repeat(32)}.json`));
    for (const path of orphans) await fs.writeFile(path, "obsolete");
    const remove = vi.fn<typeof fs.rm>(async (path, options) => {
      if (String(path) === orphans[0]) throw Object.assign(new Error("locked"), { code: "EPERM" });
      return fs.rm(path, options);
    });
    const options = { transactionStore: noTransaction, operations: { remove }, limits: { maxItems: 1 } };
    expect((await runBoundedReleaseCleanup(fixture.dataDir, undefined, options)).attempted).toBe(1);
    expect((await runBoundedReleaseCleanup(fixture.dataDir, undefined, options)).completed).toBe(1);
    expect((await runBoundedReleaseCleanup(fixture.dataDir, undefined, options)).completed).toBe(1);
    await expect(fs.lstat(orphans[0]!)).resolves.toBeTruthy();
    await expect(fs.lstat(orphans[1]!)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.lstat(orphans[2]!)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("collects orphan records without a layer store and ignores unknown entries", async () => {
    const fixture = await certifiedFixture();
    await fs.copyFile(fixture.canonical, fixture.legacy);
    await fs.rm(fixture.release.releaseRoot, { recursive: true, force: true });
    await fs.rm(resolve(fixture.dataDir, "dependency-layers"), { recursive: true, force: true });
    await fixture.store.update(state => ({ ...state, releases: {}, references: { active: null, pending: null, approved: null, rollback: null, retention: [] } }));
    const unknown = resolve(fixture.dataDir, "dependency-certifications", "keep.json");
    await fs.writeFile(unknown, "keep");
    const subdirectory = resolve(fixture.dataDir, "dependency-certifications", `dependencies-${"a".repeat(32)}.json`);
    await fs.mkdir(subdirectory);
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });
    await expect(fs.lstat(fixture.canonical)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.lstat(fixture.legacy)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await fs.readFile(unknown, "utf8")).toBe("keep");
    expect((await fs.lstat(subdirectory)).isDirectory()).toBe(true);
    await fs.rm(resolve(fixture.dataDir, "dependency-certifications"), { recursive: true, force: true });
    await expect(runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction })).resolves.toBeTruthy();
  });
});

async function certifiedFixture() {
  const root = await fs.realpath(await fs.mkdtemp(resolve(tmpdir(), "dependency-certification-test-")));
  roots.push(root);
  const packageRoot = resolve(root, "package");
  const dataDir = resolve(root, "data");
  await fs.mkdir(resolve(packageRoot, "bin"), { recursive: true });
  await fs.mkdir(resolve(packageRoot, "node_modules", "fixture-dependency"), { recursive: true });
  await fs.writeFile(resolve(packageRoot, "package.json"), JSON.stringify({
    name: "@timurproko/a1", privateLaunchContract: "neutral-launch-v1", version: "2.0.0", files: ["bin"], dependencies: { "fixture-dependency": "1.0.0" },
  }));
  await fs.writeFile(resolve(packageRoot, "bin", "supervisor.js"), "supervisor");
  await fs.writeFile(resolve(packageRoot, "bin", "guardian.js"), "guardian");
  await fs.writeFile(resolve(packageRoot, "node_modules", "fixture-dependency", "package.json"), JSON.stringify({ name: "fixture-dependency", version: "1.0.0", main: "index.js" }));
  await fs.writeFile(resolve(packageRoot, "node_modules", "fixture-dependency", "index.js"), "dependency");
  const release = await materializeRelease(packageRoot, dataDir);
  const diagnosticsPath = await certifyMaterializedRelease(release, dataDir);
  const store = new CohortStateStore(dataDir);
  await store.recordCandidate(release);
  await store.approve(release.releaseId, diagnosticsPath);
  await store.activate(release.releaseId);
  const layer = release.dependencyLayers![0]!;
  return { root, packageRoot, dataDir, release, layer, store, record: { ...release, diagnosticsPath },
    canonical: dependencyLayerCertificationPath(dataDir, layer.layerId), legacy: legacyDependencyLayerCertificationPath(dataDir, layer.layerId) };
}

async function legacyFixture() {
  const fixture = await certifiedFixture();
  await fs.rename(fixture.canonical, fixture.legacy);
  const document = JSON.parse(await fs.readFile(fixture.record.diagnosticsPath, "utf8"));
  const metadata = await fs.lstat(fixture.legacy, { bigint: true });
  const evidence = document.restartSeal.dependencyLayers[0].certification;
  Object.assign(evidence, { path: fixture.legacy, device: String(metadata.dev), inode: String(metadata.ino), mode: Number(metadata.mode),
    size: String(metadata.size), modifiedNs: String(metadata.mtimeNs), changedNs: String(metadata.ctimeNs), bornNs: String(metadata.birthtimeNs) });
  const { sealDigest: _digest, ...core } = document.restartSeal;
  document.restartSeal.sealDigest = restartSealDigest(core);
  await writeReadonly(fixture.record.diagnosticsPath, document);
  return fixture;
}

async function writeReadonly(path: string, document: unknown) {
  await fs.chmod(path, 0o600);
  await fs.writeFile(path, JSON.stringify(document));
  await fs.chmod(path, 0o400);
}
