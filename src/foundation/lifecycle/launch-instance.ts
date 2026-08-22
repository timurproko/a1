import type { LaunchProfileId, NativeProcessIdentity } from "./model.js";
import { assertLaunchProfileId, assertNativeProcessIdentity } from "./model.js";

export type LaunchInstanceId = string;
export type LaunchInstanceState = "requested" | "active" | "stopping" | "completed" | "interrupted";
export type LaunchInstanceShutdownPolicy = "terminate-tree-on-close";
export type LaunchInstanceStopReason = "owner-disconnect" | "supervisor-disconnect" | "user-request" | "update";

export interface ProcessContainmentIdentity {
  readonly provider: string;
  readonly token: string;
}

export type LaunchInstanceOutcome =
  | { readonly kind: "exited"; readonly exitCode: number }
  | { readonly kind: "signaled"; readonly signal: string }
  | { readonly kind: "stopped"; readonly reason: LaunchInstanceStopReason }
  | { readonly kind: "spawn-error" | "guardian-error" | "cleanup-error"; readonly message: string; readonly code: string | null }
  | { readonly kind: "interrupted"; readonly reason: "owner-disconnect" | "supervisor-disconnect" | "guardian-exit" | "legacy-migration"; readonly message: string };

export interface LaunchInstance {
  readonly id: LaunchInstanceId;
  readonly ownerClientId: string;
  readonly profileId: LaunchProfileId;
  readonly state: LaunchInstanceState;
  readonly shutdownPolicy: LaunchInstanceShutdownPolicy;
  readonly guardianIdentity: NativeProcessIdentity;
  readonly rootIdentity: NativeProcessIdentity | null;
  readonly containmentIdentity: ProcessContainmentIdentity | null;
  readonly createdAt: string;
  readonly activatedAt: string | null;
  readonly stoppingAt: string | null;
  readonly completedAt: string | null;
  readonly outcome: LaunchInstanceOutcome | null;
}

const ALLOWED_TRANSITIONS = {
  requested: ["active", "completed", "interrupted"],
  active: ["stopping", "completed", "interrupted"],
  stopping: ["completed", "interrupted"],
  completed: [],
  interrupted: [],
} as const satisfies Readonly<Record<LaunchInstanceState, readonly LaunchInstanceState[]>>;

export function assertLaunchInstance(instance: LaunchInstance): void {
  assertIdentifier(instance.id, "launch instance identity");
  assertIdentifier(instance.ownerClientId, "launch instance owner identity");
  assertLaunchProfileId(instance.profileId);
  if (!(instance.state in ALLOWED_TRANSITIONS)) throw new TypeError(`invalid launch instance state: ${String(instance.state)}`);
  if (instance.shutdownPolicy !== "terminate-tree-on-close") throw new TypeError("launch instance shutdown policy must terminate its process tree on close");
  assertNativeProcessIdentity(instance.guardianIdentity);
  if (instance.rootIdentity !== null) assertNativeProcessIdentity(instance.rootIdentity);
  if (instance.containmentIdentity !== null) assertProcessContainmentIdentity(instance.containmentIdentity);
  assertTimestamp(instance.createdAt, "launch instance creation time");
  assertOptionalTimestamp(instance.activatedAt, "launch instance activation time");
  assertOptionalTimestamp(instance.stoppingAt, "launch instance stopping time");
  assertOptionalTimestamp(instance.completedAt, "launch instance completion time");
  if (instance.outcome !== null) assertLaunchInstanceOutcome(instance.outcome);

  if (instance.state === "requested") {
    if (instance.rootIdentity !== null || instance.containmentIdentity !== null || instance.activatedAt !== null) {
      throw new TypeError("requested launch instance cannot have active runtime ownership");
    }
    if (instance.stoppingAt !== null || instance.completedAt !== null || instance.outcome !== null) {
      throw new TypeError("requested launch instance cannot have stopping or terminal state");
    }
    return;
  }

  if (instance.state === "active" || instance.state === "stopping") {
    if (instance.rootIdentity === null || instance.containmentIdentity === null || instance.activatedAt === null) {
      throw new TypeError(`${instance.state} launch instance requires root and containment ownership`);
    }
    if (instance.completedAt !== null || instance.outcome !== null) throw new TypeError(`${instance.state} launch instance cannot have a terminal outcome`);
    if (instance.state === "active" && instance.stoppingAt !== null) throw new TypeError("active launch instance cannot have a stopping time");
    if (instance.state === "stopping" && instance.stoppingAt === null) throw new TypeError("stopping launch instance requires a stopping time");
    return;
  }

  if (instance.completedAt === null || instance.outcome === null) throw new TypeError("terminal launch instance requires completion time and outcome");
  if (instance.state === "completed" && instance.outcome.kind === "interrupted") throw new TypeError("completed launch instance cannot carry an interrupted outcome");
  if (instance.state === "interrupted" && instance.outcome.kind !== "interrupted" && instance.outcome.kind !== "cleanup-error") {
    throw new TypeError("interrupted launch instance requires an interrupted or cleanup-error outcome");
  }
}

export function assertLaunchInstanceTransition(previous: LaunchInstance, next: LaunchInstance): void {
  assertLaunchInstance(previous);
  assertLaunchInstance(next);
  if (previous.id !== next.id || previous.ownerClientId !== next.ownerClientId || previous.profileId !== next.profileId) {
    throw new TypeError("launch instance identity and ownership are immutable");
  }
  if (previous.shutdownPolicy !== next.shutdownPolicy
    || !sameProcessIdentity(previous.guardianIdentity, next.guardianIdentity)
    || previous.createdAt !== next.createdAt) {
    throw new TypeError("launch instance guardian, policy, and creation identity are immutable");
  }
  const allowedTransitions: readonly LaunchInstanceState[] = ALLOWED_TRANSITIONS[previous.state];
  if (!allowedTransitions.includes(next.state)) {
    throw new TypeError(`invalid launch instance transition: ${previous.state} -> ${next.state}`);
  }
  if (previous.rootIdentity !== null && !sameProcessIdentity(previous.rootIdentity, next.rootIdentity)) {
    throw new TypeError("launch instance root identity is immutable after activation");
  }
  if (previous.containmentIdentity !== null && !sameContainmentIdentity(previous.containmentIdentity, next.containmentIdentity)) {
    throw new TypeError("launch instance containment identity is immutable after activation");
  }
}

export function assertProcessContainmentIdentity(identity: ProcessContainmentIdentity): void {
  assertIdentifier(identity.provider, "process containment provider");
  assertIdentifier(identity.token, "process containment token");
}

export function assertLaunchInstanceOutcome(outcome: LaunchInstanceOutcome): void {
  if (outcome.kind === "exited") {
    if (!Number.isSafeInteger(outcome.exitCode)) throw new TypeError("launch instance exit code must be a safe integer");
    return;
  }
  if (outcome.kind === "signaled") {
    assertIdentifier(outcome.signal, "launch instance signal");
    return;
  }
  if (outcome.kind === "stopped") {
    if (!["owner-disconnect", "supervisor-disconnect", "user-request", "update"].includes(outcome.reason)) {
      throw new TypeError("invalid launch instance stop reason");
    }
    return;
  }
  if (outcome.kind === "interrupted") {
    if (!["owner-disconnect", "supervisor-disconnect", "guardian-exit", "legacy-migration"].includes(outcome.reason)) {
      throw new TypeError("invalid launch instance interruption reason");
    }
    assertDiagnostic(outcome.message, "launch instance interruption message");
    return;
  }
  if (outcome.kind !== "spawn-error" && outcome.kind !== "guardian-error" && outcome.kind !== "cleanup-error") {
    throw new TypeError(`invalid launch instance outcome: ${String((outcome as { kind?: unknown }).kind)}`);
  }
  assertDiagnostic(outcome.message, "launch instance failure message");
  if (outcome.code !== null) assertIdentifier(outcome.code, "launch instance failure code");
}

function sameProcessIdentity(left: NativeProcessIdentity, right: NativeProcessIdentity | null): boolean {
  return right !== null && left.pid === right.pid && left.startIdentity === right.startIdentity;
}

function sameContainmentIdentity(left: ProcessContainmentIdentity, right: ProcessContainmentIdentity | null): boolean {
  return right !== null && left.provider === right.provider && left.token === right.token;
}

function assertIdentifier(value: string, name: string): void {
  if (!value || value.length > 512 || value.includes("\0")) throw new TypeError(`${name} must be non-empty, bounded, and contain no null byte`);
}

function assertDiagnostic(value: string, name: string): void {
  if (!value || value.length > 4_096 || value.includes("\0")) throw new TypeError(`${name} must be non-empty, bounded, and contain no null byte`);
}

function assertTimestamp(value: string, name: string): void {
  if (!value || !Number.isFinite(Date.parse(value))) throw new TypeError(`${name} must be a valid timestamp`);
}

function assertOptionalTimestamp(value: string | null, name: string): void {
  if (value !== null) assertTimestamp(value, name);
}
