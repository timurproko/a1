export const WORKSPACE_CONTRACT_VERSION = 1 as const;
export const NATIVE_HOST_PROTOCOL_VERSION = 1 as const;

export type WorkspaceId = string;
export type AgentId = string;
export type AdapterId = string;
export type CorrelationId = string;
export type EventPosition = number;
export type WindowId = string;
export type TabId = string;
export type PaneId = string;
export type TerminalSessionId = string;
export type TopologyNodeId = string;
export type NativeHostInstanceId = string;
export type RecoveryReferenceId = string;

export type AgentRuntimeKind = "structured" | "composed-terminal";
export type AgentLifecycleState =
  | "creating"
  | "ready"
  | "inactive"
  | "stopping"
  | "stopped"
  | "failed"
  | "discontinuous";

export interface StructuredFlowLimits {
  readonly maxEventBytes: number;
  readonly maxSnapshotBytes: number;
  readonly maxAttachmentBytes: number;
  readonly maxQueuedEvents: number;
  readonly maxConcurrentCommands: number;
  readonly maxReconnectEvents: number;
}

export interface StructuredCapabilityContract {
  readonly kind: "structured";
  readonly protocolVersion: typeof WORKSPACE_CONTRACT_VERSION;
  readonly adapterId: AdapterId;
  readonly commands: readonly string[];
  readonly eventTypes: readonly string[];
  readonly snapshots: "none" | "authoritative";
  readonly resume: "none" | "position" | "snapshot";
  readonly cancellation: "none" | "correlated";
  readonly attachmentTypes: readonly string[];
  readonly flow: StructuredFlowLimits;
}

export interface ComposedTerminalCapabilityContract {
  readonly kind: "composed-terminal";
  readonly protocolVersion: typeof NATIVE_HOST_PROTOCOL_VERSION;
  readonly hostInstanceId: NativeHostInstanceId;
  readonly topologyRevision: number;
  readonly proofStatus: "unavailable" | "pending" | "accepted" | "rejected";
}

export type AgentCapabilityContract = StructuredCapabilityContract | ComposedTerminalCapabilityContract;

export interface ManagedAgentDescriptor {
  readonly id: AgentId;
  readonly displayName: string;
  readonly adapterId: AdapterId;
  readonly runtime: AgentRuntimeKind;
  readonly lifecycle: AgentLifecycleState;
  readonly capability: AgentCapabilityContract;
  readonly createdAt: string;
  readonly recoveryReferenceId: RecoveryReferenceId | null;
}

export interface TerminalDimensions {
  readonly columns: number;
  readonly rows: number;
  readonly widthPixels: number;
  readonly heightPixels: number;
}

export interface TerminalSessionLaunch {
  readonly id: TerminalSessionId;
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly dimensions: TerminalDimensions;
  readonly inactivity: "live-unpainted" | "pause-display" | "suspend" | "terminate";
}

export interface TerminalPane {
  readonly id: PaneId;
  readonly sessionId: TerminalSessionId;
}

export type TerminalTopologyNode =
  | { readonly id: TopologyNodeId; readonly kind: "leaf"; readonly paneId: PaneId }
  | {
    readonly id: TopologyNodeId;
    readonly kind: "split";
    readonly axis: "horizontal" | "vertical";
    readonly ratio: number;
    readonly first: TopologyNodeId;
    readonly second: TopologyNodeId;
  };

export interface TerminalTab {
  readonly id: TabId;
  readonly rootNodeId: TopologyNodeId;
  readonly focusedPaneId: PaneId;
  readonly nodes: readonly TerminalTopologyNode[];
  readonly panes: readonly TerminalPane[];
}

export interface TerminalWindow {
  readonly id: WindowId;
  readonly activeTabId: TabId;
  readonly tabs: readonly TerminalTab[];
}

export interface TerminalTopologySnapshot {
  readonly hostInstanceId: NativeHostInstanceId;
  readonly revision: number;
  readonly windows: readonly TerminalWindow[];
  readonly sessions: readonly TerminalSessionLaunch[];
}

export type WorkspaceCommand =
  | { readonly type: "create-agent"; readonly correlationId: CorrelationId; readonly agent: ManagedAgentDescriptor }
  | { readonly type: "select-agent"; readonly correlationId: CorrelationId; readonly agentId: AgentId }
  | { readonly type: "rename-agent"; readonly correlationId: CorrelationId; readonly agentId: AgentId; readonly displayName: string }
  | { readonly type: "stop-agent" | "restart-agent" | "remove-agent"; readonly correlationId: CorrelationId; readonly agentId: AgentId }
  | {
    readonly type: "structured-command";
    readonly correlationId: CorrelationId;
    readonly agentId: AgentId;
    readonly command: string;
    readonly payload: unknown;
  }
  | {
    readonly type: "cancel-structured-command";
    readonly correlationId: CorrelationId;
    readonly agentId: AgentId;
    readonly targetCorrelationId: CorrelationId;
  };

export type WorkspaceEvent =
  | { readonly type: "agent-lifecycle"; readonly agentId: AgentId; readonly position: EventPosition; readonly state: AgentLifecycleState }
  | { readonly type: "structured-event"; readonly agentId: AgentId; readonly position: EventPosition; readonly eventType: string; readonly payload: unknown }
  | { readonly type: "command-outcome"; readonly agentId: AgentId; readonly correlationId: CorrelationId; readonly outcome: "accepted" | "rejected" | "completed" | "failed" | "timed-out" | "cancelled" }
  | { readonly type: "terminal-topology"; readonly agentId: AgentId; readonly topology: TerminalTopologySnapshot }
  | { readonly type: "recovery-discontinuity"; readonly agentId: AgentId; readonly reason: string };

export interface WorkspaceSnapshot {
  readonly contractVersion: typeof WORKSPACE_CONTRACT_VERSION;
  readonly workspaceId: WorkspaceId;
  readonly revision: number;
  readonly selectedAgentId: AgentId | null;
  readonly agents: readonly ManagedAgentDescriptor[];
}

export interface StructuredAgentSnapshot {
  readonly contractVersion: typeof WORKSPACE_CONTRACT_VERSION;
  readonly agentId: AgentId;
  readonly snapshotId: string;
  readonly position: EventPosition;
  readonly authoritative: true;
  readonly payload: unknown;
}

export interface NativeHostHello {
  readonly protocolVersion: typeof NATIVE_HOST_PROTOCOL_VERSION;
  readonly hostInstanceId: NativeHostInstanceId;
  readonly buildId: string;
  readonly platform: "windows" | "macos" | "linux";
  readonly capabilities: readonly ("exact-command" | "revisioned-topology" | "native-input" | "native-rendering" | "retained-terminal-state")[];
}

export type NativeHostCommand =
  | { readonly type: "snapshot"; readonly correlationId: CorrelationId }
  | { readonly type: "apply-topology"; readonly correlationId: CorrelationId; readonly expectedRevision: number; readonly topology: TerminalTopologySnapshot }
  | { readonly type: "focus-pane"; readonly correlationId: CorrelationId; readonly expectedRevision: number; readonly paneId: PaneId }
  | { readonly type: "close-pane"; readonly correlationId: CorrelationId; readonly expectedRevision: number; readonly paneId: PaneId }
  | { readonly type: "shutdown"; readonly correlationId: CorrelationId };

export type NativeHostEvent =
  | { readonly type: "topology-changed"; readonly topology: TerminalTopologySnapshot }
  | { readonly type: "pane-ready"; readonly paneId: PaneId; readonly sessionId: TerminalSessionId }
  | { readonly type: "process-exited"; readonly paneId: PaneId; readonly sessionId: TerminalSessionId; readonly exitCode: number | null; readonly signal: string | null }
  | { readonly type: "host-degraded"; readonly code: string; readonly message: string };

export interface StructuredRecoveryAuthority {
  readonly kind: "structured";
  readonly referenceId: RecoveryReferenceId;
  readonly agentId: AgentId;
  readonly adapterId: AdapterId;
  readonly processIdentity: string;
  readonly ownershipProof: string;
  readonly boundary:
    | { readonly kind: "position"; readonly position: EventPosition; readonly resumeToken: string }
    | { readonly kind: "snapshot"; readonly snapshotId: string };
}

export interface ComposedRecoveryAuthority {
  readonly kind: "composed-terminal";
  readonly referenceId: RecoveryReferenceId;
  readonly agentId: AgentId;
  readonly hostInstanceId: NativeHostInstanceId;
  readonly hostBuildId: string;
  readonly processIdentity: string;
  readonly pseudoterminalIdentity: string;
  readonly retainedStateIdentity: string;
  readonly topologyRevision: number;
  readonly streamPosition: number;
}

export type AgentRecoveryAuthority = StructuredRecoveryAuthority | ComposedRecoveryAuthority;
