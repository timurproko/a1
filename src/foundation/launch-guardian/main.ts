import { randomUUID } from "node:crypto";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { resolve } from "node:path";
import type { LaunchInstanceOutcome, LaunchInstanceStopIntent, LaunchInstanceStopReason, LaunchProfileId, NativeProcessIdentity, SupervisorCommand } from "../lifecycle/index.js";
import { assertLaunchProfileId } from "../lifecycle/index.js";
import {
  closeVerifiedContainment,
  LinuxNativeProcessInspector,
  NativeGuardianContainment,
  resolveProcessGuardianPath,
  verifyProcessGuardianArtifact,
  WindowsNativeProcessInspector,
  type NativeProcessInspector,
  type ProcessContainment,
} from "../process-containment/index.js";
import { SupervisorClient } from "../protocol/index.js";
import { resolveProductPaths } from "../supervision/index.js";

interface GuardianControl {
  connect(endpoint: string, timeoutMs?: number): Promise<unknown>;
  command(command: SupervisorCommand): Promise<{ readonly ok: boolean; readonly error?: { readonly code: string; readonly message: string } }>;
  on(event: "stopIntent", listener: (intent: LaunchInstanceStopIntent) => void): unknown;
  on(event: "disconnect", listener: () => void): unknown;
  off(event: "stopIntent", listener: (intent: LaunchInstanceStopIntent) => void): unknown;
  off(event: "disconnect", listener: () => void): unknown;
  close(): void;
}

export interface LaunchGuardianOptions {
  readonly profileId: LaunchProfileId;
  readonly releaseRoot: string;
  readonly uiEntry: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly cwd?: string;
  readonly helperPath?: string;
  readonly inspector?: NativeProcessInspector;
  readonly control?: GuardianControl;
  readonly containment?: ProcessContainment;
  readonly ensureHelper?: (path: string) => Promise<void>;
}

export async function runLaunchGuardian(options: LaunchGuardianOptions): Promise<number> {
  assertLaunchProfileId(options.profileId);
  const environment = { ...(options.environment ?? process.env) };
  const paths = resolveProductPaths(environment);
  const instanceId = randomUUID();
  const helperPath = options.helperPath ?? resolveProcessGuardianPath(options.releaseRoot, environment);
  const inspector = options.inspector ?? platformInspector(helperPath);
  await (options.ensureHelper ?? verifyProcessGuardianArtifact)(helperPath);
  const guardianIdentity = await inspector.observe(process.pid);
  if (!guardianIdentity) throw diagnosticError("launch guardian cannot verify its own native process identity", "PROCESS_IDENTITY_UNAVAILABLE");

  const client = options.control ?? new SupervisorClient(environment[PRODUCT_IDENTITY.environment.releaseId]);
  await client.connect(paths.endpoint);
  const containment = options.containment ?? new NativeGuardianContainment(
    instanceId,
    helperPath,
    resolve(paths.runtimeDir, "launch-instances", `${instanceId}.ready.json`),
  );
  const stop = stopRequests(client, instanceId);
  let rootIdentity: NativeProcessIdentity | null = null;
  try {
    await requireAccepted(client, {
      type: "create-launch-instance",
      requestId: randomUUID(),
      instanceId,
      profileId: options.profileId,
      shutdownPolicy: "terminate-tree-on-close",
      guardianIdentity,
    });

    let handle;
    try {
      handle = await containment.spawn(process.execPath, [options.uiEntry], {
        cwd: options.cwd ?? process.cwd(),
        environment: environmentEntries(environment),
        ...(environment.TERM ? { terminalType: environment.TERM } : {}),
      });
      rootIdentity = handle.identity;
      await requireAccepted(client, {
        type: "activate-launch-instance",
        requestId: randomUUID(),
        instanceId,
        rootIdentity,
        containmentIdentity: containment.identity,
      });
    } catch (error) {
      const outcome = failureOutcome(error, "guardian-error");
      await completeBestEffort(client, instanceId, "completed", outcome);
      throw error;
    }

    const outcome = await Promise.race([
      handle.outcome,
      stop.requested.then(async reason => {
        if (reason !== "supervisor-disconnect") {
          await requireAccepted(client, {
            type: "begin-launch-instance-stop",
            requestId: randomUUID(),
            instanceId,
            reason,
          });
        }
        if (!rootIdentity) return failureOutcome(new Error("launch root identity is unavailable"), "cleanup-error");
        const result = await closeVerifiedContainment(containment, inspector, rootIdentity, reason);
        await containment.close();
        return result.outcome;
      }),
    ]);

    await containment.close();
    if (outcome.kind !== "interrupted" || outcome.reason !== "supervisor-disconnect") {
      await completeBestEffort(
        client,
        instanceId,
        outcome.kind === "interrupted" || outcome.kind === "cleanup-error" ? "interrupted" : "completed",
        outcome,
      );
    }
    return exitCode(outcome);
  } catch (error) {
    await containment.close().catch(() => undefined);
    throw error;
  } finally {
    stop.dispose();
    client.close();
  }
}

function platformInspector(helperPath: string): NativeProcessInspector {
  if (process.platform === "win32") return new WindowsNativeProcessInspector(helperPath);
  if (process.platform === "linux") return new LinuxNativeProcessInspector();
  throw diagnosticError(`launch-instance process containment is unsupported on ${process.platform}`, "CONTAINMENT_UNSUPPORTED");
}

function stopRequests(client: GuardianControl, instanceId: string) {
  let resolveStop!: (reason: LaunchInstanceStopReason) => void;
  let settled = false;
  const requested = new Promise<LaunchInstanceStopReason>(resolvePromise => { resolveStop = resolvePromise; });
  const request = (reason: LaunchInstanceStopReason) => {
    if (settled) return;
    settled = true;
    resolveStop(reason);
  };
  const onStopIntent = (intent: LaunchInstanceStopIntent) => {
    if (intent.instanceId === instanceId) request(intent.reason);
  };
  const onDisconnect = () => request("supervisor-disconnect");
  const onSigterm = () => request("user-request");
  const onSigint = () => undefined;
  client.on("stopIntent", onStopIntent);
  client.on("disconnect", onDisconnect);
  process.once("SIGTERM", onSigterm);
  process.on("SIGINT", onSigint);
  return {
    requested,
    dispose() {
      client.off("stopIntent", onStopIntent);
      client.off("disconnect", onDisconnect);
      process.off("SIGTERM", onSigterm);
      process.off("SIGINT", onSigint);
    },
  };
}

async function requireAccepted(client: GuardianControl, command: SupervisorCommand): Promise<void> {
  const result = await client.command(command);
  if (!result.ok) throw diagnosticError(result.error?.message ?? `supervisor rejected ${command.type}`, result.error?.code ?? "SUPERVISOR_REJECTED");
}

async function completeBestEffort(
  client: GuardianControl,
  instanceId: string,
  terminalState: "completed" | "interrupted",
  outcome: LaunchInstanceOutcome,
): Promise<void> {
  await requireAccepted(client, {
    type: "complete-launch-instance",
    requestId: randomUUID(),
    instanceId,
    terminalState,
    outcome,
  }).catch(() => undefined);
}

function environmentEntries(environment: NodeJS.ProcessEnv): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(environment).filter((entry): entry is [string, string] => entry[1] !== undefined));
}

function failureOutcome(error: unknown, kind: "guardian-error" | "cleanup-error"): LaunchInstanceOutcome {
  return {
    kind,
    message: error instanceof Error ? error.message : String(error),
    code: error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : null,
  };
}

function exitCode(outcome: LaunchInstanceOutcome): number {
  if (outcome.kind === "exited") return outcome.exitCode;
  if (outcome.kind === "stopped") return 0;
  return 1;
}

function diagnosticError(message: string, code: string): Error & { code: string } {
  return Object.assign(new Error(`A1: ${message}`), { code });
}
