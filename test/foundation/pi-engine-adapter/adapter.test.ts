import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import {
  OWNED_UI_EXTENSION_UI_CALLBACKS,
  type OwnedUiCommand,
  type OwnedUiEvent,
} from "../../../src/foundation/owned-ui-contracts/index.js";
import {
  createPiEngineAdapter,
  type PiEngineAdapter,
} from "../../../src/foundation/pi-engine-adapter/index.js";

class FakeSession {
  readonly listeners = new Set<(event: unknown) => void>();
  readonly sessionId: string;
  model: unknown = { provider: "openai", id: "gpt-5", name: "GPT-5" };
  thinkingLevel: unknown = "medium";
  isStreaming = false;
  readonly isIdle = true;
  isRetrying = false;
  isCompacting = false;
  readonly messages: readonly unknown[] = [];
  contextUsage: { tokens: number | null; contextWindow: number; percent: number | null } | undefined;
  readonly sessionManager = {
    getSessionName: () => "adapter-test",
    getEntries: () => this.messages.map(message => ({ type: "message", message })),
  };
  readonly calls: string[] = [];
  extensionBindings: unknown;
  disposed = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  setMessages(messages: readonly unknown[]): void {
    (this as { messages: readonly unknown[] }).messages = messages;
  }

  getContextUsage(): { tokens: number | null; contextWindow: number; percent: number | null } | undefined {
    return this.contextUsage;
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

  async bindExtensions(bindings: unknown): Promise<void> {
    this.extensionBindings = bindings;
    this.calls.push("bindExtensions");
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

class FakeRuntime {
  session: FakeSession;
  readonly services = {
    modelRuntime: {
      getModel(providerId: string, modelId: string): unknown {
        return providerId === "openai" && modelId === "gpt-5.1"
          ? { provider: providerId, id: modelId, name: "GPT-5.1" }
          : undefined;
      },
      getAvailableSnapshot: () => [
        { provider: "openai", id: "gpt-5", name: "GPT-5" },
        { provider: "anthropic", id: "claude", name: "Claude" },
      ],
      isUsingSubscription: (providerId: string) => providerId === "openai",
    },
    diagnostics: [{ type: "warning", message: "service warning" }],
  };
  readonly diagnostics = [{ type: "info", message: "runtime ready" }];
  rebind: ((session: FakeSession) => Promise<void>) | undefined;
  readonly calls: string[] = [];
  disposed = false;

  constructor(session: FakeSession) {
    this.session = session;
  }

  setRebindSession(callback: (session: FakeSession) => Promise<void>): void {
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
    createRuntime: async () => runtime as unknown as AgentSessionRuntime,
  });
  adapter.onEvent(event => events.push(event));
  return { adapter, events };
}

function completeExtensionUiPort(): unknown {
  const value: Record<string, unknown> = Object.fromEntries(OWNED_UI_EXTENSION_UI_CALLBACKS.map(name => [name, () => undefined]));
  value.theme = Object.fromEntries([
    "fg", "bg", "bold", "italic", "underline", "inverse", "strikethrough", "getFgAnsi", "getBgAnsi",
    "getColorMode", "getThinkingBorderColor", "getBashModeBorderColor",
  ].map(name => [name, () => undefined]));
  return value;
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

  it("maps public session usage and footer state without placeholder statistics", async () => {
    const session = new FakeSession("pi-session-1");
    session.contextUsage = { tokens: 86_768, contextWindow: 272_000, percent: 31.9 };
    session.setMessages([{
      role: "assistant",
      usage: {
        input: 1_800_000,
        output: 222_000,
        cacheRead: 94_000_000,
        cacheWrite: 12_000,
        cost: { total: 72.526 },
      },
    }]);
    const { adapter } = await adapterWithRuntime(new FakeRuntime(session));

    expect(adapter.view().status).toMatchObject({
      usage: {
        input: 1_800_000,
        output: 222_000,
        cacheRead: 94_000_000,
        cacheWrite: 12_000,
        cost: 72.526,
        contextTokens: 86_768,
        contextWindow: 272_000,
        contextPercent: 31.9,
        usingSubscription: true,
      },
      footer: { sessionName: "adapter-test", availableProviderCount: 2 },
    });
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
    await adapter.flushEvents();

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
    await adapter.flushEvents();

    expect(runtime.calls).toEqual(["newSession", "switch:C:/sessions/resume.jsonl"]);
    expect(oldSession.listeners.size).toBe(0);
    expect(newSession.listeners.size).toBe(0);
    expect(resumedSession.listeners.size).toBe(1);
    expect(events.some(event => event.type === "session-lifecycle" && event.lifecycle === "busy")).toBe(true);
  });

  it("maps session snapshots into owned transcript blocks without exporting Pi types or image payloads", async () => {
    const runtime = new FakeRuntime(new FakeSession("pi-session-1"));
    const session = runtime.session as FakeSession;
    const userMessage = {
      role: "user",
      content: [{ type: "text", text: "Read the file" }, { type: "image", data: "secret-image-bytes", mimeType: "image/png" }],
      timestamp: 1,
    };
    const assistantMessage = {
      role: "assistant",
      content: [
        { type: "thinking", thinking: "Plan first" },
        { type: "text", text: "Reading now" },
        { type: "toolCall", id: "call-1", name: "read", arguments: { path: "README.md" } },
      ],
      timestamp: 2,
    };
    const toolResult = {
      role: "toolResult",
      toolCallId: "call-1",
      toolName: "read",
      content: [{ type: "text", text: "file summary" }],
      isError: false,
      timestamp: 3,
    };
    const bashExecution = {
      role: "bashExecution", command: "printf ok", output: "ok", exitCode: 0, cancelled: false, timestamp: 4,
    };
    const customMessage = {
      role: "custom", customType: "notice", content: "extension notice", display: true, details: { value: 1 }, timestamp: 5,
    };
    const hiddenCustomMessage = { ...customMessage, customType: "hidden", display: false, timestamp: 6 };
    const compactionSummary = { role: "compactionSummary", summary: "compact summary", tokensBefore: 123, timestamp: 7 };
    session.setMessages([userMessage, assistantMessage, toolResult, bashExecution, customMessage, hiddenCustomMessage, compactionSummary]);

    const { adapter } = await adapterWithRuntime(runtime);
    const transcript = adapter.view().transcript;
    expect(transcript.map(block => block.kind)).toEqual([
      "user", "assistant", "tool-result", "bash", "custom", "compaction",
    ]);
    expect(transcript[0]?.payload).toMatchObject({ role: "user", imageCount: 1 });
    expect(transcript[1]?.payload).toMatchObject({
      role: "assistant",
      content: [
        { type: "thinking", thinking: "Plan first" },
        { type: "text", text: "Reading now" },
        { type: "toolCall", id: "call-1", name: "read", arguments: { path: "README.md" } },
      ],
    });
    expect(JSON.stringify(transcript)).not.toContain("secret-image-bytes");
    expect(transcript.find(block => block.kind === "tool-result")).toMatchObject({
      id: "tool-call-1",
      text: "file summary",
      payload: { toolCallId: "call-1", toolName: "read", arguments: { json: { path: "README.md" } } },
    });
    expect(transcript.find(block => block.kind === "bash")).toMatchObject({ title: "printf ok", text: "ok" });
    expect(transcript.find(block => block.kind === "custom")).toMatchObject({ title: "notice", text: "extension notice" });
    expect(adapter.snapshot()).toMatchObject({
      contractVersion: 1,
      sessionId: "owned-1",
      view: { sessionId: "owned-1" },
    });
  });

  it("maps streaming message and tool execution events while preserving block identity", async () => {
    const runtime = new FakeRuntime(new FakeSession("pi-session-1"));
    const { adapter, events } = await adapterWithRuntime(runtime);
    const session = runtime.session as FakeSession;
    const message = {
      role: "assistant",
      content: [{ type: "text", text: "Hello" }],
      timestamp: 10,
    };

    session.emit({ type: "message_start", message });
    const updatedMessage = { ...message, content: [{ type: "text", text: "Hello world" }] };
    session.emit({ type: "message_update", message: updatedMessage, assistantMessageEvent: { type: "text_delta", delta: " world" } });
    session.emit({ type: "tool_execution_start", toolCallId: "tool-1", toolName: "bash", args: { command: "npm test" } });
    session.emit({ type: "tool_execution_update", toolCallId: "tool-1", toolName: "bash", partialResult: { content: [{ type: "text", text: "running" }] } });
    session.emit({ type: "tool_execution_end", toolCallId: "tool-1", toolName: "bash", result: { content: [{ type: "text", text: "passed" }] }, isError: false });
    session.emit({ type: "message_end", message: updatedMessage });
    await adapter.flushEvents();

    const transcript = adapter.view().transcript;
    expect(transcript.find(block => block.kind === "assistant")).toMatchObject({ text: "Hello world", status: "finalized" });
    expect(transcript.find(block => block.kind === "tool-result")).toMatchObject({ status: "finalized", text: "passed" });
    expect(events.filter(event => event.type === "transcript-block").length).toBeGreaterThanOrEqual(5);
    session.emit({ type: "message_start" });
    expect(adapter.view().transcript).toHaveLength(transcript.length);
  });

  it("retains distinct turns with repeated timestamps across authoritative and missing-message settlement", async () => {
    const runtime = new FakeRuntime(new FakeSession("pi-session-1"));
    const { adapter } = await adapterWithRuntime(runtime);
    const session = runtime.session as FakeSession;
    const messages = [
      { role: "user", content: [{ type: "text", text: "first" }], timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "first response" }], stopReason: "stop", timestamp: 10 },
      { role: "user", content: [{ type: "text", text: "second" }], timestamp: 2 },
      { role: "assistant", content: [{ type: "text", text: "second response" }], stopReason: "stop", timestamp: 10 },
      { role: "user", content: [{ type: "text", text: "failure" }], timestamp: 3 },
      { role: "assistant", content: [], stopReason: "error", errorMessage: "provider failed", timestamp: 10 },
    ];
    session.setMessages(messages);
    session.emit({ type: "agent_end", messages });
    await adapter.flushEvents();

    const firstSettlement = adapter.view().transcript;
    expect(firstSettlement.filter(block => block.kind === "assistant")).toHaveLength(3);
    expect(new Set(firstSettlement.map(block => block.id)).size).toBe(firstSettlement.length);
    expect(firstSettlement.map(block => block.text)).toEqual(expect.arrayContaining([
      "first", "first response", "second", "second response", "failure",
    ]));

    session.emit({ type: "agent_settled" });
    await adapter.flushEvents();
    expect(adapter.view().transcript.map(block => block.id)).toEqual(firstSettlement.map(block => block.id));
    expect(adapter.view().transcript.find(block => JSON.stringify(block.payload).includes("provider failed"))).toBeDefined();
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

  it("exposes public SDK resources and the complete unbound visual extension contract", async () => {
    const runtime = new FakeRuntime(new FakeSession("pi-session-1"));
    (runtime.services as { resourceLoader?: unknown }).resourceLoader = {
      getSkills: () => ({ skills: [{ name: "review", path: "skills/review.md" }], diagnostics: [{ path: "skills/bad.md", message: "bad skill" }] }),
      getPrompts: () => ({ prompts: [{ name: "handoff", path: "prompts/handoff.md" }], diagnostics: [] }),
      getAgentsFiles: () => ({ agentsFiles: [{ path: "AGENTS.md", content: "rules" }] }),
      getSystemPromptSource: () => ({ path: "system.md" }),
      getAppendSystemPromptSources: () => [{ path: "append.md" }],
      getExtensions: () => ({
        extensions: [
          { path: "extensions/visible.ts", resolvedPath: "D:/agent/extensions/visible.ts", hidden: false },
          { path: "extensions/hidden.ts", resolvedPath: "D:/agent/extensions/hidden.ts", hidden: true },
          { path: "extensions/malformed.ts" },
        ],
        errors: [
          { path: "extensions/broken.ts", error: "factory threw" },
          { path: 42, error: null },
        ],
      }),
    };
    const { adapter } = await adapterWithRuntime(runtime);

    expect(adapter.nonVisualResources()).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "skill", label: "review", sourcePath: "skills/review.md" }),
      expect.objectContaining({ kind: "skill", diagnostic: "skills/bad.md: bad skill" }),
      expect.objectContaining({ kind: "prompt-template", label: "handoff" }),
      expect.objectContaining({ kind: "agent-context", sourcePath: "AGENTS.md" }),
      expect.objectContaining({ kind: "system-prompt", sourcePath: "system.md" }),
    ]));
    expect(adapter.extensionResources()).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "extension", sourcePath: "extensions/visible.ts", loaded: true, hidden: false }),
      expect.objectContaining({ kind: "extension", sourcePath: "extensions/hidden.ts", loaded: true, hidden: true }),
      expect.objectContaining({ loaded: false, diagnostic: "factory threw" }),
      expect.objectContaining({ loaded: false, diagnostic: expect.stringContaining("malformed extension metadata") }),
      expect.objectContaining({ loaded: false, diagnostic: expect.stringContaining("malformed error metadata") }),
    ]));
    expect(adapter.visualExtensionSupport()).toMatchObject({
      available: false,
      contractComplete: true,
      contractVersion: 1,
      binding: "unbound",
      uiCallbacks: expect.arrayContaining(["custom", "setWidget", "setEditorComponent", "onTerminalInput"]),
      uiProperties: ["theme"],
      renderCallbacks: ["tool.renderCall", "tool.renderResult", "message", "entry", "markdownTransformer"],
      diagnostic: expect.stringContaining("has not been bound"),
    });
  });

  it("binds, isolates, and disposes the public extension UI lifecycle", async () => {
    const runtime = new FakeRuntime(new FakeSession("pi-session-1"));
    const { adapter } = await adapterWithRuntime(runtime);
    const shutdown = vi.fn();
    await adapter.bindExtensionUi(completeExtensionUiPort(), shutdown);
    expect(runtime.session.calls).toContain("bindExtensions");
    expect(runtime.session.extensionBindings).toMatchObject({ mode: "tui", shutdownHandler: expect.any(Function), onError: expect.any(Function) });
    expect(adapter.visualExtensionSupport()).toMatchObject({ available: true, binding: "bound" });

    await adapter.execute(command("new-session", "extension-session-switch"));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(runtime.session.calls).toContain("bindExtensions");
    expect(adapter.visualExtensionSupport()).toMatchObject({ available: true, binding: "bound" });

    const binding = runtime.session.extensionBindings as { shutdownHandler: () => void; onError: (error: unknown) => void };
    binding.shutdownHandler();
    expect(shutdown).toHaveBeenCalledOnce();
    binding.onError({ error: "isolated extension failure" });
    await adapter.flushEvents();
    expect(adapter.view().diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "extension-ui", message: "isolated extension failure", recoverable: true }),
    ]));

    await adapter.unbindExtensionUi();
    expect(adapter.visualExtensionSupport()).toMatchObject({ available: false, binding: "unbound" });
    await adapter.dispose();
  });

  it("contains malformed and throwing extension discovery as diagnostics", async () => {
    const runtime = new FakeRuntime(new FakeSession("pi-session-1"));
    const loader = {
      getSkills: () => ({ skills: [], diagnostics: [] }),
      getPrompts: () => ({ prompts: [], diagnostics: [] }),
      getAgentsFiles: () => ({ agentsFiles: [] }),
      getSystemPromptSource: () => undefined,
      getAppendSystemPromptSources: () => [],
      getExtensions: (): unknown => { throw new Error("extension loader crashed"); },
    };
    (runtime.services as { resourceLoader?: unknown }).resourceLoader = loader;
    const { adapter } = await adapterWithRuntime(runtime);

    expect(adapter.extensionResources()).toEqual([
      expect.objectContaining({ loaded: false, diagnostic: "Extension discovery failed: extension loader crashed" }),
    ]);

    loader.getExtensions = () => ({ extensions: "invalid", errors: null });
    expect(adapter.extensionResources()).toEqual([
      expect.objectContaining({ diagnostic: expect.stringContaining("malformed extensions collection") }),
      expect.objectContaining({ diagnostic: expect.stringContaining("malformed errors collection") }),
    ]);
  });

  it("coalesces high-rate engine events under a bounded queue without terminal failures", async () => {
    const runtime = new FakeRuntime(new FakeSession("pi-session-1"));
    const { adapter, events } = await adapterWithRuntime(runtime);
    const session = runtime.session as FakeSession;

    for (let index = 0; index < 2_048; index += 1) session.emit({ type: "agent_start" });
    await adapter.flushEvents();

    expect(events.length).toBeLessThanOrEqual(1_100);
    expect(adapter.view().diagnostics.some(diagnostic => diagnostic.code === "event-backpressure")).toBe(true);
    expect(adapter.view().lifecycle).toBe("busy");
  });

  it("fails startup without producing a partial session and resets transient state on replacement", async () => {
    await expect(createPiEngineAdapter({
      cwd: "D:/work",
      agentDir: "D:/agent",
      sessionId: "owned-1",
      createRuntime: async () => {
        throw new Error("synthetic startup failure");
      },
    })).rejects.toThrow("synthetic startup failure");

    const runtime = new FakeRuntime(new FakeSession("pi-session-old"));
    const { adapter } = await adapterWithRuntime(runtime);
    const oldSession = runtime.session as FakeSession;
    oldSession.emit({ type: "queue_update", steering: ["old steering"], followUp: ["old follow-up"] });
    await adapter.flushEvents();
    expect(adapter.view().editor.queuedSubmissions).toEqual(["old steering", "old follow-up"]);

    await adapter.execute(command("new-session", "replace-1"));
    expect(adapter.view().editor.queuedSubmissions).toEqual([]);
    expect(adapter.view().transcript).toEqual([]);
    expect(adapter.view().activeCommandIds).toEqual([]);
  });
});
