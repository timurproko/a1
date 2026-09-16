import { gzipSync } from "node:zlib";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectDownloadCache, packageInstallArguments, verifyInstalledCandidate } from "../../scripts/release/package-download-cache.mjs";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe("clean installation download-cache controls", () => {
  it("uses prefer-offline with fallback in production and reserves offline for the warm audit control", () => {
    expect(packageInstallArguments("prefix", "candidate.tgz", "cache")).toEqual([
      "install", "--global", "--prefix", "prefix", "candidate.tgz", "--ignore-scripts", "--no-audit", "--no-fund", "--cache", "cache", "--prefer-offline",
    ]);
    expect(packageInstallArguments("prefix", "candidate.tgz", "cache", true)).toEqual([
      "install", "--global", "--prefix", "prefix", "candidate.tgz", "--ignore-scripts", "--no-audit", "--no-fund", "--cache", "cache", "--offline",
    ]);
    expect(() => packageInstallArguments("", "candidate", "cache")).toThrow("paths are required");
  });

  it("verifies every installed candidate payload byte and manifest identity", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-cached-install-")); roots.push(root);
    const manifest = { name: "@fixture/app", version: "1.0.0", bin: { app: "bin/cli.js" } };
    const bytes = tarball({ "package/package.json": JSON.stringify(manifest), "package/bin/cli.js": "export const exact = true;" });
    await put(root, "package.json", JSON.stringify(manifest));
    await put(root, "bin/cli.js", "export const exact = true;");
    await expect(verifyInstalledCandidate(bytes, root)).resolves.toMatchObject({ name: "@fixture/app", version: "1.0.0", files: 2 });
    await put(root, "bin/cli.js", "tampered");
    await expect(verifyInstalledCandidate(bytes, root)).rejects.toThrow("payload differs");
  });

  it("rejects installed manifest drift and unsafe candidate entries", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-cached-install-")); roots.push(root);
    const manifest = { name: "@fixture/app", version: "1.0.0", bin: { app: "bin/cli.js" } };
    await put(root, "package.json", JSON.stringify({ ...manifest, version: "2.0.0" }));
    await put(root, "bin/cli.js", "exact");
    await expect(verifyInstalledCandidate(tarball({ "package/package.json": JSON.stringify(manifest), "package/bin/cli.js": "exact" }), root)).rejects.toThrow("payload differs");
    await expect(verifyInstalledCandidate(tarball({ "package/package.json": JSON.stringify(manifest), "package/../escape": "private" }), root)).rejects.toThrow(/unsafe entry path|payload path is unsafe/);
  });

  it("records bounded content-free cache size without reading file content", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-download-cache-")); roots.push(root);
    expect(await inspectDownloadCache(join(root, "missing"))).toEqual({ files: 0, bytes: 0 });
    await put(root, "cache/a.bin", Buffer.alloc(3));
    await put(root, "cache/nested/b.bin", Buffer.alloc(5));
    expect(await inspectDownloadCache(join(root, "cache"))).toEqual({ files: 2, bytes: 8 });
  });

  it("verifies identical candidate bytes independently in two fresh installation roots", async () => {
    const cold = await mkdtemp(join(tmpdir(), "a1-cold-prefix-"));
    const warm = await mkdtemp(join(tmpdir(), "a1-warm-prefix-"));
    roots.push(cold, warm);
    const manifest = { name: "@fixture/app", version: "1.0.0", bin: { app: "bin/cli.js" } };
    const candidate = tarball({ "package/package.json": JSON.stringify(manifest), "package/bin/cli.js": "export const exact = true;" });
    for (const root of [cold, warm]) {
      await put(root, "package.json", JSON.stringify(manifest));
      await put(root, "bin/cli.js", "export const exact = true;");
    }
    const [coldIdentity, warmIdentity] = await Promise.all([
      verifyInstalledCandidate(candidate, cold), verifyInstalledCandidate(candidate, warm),
    ]);
    expect(cold).not.toBe(warm);
    expect(coldIdentity).toEqual(warmIdentity);
  });
});

async function put(root: string, path: string, source: string | Buffer) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), source);
}
function tarball(files: Record<string, string>): Buffer {
  const parts: Buffer[] = [];
  for (const [path, source] of Object.entries(files)) {
    const content = Buffer.from(source), header = Buffer.alloc(512);
    header.write(path, 0, "utf8");
    header.write(`${content.length.toString(8).padStart(11, "0")}\0`, 124, "ascii");
    header[156] = "0".charCodeAt(0);
    parts.push(header, content, Buffer.alloc(Math.ceil(content.length / 512) * 512 - content.length));
  }
  return gzipSync(Buffer.concat([...parts, Buffer.alloc(1024)]));
}
