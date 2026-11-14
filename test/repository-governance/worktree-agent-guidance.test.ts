import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { DELIVERY_ROUTE } from "../../scripts/governance/delivery-contract.mjs";

describe("shared worktree agent guidance", () => {
  it("keeps task attachment through implementation and review without an inventory approval procedure", async () => {
    const read = (file: string) => readFile(resolve(file), "utf8");
    const [agents, feature, structure, skill, cleanup, delivery] = await Promise.all([
      "AGENTS.md", "docs/features/worktrees.md", "docs/architecture/project-structure.md", ".agents/skills/change-delivery/SKILL.md",
      "docs/local-worktree-cleanup.md", "docs/openspec-archive-automation.md",
    ].map(read));
    expect(agents).toContain(DELIVERY_ROUTE);
    expect(feature).toContain("../delivery-rules.md");
    for (const instructions of [agents, feature, structure, skill]) {
      expect(instructions).not.toMatch(/detach` when handing off or finishing/);
    }
    expect(feature).toContain("Repository cleanup handoff is independent and does not require runtime detach.");
    expect(structure).not.toContain("run `a1 session worktrees` and");
    expect(structure).not.toContain("different returned path blocks edits");
    expect(skill).toContain("../../../docs/delivery-rules.md");
    expect(feature).toContain("before integrating a repository's instruction migration");
    expect(feature).toContain("No command removes worktrees");
    expect(feature).toContain(".a1/worktree.json");
    expect(feature).not.toContain("git config --local a1.worktreeCleanup");
    const declared = JSON.parse(await read(".a1/worktree.json")) as { cleanup: string[] };
    expect(declared.cleanup.slice(0, 3)).toEqual(["node", "scripts/governance/local-worktree-cleanup.mjs", "complete"]);
    for (const instructions of [cleanup, delivery]) expect(instructions).toContain("a1 worktree complete");
    expect(cleanup).toContain("attached-session");
  });
});
