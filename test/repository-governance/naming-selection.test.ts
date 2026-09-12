import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { createTierPlan } from "../../scripts/release/validation-tier.mjs";
import { collectCommitChanges } from "../../scripts/release/validation-impact.mjs";
import { selectNamingImpact } from "../../scripts/governance/naming-source-policy.mjs";
import { runNamingValidation } from "../../scripts/governance/product-identifier-policy.mjs";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
const git = (root: string, ...args: string[]) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
async function file(root: string, path: string, source: string) { await mkdir(dirname(resolve(root, path)), { recursive: true }); await writeFile(resolve(root, path), source); }
const commit = (root: string) => { git(root, "add", "."); git(root, "commit", "-qm", "fixture"); return git(root, "rev-parse", "HEAD"); };
async function repository(source = "const value = 1;\n") {
  const root = await mkdtemp(resolve(tmpdir(), "naming-selection-")); roots.push(root);
  git(root, "init", "-q"); git(root, "config", "user.email", "fixture@example.invalid"); git(root, "config", "user.name", "Fixture");
  await file(root, "config/internal-naming-policy.json", JSON.stringify({ schema: "internal-naming-policy-v1", environment: [], externalMembers: [] }));
  await file(root, "src/worker.ts", source);
  return { root, base: commit(root) };
}
async function selection(root: string, base: string) {
  const head = git(root, "rev-parse", "HEAD");
  const changes = await collectCommitChanges(root, base, head);
  return { base, head, changes, naming: selectNamingImpact(changes) };
}

describe("PR whole-file naming validation", () => {
  it("inspects new files and untouched lines in modified files", async () => {
    const { root, base } = await repository("const a1Existing = 1;\nconst value = 1;\n");
    await file(root, "src/worker.ts", "const a1Existing = 1;\nconst value = 2;\n");
    await file(root, "src/new file.ts", "class A1New {}\n"); commit(root);
    const result = await runNamingValidation({ repository: root, selection: await selection(root, base) });
    expect(result.mode).toBe("changed");
    expect(result.passed).toBe(false);
    expect(result.internalIdentifiers.map(value => value.identifier).sort()).toEqual(["A1New", "a1Existing"]);
    expect(result.inspectedPaths).toEqual(["src/new file.ts", "src/worker.ts"]);
    expect(result.internalIdentifiers.every(value => value.line === 1 && value.rule === "NAME001")).toBe(true);
  });

  it("uses authoritative head bytes instead of later uncommitted edits", async () => {
    const { root, base } = await repository();
    await file(root, "src/worker.ts", "const a1Changed = 1;\n"); commit(root);
    const selected = await selection(root, base);
    await file(root, "src/worker.ts", "const repairedButUncommitted = 1;\n");
    expect((await runNamingValidation({ repository: root, selection: selected })).passed).toBe(false);
  });

  it("accounts for rename destinations and deletion without reading deleted paths", async () => {
    const { root, base } = await repository("const a1Value = 1;\n");
    git(root, "mv", "src/worker.ts", "src/renamed file.ts"); commit(root);
    const renamed = await selection(root, base);
    expect(renamed.changes[0]).toMatchObject({ status: "R", oldPath: "src/worker.ts", path: "src/renamed file.ts" });
    expect((await runNamingValidation({ repository: root, selection: renamed })).passed).toBe(false);
    const nextBase = renamed.head;
    git(root, "rm", "src/renamed file.ts"); commit(root);
    const deleted = await runNamingValidation({ repository: root, selection: await selection(root, nextBase) });
    expect(deleted.mode).toBe("none");
    expect(deleted.inspectedPaths).toEqual([]);
  });

  it("selects copy/type-change destinations and remembers scope crossings", () => {
    const selected = selectNamingImpact([
      { status: "C", oldPath: "docs/example.md", path: "src/copied.ts" },
      { status: "T", path: "src/type-changed.ts" },
      { status: "R", oldPath: "src/old.ts", path: "scripts/new.mjs" },
      { status: "D", path: "src/deleted.ts" },
    ]);
    expect(selected.paths).toEqual(["scripts/new.mjs", "src/copied.ts", "src/type-changed.ts"]);
    expect(selected.required).toBe(true);
  });

  it("full-audits unchanged code when policy changes", async () => {
    const { root, base } = await repository("const a1Existing = 1;\n");
    const path = "config/internal-naming-policy.json";
    await file(root, path, `${await readFile(resolve(root, path), "utf8")}\n`); commit(root);
    const result = await runNamingValidation({ repository: root, selection: await selection(root, base) });
    expect(result.mode).toBe("full");
    expect(result.reasons).toContain(path);
    expect(result.passed).toBe(false);
  });

  it("fails rather than accepting stale or forged selection metadata", async () => {
    const { root, base } = await repository();
    await file(root, "src/worker.ts", "const value = 2;\n"); commit(root);
    const selected = await selection(root, base);
    await expect(runNamingValidation({ repository: root, selection: { ...selected, head: "f".repeat(40) } })).rejects.toThrow(/stale/);
    await expect(runNamingValidation({ repository: root, selection: { ...selected, base: "f".repeat(40) } })).rejects.toThrow();
    await expect(runNamingValidation({ repository: root, selection: { ...selected, naming: { ...selected.naming, paths: [] } } })).rejects.toThrow(/complete current change/);
  });

  it("rejects unsupported owned source instead of omitting it", async () => {
    const { root, base } = await repository();
    await file(root, "src/new.unknown", "unknown source"); commit(root);
    const result = await runNamingValidation({ repository: root, selection: await selection(root, base) });
    expect(result.passed).toBe(false);
    expect(result.internalIdentifiers[0]).toMatchObject({ rule: "NAME002", path: "src/new.unknown" });
  });

  it("nightly audits the whole codebase even with no changed files", async () => {
    const { root } = await repository("const a1Unchanged = 1;\n");
    const result = await runNamingValidation({ repository: root });
    expect(result).toMatchObject({ mode: "full", passed: false });
    expect(result.inspectedPaths).toContain("src/worker.ts");
    expect(result.internalIdentifiers[0]?.identifier).toBe("a1Unchanged");
  });

  it("keeps the full naming audit on the nightly publication gate", async () => {
    const workflowText = await readFile(".github/workflows/release.yml", "utf8");
    const workflow = parse(workflowText);
    expect(workflow.on.schedule).toEqual(expect.arrayContaining([expect.objectContaining({ cron: expect.any(String) })]));
    const selector = workflow.jobs.validate.steps.find((step: { name?: string }) => step.name === "Select validation scope");
    expect(selector.env.MODE).toContain("needs.plan.outputs.mode");
    expect(selector.run).toContain('if [ "$MODE" = "develop" ]; then');
    expect(selector.run).toContain('else\n  selected=\'["full-release"]\'');
    expect(workflowText).toContain('process.env.MODE === "nightly" || !exists');
    expect(workflow.jobs.publish.if).toContain("needs.validate.result == 'success'");
    const plan = await createTierPlan(["full-release"]);
    expect(plan.commands.filter(command => command.id === "internal-naming-full")).toEqual([
      expect.objectContaining({ executable: "npm", arguments: ["run", "check:names"] }),
    ]);
    const manifest = JSON.parse(await readFile("package.json", "utf8"));
    expect(manifest.scripts["check:names"]).not.toContain("--selection");
  });

  it("records a no-product-work selection for non-policy documentation", async () => {
    const { root, base } = await repository();
    await file(root, "docs/guide.md", "# a1\n"); commit(root);
    const result = await runNamingValidation({ repository: root, selection: await selection(root, base) });
    expect(result).toMatchObject({ mode: "none", required: false, passed: true, inspectedPaths: [] });
  });
});
