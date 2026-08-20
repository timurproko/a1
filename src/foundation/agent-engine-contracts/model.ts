export const AGENT_ENGINE_CONTRACT_VERSION = 1 as const;

export type AgentSessionId = string;
export type AgentCommandId = string;
export type AgentEventSequence = number;
export type AgentSessionLifecycle = "starting" | "ready" | "busy" | "stopping" | "stopped" | "failed";

export type AgentCommandCapability =
  | "prompt"
  | "steer"
  | "follow-up"
  | "abort"
  | "retry"
  | "compact"
  | "bash"
  | "replace-session";

export type AgentEventCapability =
  | "lifecycle"
  | "content"
  | "command-outcome"
  | "snapshot-invalidated"
  | "diagnostic";

export interface AgentCapabilityContract {
  readonly contractVersion: typeof AGENT_ENGINE_CONTRACT_VERSION;
  readonly commands: readonly AgentCommandCapability[];
  readonly events: readonly AgentEventCapability[];
  readonly snapshots: {
    readonly supported: boolean;
    readonly maxBytes: number;
  };
}

interface AgentCommandEnvelope {
  readonly contractVersion: typeof AGENT_ENGINE_CONTRACT_VERSION;
  readonly commandId: AgentCommandId;
  readonly sessionId: AgentSessionId;
}

export type AgentCommand =
  | (AgentCommandEnvelope & { readonly type: "prompt" | "steer" | "follow-up"; readonly text: string })
  | (AgentCommandEnvelope & { readonly type: "abort" | "retry" | "compact" })
  | (AgentCommandEnvelope & { readonly type: "bash"; readonly command: string })
  | (AgentCommandEnvelope & { readonly type: "replace-session"; readonly source: { readonly kind: "new" } | { readonly kind: "resume"; readonly sessionPath: string } });

export type AgentCommandOutcome = "accepted" | "completed" | "rejected" | "failed" | "cancelled";

interface AgentEventEnvelope {
  readonly contractVersion: typeof AGENT_ENGINE_CONTRACT_VERSION;
  readonly sessionId: AgentSessionId;
  readonly sequence: AgentEventSequence;
}

export type AgentEvent =
  | (AgentEventEnvelope & { readonly type: "lifecycle"; readonly lifecycle: AgentSessionLifecycle; readonly reason: string | null })
  | (AgentEventEnvelope & { readonly type: "content"; readonly content: { readonly id: string; readonly role: "user" | "assistant" | "tool" | "system"; readonly status: "streaming" | "final"; readonly text: string } })
  | (AgentEventEnvelope & { readonly type: "command-outcome"; readonly commandId: AgentCommandId; readonly outcome: AgentCommandOutcome; readonly diagnostic: string | null })
  | (AgentEventEnvelope & { readonly type: "snapshot-invalidated"; readonly expectedRevision: number })
  | (AgentEventEnvelope & { readonly type: "diagnostic"; readonly code: string; readonly message: string; readonly recoverable: boolean });

export interface AgentSnapshot {
  readonly contractVersion: typeof AGENT_ENGINE_CONTRACT_VERSION;
  readonly snapshotId: string;
  readonly sessionId: AgentSessionId;
  readonly revision: number;
  readonly sequence: AgentEventSequence;
  readonly lifecycle: AgentSessionLifecycle;
  readonly content: readonly Extract<AgentEvent, { readonly type: "content" }>["content"][];
  readonly activeCommandIds: readonly AgentCommandId[];
  readonly capabilities: AgentCapabilityContract;
}
