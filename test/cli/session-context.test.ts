import { describe, expect, it, vi } from "vitest";
import { runSessionContextCommand } from "../../src/cli/session-context.js";

describe("session context command", () => {
  it("fails explicitly without shell-tool session identity", async () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();
    await expect(runSessionContextCommand(
      { action: "link-worktree", path: "D:/delivery" },
      { environment: {}, stdout, stderr },
    )).resolves.toBe(2);
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledWith(expect.stringMatching(/active A1 shell-tool session/));
  });
});
