import {
  AGENT_ENGINE_CONTRACT_VERSION,
  type AgentCapabilityContract,
  type AgentCommand,
  type AgentCommandOutcome,
  type AgentEnginePort,
  type AgentEvent,
  type AgentSessionLifecycle,
  type AgentSessionPort,
  type AgentSnapshot,
} from "../../../src/foundation/agent-engine-contracts/index.js";
import type {
  OwnedUiApplicationPort,
  PresentationComponentPort,
  PresentationOverlayHandle,
  PresentationOverlayOptions,
  PresentationRuntimePort,
  PresentationRuntimeState,
  PresentationTerminalPort,
} from "../../../src/foundation/presentation-contracts/index.js";

export const TEST_AGENT_CAPABILITIES: AgentCapabilityContract = {
  contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
  commands: ["prompt", "steer", "follow-up", "abort", "retry", "compact", "bash", "replace-session"],
  events: ["lifecycle", "content", "command-outcome", "snapshot-invalidated", "diagnostic"],
  snapshots: { supported: true, maxBytes: 256 * 1024 },
};

export class TestAgentSession implements AgentSessionPort {
  lifecycle: AgentSessionLifecycle = "ready";
  readonly capabilities = TEST_AGENT_CAPABILITIES;
  readonly commands: AgentCommand[] = [];
  readonly #listeners = new Set<(event: AgentEvent) => void>();
  constructor(readonly sessionId = "test-session") {}
  async execute(command: AgentCommand): Promise<AgentCommandOutcome> { this.commands.push(command); return "completed"; }
  subscribe(listener: (event: AgentEvent) => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  emit(event: AgentEvent): void { for (const listener of this.#listeners) listener(event); }
  async snapshot(): Promise<AgentSnapshot> {
    return { contractVersion: AGENT_ENGINE_CONTRACT_VERSION, snapshotId: "snapshot-1", sessionId: this.sessionId, revision: 0, sequence: 0, lifecycle: this.lifecycle, content: [], activeCommandIds: [], capabilities: this.capabilities };
  }
  async dispose(): Promise<void> { this.lifecycle = "stopped"; this.#listeners.clear(); }
}

export class TestAgentEngine implements AgentEnginePort {
  readonly capabilities = TEST_AGENT_CAPABILITIES;
  readonly session: TestAgentSession;
  disposed = false;
  constructor(sessionId = "test-session") { this.session = new TestAgentSession(sessionId); }
  async createSession(): Promise<TestAgentSession> { return this.session; }
  async dispose(): Promise<void> { this.disposed = true; await this.session.dispose(); }
}

export class TestPresentationTerminal implements PresentationTerminalPort {
  columns = 80;
  rows = 24;
  readonly enhancedKeyboard = false;
  readonly kittyProtocolActive = false;
  readonly writes: string[] = [];
  active = false;
  #input: ((data: string) => void) | undefined;
  #resize: (() => void) | undefined;
  start(onInput: (data: string) => void = () => {}, onResize: () => void = () => {}): void { this.active = true; this.#input = onInput; this.#resize = onResize; }
  stop(): void { this.active = false; this.#input = undefined; this.#resize = undefined; }
  async drainInput(): Promise<void> {}
  write(text: string): void { this.writes.push(text); }
  input(data: string): void { this.#input?.(data); }
  resize(columns: number, rows: number): void { this.columns = columns; this.rows = rows; this.#resize?.(); }
  moveBy(): void {}
  hideCursor(): void { this.write("\x1b[?25l"); }
  showCursor(): void { this.write("\x1b[?25h"); }
  clearLine(): void { this.write("\x1b[K"); }
  clearFromCursor(): void { this.write("\x1b[J"); }
  clearScreen(): void { this.write("\x1b[2J\x1b[H"); }
  setTitle(): void {}
  setProgress(): void {}
}

export class TestOwnedUiApplication implements OwnedUiApplicationPort {
  disposed = false;
  readonly calls: string[] = [];
  start(): void { this.calls.push("start"); }
  async flush(): Promise<void> { this.calls.push("flush"); }
  async waitUntilStopped(): Promise<void> { this.calls.push("wait"); }
  async dispose(): Promise<void> { this.calls.push("dispose"); this.disposed = true; }
}

export class TestPresentationRuntime implements PresentationRuntimePort {
  state: PresentationRuntimeState = "idle";
  constructor(readonly terminal: TestPresentationTerminal = new TestPresentationTerminal()) {}
  start(): void { this.terminal.start(); this.state = "running"; }
  render(): void {}
  showOverlay(_component: PresentationComponentPort, _options: PresentationOverlayOptions): PresentationOverlayHandle {
    let visible = true;
    return { get visible() { return visible; }, hide() { visible = false; }, show() { visible = true; }, focus() {}, dispose() { visible = false; } };
  }
  async stop(): Promise<void> { this.state = "stopping"; this.terminal.stop(); this.state = "stopped"; }
}

/** Temporary test-only bridge for consumers not yet inverted to AgentEnginePort. */
export function adapterRuntimeDouble(engine: TestAgentEngine = new TestAgentEngine()) {
  const listeners = new Set<(event: unknown) => void>();
  const session = {
    sessionId: engine.session.sessionId,
    model: null,
    thinkingLevel: "medium",
    isStreaming: false,
    isIdle: true,
    isRetrying: false,
    isCompacting: false,
    messages: [] as readonly unknown[],
    subscribe(listener: (event: unknown) => void) { listeners.add(listener); return () => listeners.delete(listener); },
    async prompt(text: string) { await engine.session.execute({ contractVersion: AGENT_ENGINE_CONTRACT_VERSION, type: "prompt", commandId: `prompt-${engine.session.commands.length}`, sessionId: engine.session.sessionId, text }); },
    async steer() {}, async followUp() {}, async abort() {}, abortRetry() {}, abortCompaction() {}, async compact() {}, async setModel() {}, setThinkingLevel() {},
    dispose() { void engine.session.dispose(); },
  };
  return {
    session,
    services: { modelRuntime: { getModel: () => undefined }, diagnostics: [] },
    diagnostics: [],
    setRebindSession() {}, async newSession() {}, async switchSession() {}, async dispose() { await engine.dispose(); },
  };
}
