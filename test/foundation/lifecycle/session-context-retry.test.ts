import { afterEach, describe, expect, it, vi } from "vitest";
import { retrySessionCoordination } from "../../../src/foundation/lifecycle/session-context-retry.js";

afterEach(() => { vi.useRealTimers(); });
const failure = (code: string) => Object.assign(new Error(code), { code });

describe("internal coordination retry", () => {
  it("recovers temporary registration/coordination without an agent retry loop", async () => {
    const operation = vi.fn().mockRejectedValueOnce(failure("session-runtime-unavailable"))
      .mockRejectedValueOnce(failure("worktree-claim-busy")).mockResolvedValue("attached");
    expect(await retrySessionCoordination(operation, 1_000)).toBe("attached");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("does not retry ownership conflicts or invalid identities", async () => {
    const operation = vi.fn().mockRejectedValue(failure("worktree-active-in-another-session"));
    await expect(retrySessionCoordination(operation)).rejects.toMatchObject({ code: "worktree-active-in-another-session" });
    expect(operation).toHaveBeenCalledOnce();
  });

  it("bounds repeated contention and honors cancellation", async () => {
    const operation = vi.fn().mockRejectedValue(failure("worktree-claim-busy"));
    await expect(retrySessionCoordination(operation, 0)).rejects.toMatchObject({ code: "worktree-claim-busy" });
    expect(operation).toHaveBeenCalledOnce();
    const abort = new AbortController(); abort.abort();
    await expect(retrySessionCoordination(operation, 1_000, abort.signal)).rejects.toThrow();
    expect(operation).toHaveBeenCalledOnce();
  });
});
