import { describe, expect, it } from "vitest";
import { decideWorktree } from "../../scripts/clean-worktrees.mjs";

/**
 * Which worktrees the cleanup will remove. The rule is kept apart from the doing
 * so it can be read here without a repository to run against.
 */
function state(overrides: Partial<Parameters<typeof decideWorktree>[0]> = {}): Parameters<typeof decideWorktree>[0] {
  return { path: "/w/task", dirty: false, isPrimary: false, pulls: [], ancestorOfBase: false, ...overrides };
}

describe("deciding what to remove", () => {
  it("removes a worktree whose pull request merged", () => {
    const decision = decideWorktree(state({ pulls: [{ number: 30, state: "MERGED" }] }));
    expect(decision.action).toBe("remove");
    expect(decision.reason).toContain("#30");
  });

  it("removes one whose commit is already on the base branch", () => {
    expect(decideWorktree(state({ ancestorOfBase: true })).action).toBe("remove");
  });

  it("keeps one whose pull request is still open, even when another has merged", () => {
    const decision = decideWorktree(state({ pulls: [{ number: 41, state: "MERGED" }, { number: 42, state: "OPEN" }] }));
    expect(decision.action).toBe("keep");
    expect(decision.reason).toContain("#42");
  });

  it("keeps one with uncommitted changes, whatever its pull request says", () => {
    const decision = decideWorktree(state({ dirty: true, pulls: [{ number: 30, state: "MERGED" }] }));
    expect(decision.action).toBe("keep");
    expect(decision.reason).toContain("uncommitted");
  });

  it("keeps the primary checkout", () => {
    expect(decideWorktree(state({ isPrimary: true, ancestorOfBase: true })).action).toBe("keep");
  });

  it("keeps one nothing has landed, rather than guessing", () => {
    const decision = decideWorktree(state({ pulls: [{ number: 44, state: "CLOSED" }] }));
    expect(decision.action).toBe("keep");
    expect(decision.reason).toContain("no merged pull request");
  });
});
