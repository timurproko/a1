import type {
  CommandResult,
  LaunchInstanceId,
  LaunchInstanceOutcome,
  LaunchProfileId,
  NativeProcessIdentity,
  ProcessContainmentIdentity,
  RequestId,
  SupervisorCommand,
  TransparentTerminalLaunchProfile,
  TransparentTerminalLifecycleOutcome,
} from "../lifecycle/index.js";
import {
  assertNativeProcessIdentity,
  assertProcessContainmentIdentity,
  assertTransparentTerminalLaunchProfile,
} from "../lifecycle/index.js";

export interface ForegroundLeaseControl {
  command(command: SupervisorCommand): Promise<CommandResult>;
}

export type TransparentStopReason = "owner-disconnect" | "user-request" | "update";

export interface TransparentChildHandle {
  readonly processIdentity: NativeProcessIdentity;
  readonly outcome: Promise<TransparentTerminalLifecycleOutcome>;
  stop(reason: TransparentStopReason): Promise<TransparentTerminalLifecycleOutcome>;
}

export interface TransparentNativeLauncher {
  launch(profile: TransparentTerminalLaunchProfile): Promise<TransparentChildHandle>;
}

export interface ForegroundBrokerRequest {
  readonly instanceId: LaunchInstanceId;
  readonly profileId: LaunchProfileId;
  readonly guardianIdentity: NativeProcessIdentity;
  readonly profile: TransparentTerminalLaunchProfile;
  readonly stopRequested?: Promise<TransparentStopReason>;
}

export interface ForegroundBrokerResult {
  readonly instanceId: LaunchInstanceId;
  readonly processIdentity: NativeProcessIdentity | null;
  readonly outcome: TransparentTerminalLifecycleOutcome;
}

/**
 * Coordinates one directly attached child inside an independently registered
 * launch instance. Ordinary terminal data never enters this object.
 */
export async function runForegroundBroker(
  request: ForegroundBrokerRequest,
  control: ForegroundLeaseControl,
  launcher: TransparentNativeLauncher,
  createRequestId: () => RequestId,
): Promise<ForegroundBrokerResult> {
  assertRequest(request);
  await requireAccepted(control, {
    type: "create-launch-instance",
    requestId: createRequestId(),
    instanceId: request.instanceId,
    profileId: request.profileId,
    shutdownPolicy: "terminate-tree-on-close",
    guardianIdentity: request.guardianIdentity,
  });

  let handle: TransparentChildHandle;
  try {
    handle = await launcher.launch(request.profile);
    assertNativeProcessIdentity(handle.processIdentity);
  } catch (error) {
    const outcome: TransparentTerminalLifecycleOutcome = {
      kind: "spawn-error",
      message: errorMessage(error),
      code: errorCode(error),
    };
    await requireAccepted(control, completionCommand(request.instanceId, createRequestId(), outcome));
    return { instanceId: request.instanceId, processIdentity: null, outcome };
  }

  const containmentIdentity: ProcessContainmentIdentity = {
    provider: "direct-child-transition",
    token: handle.processIdentity.startIdentity,
  };
  assertProcessContainmentIdentity(containmentIdentity);

  try {
    await requireAccepted(control, {
      type: "activate-launch-instance",
      requestId: createRequestId(),
      instanceId: request.instanceId,
      rootIdentity: handle.processIdentity,
      containmentIdentity,
    });
    const outcome = request.stopRequested
      ? await Promise.race([
          handle.outcome,
          request.stopRequested.then(async reason => {
            await requireAccepted(control, {
              type: "begin-launch-instance-stop",
              requestId: createRequestId(),
              instanceId: request.instanceId,
              reason,
            });
            return await handle.stop(reason);
          }),
        ])
      : await handle.outcome;
    await requireAccepted(control, completionCommand(request.instanceId, createRequestId(), outcome));
    return { instanceId: request.instanceId, processIdentity: handle.processIdentity, outcome };
  } catch (error) {
    const outcome: TransparentTerminalLifecycleOutcome = {
      kind: "broker-error",
      message: errorMessage(error),
      code: errorCode(error),
    };
    await control.command(completionCommand(request.instanceId, createRequestId(), outcome)).catch(() => undefined);
    throw error;
  }
}

function assertRequest(request: ForegroundBrokerRequest): void {
  if (!request.instanceId) throw new TypeError("foreground broker instance identity is required");
  assertNativeProcessIdentity(request.guardianIdentity);
  assertTransparentTerminalLaunchProfile(request.profile);
}

function completionCommand(
  instanceId: LaunchInstanceId,
  requestId: RequestId,
  outcome: TransparentTerminalLifecycleOutcome,
): Extract<SupervisorCommand, { type: "complete-launch-instance" }> {
  const mapped = launchInstanceOutcome(outcome);
  return {
    type: "complete-launch-instance",
    requestId,
    instanceId,
    terminalState: mapped.kind === "interrupted" || mapped.kind === "cleanup-error" ? "interrupted" : "completed",
    outcome: mapped,
  };
}

function launchInstanceOutcome(outcome: TransparentTerminalLifecycleOutcome): LaunchInstanceOutcome {
  if (outcome.kind === "exited") return outcome;
  if (outcome.kind === "signaled") return outcome;
  if (outcome.kind === "stopped") return outcome;
  if (outcome.kind === "detached") {
    return { kind: "interrupted", reason: "owner-disconnect", message: "transparent child detached from a non-resident launch instance" };
  }
  if (outcome.kind === "spawn-error") return { kind: "spawn-error", message: outcome.message, code: outcome.code };
  return { kind: "guardian-error", message: outcome.message, code: outcome.code };
}

async function requireAccepted(control: ForegroundLeaseControl, command: SupervisorCommand): Promise<void> {
  const result = await control.command(command);
  if (!result.ok) throw new Error(result.error?.message ?? `supervisor rejected ${command.type}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorCode(error: unknown): string | null {
  return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : null;
}
