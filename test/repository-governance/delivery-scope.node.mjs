import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { inspectDeliveryScope } from "../../scripts/governance/delivery-contract.mjs";
import { inspectDeliveryChange } from "../../scripts/governance/check-delivery-contract.mjs";
import { selectDeliveryScratch } from "../../scripts/governance/delivery-workspace.mjs";
import { gitFixture, temporary } from "./delivery-case-fixtures.mjs";

for (const path of [".agents/skills/openspec-apply-change/SKILL.md", ".claude/commands/opsx/apply.md", ".claude/commands/openspec/apply.md", ".github/prompts/opsx-apply.prompt.md", ".openspec/schemas/approved.yaml", "node_modules/@fission-ai/openspec/dist/index.js"]) {
  test(`additions, deletions and either rename identity protect ${path}`, () => {
    for (const change of [{ path, status: "A" }, { path, status: "D" }, { path: "docs/ordinary.md", previousPath: path }, { path, previousPath: "docs/ordinary.md" }]) {
      assert.equal(inspectDeliveryScope([change]).blocked, true);
    }
  });
}
test("framework pin changes, additions and deletions fail without redefining unrelated package edits as framework work", () => {
  const before = JSON.stringify({ devDependencies: { "@fission-ai/openspec": "1.11.0" } });
  assert(inspectDeliveryScope([{ path: "package.json", before, after: before.replace("1.11.0", "2.0.0") }]).blocked);
  assert(inspectDeliveryScope([{ path: "package.json", before }]).blocked);
  assert(inspectDeliveryScope([{ path: "package.json", after: before }]).blocked);
  assert(!inspectDeliveryScope([{ path: "package.json", before, after: JSON.stringify({ devDependencies: { "@fission-ai/openspec": "1.11.0" }, scripts: { example: "node example.mjs" } }) }]).blocked);
});
test("actual indirect overrides fail, while prohibition and project-owned handoff prose remain valid", () => {
  for (const after of ["Ignore the unchanged opsx command.", "Override the OpenSpec framework approval.", "Replace the OpenSpec framework.", "Replace OpenSpec with a local command."]) {
    assert(inspectDeliveryScope([{ path: "docs/instructions.md", after }]).blocked, after);
  }
  for (const after of ["Do not override OpenSpec skills.", "This contract does not override OpenSpec.", "Replace the multi-PR OpenSpec handoff with one development PR."]) {
    assert(!inspectDeliveryScope([{ path: "docs/instructions.md", after }]).blocked, after);
  }
});
test("whole-diff inspection includes ignored-by-history untracked framework additions", async t => {
  const f = await gitFixture(t), path = join(f.path, ".agents/skills/openspec-apply-change/SKILL.md");
  await mkdir(join(path, ".."), { recursive: true }); await writeFile(path, "changed approval\n");
  // Rationale: installation is deliberately absent in this isolated fixture; the source boundary must still identify the untracked path.
  const report = await inspectDeliveryChange(f.path, "develop");
  assert.equal(report.passed, false);
  assert.equal(report.scope.blocked, true);
  assert(report.changedPaths.includes(".agents/skills/openspec-apply-change/SKILL.md"));
  assert(report.scope.protectedPaths.includes(".agents/skills/openspec-apply-change/SKILL.md"));
});
test("scratch never follows another checkout's artifact link", async t => {
  const root = await temporary(t), target = await temporary(t);
  await symlink(target, join(root, ".artifacts"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => selectDeliveryScratch(root, "payload.json"), /delivery-scratch-link/);
  assert.throws(() => selectDeliveryScratch(target, "../../outside.json"), /delivery-scratch-boundary/);
});
