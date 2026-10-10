import { describe, expect, it, vi } from "vitest";
import { runSessionContextCommand } from "../../src/cli/session-context.js";
import type { SessionContextOutcome } from "../../src/features/launch/index.js";

const launch = vi.hoisted(() => ({ outcome: null as SessionContextOutcome | null }));
vi.mock("../../src/features/launch/index.js", async importOriginal => ({
  ...await importOriginal<typeof import("../../src/features/launch/index.js")>(),
  updateSessionRepositoryContext: async () => launch.outcome,
}));

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

  it("names a claiming agent only when it is not the runtime's primary agent", async () => {
    launch.outcome = { kind: "worktrees", entries: [
      { cwd: "D:/primary", branch: "develop", status: "available", agentId: null },
      { cwd: "D:/delivery", branch: "fix/one", status: "current", agentId: "primary" },
      { cwd: "D:/delivery-two", branch: "fix/two", status: "busy", agentId: "agent-b" },
    ] };
    const stdout = vi.fn<(message: string) => void>();
    await expect(runSessionContextCommand({ action: "worktrees" }, {
      environment: { PI_SESSION_ID: "session", PI_SESSION_FILE: "D:/session.jsonl", A1_SESSION_RUNTIME_ID: "runtime" },
      inspectProcess: async () => null,
      stdout,
      stderr: vi.fn(),
    })).resolves.toBe(0);
    expect(stdout.mock.calls.map(([line]) => line)).toEqual([
      "available: D:/primary (develop)\n",
      "current: D:/delivery (fix/one)\n",
      "busy: D:/delivery-two (fix/two) [agent agent-b]\n",
    ]);
  });
});
