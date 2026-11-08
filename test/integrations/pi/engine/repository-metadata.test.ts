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
