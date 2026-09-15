import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseImplementation } from "../../scripts/governance/openspec-archive-policy.mjs";

describe("repository-owned single-PR delivery guidance", () => {
  it("keeps planning approval, implementation, acceptance, and integration distinct", async () => {
    const config = await readFile("openspec/config.yaml", "utf8");
    expect(config).toContain("one draft PR");
    expect(config).toContain("user approves the plan and explicitly requests implementation");
    expect(config).toContain("same worktree, branch, history, and draft PR");
    expect(config).toContain("Never enable auto-merge for a code/operational pull request");
    expect(config).toContain("New candidate commits require current-head CI and renewed implementation review");
    expect(config).toContain("Only verified authorized human manual merge of the exact complete checked record supplies PR-backed acceptance");
    expect(config).toContain("#<source PR>(accept): <original implementation subject>");
    expect(config).toContain("Candidate CI validates integrity without claiming unchecked review items passed");
    expect(config).not.toContain("After the initial specification merges");
    expect(config).not.toContain("Split mixed planning/implementation branches");
  });

  it("ships a discoverable first-party skill with resolvable local guidance links", async () => {
    const path = resolve(".agents/skills/change-delivery/SKILL.md");
    const skill = await readFile(path, "utf8");
    expect(skill).toMatch(/^---\nname: change-delivery\ndescription: .+\n---/);
    expect(skill).toContain("same worktree, branch, history, and PR");
    expect(skill).toContain("After the maintainer approves the plan and explicitly requests implementation");
    expect(skill).toContain("Rejected new draft");
    expect(skill).toContain("Already-merged legacy plan");
    for (const match of skill.matchAll(/\]\((\.\.\/[^)]+)\)/g)) await access(resolve(dirname(path), match[1]!));
  });

  it("provides valid version-2 and legacy version-1 link examples, without inventing acceptance", async () => {
    const docs = await readFile("docs/openspec-archive-automation.md", "utf8");
    const examples = [...docs.matchAll(/```openspec-implementation\n([\s\S]*?)\n```/g)].map(match =>
      parseImplementation(`\`\`\`openspec-implementation\n${match[1]}\n\`\`\``));
    expect(examples.map(value => value?.version)).toEqual([2, 1]);
    expect(examples[0]).not.toHaveProperty("specificationPr");
    expect(examples[1]?.specificationPr).toBe(123);
    expect(docs).toContain("openspec/acceptance/<change>/<source-head>.json");
    expect(docs).toContain("#<source-pr>(accept): <original implementation subject>");
    expect(docs).toContain("Its body is an unchecked list linking the original PR");
    expect(docs).toContain("Manually merge this PR to record acceptance");
    expect(docs).not.toContain("REPLACE_WITH_FINAL_REVIEWED_40_CHARACTER_SHA");
    expect(docs).toContain("Closing alone does not authorize deleting an unmerged branch or dirty worktree");
    expect(docs).toContain("Legacy merged plan rejected");
    expect(docs).toContain("Unit tests are not that evidence");
  });

  it("removes the obsolete split requirement from maintained handoff and purpose text", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    expect(runbook).not.toContain("starts only after that specification merges");
    expect(runbook).toContain("same worktree, branch, history, and PR");
    const spec = await readFile("openspec/specs/change-delivery-workflow/spec.md", "utf8");
    const purpose = spec.split("## Purpose")[1]?.split("## Requirements")[0];
    expect(purpose).toContain("same-PR implementation delivery");
    expect(purpose).not.toContain("separate implementation delivery");
  });
});
