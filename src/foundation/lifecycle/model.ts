import { PRODUCT_TEXT } from "../../product-identity.js";

export type LaunchProfileId = "addone" | "pi" | "sandbox";
export type GenerationId = string;
export type DriverProfileId = string;
export type RequestId = string;
export type ForegroundTerminalLeaseId = string;

export interface TerminalDimensions {
  readonly columns: number;
  readonly rows: number;
}

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

export interface SupervisorSnapshot {
  readonly revision: number;
}

export type SupervisorCommand =
  | { readonly type: "acquire-foreground-terminal-lease"; readonly requestId: RequestId; readonly leaseId: ForegroundTerminalLeaseId; readonly ownerId: string; readonly profile: TransparentTerminalLaunchProfile }
  | { readonly type: "activate-foreground-terminal-lease"; readonly requestId: RequestId; readonly leaseId: ForegroundTerminalLeaseId; readonly generationId: GenerationId; readonly processIdentity: NativeProcessIdentity }
  | { readonly type: "heartbeat-foreground-terminal-lease"; readonly requestId: RequestId; readonly leaseId: ForegroundTerminalLeaseId; readonly processIdentity: NativeProcessIdentity }
  | { readonly type: "release-foreground-terminal-lease"; readonly requestId: RequestId; readonly leaseId: ForegroundTerminalLeaseId; readonly processIdentity: NativeProcessIdentity | null; readonly outcome: TransparentTerminalLifecycleOutcome }
  | { readonly type: "resynchronize"; readonly requestId: RequestId };

export interface CommandResult {
  readonly requestId: RequestId;
  readonly ok: boolean;
  readonly revision: number;
  readonly error?: { readonly code: "invalid-command" | "not-found" | "stale-generation" | "capability-error" | "driver-error"; readonly message: string };
}

export function assertLaunchProfileId(value: unknown): asserts value is LaunchProfileId {
  if (value !== "addone" && value !== "pi" && value !== "sandbox") throw new TypeError(PRODUCT_TEXT.diagnostic(`launch profile is invalid: ${String(value)}`));
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
