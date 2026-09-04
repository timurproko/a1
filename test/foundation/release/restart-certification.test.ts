import { chmod, lstat, mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  certifyMaterializedRelease,
  materializeRelease,
  readMaterializedRelease,
  readRestartCertifiedRelease,
  restartSealDigest,
  RELEASE_MANIFEST_FILENAME,
  UpdateTransactionStore,
  type RestartValidationEvent,
} from "../../../src/foundation/release/index.js";
import { assertImmutableFileMode, immutablePlatformPolicy } from "../../../src/foundation/release/immutable-platform.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("durable restart certification", () => {
  it("validates a certified layered release without payload-wide reads", async () => {
    const small = await certifiedFixture(0);
    const large = await certifiedFixture(100);
    const smallEvents: RestartValidationEvent[] = [];
    const largeEvents: RestartValidationEvent[] = [];

    await expect(readRestartCertifiedRelease(small.record, small.dataDir, event => smallEvents.push(event))).resolves.toMatchObject({
      releaseId: small.release.releaseId,
      dependencyLayers: small.release.dependencyLayers,
    });
    await expect(readRestartCertifiedRelease(large.record, large.dataDir, event => largeEvents.push(event))).resolves.toMatchObject({
      releaseId: large.release.releaseId,
      dependencyLayers: large.release.dependencyLayers,
    });

    expect(large.release.files.length).toBeGreaterThan(small.release.files.length);
    expect(largeEvents).toHaveLength(smallEvents.length);
    expect(largeEvents.every(event => event.operation === "restart-evidence-read")).toBe(true);
    expect(largeEvents.some(event => event.path.endsWith("extra-99.js"))).toBe(false);
  });

  it("rejects changed records, manifests, bindings, immutability controls, and active transactions", async () => {
    const recordFixture = await certifiedFixture(1);
    await expect(readRestartCertifiedRelease({ ...recordFixture.record, contentDigest: "f".repeat(64) }, recordFixture.dataDir)).rejects.toThrow(/approved release record/);
    await expect(readRestartCertifiedRelease({ ...recordFixture.record, releaseRoot: resolve(recordFixture.root, "outside-release") }, recordFixture.dataDir)).rejects.toThrow(/approved release identity/);

    const manifestFixture = await certifiedFixture(1);
    const manifestPath = resolve(manifestFixture.release.releaseRoot, RELEASE_MANIFEST_FILENAME);
    await chmod(manifestPath, 0o600);
    await expect(readRestartCertifiedRelease(manifestFixture.record, manifestFixture.dataDir)).rejects.toThrow(/path evidence changed|file is writable/);

    const bindingFixture = await certifiedFixture(1);
    const binding = resolve(bindingFixture.release.releaseRoot, "node_modules");
    const outside = resolve(bindingFixture.root, "outside");
    await mkdir(outside);
    await unlink(binding);
    await symlink(outside, binding, process.platform === "win32" ? "junction" : "dir");
    await expect(readRestartCertifiedRelease(bindingFixture.record, bindingFixture.dataDir)).rejects.toThrow(/path evidence changed|targets unexpected content/);

    const layerFixture = await certifiedFixture(1);
    const layer = layerFixture.release.dependencyLayers![0]!;
    const layerCertification = resolve(layerFixture.dataDir, `dependency-layer-certification-${layer.layerId}.json`);
    await chmod(layerCertification, 0o600);
    await expect(readRestartCertifiedRelease(layerFixture.record, layerFixture.dataDir)).rejects.toThrow(/path evidence changed|file is writable/);

    const platformFixture = await certifiedFixture(1);
    const platformDocument = JSON.parse(await readFile(platformFixture.record.diagnosticsPath, "utf8")) as any;
    const { sealDigest: _sealDigest, ...platformCore } = platformDocument.restartSeal;
    platformCore.platformPolicy = "unsupported-policy-v1";
    platformDocument.restartSeal = { ...platformCore, sealDigest: restartSealDigest(platformCore) };
    await chmod(platformFixture.record.diagnosticsPath, 0o600);
    await writeFile(platformFixture.record.diagnosticsPath, JSON.stringify(platformDocument));
    await chmod(platformFixture.record.diagnosticsPath, 0o400);
    await expect(readRestartCertifiedRelease(platformFixture.record, platformFixture.dataDir)).rejects.toThrow(/platform immutability evidence is unsupported/);

    const transactionFixture = await certifiedFixture(1);
    await new UpdateTransactionStore(transactionFixture.dataDir).begin({
      channel: "next",
      targetVersion: "2.0.1",
      packageRoot: transactionFixture.packageRoot,
      priorActiveReleaseId: transactionFixture.release.releaseId,
    });
    await expect(readRestartCertifiedRelease(transactionFixture.record, transactionFixture.dataDir)).rejects.toThrow(/active update transaction/);
  });

  it("falls back to complete verification and resealing after stale evidence", async () => {
    const fixture = await certifiedFixture(1);
    const diagnostics = JSON.parse(await readFile(fixture.record.diagnosticsPath, "utf8")) as Record<string, unknown>;
    await chmod(fixture.record.diagnosticsPath, 0o600);
    await writeFile(fixture.record.diagnosticsPath, JSON.stringify({ ...diagnostics, restartSeal: null }));
    await chmod(fixture.record.diagnosticsPath, 0o400);

    await expect(readRestartCertifiedRelease(fixture.record, fixture.dataDir)).rejects.toThrow(/no durable restart seal/);
    const verified = await readMaterializedRelease(fixture.release.releaseRoot);
    await certifyMaterializedRelease(verified, fixture.dataDir);
    await expect(readRestartCertifiedRelease(fixture.record, fixture.dataDir)).resolves.toMatchObject({ releaseId: fixture.release.releaseId });
  });

  it("qualifies supported read-only platform policies and keeps certified payload files immutable", async () => {
    expect(immutablePlatformPolicy("win32")).toBe("windows-readonly-content-v1");
    expect(immutablePlatformPolicy("linux")).toBe("posix-readonly-content-v1");
    expect(immutablePlatformPolicy("darwin")).toBe("posix-readonly-content-v1");
    expect(immutablePlatformPolicy("aix")).toBeNull();
    expect(() => assertImmutableFileMode({ mode: 0o600 }, "writable.js")).toThrow(/writable/);

    const fixture = await certifiedFixture(1);
    for (const path of ["bin/supervisor.js", "bin/guardian.js", "dist/extra-0.js"]) {
      expect((await lstat(resolve(fixture.release.releaseRoot, path))).mode & 0o222).toBe(0);
    }
    await expect(writeFile(resolve(fixture.release.releaseRoot, "dist/extra-0.js"), "ordinary mutation"))
      .rejects.toMatchObject({ code: expect.stringMatching(/EACCES|EPERM/) });
    const layer = fixture.release.dependencyLayers![0]!;
    const dependency = resolve(fixture.dataDir, "dependency-layers", layer.layerId, "node_modules", "fixture-dependency", "index.js");
    expect((await lstat(dependency)).mode & 0o222).toBe(0);
  });
});

async function certifiedFixture(extraFiles: number) {
  const root = await mkdtemp(resolve(tmpdir(), "a1-restart-certification-"));
  roots.push(root);
  const packageRoot = resolve(root, "package");
  const dataDir = resolve(root, "data");
  await mkdir(resolve(packageRoot, "bin"), { recursive: true });
  await mkdir(resolve(packageRoot, "dist"), { recursive: true });
  await mkdir(resolve(packageRoot, "node_modules", "fixture-dependency"), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({
    name: "@timurproko/a1",
    version: "2.0.0",
    files: ["bin", "dist"],
    dependencies: { "fixture-dependency": "1.0.0" },
  }));
  await writeFile(resolve(packageRoot, "bin", "supervisor.js"), "supervisor");
  await writeFile(resolve(packageRoot, "bin", "guardian.js"), "guardian");
  await writeFile(resolve(packageRoot, "node_modules", "fixture-dependency", "package.json"), JSON.stringify({
    name: "fixture-dependency",
    version: "1.0.0",
    main: "index.js",
  }));
  await writeFile(resolve(packageRoot, "node_modules", "fixture-dependency", "index.js"), "dependency");
  for (let index = 0; index < extraFiles; index += 1) {
    await writeFile(resolve(packageRoot, "dist", `extra-${index}.js`), `export default ${index};`);
  }
  if (extraFiles === 0) await writeFile(resolve(packageRoot, "dist", "app.js"), "app");

  const release = await materializeRelease(packageRoot, dataDir);
  const diagnosticsPath = await certifyMaterializedRelease(release, dataDir);
  return {
    root,
    packageRoot,
    dataDir,
    release,
    record: {
      releaseId: release.releaseId,
      releaseRoot: release.releaseRoot,
      packageVersion: release.packageVersion,
      contentDigest: release.contentDigest,
      diagnosticsPath,
    },
  };
}
