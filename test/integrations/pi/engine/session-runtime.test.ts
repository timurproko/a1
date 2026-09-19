import { describe, expect, it } from "vitest";
import type { AgentSession, AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { PiEngineRuntime, type PiEngineRuntimePorts } from "../../../../src/integrations/pi/engine/session-runtime.js";
import type { PiWorkflowHost } from "../../../../src/integrations/pi/engine/workflows.js";

class FakeSession {
  readonly listeners = new Set<(event: unknown) => void>();
  readonly messages: unknown[] = [];
  readonly sessionManager = { getSessionFile: () => this.file };
  readonly file: string | undefined;
  constructor(file: string | undefined = undefined) { this.file = file; }
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

function harness(overrides: Partial<PiEngineRuntimePorts> = {}, options: { updates?: readonly string[]; changelog?: string } = {}) {
  const runtime = new FakeRuntime();
  const calls: string[] = [];
  const state = { disposed: false, blocked: false };
  const host: PiWorkflowHost = { copyText: async () => {}, runCommand: async () => ({ stdout: "", stderr: "" }), readChangelog: async () => options.changelog ?? "" };
  const engine = new PiEngineRuntime({
    cwd: "D:/work", agentDir: "D:/agent", sessionId: "owned-1", sessionPath: undefined, sessionSelection: undefined,
    sessionForkPrompt: undefined, projectTrustPrompt: undefined, createRuntime: async () => runtime as unknown as AgentSessionRuntime,
    checkPackageUpdates: options.updates === undefined ? undefined : async () => options.updates!, host,
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
