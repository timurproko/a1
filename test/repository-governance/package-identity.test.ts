import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const script = resolve(fileURLToPath(new URL("../../scripts/check-package-identity.mjs", import.meta.url)));
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("authoritative npm package identity", () => {
  it("accepts a1-only live surfaces while preserving historical records", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({ name: "@timurproko/a1", version: "0.1.0", bin: { a1: "bin/addone.js" } }),
      "README.md": "Install `@timurproko/a1` and run `a1`.",
      "src/package.ts": "export const packageName = '@timurproko/a1';",
      "openspec/changes/archive/old/proposal.md": "Published @timurproko/addone with `addone`.",
      "openspec/changes/live/evidence/record.md": "Historical @timurproko/addone evidence.",
      "openspec/changes/republish-as-a1/design.md": "Remove @timurproko/addone and `addone`.",
    });
    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Package identity OK");
  });

  it("rejects the old package and command in live surfaces", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({ name: "@timurproko/addone", bin: { addone: "bin/addone.js", a1: "bin/addone.js" } }),
      "docs/install.md": "Run `addone update` after installing @timurproko/addone.",
    });
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("obsolete npm package identity");
    expect(result.stderr).toContain("obsolete public addone command");
  });
});

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-package-identity-"));
  roots.push(root);
  for (const [path, source] of Object.entries(files)) {
    const absolute = resolve(root, path);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, source, "utf8");
  }
  return root;
}

function run(root: string) {
  return spawnSync(process.execPath, [script, "--root", root], { encoding: "utf8" });
}
