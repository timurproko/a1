import {
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  SessionManager,
  type CreateAgentSessionRuntimeFactory,
} from "@earendil-works/pi-coding-agent";
import {
  assertOwnedUiCommand,
  assertOwnedUiSnapshot,
  type OwnedUiCommand,
  type OwnedUiCommandOutcome,
  type OwnedUiDiagnostics,
  type OwnedUiEditorState,
  type OwnedUiEvent,
  type OwnedUiModelInfo,
  type OwnedUiSessionViewModel,
  type OwnedUiSnapshot,
  type OwnedUiStatusView,
  type OwnedUiTerminalSurface,
  type OwnedUiThinkingLevel,
  type OwnedUiTranscriptBlock,
} from "../owned-ui-contracts/index.js";

export interface PiEngineRuntimeFactoryInput {
  readonly cwd: string;
  readonly agentDir: string;
  readonly sessionId: string;
}

export interface PiSessionLike {
  readonly sessionId: string;
  readonly model: unknown;
  readonly thinkingLevel: unknown;
  readonly isStreaming: boolean;
  readonly isIdle: boolean;
  readonly isRetrying: boolean;
  readonly isCompacting: boolean;
  readonly messages: readonly unknown[];
  subscribe(listener: (event: unknown) => void): () => void;
  prompt(text: string, options?: unknown): Promise<void>;
  steer(text: string): Promise<void>;
  followUp(text: string): Promise<void>;
  abort(): Promise<void>;
  abortRetry(): void;
  abortCompaction(): void;
  compact(customInstructions?: string): Promise<unknown>;
  setModel(model: unknown): Promise<void>;
  setThinkingLevel(level: unknown): void;
  dispose(): void;
}

export interface PiServicesLike {
  readonly modelRuntime: {
    getModel(providerId: string, modelId: string): unknown;
  };
  readonly diagnostics: readonly { readonly type: string; readonly message: string }[];
}

export interface PiRuntimeLike {
  readonly session: PiSessionLike;
  readonly services: PiServicesLike;
  readonly diagnostics: readonly { readonly type: string; readonly message: string }[];
  setRebindSession(callback: (session: PiSessionLike) => Promise<void>): void;
  newSession(options?: unknown): Promise<unknown>;
  switchSession(sessionPath: string, options?: unknown): Promise<unknown>;
  dispose(): Promise<void>;
}

export type PiEngineRuntimeFactory = (input: PiEngineRuntimeFactoryInput) => Promise<PiRuntimeLike>;

export interface PiEngineAdapterOptions {
  readonly cwd?: string;
  readonly agentDir?: string;
  readonly sessionId?: string;
  readonly createRuntime?: PiEngineRuntimeFactory;
}

interface AdapterCommandResult {
  readonly outcome: OwnedUiCommandOutcome;
  readonly diagnostic: string | null;
}

const DEFAULT_SURFACE: OwnedUiTerminalSurface = {
  columns: 100,
  rows: 32,
  focusedRegion: "editor",
  hardwareCursor: false,
};

export class PiEngineAdapter {
  readonly #runtimeFactory: PiEngineRuntimeFactory;
  readonly #cwd: string;
  readonly #agentDir: string;
  readonly #sessionId: string;
  readonly #listeners = new Set<(event: OwnedUiEvent) => void>();
  #runtime: PiRuntimeLike | undefined;
  #session: PiSessionLike | undefined;
  #unsubscribe: (() => void) | undefined;
  #sequence = 0;
  #viewRevision = 0;
  #lifecycle: OwnedUiSessionViewModel["lifecycle"] = "starting";
  #editor: OwnedUiEditorState = {
    text: "",
    queuedSubmissions: [],
    selection: null,
    cursorOffset: 0,
    historyRevision: 0,
    submitEnabled: false,
  };
  #status: OwnedUiStatusView = {
    title: "Pi",
    workingMessage: null,
    diagnostics: [],
    badges: [],
  };
  #terminal: OwnedUiTerminalSurface = DEFAULT_SURFACE;
  #activeModel: OwnedUiModelInfo | null = null;
  #thinkingLevel: OwnedUiThinkingLevel = "medium";
  #activeCommandIds: string[] = [];
  readonly #completedCommands = new Map<string, AdapterCommandResult>();
  #transcript: OwnedUiTranscriptBlock[] = [];
  readonly #messageBlockIds = new WeakMap<object, string>();
  readonly #messageFallbackIds = new Map<string, string>();
  readonly #toolBlockIds = new Map<string, string>();
  #nextBlockSequence = 0;
  #diagnostics: OwnedUiDiagnostics[] = [];
  readonly #eventQueue: OwnedUiEvent[] = [];
  #eventQueueProcessing: Promise<void> | undefined;
  #droppedEventCount = 0;
  #lastPrompt: string | null = null;
  #disposed = false;

  constructor(options: PiEngineAdapterOptions = {}) {
    this.#cwd = options.cwd ?? process.cwd();
    this.#agentDir = options.agentDir ?? getAgentDir();
    this.#sessionId = options.sessionId ?? "owned-session-1";
    this.#runtimeFactory = options.createRuntime ?? createDefaultPiRuntime;
  }

  get sessionId(): string {
    return this.#sessionId;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  async start(): Promise<OwnedUiSessionViewModel> {
    if (this.#runtime) return this.view();
    const runtime = await this.#runtimeFactory({
      cwd: this.#cwd,
      agentDir: this.#agentDir,
      sessionId: this.#sessionId,
    }).catch(error => {
      this.#lifecycle = "failed";
      this.#addDiagnostic("error", "engine-startup", error instanceof Error ? error.message : String(error), false);
      throw error;
    });
    this.#runtime = runtime;
    runtime.setRebindSession(async session => {
      this.#bindSession(session);
      this.#emitView();
    });
    for (const diagnostic of [...runtime.diagnostics, ...runtime.services.diagnostics]) {
      this.#addDiagnostic(
        diagnostic.type === "error" ? "error" : diagnostic.type === "warning" ? "warning" : "info",
        "engine-startup",
        diagnostic.message,
        diagnostic.type !== "error",
      );
    }
    this.#bindSession(runtime.session);
    this.#lifecycle = "ready";
    this.#editor = { ...this.#editor, submitEnabled: true };
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "ready", reason: null });
    this.#emitView();
    return this.view();
  }

  onEvent(listener: (event: OwnedUiEvent) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#event({ type: "session-view", view: this.view() }));
    return () => this.#listeners.delete(listener);
  }

  async flushEvents(): Promise<void> {
    while (this.#eventQueueProcessing) await this.#eventQueueProcessing;
  }

  view(): OwnedUiSessionViewModel {
    return {
      contractVersion: 1,
      sessionId: this.#sessionId,
      revision: this.#viewRevision,
      lifecycle: this.#lifecycle,
      transcript: this.#transcript.map(block => ({ ...block })),
      editor: { ...this.#editor, queuedSubmissions: [...this.#editor.queuedSubmissions] },
      status: {
        ...this.#status,
        diagnostics: [...this.#status.diagnostics],
        badges: [...this.#status.badges],
      },
      terminal: { ...this.#terminal },
      activeModel: this.#activeModel === null ? null : { ...this.#activeModel },
      thinkingLevel: this.#thinkingLevel,
      activeCommandIds: [...this.#activeCommandIds],
      dialog: null,
      overlay: null,
      customizations: [],
      diagnostics: this.#diagnostics.map(diagnostic => ({ ...diagnostic })),
    };
  }

  snapshot(): OwnedUiSnapshot {
    const snapshot: OwnedUiSnapshot = {
      contractVersion: 1,
      snapshotId: `snapshot-${this.#viewRevision}`,
      sessionId: this.#sessionId,
      sequence: this.#sequence,
      view: this.view(),
    };
    assertOwnedUiSnapshot(snapshot);
    return snapshot;
  }

  async execute(command: OwnedUiCommand): Promise<AdapterCommandResult> {
    assertOwnedUiCommand(command);
    if (command.sessionId !== this.#sessionId) {
      return this.#finishCommand(command, "rejected", "command targets a different owned session");
    }
    if (this.#disposed || !this.#runtime || !this.#session) {
      return this.#finishCommand(command, "rejected", "engine adapter is not running");
    }
    const existing = this.#completedCommands.get(command.correlationId);
    if (existing) return existing;
    if (this.#activeCommandIds.includes(command.correlationId)) {
      return this.#finishCommand(command, "rejected", "duplicate engine command correlation id");
    }

    this.#activeCommandIds.push(command.correlationId);
    this.#emitEvent({
      type: "command-outcome",
      correlationId: command.correlationId,
      outcome: "accepted",
      diagnostic: null,
    });
    try {
      await this.#perform(command);
      this.#emitView();
      return this.#recordCommand(command, "completed", null);
    } catch (error) {
      const diagnostic = error instanceof Error ? error.message : String(error);
      this.#addDiagnostic("error", "engine-command", diagnostic, true);
      this.#emitView();
      return this.#recordCommand(command, "failed", diagnostic);
    }
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#lifecycle = "stopping";
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "stopping", reason: null });
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    await this.#runtime?.dispose();
    this.#lifecycle = "stopped";
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "stopped", reason: null });
    this.#emitView();
    await this.flushEvents();
  }

  async #perform(command: OwnedUiCommand): Promise<void> {
    const runtime = this.#runtime;
    const session = this.#session;
    if (!runtime || !session) throw new Error("engine session is unavailable");

    switch (command.type) {
      case "prompt": {
        this.#lastPrompt = command.text;
        await session.prompt(
          command.text,
          session.isStreaming ? { streamingBehavior: "followUp" } : undefined,
        );
        return;
      }
      case "steer":
        this.#lastPrompt = command.text;
        await session.steer(command.text);
        return;
      case "follow-up":
        this.#lastPrompt = command.text;
        await session.followUp(command.text);
        return;
      case "abort":
        if (session.isRetrying) session.abortRetry();
        if (session.isCompacting) session.abortCompaction();
        await session.abort();
        return;
      case "retry":
        if (this.#lastPrompt === null) throw new Error("no previous prompt is available to retry");
        await session.prompt(
          this.#lastPrompt,
          session.isStreaming ? { streamingBehavior: "followUp" } : undefined,
        );
        return;
      case "compact":
        await session.compact();
        return;
      case "set-model": {
        const model = runtime.services.modelRuntime.getModel(
          command.model.providerId,
          command.model.modelId,
        );
        if (!model) {
          throw new Error(`model is unavailable: ${command.model.providerId}/${command.model.modelId}`);
        }
        await session.setModel(model);
        this.#activeModel = { ...command.model };
        return;
      }
      case "set-thinking-level":
        session.setThinkingLevel(command.thinkingLevel);
        this.#thinkingLevel = command.thinkingLevel;
        return;
      case "new-session":
        await runtime.newSession();
        return;
      case "resume-session":
        await runtime.switchSession(command.sessionPath);
        return;
      case "resize-surface":
        this.#terminal = { ...command.surface };
        this.#emitEvent({ type: "terminal-surface", surface: this.#terminal });
        return;
      case "shutdown":
        await this.dispose();
        return;
      case "apply-customization":
      case "remove-customization":
        throw new Error("customization commands belong to the owned UI layer, not the Pi engine adapter");
    }
  }

  #bindSession(session: PiSessionLike): void {
    this.#unsubscribe?.();
    this.#session = session;
    this.#activeCommandIds = [];
    this.#completedCommands.clear();
    this.#lastPrompt = null;
    this.#editor = {
      text: "",
      queuedSubmissions: [],
      selection: null,
      cursorOffset: 0,
      historyRevision: this.#editor.historyRevision + 1,
      submitEnabled: true,
    };
    this.#status = { ...this.#status, workingMessage: null, badges: [] };
    this.#activeModel = readModel(session.model);
    this.#thinkingLevel = readThinkingLevel(session.thinkingLevel);
    this.#rebuildTranscript(session.messages, "finalized");
    this.#unsubscribe = session.subscribe(event => this.#handlePiEvent(event));
  }

  #handlePiEvent(event: unknown): void {
    if (!isRecord(event) || typeof event.type !== "string") return;
    switch (event.type) {
      case "agent_start":
        this.#lifecycle = "busy";
        this.#status = { ...this.#status, workingMessage: "Working…" };
        this.#emitEvent({ type: "session-lifecycle", lifecycle: "busy", reason: null });
        this.#emitEvent({ type: "status", status: this.#status });
        return;
      case "message_start":
        this.#upsertMessageBlock(event.message, "live");
        return;
      case "message_update": {
        const block = this.#upsertMessageBlock(event.message, "live");
        if (block && isRecord(event.assistantMessageEvent) && typeof event.assistantMessageEvent.delta === "string") {
          this.#upsertTranscriptBlock({
            ...block,
            text: block.text.endsWith(event.assistantMessageEvent.delta)
              ? block.text
              : `${block.text}${event.assistantMessageEvent.delta}`,
          });
        }
        return;
      }
      case "message_end":
        this.#upsertMessageBlock(event.message, "finalized");
        return;
      case "turn_end":
        this.#upsertMessageBlock(event.message, "finalized");
        if (Array.isArray(event.toolResults)) {
          for (const result of event.toolResults) this.#upsertMessageBlock(result, "finalized");
        }
        return;
      case "tool_execution_start":
      case "tool_execution_update":
      case "tool_execution_end":
        this.#upsertToolExecutionBlock(event);
        return;
      case "agent_settled":
      case "agent_end":
        if (event.type === "agent_end" && event.willRetry === true) return;
        this.#rebuildTranscript(Array.isArray(event.messages) ? event.messages : [], "finalized");
        this.#lifecycle = "ready";
        this.#status = { ...this.#status, workingMessage: null };
        this.#emitEvent({ type: "session-lifecycle", lifecycle: "ready", reason: null });
        this.#emitEvent({ type: "status", status: this.#status });
        this.#emitView();
        return;
      case "queue_update": {
        const steering = readStringArray(event.steering);
        const followUp = readStringArray(event.followUp);
        this.#editor = {
          ...this.#editor,
          queuedSubmissions: [...steering, ...followUp],
          historyRevision: this.#editor.historyRevision + 1,
        };
        this.#emitEvent({ type: "editor-state", editor: this.#editor });
        return;
      }
      case "auto_retry_start":
        this.#lifecycle = "busy";
        this.#status = { ...this.#status, workingMessage: "Retrying…" };
        this.#emitEvent({ type: "status", status: this.#status });
        return;
      case "auto_retry_end":
      case "compaction_end":
        this.#lifecycle = "ready";
        this.#status = { ...this.#status, workingMessage: null };
        this.#emitEvent({ type: "status", status: this.#status });
        return;
      case "compaction_start":
        this.#lifecycle = "busy";
        this.#status = { ...this.#status, workingMessage: "Compacting…" };
        this.#emitEvent({ type: "status", status: this.#status });
        return;
      case "thinking_level_changed":
        this.#thinkingLevel = readThinkingLevel(event.level);
        return;
      default:
        return;
    }
  }

  #rebuildTranscript(messages: readonly unknown[], status: OwnedUiTranscriptBlock["status"]): void {
    const blocks: OwnedUiTranscriptBlock[] = [];
    for (const [index, message] of messages.entries()) {
      blocks.push(...this.#messageBlocks(message, status, index));
    }
    this.#transcript = blocks;
  }

  #upsertMessageBlock(
    message: unknown,
    status: OwnedUiTranscriptBlock["status"],
  ): OwnedUiTranscriptBlock | undefined {
    const blocks = this.#messageBlocks(message, status, this.#transcript.length);
    const first = blocks[0];
    for (const block of blocks) this.#upsertTranscriptBlock(block);
    return first;
  }

  #messageBlocks(
    message: unknown,
    status: OwnedUiTranscriptBlock["status"],
    fallbackIndex: number,
  ): OwnedUiTranscriptBlock[] {
    if (!isRecord(message) || typeof message.role !== "string") return [];
    const baseId = this.#messageBlockId(message, fallbackIndex);
    if (message.role === "user") {
      return [{
        id: baseId,
        kind: "user",
        status,
        revision: this.#nextBlockRevision(baseId),
        title: "User",
        text: textFromContent(message.content),
        payload: { role: "user", imageCount: contentImageCount(message.content) },
      }];
    }
    if (message.role === "toolResult") {
      return [{
        id: baseId,
        kind: "tool-result",
        status,
        revision: this.#nextBlockRevision(baseId),
        title: stringValue(message.toolName) ?? "Tool result",
        text: textFromContent(message.content),
        payload: {
          role: "toolResult",
          toolCallId: stringValue(message.toolCallId) ?? null,
          isError: message.isError === true,
          details: jsonSummary(message.details),
        },
      }];
    }
    if (message.role !== "assistant" || !Array.isArray(message.content)) return [];

    const blocks: OwnedUiTranscriptBlock[] = [];
    const text = textFromContent(message.content);
    if (text) {
      blocks.push({
        id: baseId,
        kind: "assistant",
        status,
        revision: this.#nextBlockRevision(baseId),
        title: "Assistant",
        text,
        payload: {
          role: "assistant",
          provider: stringValue(message.provider) ?? null,
          model: stringValue(message.model) ?? null,
          stopReason: stringValue(message.stopReason) ?? null,
          errorMessage: stringValue(message.errorMessage) ?? null,
        },
      });
    }
    const thinking = thinkingFromContent(message.content);
    if (thinking) {
      blocks.push({
        id: `${baseId}:thinking`,
        kind: "thinking",
        status,
        revision: this.#nextBlockRevision(`${baseId}:thinking`),
        title: "Thinking",
        text: thinking,
        payload: { role: "assistant", redacted: contentHasRedactedThinking(message.content) },
      });
    }
    for (const item of message.content) {
      if (!isRecord(item) || item.type !== "toolCall") continue;
      const toolCallId = stringValue(item.id) ?? `${baseId}:${blocks.length}`;
      const blockId = this.#toolBlockIds.get(toolCallId) ?? `tool-${toolCallId}`;
      this.#toolBlockIds.set(toolCallId, blockId);
      blocks.push({
        id: blockId,
        kind: "tool-call",
        status,
        revision: this.#nextBlockRevision(blockId),
        title: stringValue(item.name) ?? "Tool",
        text: jsonSummary(item.arguments).summary,
        payload: {
          toolCallId,
          toolName: stringValue(item.name) ?? "unknown",
          arguments: jsonSummary(item.arguments),
        },
      });
    }
    return blocks;
  }

  #upsertToolExecutionBlock(event: Record<string, unknown>): void {
    const toolCallId = stringValue(event.toolCallId);
    if (!toolCallId) return;
    const blockId = this.#toolBlockIds.get(toolCallId) ?? `tool-${toolCallId}`;
    this.#toolBlockIds.set(toolCallId, blockId);
    const ended = event.type === "tool_execution_end";
    const source = ended ? event.result : event.partialResult;
    this.#upsertTranscriptBlock({
      id: blockId,
      kind: ended ? "tool-result" : "tool-call",
      status: ended ? "finalized" : "live",
      revision: this.#nextBlockRevision(blockId),
      title: stringValue(event.toolName) ?? "Tool",
      text: textFromContent(isRecord(source) ? source.content : source),
      payload: {
        toolCallId,
        toolName: stringValue(event.toolName) ?? "unknown",
        arguments: jsonSummary(event.args),
        result: jsonSummary(source),
        isError: event.isError === true,
      },
    });
  }

  #upsertTranscriptBlock(block: OwnedUiTranscriptBlock): void {
    const index = this.#transcript.findIndex(existing => existing.id === block.id);
    if (index >= 0) this.#transcript[index] = block;
    else this.#transcript.push(block);
    this.#emitEvent({ type: "transcript-block", block });
  }

  #messageBlockId(message: Record<string, unknown>, fallbackIndex: number): string {
    const existing = this.#messageBlockIds.get(message);
    if (existing) return existing;
    const timestamp = typeof message.timestamp === "number" && Number.isSafeInteger(message.timestamp)
      ? message.timestamp
      : fallbackIndex;
    const fallback = `message-${stringValue(message.role) ?? "unknown"}-${timestamp}`;
    const cached = this.#messageFallbackIds.get(fallback) ?? fallback;
    this.#messageFallbackIds.set(fallback, cached);
    this.#messageBlockIds.set(message, cached);
    return cached;
  }

  #nextBlockRevision(id: string): number {
    const existing = this.#transcript.find(block => block.id === id);
    if (existing) return existing.revision + 1;
    this.#nextBlockSequence += 1;
    return this.#nextBlockSequence;
  }

  #recordCommand(
    command: OwnedUiCommand,
    outcome: OwnedUiCommandOutcome,
    diagnostic: string | null,
  ): AdapterCommandResult {
    const result = this.#finishCommand(command, outcome, diagnostic);
    this.#completedCommands.set(command.correlationId, result);
    if (this.#completedCommands.size > 256) {
      const oldest = this.#completedCommands.keys().next().value;
      if (oldest) this.#completedCommands.delete(oldest);
    }
    return result;
  }

  #finishCommand(
    command: OwnedUiCommand,
    outcome: OwnedUiCommandOutcome,
    diagnostic: string | null,
  ): AdapterCommandResult {
    this.#activeCommandIds = this.#activeCommandIds.filter(id => id !== command.correlationId);
    this.#emitEvent({
      type: "command-outcome",
      correlationId: command.correlationId,
      outcome,
      diagnostic,
    });
    return { outcome, diagnostic };
  }

  #addDiagnostic(
    severity: OwnedUiDiagnostics["severity"],
    code: string,
    message: string,
    recoverable: boolean,
  ): void {
    const diagnostic = this.#recordDiagnostic(severity, code, message, recoverable);
    this.#emitEvent({ type: "diagnostic", diagnostic });
  }

  #emitView(): void {
    this.#viewRevision += 1;
    this.#emitEvent({ type: "session-view", view: this.view() });
  }

  #emitEvent(
    value:
      | Omit<Extract<OwnedUiEvent, { type: "session-lifecycle" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "session-view" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "transcript-block" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "editor-state" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "status" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "command-outcome" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "terminal-surface" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "diagnostic" }>, "sessionId" | "sequence">,
  ): void {
    const event = this.#event(value);
    if (event.type !== "session-view") this.#viewRevision += 1;
    this.#enqueueEvent(event);
  }

  #enqueueEvent(event: OwnedUiEvent): void {
    const capacity = 1_024;
    if (this.#eventQueue.length >= capacity) {
      const coalescible = this.#eventQueue.findIndex(queued =>
        queued.type === "session-view"
        || queued.type === "status"
        || queued.type === "editor-state"
        || queued.type === "transcript-block"
      );
      if (coalescible >= 0) this.#eventQueue.splice(coalescible, 1);
      else this.#eventQueue.shift();
      this.#droppedEventCount += 1;
      if (this.#droppedEventCount === 1 || this.#droppedEventCount % 128 === 0) {
        this.#recordDiagnostic(
          "warning",
          "event-backpressure",
          `owned UI coalesced ${this.#droppedEventCount} engine events under backpressure`,
          true,
        );
      }
    }
    this.#eventQueue.push(event);
    this.#eventQueueProcessing ??= Promise.resolve().then(() => this.#processEventQueue());
  }

  async #processEventQueue(): Promise<void> {
    try {
      while (this.#eventQueue.length > 0) {
        const event = this.#eventQueue.shift();
        if (!event) continue;
        for (const listener of this.#listeners) {
          try {
            listener(event);
          } catch (error) {
            this.#recordDiagnostic(
              "warning",
              "event-listener",
              error instanceof Error ? error.message : String(error),
              true,
            );
          }
        }
      }
    } finally {
      this.#eventQueueProcessing = undefined;
      if (this.#eventQueue.length > 0) {
        this.#eventQueueProcessing = Promise.resolve().then(() => this.#processEventQueue());
      }
    }
  }

  #recordDiagnostic(
    severity: OwnedUiDiagnostics["severity"],
    code: string,
    message: string,
    recoverable: boolean,
  ): OwnedUiDiagnostics {
    const diagnostic: OwnedUiDiagnostics = {
      sequence: this.#diagnostics.length,
      code,
      severity,
      message,
      recoverable,
    };
    this.#diagnostics.push(diagnostic);
    if (this.#diagnostics.length > 100) this.#diagnostics.shift();
    this.#status = {
      ...this.#status,
      diagnostics: [...this.#status.diagnostics, message].slice(-8),
    };
    return diagnostic;
  }

  #event(
    value:
      | Omit<Extract<OwnedUiEvent, { type: "session-lifecycle" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "session-view" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "transcript-block" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "editor-state" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "status" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "command-outcome" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "terminal-surface" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "diagnostic" }>, "sessionId" | "sequence">,
  ): OwnedUiEvent {
    this.#sequence += 1;
    return { ...value, sessionId: this.#sessionId, sequence: this.#sequence } as OwnedUiEvent;
  }
}

export async function createPiEngineAdapter(
  options: PiEngineAdapterOptions = {},
): Promise<PiEngineAdapter> {
  const adapter = new PiEngineAdapter(options);
  await adapter.start();
  return adapter;
}

async function createDefaultPiRuntime(input: PiEngineRuntimeFactoryInput): Promise<PiRuntimeLike> {
  const sessionManager = SessionManager.create(input.cwd);
  const createRuntime: CreateAgentSessionRuntimeFactory = async ({
    cwd,
    sessionManager: targetSessionManager,
    sessionStartEvent,
  }) => {
    const services = await createAgentSessionServices({ cwd, agentDir: input.agentDir });
    const created = await createAgentSessionFromServices({
      services,
      sessionManager: targetSessionManager,
      ...(sessionStartEvent ? { sessionStartEvent } : {}),
    });
    return {
      ...created,
      services,
      diagnostics: services.diagnostics,
    };
  };
  const runtime = await createAgentSessionRuntime(createRuntime, {
    cwd: input.cwd,
    agentDir: input.agentDir,
    sessionManager,
  });
  return runtime as unknown as PiRuntimeLike;
}

function readModel(value: unknown): OwnedUiModelInfo | null {
  if (!isRecord(value)) return null;
  const providerId = stringValue(value.provider) ?? stringValue(value.providerId);
  const modelId = stringValue(value.id) ?? stringValue(value.modelId);
  if (!providerId || !modelId) return null;
  return {
    providerId,
    modelId,
    displayName: stringValue(value.name) ?? modelId,
  };
}

function readThinkingLevel(value: unknown): OwnedUiThinkingLevel {
  return value === "off" || value === "minimal" || value === "low" || value === "medium"
    || value === "high" || value === "xhigh"
    ? value
    : "medium";
}

function readStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map(item => isRecord(item) && item.type === "text" ? stringValue(item.text) ?? "" : "")
    .filter(text => text.length > 0)
    .join("\n");
}

function thinkingFromContent(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map(item => isRecord(item) && item.type === "thinking" ? stringValue(item.thinking) ?? "" : "")
    .filter(text => text.length > 0)
    .join("\n");
}

function contentImageCount(content: unknown): number {
  return Array.isArray(content)
    ? content.filter(item => isRecord(item) && item.type === "image").length
    : 0;
}

function contentHasRedactedThinking(content: unknown): boolean {
  return Array.isArray(content)
    && content.some(item => isRecord(item) && item.type === "thinking" && item.redacted === true);
}

function jsonSummary(value: unknown): { readonly summary: string; readonly json: unknown } {
  const json = sanitizeJson(value);
  let summary = "";
  try {
    summary = JSON.stringify(json);
  } catch {
    summary = String(value);
  }
  if (summary.length > 512) summary = `${summary.slice(0, 509)}...`;
  return { summary, json };
}

function sanitizeJson(value: unknown, depth = 0): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (depth >= 8) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 100).map(item => sanitizeJson(item, depth + 1));
  if (isRecord(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).slice(0, 100)) {
      output[key] = sanitizeJson(item, depth + 1);
    }
    return output;
  }
  return String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
