import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const checker = "scripts/governance/check-code-documentation.mjs";

async function put(root: string, path: string, source: string) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), source);
}

async function repositoryFixture(source = "export const value = 1;\n") {
  const root = await mkdtemp(join(tmpdir(), "a1-code-doc-command-"));
  await execFileAsync("git", ["init"], { cwd: root });
  await put(root, "config/baselines/pinned-pi-source-port-ledger.json", '{"records":[]}\n');
  await put(root, "scripts/changed.mjs", source);
  await execFileAsync("git", ["add", "-f", "."], { cwd: root });
  return root;
}

function selection(path: string) {
  return {
    schema: "a1-validation-impact-v1",
    base: "a".repeat(40),
    head: "b".repeat(40),
    changes: [{ status: "M", path }],
    docsOnly: false,
    versionOnly: false,
    openspecTouched: false,
    ordinaryScopes: ["fast"],
    rendering: { tier: "none", reasons: [], fallbacks: [], changedPaths: [path] },
    documentation: { required: true, paths: [path] },
    timing: { classifierMs: 1 },
  };
}

describe("code documentation command modes", () => {
  it("checks only selected changed files and records zero full scans", async () => {
    const root = await repositoryFixture();
    await put(root, "selection.json", `${JSON.stringify(selection("scripts/changed.mjs"))}\n`);
    await execFileAsync(process.execPath, [checker, "--root", root, "--mode", "changed", "--selection", "selection.json", "--result", "changed.json"]);
    expect(JSON.parse(await readFile(join(root, "changed.json"), "utf8"))).toMatchObject({
      mode: "changed",
      passed: true,
      filesInspected: 1,
      fullRepositoryScans: 0,
    });
  });

  it("rejects changed-file violations and invalid selection paths", async () => {
    const root = await repositoryFixture("// unclear\nexport const value = 1;\n");
    await put(root, "selection.json", `${JSON.stringify(selection("scripts/changed.mjs"))}\n`);
    await expect(execFileAsync(process.execPath, [checker, "--root", root, "--mode", "changed", "--selection", "selection.json"])).rejects.toMatchObject({ code: 1 });
    await put(root, "bad.json", `${JSON.stringify(selection("../outside.ts"))}\n`);
    await expect(execFileAsync(process.execPath, [checker, "--root", root, "--mode", "changed", "--selection", "bad.json"])).rejects.toBeDefined();
  });

  it("performs one explicit complete scan and reports seeded violations", async () => {
    const root = await repositoryFixture("// unclear\nexport const value = 1;\n");
    await expect(execFileAsync(process.execPath, [checker, "--root", root, "--mode", "full", "--result", "full.json"])).rejects.toMatchObject({ code: 1 });
    expect(JSON.parse(await readFile(join(root, "full.json"), "utf8"))).toMatchObject({
      mode: "full",
      passed: false,
      filesInspected: 1,
      fullRepositoryScans: 1,
    });
  });

  it("rejects unsupported modes and missing changed selection", async () => {
    const root = await repositoryFixture();
    await expect(execFileAsync(process.execPath, [checker, "--root", root, "--mode", "unknown"])).rejects.toBeDefined();
    await expect(execFileAsync(process.execPath, [checker, "--root", root, "--mode", "changed"])).rejects.toBeDefined();
  });
});
