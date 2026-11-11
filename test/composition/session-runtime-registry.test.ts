import { afterEach, describe, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({
  activate: vi.fn(async (..._args: unknown[]) => ({ cwd: "/repo", branch: "develop" })),
  observe: vi.fn(async (..._args: unknown[]) => ({ cwd: "/repo", branch: "develop", revision: "revision-one" } as { cwd: string; branch: string; revision: string } | null)),
  register: vi.fn(async (..._args: unknown[]) => {}),
  release: vi.fn(async (..._args: unknown[]) => {}),
}));
vi.mock("../../src/foundation/lifecycle/session-repository-context.js", () => ({
  activateSessionRepositoryContext: context.activate,
  readActiveSessionRepositoryContext: context.observe,
  readSessionStartupRoot: async () => "/startup",
  registerSessionRepositoryRuntime: context.register,
  releaseSessionRepositoryRuntime: context.release,
}));

const { SessionRuntimeRegistry } = await import("../../src/composition/session-runtime-registry.js");

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

const owner = { pid: process.pid, startIdentity: "boot-7" };

describe("SessionRuntimeRegistry", () => {
  it("claims nothing outside a runtime that claims worktrees", async () => {
    const registry = new SessionRuntimeRegistry({ runtimeId: undefined, inspectProcess: async () => owner });
    expect(await registry.readerFor(undefined)("s1", "/s1.jsonl", new AbortController().signal)).toBeNull();
    await registry.dispose();
    expect(context.activate).not.toHaveBeenCalled();
    expect(context.release).not.toHaveBeenCalled();
  });

  it("activates once per binding, polls without writes, and releases claims on dispose", async () => {
    vi.useFakeTimers();
    const inspect = vi.fn(async () => owner);
    const registry = new SessionRuntimeRegistry({ runtimeId: "runtime-1", inspectProcess: inspect, refreshMs: 1_000 });
    const signal = new AbortController().signal;
    expect(await registry.readerFor(undefined)("s1", "/s1.jsonl", signal)).toEqual({ cwd: "/repo", branch: "develop", revision: "revision-one" });
    await registry.readerFor("agent-2")("s2", "/s2.jsonl", signal);
    expect(context.activate.mock.calls.map(call => call[3])).toEqual([
      expect.not.objectContaining({ agentId: expect.anything() }),
      expect.objectContaining({ agentId: "agent-2" }),
    ]);
    await registry.readerFor(undefined)("s1", "/s1.jsonl", signal);
    await registry.readerFor("agent-2")("s2", "/s2.jsonl", signal);
    expect(context.activate).toHaveBeenCalledTimes(2);
    expect(context.observe).toHaveBeenCalledTimes(4);
    context.observe.mockResolvedValueOnce({ cwd: "/new-worktree", branch: "fix/task", revision: "revision-two" });
    expect(await registry.readerFor(undefined)("s1", "/s1.jsonl", signal)).toMatchObject({ cwd: "/new-worktree" });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(context.register).not.toHaveBeenCalled();
    await registry.dispose();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(context.register).not.toHaveBeenCalled();
    expect(context.release).toHaveBeenCalledWith("runtime-1", owner);
    expect(inspect).toHaveBeenCalledOnce();
  });

  it("retries registration after the first activation fails", async () => {
    vi.useFakeTimers();
    context.activate.mockRejectedValueOnce(Object.assign(new Error("busy"), { code: "worktree-claim-busy" }));
    const registry = new SessionRuntimeRegistry({ runtimeId: "runtime-1", inspectProcess: async () => owner, refreshMs: 1_000 });
    await expect(registry.readerFor(undefined)("s1", "/s1.jsonl", new AbortController().signal)).rejects.toThrow("busy");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(context.register).toHaveBeenCalledWith({ sessionId: "s1", sessionFile: "/s1.jsonl" }, "runtime-1", owner, expect.any(Object));
    await registry.dispose();
  });

  it("retries transient self-inspection failure instead of caching null", async () => {
    vi.useFakeTimers();
    const inspect = vi.fn(async () => owner).mockRejectedValueOnce(new Error("temporary"));
    const registry = new SessionRuntimeRegistry({ runtimeId: "runtime-1", inspectProcess: inspect, refreshMs: 1_000 });
    expect(await registry.readerFor(undefined)("s1", "/s1.jsonl", new AbortController().signal)).toBeNull();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(inspect).toHaveBeenCalledTimes(2);
    expect(context.register).toHaveBeenCalledTimes(2);
    await registry.dispose();
  });

  it("arms retries when the first inspection observes no identity and republishes only the current session", async () => {
    vi.useFakeTimers();
    const inspect = vi.fn(async () => owner).mockResolvedValueOnce(null as never);
    const registry = new SessionRuntimeRegistry({ runtimeId: "runtime-1", inspectProcess: inspect, refreshMs: 1_000 });
    expect(await registry.readerFor(undefined)("s1", "/s1.jsonl", new AbortController().signal)).toBeNull();
    expect(context.activate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(context.register.mock.calls.map(call => call[0])).toEqual([{ sessionId: "s1", sessionFile: "/s1.jsonl" }]);
    await registry.readerFor(undefined)("s2", "/s2.jsonl", new AbortController().signal);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(context.register.mock.calls.slice(1)).toEqual([]);
    await registry.dispose();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(context.register).toHaveBeenCalledTimes(1);
    expect(context.release).toHaveBeenCalledWith("runtime-1", owner);
  });

  it("coalesces slow retries and drains them before disposal releases claims", async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    context.register.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const registry = new SessionRuntimeRegistry({ runtimeId: "runtime-1", inspectProcess: async () => owner, refreshMs: 1_000 });
    context.activate.mockRejectedValueOnce(new Error("temporary activation failure"));
    await expect(registry.readerFor(undefined)("s1", "/s1.jsonl", new AbortController().signal)).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(context.register).toHaveBeenCalledOnce();
    const disposing = registry.dispose();
    expect(context.release).not.toHaveBeenCalled();
    finish();
    await disposing;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(context.register).toHaveBeenCalledOnce();
    expect(context.release).toHaveBeenCalledOnce();
    expect(await registry.readerFor(undefined)("late", "/late", new AbortController().signal)).toBeNull();
    expect(context.activate).toHaveBeenCalledOnce();
  });

  it("does not activate an obsolete session after delayed self-inspection", async () => {
    vi.useFakeTimers();
    let inspected!: (value: typeof owner) => void;
    const registry = new SessionRuntimeRegistry({ runtimeId: "runtime-1", inspectProcess: () => new Promise(resolve => { inspected = resolve; }), refreshMs: 1_000 });
    const first = registry.readerFor(undefined)("s1", "/s1.jsonl", new AbortController().signal);
    await vi.advanceTimersByTimeAsync(0);
    const second = registry.readerFor(undefined)("s2", "/s2.jsonl", new AbortController().signal);
    inspected(owner);
    expect(await first).toBeNull();
    await second;
    expect(context.activate).toHaveBeenCalledOnce();
    expect(context.activate.mock.calls[0]?.[0]).toEqual({ sessionId: "s2", sessionFile: "/s2.jsonl" });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(context.register).not.toHaveBeenCalled();
    await registry.dispose();
  });

  it("keeps retrying failures and preserves independent agents", async () => {
    vi.useFakeTimers();
    context.register.mockRejectedValue(new Error("busy"));
    context.activate.mockRejectedValue(new Error("initial busy"));
    const registry = new SessionRuntimeRegistry({ runtimeId: "runtime-1", inspectProcess: async () => owner, refreshMs: 1_000 });
    await expect(registry.readerFor(undefined)("s1", "/s1.jsonl", new AbortController().signal)).rejects.toThrow();
    await expect(registry.readerFor("agent-2")("s2", "/s2.jsonl", new AbortController().signal)).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(context.register).toHaveBeenCalledTimes(6);
    expect(context.register.mock.calls.map(call => (call[0] as { sessionId: string }).sessionId)).toEqual(["s1", "s2", "s1", "s2", "s1", "s2"]);
    await registry.dispose();
  });

  it("recovers tool lookup internally and uses startup only after verified detach", async () => {
    const inspect = vi.fn(async () => owner).mockResolvedValueOnce(null as never);
    const registry = new SessionRuntimeRegistry({ runtimeId: "runtime-1", inspectProcess: inspect });
    const read = registry.toolReaderFor(undefined), signal = new AbortController().signal;
    expect(await read("s1", "/s1.jsonl", signal)).toBe("/repo");
    expect(inspect).toHaveBeenCalledTimes(2);
    context.observe.mockResolvedValueOnce(null);
    expect(await read("s1", "/s1.jsonl", signal)).toBe("/startup");
    context.observe.mockRejectedValueOnce(Object.assign(new Error("corrupt attachment"), { code: "worktree-owner-unverifiable" }));
    await expect(read("s1", "/s1.jsonl", signal)).rejects.toThrow("corrupt attachment");
    expect(context.activate).toHaveBeenCalledOnce();
    await registry.dispose();
    await expect(read("s1", "/s1.jsonl", signal)).rejects.toThrow("not active");
  });

  it("reactivates a missing registration or absent claim instead of remaining permanently poisoned", async () => {
    const registry = new SessionRuntimeRegistry({ runtimeId: "runtime-1", inspectProcess: async () => owner });
    const read = registry.toolReaderFor(undefined), signal = new AbortController().signal;
    expect(await read("s1", "/s1.jsonl", signal)).toBe("/repo");
    for (const code of ["session-runtime-unavailable", "worktree-context-changed"]) {
      context.observe.mockRejectedValueOnce(Object.assign(new Error("recoverable"), { code }));
      expect(await read("s1", "/s1.jsonl", signal)).toBe("/repo");
    }
    expect(context.activate).toHaveBeenCalledTimes(3);
    await registry.dispose();
  });

  it("publishes no claims when the runtime's own identity cannot be read", async () => {
    const registry = new SessionRuntimeRegistry({ runtimeId: "runtime-1", inspectProcess: async () => { throw new Error("denied"); } });
    expect(await registry.readerFor(undefined)("s1", "/s1.jsonl", new AbortController().signal)).toBeNull();
    await registry.dispose();
    expect(context.activate).not.toHaveBeenCalled();
    expect(context.release).not.toHaveBeenCalled();
  });
});
