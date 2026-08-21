import type { LaunchInstanceOutcome, LaunchInstanceStopReason, NativeProcessIdentity, ProcessContainmentIdentity } from "../lifecycle/index.js";

export interface ContainedSpawnOptions {
  readonly cwd: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly terminalType?: string;
}

export interface ContainedProcessHandle {
  readonly identity: NativeProcessIdentity;
  readonly outcome: Promise<LaunchInstanceOutcome>;
}

export interface NativeProcessInspector {
  observe(pid: number): Promise<NativeProcessIdentity | null>;
  matches(identity: NativeProcessIdentity): Promise<boolean>;
}

export interface ProcessContainment {
  readonly identity: ProcessContainmentIdentity;
  spawn(executable: string, arguments_: readonly string[], options: ContainedSpawnOptions): Promise<ContainedProcessHandle>;
  contains(identity: NativeProcessIdentity): Promise<boolean>;
  stop(force: boolean): Promise<void>;
  waitForEmpty(timeoutMs: number): Promise<boolean>;
  close(): Promise<void>;
}

export interface ProcessContainmentFactory {
  create(instanceId: string): Promise<ProcessContainment>;
}

export interface ContainmentCloseResult {
  readonly outcome: LaunchInstanceOutcome;
  readonly graceful: boolean;
  readonly forced: boolean;
}

export async function closeVerifiedContainment(
  containment: ProcessContainment,
  inspector: NativeProcessInspector,
  rootIdentity: NativeProcessIdentity,
  reason: LaunchInstanceStopReason,
  deadlineMs = 1_500,
): Promise<ContainmentCloseResult> {
  if (!await ownershipMatches(containment, inspector, rootIdentity)) {
    return ownershipMismatch("refusing graceful cleanup because launch-instance ownership changed");
  }

  await containment.stop(false);
  if (await containment.waitForEmpty(deadlineMs)) {
    return { outcome: { kind: "stopped", reason }, graceful: true, forced: false };
  }

  if (!await ownershipMatches(containment, inspector, rootIdentity)) {
    return ownershipMismatch("refusing forced cleanup because launch-instance ownership changed");
  }

  await containment.stop(true);
  if (await containment.waitForEmpty(deadlineMs)) {
    return { outcome: { kind: "stopped", reason }, graceful: false, forced: true };
  }

  return {
    outcome: {
      kind: "cleanup-error",
      message: "launch-instance process tree did not exit within the bounded cleanup deadline",
      code: "CONTAINMENT_CLEANUP_TIMEOUT",
    },
    graceful: false,
    forced: true,
  };
}

async function ownershipMatches(
  containment: ProcessContainment,
  inspector: NativeProcessInspector,
  rootIdentity: NativeProcessIdentity,
): Promise<boolean> {
  return await inspector.matches(rootIdentity) && await containment.contains(rootIdentity);
}

function ownershipMismatch(message: string): ContainmentCloseResult {
  return {
    outcome: { kind: "cleanup-error", message, code: "PROCESS_IDENTITY_MISMATCH" },
    graceful: false,
    forced: false,
  };
}
