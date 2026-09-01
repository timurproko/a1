import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { deriveReleaseIdentity, discoverReleasePayload, resolveWithin } from "../../../src/foundation/release/index.js";

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

  it("discovers deterministic payload paths without reading ordinary contents", async () => {
    const root = await fixturePackage("1.0.0", "safe");
    await writeFile(resolve(root, "dist/z.js"), "z");
    await writeFile(resolve(root, "dist/a.js"), "a");
    const reads: string[] = [];

    const payload = await discoverReleasePayload(root, { onSourceRead: path => reads.push(path) });

    expect(payload.paths).toEqual(["dist/a.js", "dist/app.js", "dist/z.js", "package.json"]);
    expect(reads).toEqual(["package.json"]);
  });

  it("rejects missing dependencies and linked payload entries during discovery", async () => {
    const root = await fixturePackage("1.0.0", "safe");
    const manifestPath = resolve(root, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
    await writeFile(manifestPath, JSON.stringify({ ...manifest, dependencies: { "missing-package": "1.0.0" } }));
    await expect(discoverReleasePayload(root)).rejects.toThrow(/dependency is missing/);

    await writeFile(manifestPath, JSON.stringify(manifest));
    const outside = resolve(root, "outside");
    await mkdir(outside);
    await symlink(outside, resolve(root, "dist/link"), "junction");
    await expect(discoverReleasePayload(root)).rejects.toThrow(/symbolic link/);
  });

  it("follows a dependency linked inside the installation, because A1 links one itself", async () => {
    const root = await fixturePackage("1.0.0", "safe");
    const manifestPath = resolve(root, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
    await writeFile(manifestPath, JSON.stringify({ ...manifest, dependencies: { "linked-package": "1.0.0" } }));

    // Invariant: the real copy lives nested, exactly as pinned Pi's pi-tui does.
    const nested = resolve(root, "node_modules/host/node_modules/linked-package");
    await mkdir(nested, { recursive: true });
    await writeFile(resolve(nested, "package.json"), JSON.stringify({ name: "linked-package", version: "1.0.0" }));
    await writeFile(resolve(nested, "index.js"), "export default 1;\n");
    await mkdir(resolve(root, "node_modules"), { recursive: true });
    await symlink(nested, resolve(root, "node_modules/linked-package"), "junction");

    const payload = await discoverReleasePayload(root);

    expect(payload.paths).toContain("node_modules/host/node_modules/linked-package/index.js");
    // Provenance: collected from where the files really are, never through the link itself.
    expect(payload.paths.some(path => path.startsWith("node_modules/linked-package/"))).toBe(false);
  });

  it("refuses a dependency linked to somewhere outside the installation", async () => {
    const root = await fixturePackage("1.0.0", "safe");
    const manifestPath = resolve(root, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
    await writeFile(manifestPath, JSON.stringify({ ...manifest, dependencies: { "escaping-package": "1.0.0" } }));

    const elsewhere = resolve(root, "..", `escape-${basename(root)}`);
    await mkdir(elsewhere, { recursive: true });
    roots.push(elsewhere);
    await writeFile(resolve(elsewhere, "package.json"), JSON.stringify({ name: "escaping-package", version: "1.0.0" }));
    await mkdir(resolve(root, "node_modules"), { recursive: true });
    await symlink(elsewhere, resolve(root, "node_modules/escaping-package"), "junction");

    await expect(discoverReleasePayload(root)).rejects.toThrow(/dependency is missing/);
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
