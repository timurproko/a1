import {
  AGENT_ENGINE_CONTRACT_VERSION,
  assertAgentCapabilityContract,
  assertAgentEvent,
  assertAgentSnapshot,
  type AgentCommandOutcome,
  type AgentEnginePort,
  type AgentEvent,
  type AgentMessage,
  type AgentSessionLifecycle,
  type AgentSessionPort,
  type AgentSnapshot,
} from "../../foundation/agent-engine-contracts/index.js";
import {
  WORKSPACE_CONTRACT_VERSION,
  type ManagedAgentDescriptor,
  type StructuredCapabilityContract,
} from "../../foundation/workspace-contracts/index.js";
import { presentWorkspace, type WorkspacePresentationModel } from "./presentation.js";
import { WorkspaceReducer, type WorkspaceView } from "./reducer.js";
import { WorkspaceRouter, type WorkspaceRouterResult } from "./router.js";

export interface StructuredWorkspaceLimits {
  readonly maxAgents: number;
  readonly maxMessagesPerAgent: number;
  readonly maxMessageBytes: number;
  readonly maxEditorBytes: number;
}

export interface StructuredWorkspaceTabsOptions {
  readonly workspaceId?: string;
  readonly cwd: string;
  readonly createEngine: (agentId: string) => Promise<AgentEnginePort>;
  readonly limits?: Partial<StructuredWorkspaceLimits>;
  readonly now?: () => string;
}

export interface StructuredAgentTabView {
  readonly role: "tabpanel";
  readonly agentId: string;
  readonly sessionId: string;
  readonly selected: boolean;
  readonly lifecycle: AgentSessionLifecycle;
  readonly transcript: readonly AgentMessage[];
  readonly toolMessages: readonly AgentMessage[];
  readonly editorText: string;
  readonly activeCommandIds: readonly string[];
  readonly lastSequence: number;
  readonly failure: string | null;
  readonly accessibleDescription: string;
}

export interface StructuredWorkspaceTabSelector {
  readonly role: "tab";
  readonly agentId: string;
  readonly label: string;
  readonly selected: boolean;
  readonly accessibleDescription: string;
}

export interface StructuredWorkspaceTabsView {
  readonly role: "tablist";
  readonly workspace: WorkspaceView;
  readonly presentation: WorkspacePresentationModel;
  readonly tabs: readonly StructuredWorkspaceTabSelector[];
  readonly panels: readonly StructuredAgentTabView[];
  readonly selectedPanel: StructuredAgentTabView | null;
}

export type StructuredWorkspaceTabsResult<T> =
  | { readonly kind: "applied"; readonly view: StructuredWorkspaceTabsView; readonly value: T }
  | { readonly kind: "rejected"; readonly code: string; readonly diagnostic: string };

interface MutableStructuredTab {
  readonly agentId: string;
  readonly sessionId: string;
  engine: AgentEnginePort;
  session: AgentSessionPort;
  unsubscribe: () => void;
  eventTail: Promise<void>;
  lifecycle: AgentSessionLifecycle;
  transcript: AgentMessage[];
  editorText: string;
  activeCommandIds: Set<string>;
  lastSequence: number;
  failure: string | null;
}

const DEFAULT_LIMITS: StructuredWorkspaceLimits = Object.freeze({
  maxAgents: 8,
  maxMessagesPerAgent: 512,
  maxMessageBytes: 256 * 1024,
  maxEditorBytes: 64 * 1024,
});

export class StructuredWorkspaceTabs {
  readonly router: WorkspaceRouter;
  readonly #cwd: string;
  readonly #createEngine: (agentId: string) => Promise<AgentEnginePort>;
  readonly #limits: StructuredWorkspaceLimits;
  readonly #now: () => string;
  readonly #tabs = new Map<string, MutableStructuredTab>();
  readonly #listeners = new Set<(view: StructuredWorkspaceTabsView) => void>();
  #disposed = false;

  constructor(options: StructuredWorkspaceTabsOptions) {
    if (!options.cwd || options.cwd.includes("\0")) throw new TypeError("structured workspace cwd is invalid");
    if (typeof options.createEngine !== "function") throw new TypeError("structured workspace engine factory is required");
    this.#cwd = options.cwd;
    this.#createEngine = options.createEngine;
    this.#limits = validateLimits({ ...DEFAULT_LIMITS, ...options.limits });
    this.#now = options.now ?? (() => new Date().toISOString());
    this.router = new WorkspaceRouter(new WorkspaceReducer(options.workspaceId ?? "workspace-default"));
  }

  subscribe(listener: (view: StructuredWorkspaceTabsView) => void): () => void {
    this.#listeners.add(listener);
    listener(this.view());
    return () => this.#listeners.delete(listener);
  }

  async createAgent(input: { readonly id: string; readonly displayName: string; readonly sessionId?: string }): Promise<StructuredWorkspaceTabsResult<StructuredAgentTabView>> {
    if (this.#disposed) return rejected("workspace-disposed", "structured workspace is disposed");
    if (this.#tabs.size >= this.#limits.maxAgents) return rejected("agent-limit", `structured workspace is limited to ${this.#limits.maxAgents} agents`);
    if (this.#tabs.has(input.id)) return rejected("duplicate-agent", `structured workspace agent already exists: ${input.id}`);

    const sessionId = input.sessionId ?? `${input.id}.session`;
    let runtime: { readonly engine: AgentEnginePort; readonly session: AgentSessionPort; readonly snapshot: AgentSnapshot };
    try {
      runtime = await this.#createRuntime(input.id, sessionId);
    } catch (error) {
      return rejected("engine-start-failed", diagnostic(error));
    }

    const descriptor: ManagedAgentDescriptor = {
      id: input.id,
      displayName: input.displayName,
      adapterId: `engine.${input.id}`,
      runtime: "structured",
      lifecycle: workspaceLifecycle(runtime.snapshot.lifecycle),
      capability: workspaceCapability(runtime.engine, input.id, this.#limits),
      createdAt: this.#now(),
      recoveryReferenceId: null,
    };
    const created = await this.router.createAgent(descriptor);
    if (created.kind === "rejected") {
      await disposeRuntime(runtime.session, runtime.engine);
      return created;
    }

    const tab: MutableStructuredTab = {
      agentId: input.id,
      sessionId,
      engine: runtime.engine,
      session: runtime.session,
      unsubscribe: () => {},
      eventTail: Promise.resolve(),
      lifecycle: runtime.snapshot.lifecycle,
      transcript: this.#boundedSnapshot(runtime.snapshot),
      editorText: "",
      activeCommandIds: new Set(runtime.snapshot.activeCommandIds),
      lastSequence: runtime.snapshot.sequence,
      failure: null,
    };
    tab.unsubscribe = tab.session.subscribe(event => this.#queueEvent(tab, event));
    this.#tabs.set(input.id, tab);
    await this.#reflectLifecycle(tab, runtime.snapshot.lifecycle, null);
    this.#notify();
    return applied(this.view(), this.#tabView(tab));
  }

  async selectAgent(agentId: string): Promise<StructuredWorkspaceTabsResult<StructuredAgentTabView>> {
    const selected = await this.router.selectAgent(agentId);
    if (selected.kind === "rejected") return selected;
    const tab = this.#tabs.get(agentId);
    if (!tab) return rejected("missing-runtime", `structured runtime is missing for ${agentId}`);
    this.#notify();
    return applied(this.view(), this.#tabView(tab));
  }

  setEditorText(agentId: string, text: string): StructuredWorkspaceTabsResult<StructuredAgentTabView> {
    const tab = this.#tabs.get(agentId);
    if (!tab) return rejected("unknown-agent", `structured workspace agent does not exist: ${agentId}`);
    if (typeof text !== "string" || byteLength(text) > this.#limits.maxEditorBytes) {
      return rejected("editor-limit", `structured editor exceeds ${this.#limits.maxEditorBytes} bytes`);
    }
    tab.editorText = text;
    this.#notify();
    return applied(this.view(), this.#tabView(tab));
  }

  async submitSelected(): Promise<StructuredWorkspaceTabsResult<{ readonly correlationId: string; readonly outcome: AgentCommandOutcome }>> {
    const selectedAgentId = this.router.view().selectedAgentId;
    if (!selectedAgentId) return rejected("no-selected-agent", "no structured workspace agent is selected");
    const tab = this.#tabs.get(selectedAgentId);
    if (!tab) return rejected("missing-runtime", `structured runtime is missing for ${selectedAgentId}`);
    return await this.sendPrompt(selectedAgentId, tab.editorText);
  }

  async sendPrompt(agentId: string, text: string): Promise<StructuredWorkspaceTabsResult<{ readonly correlationId: string; readonly outcome: AgentCommandOutcome }>> {
    if (typeof text !== "string" || text.length === 0) return rejected("empty-prompt", "structured prompt must not be empty");
    if (byteLength(text) > this.#limits.maxEditorBytes) return rejected("editor-limit", `structured prompt exceeds ${this.#limits.maxEditorBytes} bytes`);
    const routed = await this.router.sendStructuredCommand(agentId, "prompt", { text });
    if (routed.kind === "rejected") return routed;
    const tab = this.#tabs.get(agentId);
    if (!tab) return rejected("missing-runtime", `structured runtime is missing for ${agentId}`);

    const correlationId = routed.value.correlationId;
    tab.activeCommandIds.add(correlationId);
    if (tab.editorText === text) tab.editorText = "";
    let outcome: AgentCommandOutcome;
    try {
      outcome = await tab.session.execute({
        contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
        type: "prompt",
        commandId: correlationId,
        sessionId: tab.sessionId,
        text,
      });
    } catch (error) {
      outcome = "failed";
      await this.#failTab(tab, "command-failed", diagnostic(error));
    }
    if (outcome !== "accepted") {
      tab.activeCommandIds.delete(correlationId);
      await this.router.settleStructuredCommand(agentId, correlationId, outcome === "completed" ? "completed" : "failed");
    }
    this.#notify();
    return applied(this.view(), { correlationId, outcome });
  }

  async stopAgent(agentId: string): Promise<StructuredWorkspaceTabsResult<StructuredAgentTabView>> {
    const tab = this.#tabs.get(agentId);
    if (!tab) return rejected("unknown-agent", `structured workspace agent does not exist: ${agentId}`);
    tab.unsubscribe();
    try {
      await disposeRuntime(tab.session, tab.engine);
    } catch (error) {
      await this.#failTab(tab, "stop-failed", diagnostic(error));
      return rejected("stop-failed", diagnostic(error));
    }
    tab.lifecycle = "stopped";
    tab.activeCommandIds.clear();
    const stopped = await this.router.stopAgent(agentId);
    if (stopped.kind === "rejected") return stopped;
    this.#notify();
    return applied(this.view(), this.#tabView(tab));
  }

  async restartAgent(agentId: string): Promise<StructuredWorkspaceTabsResult<StructuredAgentTabView>> {
    const tab = this.#tabs.get(agentId);
    if (!tab) return rejected("unknown-agent", `structured workspace agent does not exist: ${agentId}`);
    await this.router.restartAgent(agentId);
    tab.unsubscribe();
    await disposeRuntime(tab.session, tab.engine).catch(() => undefined);
    try {
      const runtime = await this.#createRuntime(agentId, tab.sessionId);
      tab.engine = runtime.engine;
      tab.session = runtime.session;
      tab.lifecycle = runtime.snapshot.lifecycle;
      tab.transcript = this.#boundedSnapshot(runtime.snapshot);
      tab.activeCommandIds = new Set(runtime.snapshot.activeCommandIds);
      tab.lastSequence = runtime.snapshot.sequence;
      tab.failure = null;
      tab.eventTail = Promise.resolve();
      tab.unsubscribe = tab.session.subscribe(event => this.#queueEvent(tab, event));
      await this.#reflectLifecycle(tab, runtime.snapshot.lifecycle, null);
      this.#notify();
      return applied(this.view(), this.#tabView(tab));
    } catch (error) {
      await this.#failTab(tab, "restart-failed", diagnostic(error));
      return rejected("restart-failed", diagnostic(error));
    }
  }

  async refreshAgent(agentId: string): Promise<StructuredWorkspaceTabsResult<StructuredAgentTabView>> {
    const tab = this.#tabs.get(agentId);
    if (!tab) return rejected("unknown-agent", `structured workspace agent does not exist: ${agentId}`);
    try {
      const snapshot = await tab.session.snapshot();
      assertAgentSnapshot(snapshot);
      if (snapshot.sessionId !== tab.sessionId) throw new TypeError("structured snapshot session identity changed");
      tab.lifecycle = snapshot.lifecycle;
      tab.transcript = this.#boundedSnapshot(snapshot);
      tab.activeCommandIds = new Set(snapshot.activeCommandIds);
      tab.lastSequence = snapshot.sequence;
      tab.failure = null;
      await this.#reflectLifecycle(tab, snapshot.lifecycle, null);
      this.#notify();
      return applied(this.view(), this.#tabView(tab));
    } catch (error) {
      await this.#failTab(tab, "snapshot-failed", diagnostic(error));
      return rejected("snapshot-failed", diagnostic(error));
    }
  }

  async removeAgent(agentId: string): Promise<StructuredWorkspaceTabsResult<string>> {
    const tab = this.#tabs.get(agentId);
    if (!tab) return rejected("unknown-agent", `structured workspace agent does not exist: ${agentId}`);
    const removed = await this.router.removeAgent(agentId);
    if (removed.kind === "rejected") return removed;
    tab.unsubscribe();
    await disposeRuntime(tab.session, tab.engine).catch(() => undefined);
    this.#tabs.delete(agentId);
    this.#notify();
    return applied(this.view(), agentId);
  }

  async flush(): Promise<void> {
    await Promise.all([...this.#tabs.values()].map(tab => tab.eventTail));
  }

  view(): StructuredWorkspaceTabsView {
    const workspace = this.router.view();
    const panels = workspace.agents.flatMap(agent => {
      const tab = this.#tabs.get(agent.id);
      return tab ? [this.#tabView(tab)] : [];
    });
    const presentation = presentWorkspace(workspace);
    const rows = new Map(presentation.rows.map(row => [row.agentId, row]));
    const tabs = panels.map(panel => {
      const row = rows.get(panel.agentId);
      return Object.freeze({
        role: "tab" as const,
        agentId: panel.agentId,
        label: row?.label ?? panel.agentId,
        selected: panel.selected,
        accessibleDescription: row?.accessibleDescription ?? panel.accessibleDescription,
      });
    });
    return Object.freeze({
      role: "tablist",
      workspace,
      presentation,
      tabs: Object.freeze(tabs),
      panels: Object.freeze(panels),
      selectedPanel: panels.find(panel => panel.selected) ?? null,
    });
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    const failures: unknown[] = [];
    for (const tab of [...this.#tabs.values()].reverse()) {
      tab.unsubscribe();
      await tab.eventTail.catch(error => failures.push(error));
      await disposeRuntime(tab.session, tab.engine).catch(error => failures.push(error));
    }
    this.#tabs.clear();
    this.#listeners.clear();
    if (failures.length > 0) throw new AggregateError(failures, "structured workspace disposal failed");
  }

  async #createRuntime(agentId: string, sessionId: string): Promise<{ readonly engine: AgentEnginePort; readonly session: AgentSessionPort; readonly snapshot: AgentSnapshot }> {
    const engine = await this.#createEngine(agentId);
    try {
      assertAgentCapabilityContract(engine.capabilities);
      const session = await engine.createSession({ sessionId, cwd: this.#cwd });
      assertAgentCapabilityContract(session.capabilities);
      const snapshot = await session.snapshot();
      assertAgentSnapshot(snapshot);
      if (session.sessionId !== sessionId || snapshot.sessionId !== sessionId) throw new TypeError("structured session identity does not match its workspace tab");
      return { engine, session, snapshot };
    } catch (error) {
      await engine.dispose().catch(() => undefined);
      throw error;
    }
  }

  #queueEvent(tab: MutableStructuredTab, event: AgentEvent): void {
    tab.eventTail = tab.eventTail
      .then(() => this.#applyEvent(tab, event))
      .catch(error => this.#failTab(tab, "event-failed", diagnostic(error)))
      .then(() => this.#notify());
  }

  async #applyEvent(tab: MutableStructuredTab, event: AgentEvent): Promise<void> {
    assertAgentEvent(event, tab.session.capabilities);
    if (event.sessionId !== tab.sessionId) throw new TypeError("structured event crossed workspace tab identity");
    if (event.sequence <= tab.lastSequence) return;
    if (event.sequence !== tab.lastSequence + 1 || event.type === "snapshot-invalidated") {
      await this.refreshAgent(tab.agentId);
      return;
    }
    tab.lastSequence = event.sequence;
    if (event.type === "content") {
      this.#appendMessage(tab, event.content);
      await this.router.recordActivity(tab.agentId);
      return;
    }
    if (event.type === "lifecycle") {
      tab.lifecycle = event.lifecycle;
      await this.#reflectLifecycle(tab, event.lifecycle, event.reason);
      return;
    }
    if (event.type === "command-outcome") {
      tab.activeCommandIds.delete(event.commandId);
      await this.router.settleStructuredCommand(tab.agentId, event.commandId, event.outcome === "completed" ? "completed" : "failed");
      if (event.outcome === "failed") await this.router.requestAttention(tab.agentId);
      return;
    }
    if (event.type === "diagnostic") {
      if (event.recoverable) await this.router.requestAttention(tab.agentId);
      else await this.#failTab(tab, event.code, event.message);
    }
  }

  #appendMessage(tab: MutableStructuredTab, message: AgentMessage): void {
    if (byteLength(JSON.stringify(message)) > this.#limits.maxMessageBytes) throw new RangeError("structured message exceeds its workspace tab byte limit");
    tab.transcript.push(message);
    while (tab.transcript.length > this.#limits.maxMessagesPerAgent) tab.transcript.shift();
  }

  #boundedSnapshot(snapshot: AgentSnapshot): AgentMessage[] {
    if (byteLength(JSON.stringify(snapshot)) > snapshot.capabilities.snapshots.maxBytes) throw new RangeError("structured snapshot exceeds its negotiated byte limit");
    const messages = snapshot.content.slice(-this.#limits.maxMessagesPerAgent);
    for (const message of messages) {
      if (byteLength(JSON.stringify(message)) > this.#limits.maxMessageBytes) throw new RangeError("structured snapshot message exceeds its workspace tab byte limit");
    }
    return [...messages];
  }

  async #reflectLifecycle(tab: MutableStructuredTab, lifecycle: AgentSessionLifecycle, reason: string | null): Promise<void> {
    if (lifecycle === "ready" || lifecycle === "busy") await this.router.markRecovered(tab.agentId);
    else if (lifecycle === "starting") await this.router.restartAgent(tab.agentId);
    else if (lifecycle === "stopped") await this.router.stopAgent(tab.agentId);
    else if (lifecycle === "failed") await this.#failTab(tab, "engine-failed", reason ?? "structured engine failed");
  }

  async #failTab(tab: MutableStructuredTab, code: string, message: string): Promise<void> {
    tab.lifecycle = "failed";
    tab.failure = `${code}: ${message}`;
    tab.activeCommandIds.clear();
    await this.router.markFailed(tab.agentId, code, message);
  }

  #notify(): void {
    const view = this.view();
    for (const listener of this.#listeners) listener(view);
  }

  #tabView(tab: MutableStructuredTab): StructuredAgentTabView {
    const selected = this.router.view().selectedAgentId === tab.agentId;
    const toolMessages = tab.transcript.filter(message => message.role === "tool" || message.content.some(content => content.kind === "tool-call" || content.kind === "tool-result"));
    return Object.freeze({
      role: "tabpanel",
      agentId: tab.agentId,
      sessionId: tab.sessionId,
      selected,
      lifecycle: tab.lifecycle,
      transcript: Object.freeze([...tab.transcript]),
      toolMessages: Object.freeze(toolMessages),
      editorText: tab.editorText,
      activeCommandIds: Object.freeze([...tab.activeCommandIds]),
      lastSequence: tab.lastSequence,
      failure: tab.failure,
      accessibleDescription: `${selected ? "selected" : "background"} structured agent ${tab.agentId}; ${tab.lifecycle}; ${tab.transcript.length} messages`,
    });
  }
}

function workspaceCapability(engine: AgentEnginePort, agentId: string, limits: StructuredWorkspaceLimits): StructuredCapabilityContract {
  return {
    kind: "structured",
    protocolVersion: WORKSPACE_CONTRACT_VERSION,
    adapterId: `engine.${agentId}`,
    commands: Object.freeze([...engine.capabilities.commands]),
    eventTypes: Object.freeze([...engine.capabilities.events]),
    snapshots: engine.capabilities.snapshots.supported ? "authoritative" : "none",
    resume: engine.capabilities.snapshots.supported ? "snapshot" : "none",
    cancellation: engine.capabilities.commands.includes("abort") ? "correlated" : "none",
    attachmentTypes: Object.freeze([]),
    flow: Object.freeze({
      maxEventBytes: limits.maxMessageBytes,
      maxSnapshotBytes: engine.capabilities.snapshots.maxBytes,
      maxAttachmentBytes: limits.maxMessageBytes,
      maxQueuedEvents: limits.maxMessagesPerAgent,
      maxConcurrentCommands: 4,
      maxReconnectEvents: limits.maxMessagesPerAgent,
    }),
  };
}

function workspaceLifecycle(lifecycle: AgentSessionLifecycle): ManagedAgentDescriptor["lifecycle"] {
  if (lifecycle === "starting") return "creating";
  if (lifecycle === "stopping") return "stopping";
  if (lifecycle === "stopped") return "stopped";
  if (lifecycle === "failed") return "failed";
  return "ready";
}

function validateLimits(limits: StructuredWorkspaceLimits): StructuredWorkspaceLimits {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`structured workspace ${name} must be a positive safe integer`);
  }
  return Object.freeze(limits);
}

async function disposeRuntime(session: AgentSessionPort, engine: AgentEnginePort): Promise<void> {
  const failures: unknown[] = [];
  await session.dispose().catch(error => failures.push(error));
  await engine.dispose().catch(error => failures.push(error));
  if (failures.length > 0) throw new AggregateError(failures, "structured agent runtime disposal failed");
}

function applied<T>(view: StructuredWorkspaceTabsView, value: T): Extract<StructuredWorkspaceTabsResult<T>, { kind: "applied" }> {
  return { kind: "applied", view, value };
}

function rejected(code: string, message: string): Extract<StructuredWorkspaceTabsResult<never>, { kind: "rejected" }> {
  return { kind: "rejected", code, diagnostic: message };
}

function diagnostic(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
