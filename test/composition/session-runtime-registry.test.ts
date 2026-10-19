import { afterEach, describe, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({
  activate: vi.fn(async (..._args: unknown[]) => ({ repositoryPath: "/repo" })),
  register: vi.fn(async (..._args: unknown[]) => {}),
  release: vi.fn(async (..._args: unknown[]) => {}),
}));
vi.mock("../../src/foundation/lifecycle/session-repository-context.js", () => ({
  activateSessionRepositoryContext: context.activate,
  registerSessionRepositoryRuntime: context.register,
  releaseSessionRepositoryRuntime: context.release,
}));

const { SessionRuntimeRegistry } = await import("../../src/composition/session-runtime-registry.js");

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

const owner = { pid: 7, startIdentity: "boot-7" } as never;

describe("SessionRuntimeRegistry", () => {
  it("claims nothing outside a runtime that claims worktrees", async () => {
    const registry = new SessionRuntimeRegistry({ runtimeId: undefined, inspectProcess: async () => owner });
    expect(await registry.readerFor(undefined)("s1", "/s1.jsonl", new AbortController().signal)).toBeNull();
    await registry.dispose();
    expect(context.activate).not.toHaveBeenCalled();
    expect(context.release).not.toHaveBeenCalled();
  });

  it("activates each agent's claim once, refreshes all claims on the heartbeat, and releases them on dispose", async () => {
    vi.useFakeTimers();
    const inspect = vi.fn(async () => owner);
    const registry = new SessionRuntimeRegistry({ runtimeId: "runtime-1", inspectProcess: inspect, refreshMs: 1_000 });
    const signal = new AbortController().signal;
    expect(await registry.readerFor(undefined)("s1", "/s1.jsonl", signal)).toEqual({ repositoryPath: "/repo" });
    await registry.readerFor("agent-2")("s2", "/s2.jsonl", signal);
    expect(context.activate.mock.calls.map(call => call[3])).toEqual([
      expect.not.objectContaining({ agentId: expect.anything() }),
      expect.objectContaining({ agentId: "agent-2" }),
    ]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(context.register).toHaveBeenCalledTimes(2);
    await registry.dispose();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(context.register).toHaveBeenCalledTimes(2);
    expect(context.release).toHaveBeenCalledWith("runtime-1", owner);
    expect(inspect).toHaveBeenCalledOnce();
  });

  it("publishes no claims when the runtime's own identity cannot be read", async () => {
    const registry = new SessionRuntimeRegistry({ runtimeId: "runtime-1", inspectProcess: async () => { throw new Error("denied"); } });
    expect(await registry.readerFor(undefined)("s1", "/s1.jsonl", new AbortController().signal)).toBeNull();
    await registry.dispose();
    expect(context.activate).not.toHaveBeenCalled();
    expect(context.release).not.toHaveBeenCalled();
  });
});
