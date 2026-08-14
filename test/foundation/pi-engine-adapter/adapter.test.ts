import { describe, expect, it } from "vitest";
import type { OwnedUiCommand, OwnedUiEvent } from "../../../src/foundation/owned-ui-contracts/index.js";
import {
  createPiEngineAdapter,
  type PiEngineAdapter,
  type PiRuntimeLike,
  type PiSessionLike,
} from "../../../src/foundation/pi-engine-adapter/index.js";

class FakeSession implements PiSessionLike {
  readonly listeners = new Set<(event: unknown) => void>();
  readonly sessionId: string;
  model: unknown = { provider: "openai", id: "gpt-5", name: "GPT-5" };
  thinkingLevel: unknown = "medium";
  isStreaming = false;
  readonly isIdle = true;
  isRetrying = false;
  isCompacting = false;
  readonly messages: readonly unknown[] = [];
  readonly calls: string[] = [];
  disposed = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  subscribe(listener: (event: unknown) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: unknown): void {
    for (const listener of this.listeners) listener(event);
  }

  async prompt(text: string): Promise<void> {
    this.calls.push(`prompt:${text}`);
    this.isStreaming = true;
    this.emit({ type: "agent_start" });
    this.isStreaming = false;
    this.emit({ type: "agent_end", willRetry: false });
  }

  async steer(text: string): Promise<void> {
    this.calls.push(`steer:${text}`);
  }

  async followUp(text: string): Promise<void> {
    this.calls.push(`followUp:${text}`);
  }

  async abort(): Promise<void> {
    this.calls.push("abort");
    this.isStreaming = false;
  }

  abortRetry(): void {
    this.calls.push("abortRetry");
  }

  abortCompaction(): void {
    this.calls.push("abortCompaction");
  }

  async compact(): Promise<void> {
    this.calls.push("compact");
  }

  async setModel(model: unknown): Promise<void> {
    this.model = model;
    this.calls.push("setModel");
  }

  setThinkingLevel(level: unknown): void {
    this.thinkingLevel = level;
    this.calls.push(`thinking:${String(level)}`);
    this.emit({ type: "thinking_level_changed", level });
  }

  dispose(): void {
    this.disposed = true;
  }
}

class FakeRuntime implements PiRuntimeLike {
  session: FakeSession;
  readonly services = {
    modelRuntime: {
      getModel(providerId: string, modelId: string): unknown {
        return providerId === "openai" && modelId === "gpt-5.1"
          ? { provider: providerId, id: modelId, name: "GPT-5.1" }
          : undefined;
      },
    },
    diagnostics: [{ type: "warning", message: "service warning" }],
  };
  readonly diagnostics = [{ type: "info", message: "runtime ready" }];
  rebind: ((session: PiSessionLike) => Promise<void>) | undefined;
  readonly calls: string[] = [];
  disposed = false;

  constructor(session: FakeSession) {
    this.session = session;
  }

  setRebindSession(callback: (session: PiSessionLike) => Promise<void>): void {
    this.rebind = callback;
  }

  async newSession(): Promise<void> {
    this.calls.push("newSession");
    this.session = new FakeSession("pi-session-new");
    await this.rebind?.(this.session);
  }

  async switchSession(sessionPath: string): Promise<void> {
    this.calls.push(`switch:${sessionPath}`);
    this.session = new FakeSession(`pi-session-${sessionPath}`);
    await this.rebind?.(this.session);
  }

  async dispose(): Promise<void> {
    this.calls.push("dispose");
    this.disposed = true;
    this.session.dispose();
  }
}

async function adapterWithRuntime(runtime: FakeRuntime): Promise<{
  adapter: PiEngineAdapter;
  events: OwnedUiEvent[];
}> {
  const events: OwnedUiEvent[] = [];
  const adapter = await createPiEngineAdapter({
    cwd: "D:/work",
    agentDir: "D:/agent",
    sessionId: "owned-1",
    createRuntime: async () => runtime,
  });
  adapter.onEvent(event => events.push(event));
  return { adapter, events };
}

function command(type: OwnedUiCommand["type"], correlationId: string, extra: Partial<OwnedUiCommand> = {}): OwnedUiCommand {
  return { type, correlationId, sessionId: "owned-1", ...extra } as OwnedUiCommand;
}

describe("Pi engine adapter", () => {
  it("constructs a runtime, owns session rebinding, exposes startup diagnostics, and shuts down", async () => {
    const runtime = new FakeRuntime(new FakeSession("pi-session-1"));
    const { adapter, events } = await adapterWithRuntime(runtime);
    expect(adapter.view()).toMatchObject({
      sessionId: "owned-1",
      lifecycle: "ready",
      activeModel: { providerId: "openai", modelId: "gpt-5" },
      thinkingLevel: "medium",
    });
    expect(adapter.view().diagnostics.map(diagnostic => diagnostic.message)).toEqual([
      "runtime ready",
      "service warning",
    ]);
    expect(events.some(event => event.type === "session-view" && event.view.lifecycle === "ready")).toBe(true);

    await adapter.execute(command("shutdown", "shutdown-1"));
    expect(runtime.calls).toContain("dispose");
    expect(adapter.disposed).toBe(true);
    expect(adapter.view().lifecycle).toBe("stopped");
  });

  it("executes prompt, steering, abort, retry, compaction, model, and thinking commands", async () => {
    const runtime = new FakeRuntime(new FakeSession("pi-session-1"));
    const { adapter } = await adapterWithRuntime(runtime);
    const session = runtime.session as FakeSession;

    await adapter.execute(command("prompt", "prompt-1", { text: "Inspect" }));
    await adapter.execute(command("steer", "steer-1", { text: "Adjust" }));
    await adapter.execute(command("follow-up", "follow-1", { text: "Continue" }));
    session.isRetrying = true;
    session.isCompacting = true;
    await adapter.execute(command("abort", "abort-1"));
    await adapter.execute(command("retry", "retry-1"));
    await adapter.execute(command("compact", "compact-1"));
    await adapter.execute(command("set-model", "model-1", {
      model: { providerId: "openai", modelId: "gpt-5.1", displayName: "GPT-5.1" },
    }));
    await adapter.execute(command("set-thinking-level", "thinking-1", { thinkingLevel: "high" }));

    expect(session.calls).toEqual([
      "prompt:Inspect",
      "steer:Adjust",
      "followUp:Continue",
      "abortRetry",
      "abortCompaction",
      "abort",
      "prompt:Continue",
      "compact",
      "setModel",
      "thinking:high",
    ]);
    expect(adapter.view().activeModel).toMatchObject({ providerId: "openai", modelId: "gpt-5.1" });
    expect(adapter.view().thinkingLevel).toBe("high");
  });

  it("maps lifecycle and queued-input engine events into owned UI events", async () => {
    const runtime = new FakeRuntime(new FakeSession("pi-session-1"));
    const { adapter, events } = await adapterWithRuntime(runtime);
    const session = runtime.session as FakeSession;

    session.emit({ type: "agent_start" });
    session.emit({ type: "queue_update", steering: ["steer"], followUp: ["later"] });
    session.emit({ type: "agent_settled" });

    expect(events.some(event => event.type === "session-lifecycle" && event.lifecycle === "busy")).toBe(true);
    expect(events.some(event => event.type === "session-lifecycle" && event.lifecycle === "ready")).toBe(true);
    expect(adapter.view().editor.queuedSubmissions).toEqual(["steer", "later"]);
    expect(adapter.view().status.workingMessage).toBeNull();
  });

  it("rebinds subscriptions when new and resumed sessions replace the runtime session", async () => {
    const runtime = new FakeRuntime(new FakeSession("pi-session-old"));
    const { adapter, events } = await adapterWithRuntime(runtime);
    const oldSession = runtime.session as FakeSession;

    await adapter.execute(command("new-session", "new-1"));
    const newSession = runtime.session as FakeSession;
    await adapter.execute(command("resume-session", "resume-1", { sessionPath: "C:/sessions/resume.jsonl" }));
    const resumedSession = runtime.session as FakeSession;
    resumedSession.emit({ type: "agent_start" });

    expect(runtime.calls).toEqual(["newSession", "switch:C:/sessions/resume.jsonl"]);
    expect(oldSession.listeners.size).toBe(0);
    expect(newSession.listeners.size).toBe(0);
    expect(resumedSession.listeners.size).toBe(1);
    expect(events.some(event => event.type === "session-lifecycle" && event.lifecycle === "busy")).toBe(true);
  });

  it("rejects foreign, duplicate, and unavailable-model commands without corrupting adapter state", async () => {
    const runtime = new FakeRuntime(new FakeSession("pi-session-1"));
    const { adapter } = await adapterWithRuntime(runtime);

    const foreign = await adapter.execute(command("abort", "foreign-1", { sessionId: "owned-2" }));
    expect(foreign.outcome).toBe("rejected");
    const first = await adapter.execute(command("compact", "same"));
    const duplicate = await adapter.execute(command("compact", "same"));
    expect(first.outcome).toBe("completed");
    expect(duplicate.outcome).toBe("completed");
    expect((runtime.session as FakeSession).calls.filter(call => call === "compact")).toHaveLength(1);
    const missing = await adapter.execute(command("set-model", "missing-model", {
      model: { providerId: "openai", modelId: "missing", displayName: "Missing" },
    }));
    expect(missing.outcome).toBe("failed");
    expect(adapter.view().lifecycle).toBe("ready");
    expect(adapter.view().activeCommandIds).toEqual([]);
  });
});
