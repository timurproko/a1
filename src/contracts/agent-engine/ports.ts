import type {
  AgentCapabilityContract,
  AgentCommand,
  AgentCommandOutcome,
  AgentEvent,
  AgentSessionId,
  AgentSessionLifecycle,
  AgentSnapshot,
} from "./model.js";

export interface AgentSessionPort {
  readonly sessionId: AgentSessionId;
  readonly lifecycle: AgentSessionLifecycle;
  readonly capabilities: AgentCapabilityContract;
  execute(command: AgentCommand): Promise<AgentCommandOutcome>;
  subscribe(listener: (event: AgentEvent) => void): () => void;
  snapshot(): Promise<AgentSnapshot>;
  dispose(): Promise<void>;
}

export interface AgentEnginePort {
  readonly capabilities: AgentCapabilityContract;
  createSession(input: { readonly sessionId: AgentSessionId; readonly cwd: string }): Promise<AgentSessionPort>;
  dispose(): Promise<void>;
}
