import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const shared = "In an active A1 session, use `a1 worktree enter <branch>` or `a1 worktree attach <absolute-path>`. Work in the returned directory; successful completion is the attachment confirmation. Use `a1 worktree detach` when handing off or finishing; it preserves files and branches. A1 owns coordination, retries, and recovery; `a1 worktree list` is informational. Outside A1, use ordinary Git worktrees.";

describe("shared worktree agent guidance", () => {
  it("keeps one root usage block without a repository inventory approval procedure", async () => {
    const read = (file: string) => readFile(resolve(file), "utf8");
    const [agents, feature, structure, skill] = await Promise.all([
      "AGENTS.md", "docs/features/worktrees.md", "docs/architecture/project-structure.md", ".agents/skills/change-delivery/SKILL.md",
    ].map(read));
    expect(agents).toContain(shared);
    expect(feature).toContain(shared);
    expect(structure).not.toContain("run `a1 session worktrees` and");
    expect(structure).not.toContain("different returned path blocks edits");
    expect(skill).toContain("shared Worktrees guidance in `AGENTS.md`");
    expect(feature).toContain("before integrating a repository's instruction migration");
    expect(feature).toContain("No command removes worktrees");
  });
});
