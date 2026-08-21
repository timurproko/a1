import { chmod, mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { certifyMaterializedRelease, materializeRelease, readCertifiedReleaseManifest, readMaterializedRelease, RELEASE_MANIFEST_FILENAME, resolveReleaseEntryPoint, verifyMaterializedRelease, type ReleaseContentOperationEvent } from "../../../src/foundation/release/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("immutable release materialization", () => {
  it("copies and verifies package content beneath the A1 data directory", async () => {
    const { packageRoot, dataDir } = await fixture();
    const progress: Array<{ phase: "copying"; fileCount: number }> = [];
    const release = await materializeRelease(packageRoot, dataDir, { onProgress: event => progress.push(event) });
    expect(progress).toEqual([{ phase: "copying", fileCount: 2 }]);
    expect(RELEASE_MANIFEST_FILENAME).toBe(".a1-release.json");
    expect(release.releaseRoot).toMatch(/releases/);
    expect(await readFile(await resolveReleaseEntryPoint(release, "dist/app.js"), "utf8")).toBe("payload");
    expect((await readMaterializedRelease(release.releaseRoot)).releaseId).toBe(release.releaseId);
    await expect(resolveReleaseEntryPoint(release, "../package.json")).rejects.toThrow(/not in the verified release manifest/);
  });

  it("reads each source and writes each candidate file once without rereading fresh content for certification", async () => {
    const { packageRoot, dataDir } = await fixture();
    const operations: ReleaseContentOperationEvent[] = [];
    const release = await materializeRelease(packageRoot, dataDir, { onOperation: event => operations.push(event) });

    expect(operations.filter(event => event.operation === "source-read").map(event => event.path).sort()).toEqual(["dist/app.js", "package.json"]);
    expect(operations.filter(event => event.operation === "candidate-write").map(event => event.path).sort()).toEqual(["dist/app.js", "package.json"]);
    expect(operations.filter(event => event.operation === "verification-read")).toEqual([]);

    const certificationReads: ReleaseContentOperationEvent[] = [];
    await certifyMaterializedRelease(release, dataDir, { onOperation: event => certificationReads.push(event) });
    expect(certificationReads).toEqual([]);

    const fallbackReads: ReleaseContentOperationEvent[] = [];
    await certifyMaterializedRelease({ ...release }, dataDir, { onOperation: event => fallbackReads.push(event) });
    expect(fallbackReads.filter(event => event.operation === "verification-read").map(event => event.path).sort()).toEqual(["dist/app.js", "package.json"]);
  });

  it("removes a private candidate after a payload write failure", async () => {
    const { packageRoot, dataDir } = await fixture();
    await expect(materializeRelease(packageRoot, dataDir, {
      writeCandidateFile: async (path, bytes, mode) => {
        if (path.endsWith("app.js")) throw new Error("injected candidate write failure");
        await writeFile(path, bytes, { flag: "wx", mode });
        await chmod(path, mode);
      },
    })).rejects.toThrow(/injected candidate write failure/);
    expect(await readdir(resolve(dataDir, "releases"))).toEqual([]);
  });

  it("converges concurrent materialization on one release root", async () => {
    const { packageRoot, dataDir } = await fixture();
    const [first, second] = await Promise.all([
      materializeRelease(packageRoot, dataDir),
      materializeRelease(packageRoot, dataDir),
    ]);
    expect(second.releaseRoot).toBe(first.releaseRoot);
    expect((await readdir(resolve(dataDir, "releases"))).filter(path => path.startsWith(".candidate-"))).toEqual([]);
  });

  it("uses metadata-only loading only for an already authenticated live release", async () => {
    const { packageRoot, dataDir } = await fixture();
    const release = await materializeRelease(packageRoot, dataDir);
    const payload = resolve(release.releaseRoot, "dist/app.js");
    await chmod(payload, 0o600);
    await writeFile(payload, "tampered");
    await expect(readCertifiedReleaseManifest(release, resolve(dataDir, "releases"))).resolves.toMatchObject({ releaseId: release.releaseId });
    await expect(readMaterializedRelease(release.releaseRoot)).rejects.toThrow(/size mismatch|digest mismatch/);
  });

  it("rejects obsolete package metadata in a materialized release", async () => {
    const { packageRoot, dataDir } = await fixture();
    const release = await materializeRelease(packageRoot, dataDir);
    const manifestPath = resolve(release.releaseRoot, RELEASE_MANIFEST_FILENAME);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
    await chmod(manifestPath, 0o600);
    await writeFile(manifestPath, JSON.stringify({ ...manifest, packageName: "@timurproko/addone" }));
    await expect(readMaterializedRelease(release.releaseRoot)).rejects.toThrow(/A1 release manifest metadata is invalid/);
  });

  it("does not read a legacy-named release manifest", async () => {
    const { packageRoot, dataDir } = await fixture();
    const release = await materializeRelease(packageRoot, dataDir);
    await rename(
      resolve(release.releaseRoot, RELEASE_MANIFEST_FILENAME),
      resolve(release.releaseRoot, ".addone-release.json"),
    );

    await expect(readMaterializedRelease(release.releaseRoot)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects digest mismatch, incomplete candidates, and roots outside the selected store", async () => {
    const { packageRoot, dataDir } = await fixture();
    const release = await materializeRelease(packageRoot, dataDir);
    await chmod(resolve(release.releaseRoot, "dist/app.js"), 0o600);
    await writeFile(resolve(release.releaseRoot, "dist/app.js"), "tampered");
    await expect(verifyMaterializedRelease(release.releaseRoot)).rejects.toThrow(/size mismatch|digest mismatch/);

    const otherStore = await mkdtemp(resolve(tmpdir(), "a1-other-store-"));
    roots.push(otherStore);
    await expect(verifyMaterializedRelease(release.releaseRoot, undefined, otherStore)).rejects.toThrow(/outside the selected release store/);
  });
});

async function fixture(): Promise<{ packageRoot: string; dataDir: string }> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-materialize-"));
  roots.push(root);
  const packageRoot = resolve(root, "package");
  const dataDir = resolve(root, "data");
  await mkdir(resolve(packageRoot, "dist"), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({
    name: "@timurproko/a1",
    version: "2.0.0",
    files: ["dist"],
  }));
  await writeFile(resolve(packageRoot, "dist/app.js"), "payload");
  return { packageRoot, dataDir };
}
