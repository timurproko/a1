import type {
  NativeProcessIdentity,
  TransparentTerminalLaunchProfile,
  TransparentTerminalLifecycleOutcome,
} from "../lifecycle/index.js";
import { assertNativeProcessIdentity, assertTransparentTerminalLaunchProfile } from "../lifecycle/index.js";

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
  readonly profile: TransparentTerminalLaunchProfile;
  readonly stopRequested?: Promise<TransparentStopReason>;
}

export interface ForegroundBrokerResult {
  readonly processIdentity: NativeProcessIdentity | null;
  readonly outcome: TransparentTerminalLifecycleOutcome;
}

/**
 * Waits for one directly attached child. Launch-instance registration and
 * process-tree containment belong to the outer profile-neutral guardian.
 * Ordinary terminal data never enters this object.
 */
export async function runForegroundBroker(
  request: ForegroundBrokerRequest,
  launcher: TransparentNativeLauncher,
): Promise<ForegroundBrokerResult> {
  assertTransparentTerminalLaunchProfile(request.profile);
  let handle: TransparentChildHandle;
  try {
    handle = await launcher.launch(request.profile);
    assertNativeProcessIdentity(handle.processIdentity);
  } catch (error) {
    return {
      processIdentity: null,
      outcome: { kind: "spawn-error", message: errorMessage(error), code: errorCode(error) },
    };
  }

  const outcome = request.stopRequested
    ? await Promise.race([handle.outcome, request.stopRequested.then(async reason => await handle.stop(reason))])
    : await handle.outcome;
  return { processIdentity: handle.processIdentity, outcome };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorCode(error: unknown): string | null {
  return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : null;
}
