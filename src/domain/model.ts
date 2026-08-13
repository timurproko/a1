export type WorkspaceId = string;
export type AgentId = string;
export type GenerationId = string;
export type DriverProfileId = string;
export type RequestId = string;
export type ForegroundTerminalLeaseId = string;

export interface TerminalDimensions {
  readonly columns: number;
  readonly rows: number;
}

export type LifecycleState = "starting" | "ready" | "running" | "exited" | "stopped" | "interrupted" | "error";
export type Capability = "process-stop" | "transparent-terminal";
export type TerminalCapability = "transparent" | "composed";
export type TerminalRecoveryLevel = "exact" | "best-effort" | "detach-only" | "none";

export interface LogicalWorkspace {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly agentIds: readonly AgentId[];
  readonly selectedAgentId: AgentId | null;
  readonly createdAt: string;
}

/** Legacy launch metadata retained only until the transparent profile contract is introduced. */
export interface TerminalProfileBase {
  readonly id: DriverProfileId;
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly terminalType: string;
  readonly dimensions: TerminalDimensions;
  readonly resume: "none" | "best-effort" | "exact";
}

export interface NativePiProfile extends TerminalProfileBase {
  readonly kind: "native-pi";
  readonly resume: "none";
}

export interface CommandTerminalProfile extends TerminalProfileBase {
  readonly kind: "command";
}

export interface ShellTerminalProfile extends TerminalProfileBase {
  readonly kind: "shell";
  readonly shellIntegration: "none";
}

export type TerminalAgentProfile = NativePiProfile | CommandTerminalProfile | ShellTerminalProfile;

/** Exact application-agnostic launch request for native terminal attachment. */
export interface TransparentTerminalLaunchProfile {
  readonly id: DriverProfileId;
  readonly terminalCapability: "transparent";
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly terminalType: string;
  readonly dimensions: TerminalDimensions;
  readonly ownerDisconnect: "stop" | "detach";
  readonly recovery: "detach-only" | "none";
  readonly surface: "none";
  readonly visualReconnection: "none";
}

/** Boot-observed identity used to reject stale ownership and PID reuse. */
export interface NativeProcessIdentity {
  readonly pid: number;
  readonly startIdentity: string;
}

export type TransparentTerminalLifecycleOutcome =
  | { readonly kind: "exited"; readonly exitCode: number }
  | { readonly kind: "signaled"; readonly signal: string }
  | { readonly kind: "stopped"; readonly reason: "owner-disconnect" | "user-request" | "update" }
  | { readonly kind: "detached"; readonly reason: "owner-disconnect" }
  | { readonly kind: "spawn-error" | "broker-error"; readonly message: string; readonly code: string | null };

export type ForegroundTerminalLeaseState = "requested" | "active" | "released";

export interface ForegroundTerminalLease {
  readonly id: ForegroundTerminalLeaseId;
  readonly ownerId: string;
  readonly profile: TransparentTerminalLaunchProfile;
  readonly state: ForegroundTerminalLeaseState;
  readonly generationId: GenerationId | null;
  readonly processIdentity: NativeProcessIdentity | null;
  readonly acquiredAt: string;
  readonly heartbeatAt: string | null;
  readonly releasedAt: string | null;
  readonly outcome: TransparentTerminalLifecycleOutcome | null;
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
  /** Supervisor boot that established the live runtime handle, when known. */
  readonly ownerBootNonce?: string | null;
}

export interface LogicalTerminalAgent {
  readonly id: AgentId;
  readonly workspaceId: WorkspaceId;
  readonly name: string;
  readonly driverKind: "terminal";
  readonly profile: TerminalAgentProfile;
  readonly currentGeneration: ProcessGeneration;
  readonly createdAt: string;
}

export interface SupervisorSnapshot {
  readonly revision: number;
  readonly workspace: LogicalWorkspace;
  readonly agents: readonly LogicalTerminalAgent[];
}

export type SupervisorCommand =
  | { readonly type: "create-terminal-agent"; readonly requestId: RequestId; readonly cwd: string; readonly dimensions: TerminalDimensions }
  | { readonly type: "ensure-initial-terminal-agent"; readonly requestId: RequestId; readonly cwd: string; readonly dimensions: TerminalDimensions }
  | { readonly type: "acquire-foreground-terminal-lease"; readonly requestId: RequestId; readonly leaseId: ForegroundTerminalLeaseId; readonly ownerId: string; readonly profile: TransparentTerminalLaunchProfile }
  | { readonly type: "activate-foreground-terminal-lease"; readonly requestId: RequestId; readonly leaseId: ForegroundTerminalLeaseId; readonly generationId: GenerationId; readonly processIdentity: NativeProcessIdentity }
  | { readonly type: "heartbeat-foreground-terminal-lease"; readonly requestId: RequestId; readonly leaseId: ForegroundTerminalLeaseId; readonly processIdentity: NativeProcessIdentity }
  | { readonly type: "release-foreground-terminal-lease"; readonly requestId: RequestId; readonly leaseId: ForegroundTerminalLeaseId; readonly processIdentity: NativeProcessIdentity | null; readonly outcome: TransparentTerminalLifecycleOutcome }
  | { readonly type: "stop-agent"; readonly requestId: RequestId; readonly agentId: AgentId; readonly generationId: GenerationId }
  | { readonly type: "resynchronize"; readonly requestId: RequestId };

export type AddOneEvent =
  | { readonly type: "agent-created"; readonly agent: LogicalTerminalAgent }
  | { readonly type: "selection-changed"; readonly workspaceId: WorkspaceId; readonly agentId: AgentId | null }
  | { readonly type: "generation-ready"; readonly agentId: AgentId; readonly generationId: GenerationId }
  | { readonly type: "generation-exited"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly exitCode: number | null; readonly signal: number | null }
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

export function assertTransparentTerminalLaunchProfile(profile: TransparentTerminalLaunchProfile): void {
  if (!profile.id || profile.terminalCapability !== "transparent") throw new TypeError("invalid transparent terminal profile identity");
  if (!profile.executable || profile.executable.includes("\0")) throw new TypeError("transparent executable must be non-empty and contain no null byte");
  if (!profile.cwd || profile.cwd.includes("\0")) throw new TypeError("transparent working directory must be non-empty and contain no null byte");
  if (profile.arguments.some(value => typeof value !== "string" || value.includes("\0"))) throw new TypeError("transparent arguments must contain no null byte");
  if (Object.entries(profile.environment).some(([name, value]) => !name || name.includes("=") || name.includes("\0") || value.includes("\0"))) {
    throw new TypeError("transparent environment contains an invalid name or value");
  }
  if (!profile.terminalType || profile.terminalType.includes("\0")) throw new TypeError("transparent terminal type is invalid");
  assertDimensions(profile.dimensions);
  if (profile.surface !== "none" || profile.visualReconnection !== "none") throw new TypeError("transparent profiles cannot declare a surface or visual reconnection");
  if (profile.ownerDisconnect === "detach" && profile.recovery !== "detach-only") throw new TypeError("transparent detach policy requires detach-only recovery");
  if (profile.ownerDisconnect === "stop" && profile.recovery !== "none") throw new TypeError("transparent stop policy requires no recovery claim");
}

export function assertNativeProcessIdentity(identity: NativeProcessIdentity): void {
  if (!Number.isSafeInteger(identity.pid) || identity.pid <= 0 || !identity.startIdentity || identity.startIdentity.includes("\0")) {
    throw new TypeError("invalid native process identity");
  }
}
