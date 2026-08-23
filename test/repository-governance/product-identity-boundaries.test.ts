import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const script = resolve(repository, "scripts/check-product-identity-boundaries.mjs");
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("product identity declarative boundaries", () => {
  it("matches the repository package, workflow, bin, and native metadata", () => {
    const result = run(repository);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Product identity boundaries OK");
  });

  it.each([
    ["package manifest", async (root: string) => writeJson(root, "package.json", { name: "@example/other", bin: { "a1": "bin/cli.js" } }), "package.json name differs"],
    ["npm bin", async (root: string) => writeJson(root, "package.json", { name: "@timurproko/a1", bin: { "a1": "bin/other.js" } }), "package.json bin differs"],
    ["lockfile", async (root: string) => writeJson(root, "package-lock.json", { name: "@example/other", packages: { "": { name: "@example/other", bin: { "a1": "bin/cli.js" } } } }), "package-lock.json name differs"],
    ["workflow", async (root: string) => writeFile(resolve(root, ".github/workflows/release.yml"), "run: echo @timurproko/a1", "utf8"), "does not consume the product identity authority"],
    ["identity-blind workflow", async (root: string) => writeFile(resolve(root, ".github/workflows/release.yml"), "candidate-evidence.json\nevidence.package.name", "utf8"), "does not derive package and bin metadata from product identity"],
    ["native crate", async (root: string) => writeFile(resolve(root, "native/terminal-host/Cargo.toml"), "[package]\nname = \"other-host\"\n", "utf8"), "native Cargo package name differs"],
    ["duplicate authority", async (root: string) => writeJson(root, "src/application-identity.json", { duplicate: true }), "expected one executable JSON identity authority"],
  ])("rejects divergent %s metadata", async (_name, mutate, expected) => {
    const root = await fixture();
    await mutate(root);
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(expected);
  });
});

async function fixture(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-identity-boundaries-"));
  roots.push(root);
  const identity = JSON.parse(await readFile(resolve(repository, "src/product-identity.json"), "utf8")) as {
    packageName: string;
    commandName: string;
    artifacts: { cliEntry: string; nativeCrate: string };
  };
  const bin = { [identity.commandName]: identity.artifacts.cliEntry };
  const workflow = [
    "src/product-identity.json",
    "identity.packageName",
    "identity.commandName",
    "identity.artifacts.cliEntry",
  ].join("\n");
  await writeJson(root, "src/product-identity.json", identity);
  await writeJson(root, "package.json", { name: identity.packageName, bin });
  await writeJson(root, "package-lock.json", { name: identity.packageName, packages: { "": { name: identity.packageName, bin } } });
  await writeText(root, identity.artifacts.cliEntry, "#!/usr/bin/env node\n");
  await writeText(root, ".github/workflows/release.yml", workflow);
  await writeText(root, "native/terminal-host/Cargo.toml", `[package]\nname = "${identity.artifacts.nativeCrate}"\n`);
  await writeText(root, "native/terminal-host/Cargo.lock", `[[package]]\nname = "${identity.artifacts.nativeCrate}"\n`);
  return root;
}

async function writeJson(root: string, path: string, value: unknown): Promise<void> {
  await writeText(root, path, JSON.stringify(value));
}

async function writeText(root: string, path: string, value: string): Promise<void> {
  const absolute = resolve(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, value, "utf8");
}

function run(root: string) {
  return spawnSync(process.execPath, [script, "--root", root], { encoding: "utf8" });
}
