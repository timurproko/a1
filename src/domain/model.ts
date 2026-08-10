export type WorkspaceId = string;
export type AgentId = string;
export type GenerationId = string;
export type DriverProfileId = string;
export type RequestId = string;

export interface TerminalDimensions {
  readonly columns: number;
  readonly rows: number;
}

export interface TerminalCell {
  readonly character: string;
  readonly width: number;
  readonly foreground?: number;
  readonly background?: number;
  readonly attributes: number;
}

export interface TerminalCursor {
  readonly column: number;
  readonly row: number;
  readonly visible: boolean;
}

export interface TerminalSurface {
  readonly columns: number;
  readonly rows: number;
  readonly cells: readonly (readonly TerminalCell[])[];
  readonly cursor: TerminalCursor;
  readonly revision: number;
  readonly final: boolean;
}

export type LifecycleState = "starting" | "ready" | "running" | "exited" | "stopped" | "error";
export type Capability = "terminal-surface" | "terminal-input" | "terminal-resize" | "process-stop";

export interface LogicalWorkspace {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly agentIds: readonly AgentId[];
  readonly selectedAgentId: AgentId | null;
  readonly createdAt: string;
}

export interface NativePiProfile {
  readonly id: DriverProfileId;
  readonly kind: "native-pi";
  readonly executable: "pi";
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly terminalType: string;
  readonly dimensions: TerminalDimensions;
  readonly resume: "none";
}

export interface ProcessGeneration {
  readonly id: GenerationId;
  readonly agentId: AgentId;
  readonly sequence: number;
  readonly profileId: DriverProfileId;
  readonly state: LifecycleState;
  readonly capabilities: readonly Capability[];
  readonly startedAt: string;
  readonly exitedAt: string | null;
  readonly exitCode: number | null;
  readonly signal: number | null;
  readonly error: string | null;
}

export interface LogicalTerminalAgent {
  readonly id: AgentId;
  readonly workspaceId: WorkspaceId;
  readonly name: string;
  readonly driverKind: "terminal";
  readonly profile: NativePiProfile;
  readonly currentGeneration: ProcessGeneration;
  readonly surface: TerminalSurface | null;
  readonly createdAt: string;
}

export interface SupervisorSnapshot {
  readonly revision: number;
  readonly workspace: LogicalWorkspace;
  readonly agents: readonly LogicalTerminalAgent[];
}

export type SupervisorCommand =
  | { readonly type: "create-terminal-agent"; readonly requestId: RequestId; readonly cwd: string; readonly dimensions: TerminalDimensions }
  | { readonly type: "terminal-input"; readonly requestId: RequestId; readonly agentId: AgentId; readonly generationId: GenerationId; readonly data: string }
  | { readonly type: "terminal-resize"; readonly requestId: RequestId; readonly agentId: AgentId; readonly generationId: GenerationId; readonly dimensions: TerminalDimensions }
  | { readonly type: "stop-agent"; readonly requestId: RequestId; readonly agentId: AgentId; readonly generationId: GenerationId }
  | { readonly type: "resynchronize"; readonly requestId: RequestId };

export type AddOneEvent =
  | { readonly type: "agent-created"; readonly agent: LogicalTerminalAgent }
  | { readonly type: "selection-changed"; readonly workspaceId: WorkspaceId; readonly agentId: AgentId | null }
  | { readonly type: "generation-ready"; readonly agentId: AgentId; readonly generationId: GenerationId }
  | { readonly type: "terminal-surface-updated"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly surface: TerminalSurface }
  | { readonly type: "generation-exited"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly exitCode: number | null; readonly signal: number | null; readonly surface: TerminalSurface | null }
  | { readonly type: "generation-failed"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly message: string };

export interface OrderedEvent {
  readonly revision: number;
  readonly event: AddOneEvent;
}

export interface CommandResult {
  readonly requestId: RequestId;
  readonly ok: boolean;
  readonly revision: number;
  readonly error?: { readonly code: "invalid-command" | "not-found" | "stale-generation" | "capability-error" | "driver-error"; readonly message: string };
}

export function assertDimensions(dimensions: TerminalDimensions): void {
  if (!Number.isInteger(dimensions.columns) || dimensions.columns < 2 || dimensions.columns > 500) {
    throw new RangeError("terminal columns must be an integer from 2 to 500");
  }
  if (!Number.isInteger(dimensions.rows) || dimensions.rows < 1 || dimensions.rows > 300) {
    throw new RangeError("terminal rows must be an integer from 1 to 300");
  }
}
