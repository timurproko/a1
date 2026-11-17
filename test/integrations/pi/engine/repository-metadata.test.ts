import { describe, expect, it, onTestFinished, vi } from "vitest";
import { RepositoryMetadataPoller } from "../../../../src/integrations/pi/engine/repository-metadata.js";

function poller(branchReader: (cwd: string) => Promise<string | null>) {
  let generation = 1;
  let cwd = "D:/one";
  const changed = vi.fn();
  const instance = new RepositoryMetadataPoller({
    gitBranchReader: branchReader,
    pullRequestProbe: async (_cwd, branch) => ({ number: branch.length, url: `https://example.test/${branch}` }),
    repositoryContextPollMs: 60_000,
  }, {
    bindingGeneration: () => generation,
    sessionIdentity: () => ({ sessionId: undefined, sessionFile: undefined }),
    fallbackCwd: () => cwd,
    disposed: () => false,
    changed,
  });
  return {
    instance,
    changed,
    rebind(nextCwd: string) {
      generation += 1;
      cwd = nextCwd;
      instance.reset();
    },
  };
}

describe("RepositoryMetadataPoller", () => {
  it("replaces the scheduled poll on explicit refresh instead of accumulating background Git probes", async () => {
    vi.useFakeTimers();
    const reader = vi.fn(async () => "main"), { instance } = poller(reader);
    try {
      instance.start(); await vi.advanceTimersByTimeAsync(0);
      for (let index = 0; index < 4; index++) { instance.refresh(); await vi.advanceTimersByTimeAsync(0); }
      expect(reader).toHaveBeenCalledTimes(5);
      expect(vi.getTimerCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(reader).toHaveBeenCalledTimes(6);
      expect(vi.getTimerCount()).toBe(1);
    } finally { await instance.dispose(); vi.useRealTimers(); }
  });
  it("publishes same-path association revisions and retains verified context on observation failure", async () => {
    let revision = "first";
    let unavailable = false;
    const changed = vi.fn();
    const instance = new RepositoryMetadataPoller({
      repositoryContextReader: async () => { if (unavailable) throw new Error("busy"); return { cwd: "D:/task", branch: "feature/task", revision }; },
      pullRequestProbe: async () => null, repositoryContextPollMs: 60_000,
    }, { bindingGeneration: () => 1, sessionIdentity: () => ({ sessionId: "session", sessionFile: "/session.jsonl" }),
      fallbackCwd: () => "D:/primary", disposed: () => false, changed });
    onTestFinished(() => instance.dispose());
    instance.start(); await vi.waitFor(() => expect(instance.revision).toBe("first"));
    revision = "reentered"; instance.refresh();
    await vi.waitFor(() => expect(instance.revision).toBe("reentered"));
    expect(changed).toHaveBeenCalledTimes(2);
    unavailable = true; instance.refresh(); await new Promise(resolve => setImmediate(resolve));
    expect(instance.cwd).toBe("D:/task"); expect(instance.revision).toBe("reentered");
    expect(changed).toHaveBeenCalledTimes(2);
  });
  it("drops a probe that was still running when a new session was bound", async () => {
    const first = Promise.withResolvers<string | null>();
    const reader = vi.fn<(cwd: string) => Promise<string | null>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue("feature/two");
    const { instance, changed, rebind } = poller(reader);
    onTestFinished(() => instance.dispose());

    instance.start();
    rebind("D:/two");
    instance.refresh();
    first.resolve("feature/one");

    await vi.waitFor(() => expect(instance.branch).toBe("feature/two"));
    expect(instance.cwd).toBe("D:/two");
    expect(instance.pullRequest).toEqual({ number: 11, url: "https://example.test/feature/two" });
    expect(reader).toHaveBeenLastCalledWith("D:/two", expect.any(AbortSignal));
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("does not probe before start or after disposal", async () => {
    const reader = vi.fn(async () => "main");
    const { instance } = poller(reader);

    instance.refresh();
    await instance.dispose();
    instance.refresh();

    expect(reader).not.toHaveBeenCalled();
    expect(instance.branch).toBeNull();
  });
});
