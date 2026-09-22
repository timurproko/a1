import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentSession, AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { PiEngineRuntime, type PiEngineRuntimePorts, type PiRepositoryContextReader } from "../../../../src/integrations/pi/engine/session-runtime.js";
import type { PiPullRequestIdentity, PiPullRequestProbe } from "../../../../src/integrations/pi/engine/repository-pr.js";
import type { PiWorkflowHost } from "../../../../src/integrations/pi/engine/workflows.js";

afterEach(() => { vi.useRealTimers(); });

class FakeSession {
  readonly listeners = new Set<(event: unknown) => void>();
  readonly messages: unknown[] = [];
  readonly sessionManager = { getSessionFile: () => this.file, getSessionId: () => this.id };
  readonly file: string | undefined;
  readonly id: string;
  constructor(file: string | undefined = undefined, id = "session-one") { this.file = file; this.id = id; }
  subscribe(listener: (event: unknown) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(event: unknown): void { for (const listener of this.listeners) listener(event); }
}

class FakeRuntime {
  readonly cwd = "D:/resolved";
  session = new FakeSession("D:/sessions/one.jsonl");
  rebind: ((session: FakeSession) => Promise<void>) | undefined;
  disposed = false;
  lastChangelog: string | undefined = "0.0.1";
  readonly diagnostics = [{ type: "warning", message: "runtime warning" }];
  readonly services = {
    diagnostics: [{ type: "error", message: "service error" }],
    settingsManager: {
      getLastChangelogVersion: () => this.lastChangelog,
      setLastChangelogVersion: (version: string) => { this.lastChangelog = version; },
      getCollapseChangelog: () => true,
      flush: async () => {},
    },
  };
  setRebindSession(rebind: (session: FakeSession) => Promise<void>): void { this.rebind = rebind; }
  async dispose(): Promise<void> { this.disposed = true; }
}

function harness(overrides: Partial<PiEngineRuntimePorts> = {}, options: {
  updates?: readonly string[];
  changelog?: string;
  branch?: string | null;
  pullRequestProbe?: PiPullRequestProbe;
  pullRequestRefreshMs?: number;
  repositoryContextPollMs?: number;
  repositoryContextReader?: PiRepositoryContextReader;
  gitBranchReader?: (cwd: string) => Promise<string | null>;
} = {}) {
  const runtime = new FakeRuntime();
  const calls: string[] = [];
  const state = { disposed: false, blocked: false };
  const host: PiWorkflowHost = { copyText: async () => {}, runCommand: async () => ({ stdout: "", stderr: "" }), readChangelog: async () => options.changelog ?? "" };
  const engine = new PiEngineRuntime({
    cwd: "D:/work", agentDir: "D:/agent", sessionId: "owned-1", sessionPath: undefined, sessionSelection: undefined,
    sessionForkPrompt: undefined, projectTrustPrompt: undefined, createRuntime: async () => runtime as unknown as AgentSessionRuntime,
    checkPackageUpdates: options.updates === undefined ? undefined : async () => options.updates!,
    ...(options.gitBranchReader !== undefined
      ? { gitBranchReader: options.gitBranchReader }
      : options.branch === undefined ? {} : { gitBranchReader: async () => options.branch! }),
    ...(options.pullRequestProbe === undefined ? {} : { pullRequestProbe: options.pullRequestProbe }),
    ...(options.pullRequestRefreshMs === undefined ? {} : { pullRequestRefreshMs: options.pullRequestRefreshMs }),
    ...(options.repositoryContextPollMs === undefined ? {} : { repositoryContextPollMs: options.repositoryContextPollMs }),
    ...(options.repositoryContextReader === undefined ? {} : { repositoryContextReader: options.repositoryContextReader }),
    host,
  }, {
    disposed: () => state.disposed,
    started: () => { calls.push("started"); },
    rebindBlocked: () => state.blocked,
    sessionReplacing: () => { calls.push("replacing"); },
    sessionReplaced: session => { calls.push(`replaced:${(session as unknown as FakeSession).file}`); },
    rebound: () => { calls.push("rebound"); },
    event: event => { calls.push(`event:${String((event as { type: string }).type)}`); },
    compactionProgress: () => {},
    diagnostic: (severity, code, message) => { calls.push(`${severity}:${code}:${message.split("\n")[0]}`); },
    emitView: () => { calls.push("view"); },
    ...overrides,
  });
  return { engine, runtime, calls, state };
}

describe("PiEngineRuntime", () => {
  it("creates the runtime, reports startup diagnostics, binds the first session under generation 1, and announces the changelog", async () => {
    const { engine, runtime, calls } = harness({}, { changelog: "## New" });
    expect(engine.started).toBe(false);
    expect(engine.cwd).toBe("D:/work");
    await engine.start();
    expect(engine.started).toBe(true);
    expect(engine.cwd).toBe("D:/resolved");
    expect(engine.session).toBe(runtime.session as unknown as AgentSession);
    expect([engine.generation, engine.bindingGeneration]).toEqual([1, 1]);
    expect(calls).toEqual(["started", "warning:engine-startup:runtime warning", "error:engine-startup:service error", "replacing", "replaced:D:/sessions/one.jsonl", "info:changelog-collapsed:## New"]);
    expect(runtime.lastChangelog).not.toBe("0.0.1");
    expect(engine.currentSessionFile()).toBe("D:/sessions/one.jsonl");
  });

  it("forwards events for the current generation only, and a runtime rebind replaces the session unless blocked", async () => {
    const { engine, runtime, calls, state } = harness();
    await engine.start();
    calls.length = 0;
    runtime.session.emit({ type: "agent_start" });
    const next = new FakeSession("D:/sessions/two.jsonl");
    state.blocked = true;
    await runtime.rebind!(next);
    expect(engine.generation).toBe(1);
    state.blocked = false;
    await runtime.rebind!(next);
    expect([engine.generation, engine.bindingGeneration]).toEqual([2, 2]);
    runtime.session.emit({ type: "stale" });
    next.emit({ type: "message_start" });
    expect(calls).toEqual(["event:agent_start", "replacing", "replaced:D:/sessions/two.jsonl", "rebound", "event:message_start"]);
    expect(runtime.session.listeners.size).toBe(0);
  });

  it("suspends and resumes the subscription across an overload without replacing the session", async () => {
    const { engine, runtime, calls } = harness();
    await engine.start();
    calls.length = 0;
    engine.suspend();
    expect([engine.generation, engine.bindingGeneration]).toEqual([2, 1]);
    runtime.session.emit({ type: "dropped" });
    engine.resume();
    runtime.session.emit({ type: "kept" });
    expect(calls).toEqual(["event:kept"]);
    await engine.dispose();
    expect(runtime.disposed).toBe(true);
    runtime.session.emit({ type: "after-dispose" });
    expect(calls).toEqual(["event:kept"]);
    expect(engine.session).toBeDefined();
  });

  it("refreshes pull request identity serially, avoids unchanged views, and cancels pending work on disposal", async () => {
    vi.useFakeTimers();
    const pending: Array<{ resolve: (value: PiPullRequestIdentity | null) => void; signal: AbortSignal }> = [];
    const probe = vi.fn<PiPullRequestProbe>((_cwd, _branch, signal) => new Promise(resolve => { pending.push({ resolve, signal }); }));
    const { engine, calls } = harness({}, {
      branch: "feature/show-pr-id-status-bar",
      repositoryContextReader: async () => null,
      pullRequestProbe: probe,
      pullRequestRefreshMs: 60_000,
    });
    await engine.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(probe).toHaveBeenLastCalledWith("D:/resolved", "feature/show-pr-id-status-bar", expect.any(AbortSignal));

    pending[0]!.resolve({ number: 540, url: "https://github.com/timurproko/a1/pull/540" });
    await Promise.resolve();
    expect(engine.pullRequest).toEqual({ number: 540, url: "https://github.com/timurproko/a1/pull/540" });
    expect(calls.at(-1)).toBe("view");
    calls.length = 0;

    await vi.advanceTimersByTimeAsync(60_000);
    expect(probe).toHaveBeenCalledTimes(2);
    pending[1]!.resolve({ number: 540, url: "https://github.com/timurproko/a1/pull/540" });
    await Promise.resolve();
    expect(calls).toEqual([]);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(probe).toHaveBeenCalledTimes(3);
    const late = pending[2]!;
    await engine.dispose();
    expect(late.signal.aborted).toBe(true);
    late.resolve({ number: 541, url: "https://github.com/timurproko/a1/pull/541" });
    await Promise.resolve();
    expect(engine.pullRequest?.number).toBe(540);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(probe).toHaveBeenCalledTimes(3);
  });

  it("follows one session's associated repository, detects clearing, and keeps another session generation isolated", async () => {
    vi.useFakeTimers();
    let associated: { cwd: string; branch: string } | null = { cwd: "D:/worktrees/one", branch: "fix/one" };
    const contextReader = vi.fn<PiRepositoryContextReader>(async sessionId => sessionId === "session-one"
      ? associated
      : { cwd: "D:/worktrees/two", branch: "fix/two" });
    const branchReader = vi.fn(async (cwd: string) => cwd.endsWith("one") ? "fix/one" : cwd.endsWith("two") ? "fix/two" : "develop");
    const probe = vi.fn<PiPullRequestProbe>(async (_cwd, branch) => {
      const number = branch === "fix/one" ? 551 : branch === "fix/two" ? 552 : branch === "fix/changed" ? 553 : 500;
      return { number, url: `https://github.com/timurproko/a1/pull/${number}` };
    });
    const { engine, runtime } = harness({}, {
      repositoryContextReader: contextReader,
      repositoryContextPollMs: 1_000,
      pullRequestRefreshMs: 60_000,
      gitBranchReader: branchReader,
      pullRequestProbe: probe,
    });
    await engine.start();
    await vi.waitFor(() => expect(engine.pullRequest?.number).toBe(551));
    expect(engine.repositoryCwd).toBe("D:/worktrees/one");
    expect(probe).toHaveBeenLastCalledWith("D:/worktrees/one", "fix/one", expect.any(AbortSignal));

    associated = { cwd: "D:/worktrees/one", branch: "fix/changed" };
    await vi.advanceTimersByTimeAsync(1_000);
    expect(engine.pullRequest?.number).toBe(553);
    expect(probe).toHaveBeenLastCalledWith("D:/worktrees/one", "fix/changed", expect.any(AbortSignal));

    associated = null;
    await vi.advanceTimersByTimeAsync(1_000);
    expect(engine.repositoryCwd).toBe("D:/resolved");
    expect(engine.gitBranch).toBe("develop");
    expect(engine.pullRequest?.number).toBe(500);

    const next = new FakeSession("D:/sessions/two.jsonl", "session-two");
    await runtime.rebind!(next);
    await vi.waitFor(() => expect(engine.pullRequest?.number).toBe(552));
    expect(engine.repositoryCwd).toBe("D:/worktrees/two");
    expect(contextReader).toHaveBeenLastCalledWith("session-two", "D:/sessions/two.jsonl", expect.any(AbortSignal));
    await engine.dispose();
  });

  it("announces package updates as an informational diagnostic and skips the probe once disposed", async () => {
    const { engine, calls, state } = harness({}, { updates: ["pi-mcp-adapter"] });
    await engine.start();
    calls.length = 0;
    await engine.announcePackageUpdates();
    expect(calls).toEqual(["info:package-updates:Package updates are available. Run a1 pi update --extensions", "view"]);
    state.disposed = true;
    calls.length = 0;
    await engine.announcePackageUpdates();
    expect(calls).toEqual([]);
  });
});
