import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { deriveReleaseIdentity, resolveWithin } from "../../../src/foundation/release/index.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe("package-derived release identity", () => {
  it("uses package metadata and payload bytes without a duplicated version constant", async () => {
    const root = await fixturePackage("1.2.3", "first");
    const first = await deriveReleaseIdentity(root);
    expect(first.packageVersion).toBe("1.2.3");
    expect(first.releaseId).toMatch(/^1\.2\.3-[a-f0-9]{20}$/);

    await writeFile(resolve(root, "dist/app.js"), "second", "utf8");
    const changed = await deriveReleaseIdentity(root);
    expect(changed.packageVersion).toBe(first.packageVersion);
    expect(changed.contentDigest).not.toBe(first.contentDigest);

    const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")) as { version: string };
    expect(manifest.version).toBe(first.packageVersion);
  });

  it("rejects distribution traversal and symlinks instead of hashing outside content", async () => {
    const root = await fixturePackage("1.0.0", "safe");
    await writeFile(resolve(root, "package.json"), JSON.stringify({
      name: "@timurproko/a1",
      version: "1.0.0",
      files: ["../outside"],
    }));
    await expect(deriveReleaseIdentity(root)).rejects.toThrow(/escapes package root/);
    expect(() => resolveWithin(root, "../../outside")).toThrow(/escapes selected root/);
  });

  it("rejects the obsolete npm package identity", async () => {
    const root = await fixturePackage("1.0.0", "safe");
    const manifestPath = resolve(root, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
    await writeFile(manifestPath, JSON.stringify({ ...manifest, name: "@timurproko/addone" }));
    await expect(deriveReleaseIdentity(root)).rejects.toThrow(/unexpected A1 package name/);
  });
});

async function fixturePackage(version: string, source: string): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-release-identity-"));
  roots.push(root);
  await mkdir(resolve(root, "dist"), { recursive: true });
  await writeFile(resolve(root, "package.json"), JSON.stringify({
    name: "@timurproko/a1",
    version,
    files: ["dist"],
  }));
  await writeFile(resolve(root, "dist/app.js"), source, "utf8");
  return root;
}
