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
import { createPiPresentationRuntime, createPiTerminalBridge } from "../foundation/pi-tui-runtime-adapter/index.js";
import {
  assertPresentationComponent,
  assertPresentationRuntime,
  type OwnedUiApplicationPort,
  type PresentationComponentPort,
  type PresentationRuntimePort,
  type PresentationTerminalPort,
} from "../foundation/presentation-contracts/index.js";
import type { OwnedUiCommand, OwnedUiEvent, OwnedUiTranscriptBlock } from "../foundation/owned-ui-contracts/index.js";
import { OwnedUiSessionShell } from "../foundation/pi-owned-ui-integration/index.js";
import { OwnedUiSettingsSession, OwnedUiSettingsStore } from "../foundation/owned-ui-settings/index.js";
import { UiAppHost, UiAppRegistry } from "../foundation/ui-apps/index.js";
import { piTheme } from "../foundation/pi-component-adapter/index.js";
import type { UiTheme, UiThemeToken } from "../foundation/ui-components/index.js";
import { SETTINGS_APP_ID, SETTINGS_ROUTE, SettingsApp } from "../features/owned-ui/index.js";
import type { UiRouteHost, UiRouteSurface } from "../foundation/pi-owned-ui-integration/index.js";
import { resolveProductPaths } from "../foundation/lifecycle/index.js";

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

export interface OwnedUiCompositionOptions {
  readonly cwd?: string;
  readonly terminal?: PresentationTerminalPort;
  readonly createPiAdapter?: () => Promise<PiEngineAdapter>;
  /**
   * A1 profile whose settings this session reads and writes. Omitted keeps the
   * session settings-free, which is what the pinned comparison paths use.
   */
  readonly profileId?: string;
}

export interface OwnedUiComposition {
  readonly application: OwnedUiApplicationPort;
  /** Present when a profile was supplied, so the caller can resolve settings before start. */
  readonly settings: OwnedUiSettingsSession | null;
}

export async function composeOwnedUiApplication(options: OwnedUiCompositionOptions = {}): Promise<OwnedUiApplicationPort> {
  return (await composeOwnedUi(options)).application;
}

export async function composeOwnedUi(options: OwnedUiCompositionOptions = {}): Promise<OwnedUiComposition> {
  const cwd = options.cwd ?? process.cwd();
  const adapter = options.createPiAdapter ? await options.createPiAdapter() : await createPiEngineAdapter({ cwd });
  const settings = options.profileId === undefined
    ? null
    : new OwnedUiSettingsSession({
      store: new OwnedUiSettingsStore({ configDir: resolveProductPaths().configDir, profileId: options.profileId }),
      agentProvider: () => adapter.settingsPort(),
    });
  const routeHost = settings === null ? null : createOwnedRouteHost(settings);
  const shell = new OwnedUiSessionShell({
    backend: adapter,
    cwd,
    ...(options.terminal === undefined ? {} : { terminal: createPiTerminalBridge(options.terminal) }),
    ...(routeHost === null ? {} : { routeHost }),
  });
  const application: OwnedUiApplicationPort = {
    get disposed() { return adapter.disposed; },
    start: () => shell.start(),
    flush: () => adapter.flushEvents(),
    waitUntilStopped: () => shell.waitUntilStopped(),
    dispose: () => shell.dispose(),
  };
  return { application, settings };
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
      const runtime = options.presentationFactory?.(root, terminal) ?? createPiPresentationRuntime(root, terminal);
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

/**
 * Registers the A1-owned screens and adapts the app host to the shell's route
 * seam. The shell mounts whatever surface it is handed and forwards keys; it
 * never learns what an app is.
 */
export function createOwnedRouteHost(settings: OwnedUiSettingsSession): UiRouteHost {
  const registry = new UiAppRegistry();
  registry.register({ id: SETTINGS_APP_ID, route: SETTINGS_ROUTE, create: () => new SettingsApp(settings) });

  return {
    claims: route => registry.forRoute(route) !== null,
    open: route => {
      const registration = registry.forRoute(route);
      if (registration === null) return null;

      let size = { width: 80, height: 24 };
      let frame: readonly string[] = [];
      let closed = false;
      let onRender: () => void = () => undefined;

      const host = new UiAppHost({
        registry,
        closeOnInterrupt: true,
        theme: pinnedTheme(),
        surface: {
          size: () => size,
          requestRender: () => onRender(),
          present: lines => {
            if (lines === null) closed = true;
            else frame = lines;
          },
        },
      });
      host.open(registration.id);

      const surface: UiRouteSurface = {
        id: registration.id,
        render: (width, height) => {
          size = { width, height };
          host.render();
          return frame.length === height ? frame : [...frame.slice(0, height), ...Array(Math.max(0, height - frame.length)).fill("")];
        },
        handleInput: data => host.handleInput(data).consumed,
        isClosed: () => closed || !host.isPresenting,
        close: () => host.close(),
        onRenderRequested: listener => { onRender = listener; },
      };
      return surface;
    },
  };
}

/** Maps A1 UI tokens onto the pinned Pi theme so owned screens match the shell. */
function pinnedTheme(): UiTheme {
  return {
    fg: (token: UiThemeToken, text: string) => piTheme().fg(token === "error" ? "error" : token, text),
    bold: (text: string) => piTheme().bold(text),
    highlight: (text: string) => `[7m${text}[27m`,
  };
}
