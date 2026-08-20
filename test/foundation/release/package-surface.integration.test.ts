import crossSpawn from "cross-spawn";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repository = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
let root = "";
let tarball = "";
let pack: { filename: string; integrity: string; shasum: string; files: Array<{ path: string }> };

beforeAll(async () => {
  root = await mkdtemp(resolve(tmpdir(), "a1-package-surface-"));
  const built = run(npm, ["run", "build", "--silent"], repository);
  expect(built.status, built.stderr).toBe(0);
  await access(resolve(repository, "dist", "src", "cli", "index.js"));
  await access(resolve(repository, "dist", "src", "product-identity.js"));
  await access(resolve(repository, "dist", "src", "product-identity.json"));
  const packed = run(npm, ["pack", "--ignore-scripts", "--json", "--pack-destination", root], repository);
  expect(packed.status, packed.stderr).toBe(0);
  const results = JSON.parse(packed.stdout) as typeof pack[];
  if (!results[0]) throw new Error("npm pack returned no package result");
  pack = results[0];
  tarball = resolve(root, pack.filename);
}, 60_000);

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe("packed npm command surface", () => {
  it("packs the fresh package identity with required internal entries", async () => {
    expect(pack.filename).toBe("timurproko-a1-0.1.0.tgz");
    expect(pack.integrity).toMatch(/^sha512-/);
    expect(pack.shasum).toMatch(/^[a-f0-9]{40}$/);
    const paths = pack.files.map(file => file.path);
    expect(paths).toEqual(expect.arrayContaining([
      "package.json",
      "bin/a1.js",
      "bin/a1-ui.js",
      "bin/a1-supervisor.js",
      "dist/src/product-identity.js",
      "dist/src/product-identity.json",
      "dist/src/product-identity.d.ts",
    ]));
  });

  it("installs only the a1 shim under a clean npm prefix", async () => {
    const prefix = resolve(root, "prefix");
    const installed = run(npm, ["install", "--global", "--prefix", prefix, tarball, "--ignore-scripts"], repository);
    expect(installed.status, installed.stderr).toBe(0);

    const manifest = JSON.parse(await readFile(resolve(prefix, "node_modules", "@timurproko", "a1", "package.json"), "utf8")) as {
      name: string;
      version: string;
      bin: Record<string, string>;
    };
    expect(manifest).toMatchObject({ name: "@timurproko/a1", version: "0.1.0", bin: { a1: "bin/a1.js" } });
    expect(Object.keys(manifest.bin)).toEqual(["a1"]);

    const packageRoot = resolve(prefix, "node_modules", "@timurproko", "a1");
    const identityJson = JSON.parse(await readFile(resolve(packageRoot, "dist", "src", "product-identity.json"), "utf8")) as { packageName: string };
    const identityModule = await import(pathToFileURL(resolve(packageRoot, "dist", "src", "product-identity.js")).href) as {
      PRODUCT_IDENTITY: { packageName: string; commandName: string };
    };
    expect(identityJson.packageName).toBe("@timurproko/a1");
    expect(identityModule.PRODUCT_IDENTITY).toMatchObject({ packageName: "@timurproko/a1", commandName: "a1" });
    expect(Object.isFrozen(identityModule.PRODUCT_IDENTITY)).toBe(true);

    const bin = process.platform === "win32" ? prefix : resolve(prefix, "bin");
    const a1 = resolve(bin, process.platform === "win32" ? "a1.cmd" : "a1");
    await expect(access(a1)).resolves.toBeUndefined();
    await expect(access(resolve(bin, process.platform === "win32" ? "addone.cmd" : "addone"))).rejects.toThrow();
    await expect(access(resolve(bin, process.platform === "win32" ? "addone-supervisor.cmd" : "addone-supervisor"))).rejects.toThrow();

    const launched = run(a1, ["agent"], root);
    expect(launched.status).toBe(2);
    expect(launched.stderr).toContain("Bare a1 is the A1 agent experience");
  }, 120_000);
});

function run(command: string, arguments_: readonly string[], cwd: string) {
  return crossSpawn.sync(command, [...arguments_], { cwd, encoding: "utf8", env: process.env, windowsHide: true });
}
