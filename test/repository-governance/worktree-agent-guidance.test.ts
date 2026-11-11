import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const shared = "In an active A1 session, use `a1 worktree enter <branch>` or `a1 worktree attach <absolute-path>`. Work in the returned directory; success is the attachment confirmation. Keep the task attached after implementation completion and review handoff so follow-up fixes retain its checkout and PR. After a verified merge, run `a1 worktree complete`: it returns the session to primary before repository cleanup runs, so never clean the attached checkout directly. Use `a1 worktree detach` only when explicitly requested or switching tasks; it preserves files and branches. Runtime shutdown releases claims automatically. A1 owns coordination, retries, and recovery; `a1 worktree list` is informational. Outside A1, use ordinary Git worktrees.";

describe("shared worktree agent guidance", () => {
  it("keeps task attachment through implementation and review without an inventory approval procedure", async () => {
    const read = (file: string) => readFile(resolve(file), "utf8");
    const [agents, feature, structure, skill, cleanup, delivery] = await Promise.all([
      "AGENTS.md", "docs/features/worktrees.md", "docs/architecture/project-structure.md", ".agents/skills/change-delivery/SKILL.md",
      "docs/local-worktree-cleanup.md", "docs/openspec-archive-automation.md",
    ].map(read));
    expect(agents).toContain(shared);
    expect(feature).toContain(shared);
    for (const instructions of [agents, feature, structure, skill]) {
      expect(instructions).not.toMatch(/detach` when handing off or finishing/);
    }
    expect(feature).toContain("Repository cleanup handoff is independent and does not require runtime detach.");
    expect(structure).not.toContain("run `a1 session worktrees` and");
    expect(structure).not.toContain("different returned path blocks edits");
    expect(skill).toContain("shared Worktrees guidance in `AGENTS.md`");
    expect(feature).toContain("before integrating a repository's instruction migration");
    expect(feature).toContain("No command removes worktrees");
    expect(feature).toContain("a1.worktreeCleanup");
    for (const instructions of [cleanup, delivery]) expect(instructions).toContain("a1 worktree complete");
    expect(cleanup).toContain("attached-session");
  });
});
