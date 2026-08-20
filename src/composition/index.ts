import {
  AGENT_ENGINE_CONTRACT_VERSION,
  assertAgentCapabilityContract,
  assertAgentCommand,
  type AgentCapabilityContract,
  type AgentCommand,
  type AgentCommandOutcome,
  type AgentEnginePort,
  type AgentEvent,
  type AgentMessage,
  type AgentSessionLifecycle,
  type AgentSessionPort,
  type AgentSnapshot,
} from "../foundation/agent-engine-contracts/index.js";
import { createPiEngineAdapter, type PiEngineAdapter } from "../foundation/pi-engine-adapter/index.js";
import { PiTuiRuntimeAdapter, type PiTuiTerminalPort } from "../foundation/pi-tui-runtime-adapter/index.js";
import {
  assertPresentationComponent,
  assertPresentationRuntime,
  type PresentationComponentPort,
  type PresentationOverlayHandle,
  type PresentationOverlayOptions,
  type PresentationRuntimePort,
  type PresentationRuntimeState,
  type PresentationTerminalPort,
} from "../foundation/presentation-contracts/index.js";
import type { OwnedUiCommand, OwnedUiEvent, OwnedUiTranscriptBlock } from "../foundation/owned-ui-contracts/index.js";

const CAPABILITIES: AgentCapabilityContract = {
  contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
  commands: ["prompt", "steer", "follow-up", "abort", "retry", "compact", "bash", "replace-session"],
  events: ["lifecycle", "content", "command-outcome", "snapshot-invalidated", "diagnostic"],
  snapshots: { supported: true, maxBytes: 1024 * 1024 },
};

export interface ProcessCompositionOptions {
  readonly cwd?: string;
  readonly sessionId?: string;
  readonly engine?: AgentEnginePort;
  readonly presentationFactory?: (root: PresentationComponentPort, terminal: PresentationTerminalPort) => PresentationRuntimePort;
  readonly createPiAdapter?: () => Promise<PiEngineAdapter>;
}

export interface ProcessComposition {
  readonly engine: AgentEnginePort;
  createPresentation(root: PresentationComponentPort, terminal: PresentationTerminalPort): PresentationRuntimePort;
  dispose(): Promise<void>;
}

export async function composeProcess(options: ProcessCompositionOptions = {}): Promise<ProcessComposition> {
  let engine = options.engine;
  if (!engine) {
    const adapter = options.createPiAdapter
      ? await options.createPiAdapter()
      : await createPiEngineAdapter({
        ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
        ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
      });
    engine = new PiAgentEngineBridge(adapter, options.cwd ?? process.cwd());
  }
  assertAgentCapabilityContract(engine.capabilities);
  if (typeof engine.createSession !== "function" || typeof engine.dispose !== "function") throw new TypeError("composed engine does not satisfy the neutral engine port");
  const presentations = new Set<PresentationRuntimePort>();
  let disposed = false;
  return {
    engine,
    createPresentation(root, terminal) {
      if (disposed) throw new Error("process composition is disposed");
      assertPresentationComponent(root);
      const runtime = options.presentationFactory?.(root, terminal) ?? new PiPresentationRuntimeBridge(root, terminal);
      assertPresentationRuntime(runtime);
      presentations.add(runtime);
      return runtime;
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      const failures: unknown[] = [];
      for (const runtime of [...presentations].reverse()) await runtime.stop().catch(error => failures.push(error));
      await engine.dispose().catch(error => failures.push(error));
      if (failures.length) throw new AggregateError(failures, "process composition disposal failed");
    },
  };
}

class PiAgentEngineBridge implements AgentEnginePort {
  readonly capabilities = CAPABILITIES;
  #session: PiAgentSessionBridge | undefined;
  constructor(private readonly adapter: PiEngineAdapter, private readonly cwd: string) {}
  async createSession(input: { readonly sessionId: string; readonly cwd: string }): Promise<AgentSessionPort> {
    if (this.#session) return this.#session;
    if (input.cwd !== this.cwd) throw new TypeError("composed Pi engine cannot change working directory");
    await this.adapter.start();
    this.#session = new PiAgentSessionBridge(this.adapter, input.sessionId);
    return this.#session;
  }
  async dispose(): Promise<void> { await this.adapter.dispose(); }
}

class PiAgentSessionBridge implements AgentSessionPort {
  readonly capabilities = CAPABILITIES;
  lifecycle: AgentSessionLifecycle = "starting";
  readonly #listeners = new Set<(event: AgentEvent) => void>();
  readonly #unsubscribe: () => void;
  constructor(private readonly adapter: PiEngineAdapter, readonly sessionId: string) {
    this.#unsubscribe = adapter.onEvent(event => {
      const converted = convertEvent(event);
      if (!converted) return;
      if (converted.type === "lifecycle") this.lifecycle = converted.lifecycle;
      for (const listener of this.#listeners) listener(converted);
    });
    this.lifecycle = toLifecycle(adapter.snapshot().view.lifecycle);
  }
  async execute(command: AgentCommand): Promise<AgentCommandOutcome> {
    assertAgentCommand(command, this.capabilities);
    if (command.sessionId !== this.sessionId) return "rejected";
    if (command.type === "bash") {
      const result = await this.adapter.executeBashWorkflow(command.command, false);
      return !result.cancelled && result.exitCode === 0 ? "completed" : result.cancelled ? "cancelled" : "failed";
    }
    const owned = toOwnedCommand(command);
    const result = await this.adapter.execute(owned);
    return result.outcome === "timed-out" ? "failed" : result.outcome;
  }
  subscribe(listener: (event: AgentEvent) => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  async snapshot(): Promise<AgentSnapshot> {
    const snapshot = this.adapter.snapshot();
    return {
      contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
      snapshotId: snapshot.snapshotId,
      sessionId: this.sessionId,
      revision: snapshot.view.revision,
      sequence: snapshot.sequence,
      lifecycle: toLifecycle(snapshot.view.lifecycle),
      content: snapshot.view.transcript.map(toMessage),
      activeCommandIds: snapshot.view.activeCommandIds,
      capabilities: this.capabilities,
    };
  }
  async dispose(): Promise<void> { this.#unsubscribe(); this.#listeners.clear(); await this.adapter.dispose(); this.lifecycle = "stopped"; }
}

function toOwnedCommand(command: Exclude<AgentCommand, { readonly type: "bash" }>): OwnedUiCommand {
  const base = { correlationId: command.commandId, sessionId: command.sessionId };
  if (command.type === "replace-session") return command.source.kind === "new" ? { ...base, type: "new-session" } : { ...base, type: "resume-session", sessionPath: command.source.sessionPath };
  if (command.type === "prompt" || command.type === "steer" || command.type === "follow-up") return { ...base, type: command.type, text: command.text };
  return { ...base, type: command.type };
}

function convertEvent(event: OwnedUiEvent): AgentEvent | null {
  const base = { contractVersion: AGENT_ENGINE_CONTRACT_VERSION, sessionId: event.sessionId, sequence: event.sequence } as const;
  if (event.type === "session-lifecycle") return { ...base, type: "lifecycle", lifecycle: toLifecycle(event.lifecycle), reason: event.reason };
  if (event.type === "transcript-block") return { ...base, type: "content", content: toMessage(event.block) };
  if (event.type === "command-outcome") return { ...base, type: "command-outcome", commandId: event.correlationId, outcome: event.outcome === "timed-out" ? "failed" : event.outcome, diagnostic: event.diagnostic };
  if (event.type === "diagnostic") return { ...base, type: "diagnostic", code: event.diagnostic.code, message: event.diagnostic.message, recoverable: event.diagnostic.recoverable };
  if (event.type === "session-view") return { ...base, type: "snapshot-invalidated", expectedRevision: event.view.revision };
  return null;
}

function toLifecycle(lifecycle: "starting" | "ready" | "busy" | "suspended" | "stopping" | "stopped" | "failed"): AgentSessionLifecycle {
  return lifecycle === "suspended" ? "ready" : lifecycle;
}

function toMessage(block: OwnedUiTranscriptBlock): AgentMessage {
  const role = block.kind === "user" ? "user" : block.kind === "system" ? "system" : block.kind === "tool-call" || block.kind === "tool-result" ? "tool" : "assistant";
  return { id: block.id, role, status: block.status === "live" ? "streaming" : "final", content: [{ kind: "text", text: block.text }] };
}

class PiPresentationRuntimeBridge implements PresentationRuntimePort {
  readonly #runtime: PiTuiRuntimeAdapter;
  constructor(root: PresentationComponentPort, readonly terminal: PresentationTerminalPort) {
    this.#runtime = new PiTuiRuntimeAdapter({ root, terminal: toPiTerminal(terminal), mouse: false });
  }
  get state(): PresentationRuntimeState { return this.#runtime.state; }
  start(): void { this.#runtime.start(); }
  render(force?: boolean): void { this.#runtime.renderNow(force); }
  showOverlay(component: PresentationComponentPort, options: PresentationOverlayOptions): PresentationOverlayHandle {
    const handle = this.#runtime.showOverlay(component, {
      anchor: options.anchor === "top" ? "top-center" : options.anchor === "bottom" ? "bottom-center" : "center",
      ...(options.width === undefined ? {} : { width: options.width }),
    });
    return { get visible() { return !handle.isHidden(); }, hide: () => handle.hide(), show: () => handle.setHidden(false), focus: () => handle.focus(), dispose: () => handle.hide() };
  }
  async stop(): Promise<void> { await this.#runtime.stop(); }
}

function toPiTerminal(terminal: PresentationTerminalPort): PiTuiTerminalPort {
  return {
    get columns() { return terminal.columns; }, get rows() { return terminal.rows; }, get kittyProtocolActive() { return terminal.enhancedKeyboard; },
    start: (input, resize) => terminal.start(input, resize), stop: () => terminal.stop(), drainInput: (max, idle) => terminal.drainInput(max, idle), write: data => terminal.write(data),
    moveBy: lines => terminal.moveBy(lines), hideCursor: () => terminal.hideCursor(), showCursor: () => terminal.showCursor(), clearLine: () => terminal.clearLine(),
    clearFromCursor: () => terminal.clearFromCursor(), clearScreen: () => terminal.clearScreen(), setTitle: title => terminal.setTitle(title), setProgress: active => terminal.setProgress(active),
  };
}
