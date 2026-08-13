import type {
  CommandResult,
  ForegroundTerminalLeaseId,
  GenerationId,
  NativeProcessIdentity,
  RequestId,
  SupervisorCommand,
  TransparentTerminalLaunchProfile,
  TransparentTerminalLifecycleOutcome,
} from "../domain/index.js";
import { assertNativeProcessIdentity, assertTransparentTerminalLaunchProfile } from "../domain/index.js";

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
  readonly leaseId: ForegroundTerminalLeaseId;
  readonly generationId: GenerationId;
  readonly ownerId: string;
  readonly profile: TransparentTerminalLaunchProfile;
  /** Optional lifecycle signal supplied by the foreground owner or updater. */
  readonly stopRequested?: Promise<TransparentStopReason>;
}

export interface ForegroundBrokerResult {
  readonly leaseId: ForegroundTerminalLeaseId;
  readonly generationId: GenerationId;
  readonly processIdentity: NativeProcessIdentity | null;
  readonly outcome: TransparentTerminalLifecycleOutcome;
}

/**
 * Coordinates ownership around one natively attached child. Ordinary terminal
 * data never enters this object: the launcher owns native attachment and this
 * broker observes only process identity and the final lifecycle outcome.
 */
export async function runForegroundBroker(
  request: ForegroundBrokerRequest,
  control: ForegroundLeaseControl,
  launcher: TransparentNativeLauncher,
  createRequestId: () => RequestId,
): Promise<ForegroundBrokerResult> {
  assertRequest(request);
  await requireAccepted(control, {
    type: "acquire-foreground-terminal-lease",
    requestId: createRequestId(),
    leaseId: request.leaseId,
    ownerId: request.ownerId,
    profile: request.profile,
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
    await requireAccepted(control, {
      type: "release-foreground-terminal-lease",
      requestId: createRequestId(),
      leaseId: request.leaseId,
      processIdentity: null,
      outcome,
    });
    return { leaseId: request.leaseId, generationId: request.generationId, processIdentity: null, outcome };
  }

  try {
    await requireAccepted(control, {
      type: "activate-foreground-terminal-lease",
      requestId: createRequestId(),
      leaseId: request.leaseId,
      generationId: request.generationId,
      processIdentity: handle.processIdentity,
    });
    const outcome = request.stopRequested
      ? await Promise.race([handle.outcome, request.stopRequested.then(async reason => await handle.stop(reason))])
      : await handle.outcome;
    await requireAccepted(control, {
      type: "release-foreground-terminal-lease",
      requestId: createRequestId(),
      leaseId: request.leaseId,
      processIdentity: handle.processIdentity,
      outcome,
    });
    return { leaseId: request.leaseId, generationId: request.generationId, processIdentity: handle.processIdentity, outcome };
  } catch (error) {
    const outcome: TransparentTerminalLifecycleOutcome = {
      kind: "broker-error",
      message: errorMessage(error),
      code: errorCode(error),
    };
    await control.command({
      type: "release-foreground-terminal-lease",
      requestId: createRequestId(),
      leaseId: request.leaseId,
      processIdentity: handle.processIdentity,
      outcome,
    }).catch(() => undefined);
    throw error;
  }
}

function assertRequest(request: ForegroundBrokerRequest): void {
  if (!request.leaseId || !request.generationId || !request.ownerId) throw new TypeError("foreground broker identities are required");
  assertTransparentTerminalLaunchProfile(request.profile);
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
