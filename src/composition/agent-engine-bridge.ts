import {
  AGENT_ENGINE_CONTRACT_VERSION,
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
import type { OwnedUiCommand, OwnedUiEvent, OwnedUiTranscriptBlock } from "../foundation/owned-ui-contracts/index.js";
import type { PiEngineAdapter } from "../foundation/pi-engine-adapter/index.js";

const CAPABILITIES: AgentCapabilityContract = {
  contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
  commands: ["prompt", "steer", "follow-up", "abort", "retry", "compact", "bash", "replace-session"],
  events: ["lifecycle", "content", "command-outcome", "snapshot-invalidated", "diagnostic"],
  snapshots: { supported: true, maxBytes: 1024 * 1024 },
};

export function createPiAgentEngineBridge(adapter: PiEngineAdapter, cwd: string): AgentEnginePort {
  return new PiAgentEngineBridge(adapter, cwd);
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
    const result = await this.adapter.execute(toOwnedCommand(command));
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
