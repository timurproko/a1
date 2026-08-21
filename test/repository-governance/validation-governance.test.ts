import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const checker = resolve("scripts/check-validation-governance.mjs");
const temporaryDirectories: string[] = [];

async function createFixture(options: { rules?: unknown[]; duplicateCommands?: boolean; selector?: string } = {}) {
  const root = await mkdtemp(resolve(tmpdir(), "validation-governance-"));
  temporaryDirectories.push(root);
  await Promise.all(["config", "scripts", "src/cli", "test/cli"].map(path => mkdir(resolve(root, path), { recursive: true })));
  await writeFile(resolve(root, "src/cli/index.ts"), "export const value = true;\n");
  await writeFile(resolve(root, "test/cli/index.test.ts"), "export {};\n");
  await writeFile(resolve(root, "scripts/select-validation-impact.mjs"), options.selector ?? "export {};\n");
  await writeFile(resolve(root, "config/validation-impact.json"), JSON.stringify({
    schema: "a1-validation-impact-v1",
    mandatory: ["fast"],
    planningOnly: { patterns: ["openspec/**"], selected: ["planning"] },
    rules: options.rules ?? [{ id: "cli", owner: "cli", patterns: ["src/cli/**", "test/cli/**"], scopes: [] }],
  }));
  await writeFile(resolve(root, "config/validation-suites.json"), JSON.stringify({
    schema: "a1-validation-suites-v1",
    tiers: {
      planning: { kind: "commands", commands: [{ id: "planning", executable: "node", arguments: ["--version"] }] },
      fast: { kind: "commands", commands: [{ id: "fast", executable: "node", arguments: ["--version"] }] },
    },
    scopes: options.duplicateCommands ? {
      duplicate: { kind: "commands", commands: [{ id: "fast", executable: "node", arguments: ["--version"] }] },
    } : {},
  }));
  return root;
}

function run(root: string) {
  return spawnSync(process.execPath, [checker], { cwd: root, encoding: "utf8" });
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

describe("validation policy governance", () => {
  it("accepts mapped live paths and unique commands", async () => {
    const result = run(await createFixture());
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Validation governance OK");
  });

  it("rejects an unmapped live path", async () => {
    const result = run(await createFixture({ rules: [] }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("live path has no validation impact owner");
  });

  it("rejects duplicate selected command ownership", async () => {
    const result = run(await createFixture({ duplicateCommands: true }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("validation command id has duplicate owners");
  });

  it("rejects unexplained rules and suppressive overrides", async () => {
    const result = run(await createFixture({
      rules: [{ id: "broken", owner: "", patterns: [], scopes: [] }],
      selector: "const option = '--skip-validation';\n",
    }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("impact rule is not explainable");
    expect(result.stderr).toContain("selector exposes suppressive override");
  });
});
