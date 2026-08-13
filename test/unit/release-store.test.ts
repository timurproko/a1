import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { materializeRelease, readMaterializedRelease, resolveReleaseEntryPoint, verifyMaterializedRelease } from "../../src/foundation/release/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("immutable release materialization", () => {
  it("copies and verifies package content beneath the AddOne data directory", async () => {
    const { packageRoot, dataDir } = await fixture();
    const release = await materializeRelease(packageRoot, dataDir);
    expect(release.releaseRoot).toMatch(/releases/);
    expect(await readFile(await resolveReleaseEntryPoint(release, "dist/app.js"), "utf8")).toBe("payload");
    expect((await readMaterializedRelease(release.releaseRoot)).releaseId).toBe(release.releaseId);
    await expect(resolveReleaseEntryPoint(release, "../package.json")).rejects.toThrow(/not in the verified release manifest/);
  });

  it("rejects digest mismatch, incomplete candidates, and roots outside the selected store", async () => {
    const { packageRoot, dataDir } = await fixture();
    const release = await materializeRelease(packageRoot, dataDir);
    await chmod(resolve(release.releaseRoot, "dist/app.js"), 0o600);
    await writeFile(resolve(release.releaseRoot, "dist/app.js"), "tampered");
    await expect(verifyMaterializedRelease(release.releaseRoot)).rejects.toThrow(/size mismatch|digest mismatch/);

    const otherStore = await mkdtemp(resolve(tmpdir(), "addone-other-store-"));
    roots.push(otherStore);
    await expect(verifyMaterializedRelease(release.releaseRoot, undefined, otherStore)).rejects.toThrow(/outside the selected release store/);
  });
});

async function fixture(): Promise<{ packageRoot: string; dataDir: string }> {
  const root = await mkdtemp(resolve(tmpdir(), "addone-materialize-"));
  roots.push(root);
  const packageRoot = resolve(root, "package");
  const dataDir = resolve(root, "data");
  await mkdir(resolve(packageRoot, "dist"), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({
    name: "@timurproko/addone",
    version: "2.0.0",
    files: ["dist"],
  }));
  await writeFile(resolve(packageRoot, "dist/app.js"), "payload");
  return { packageRoot, dataDir };
}
