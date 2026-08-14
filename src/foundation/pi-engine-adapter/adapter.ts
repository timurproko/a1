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
  type OwnedUiCommand,
  type OwnedUiCommandOutcome,
  type OwnedUiDiagnostics,
  type OwnedUiEditorState,
  type OwnedUiEvent,
  type OwnedUiModelInfo,
  type OwnedUiSessionViewModel,
  type OwnedUiStatusView,
  type OwnedUiTerminalSurface,
  type OwnedUiThinkingLevel,
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
  #diagnostics: OwnedUiDiagnostics[] = [];
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

  view(): OwnedUiSessionViewModel {
    return {
      contractVersion: 1,
      sessionId: this.#sessionId,
      revision: this.#viewRevision,
      lifecycle: this.#lifecycle,
      transcript: [],
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
    this.#activeModel = readModel(session.model);
    this.#thinkingLevel = readThinkingLevel(session.thinkingLevel);
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
      case "agent_settled":
      case "agent_end":
        if (event.type === "agent_end" && event.willRetry === true) return;
        this.#lifecycle = "ready";
        this.#status = { ...this.#status, workingMessage: null };
        this.#emitEvent({ type: "session-lifecycle", lifecycle: "ready", reason: null });
        this.#emitEvent({ type: "status", status: this.#status });
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
    const diagnostic: OwnedUiDiagnostics = {
      sequence: this.#diagnostics.length,
      code,
      severity,
      message,
      recoverable,
    };
    this.#diagnostics.push(diagnostic);
    this.#status = {
      ...this.#status,
      diagnostics: [...this.#status.diagnostics, message].slice(-8),
    };
    this.#emitEvent({ type: "diagnostic", diagnostic });
  }

  #emitView(): void {
    this.#emitEvent({ type: "session-view", view: this.view() });
  }

  #emitEvent(
    value:
      | Omit<Extract<OwnedUiEvent, { type: "session-lifecycle" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "session-view" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "editor-state" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "status" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "command-outcome" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "terminal-surface" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "diagnostic" }>, "sessionId" | "sequence">,
  ): void {
    const event = this.#event(value);
    for (const listener of this.#listeners) listener(event);
  }

  #event(
    value:
      | Omit<Extract<OwnedUiEvent, { type: "session-lifecycle" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "session-view" }>, "sessionId" | "sequence">
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
