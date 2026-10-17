import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PRODUCT_TEXT } from "../../product-identity.js";
import { readLaunchContext } from "../launch-context/index.js";
import { resolve } from "node:path";
import type { LaunchInstanceOutcome, LaunchInstanceStopIntent, LaunchInstanceStopReason, LaunchProfileId, NativeProcessIdentity, SupervisorCommand } from "../lifecycle/index.js";
import { assertLaunchProfileId, resolveCohortEndpoint, resolveProductPaths, sessionSelectionArguments, type SessionSelection } from "../lifecycle/index.js";
import {
  AddonContainment,
  AddonProcessInspector,
  closeVerifiedContainment,
  LinuxNativeProcessInspector,
  loadProcessGuardianAddon,
  resolveProcessGuardianPath,
  verifyProcessGuardianArtifact,
  type NativeProcessInspector,
  type ProcessContainment,
  type ProcessGuardianAddon,
} from "../process-containment/index.js";
import { SupervisorClient } from "../protocol/index.js";
import { markStartupPhase } from "../startup/index.js";
import { exitWatcherArguments } from "./exit-watcher.js";

interface GuardianControl {
  connect(endpoint: string, timeoutMs?: number): Promise<unknown>;
  command(command: SupervisorCommand): Promise<{ readonly ok: boolean; readonly error?: { readonly code: string; readonly message: string } }>;
  on(event: "stopIntent", listener: (intent: LaunchInstanceStopIntent) => void): unknown;
  on(event: "disconnect", listener: () => void): unknown;
  off(event: "stopIntent", listener: (intent: LaunchInstanceStopIntent) => void): unknown;
  off(event: "disconnect", listener: () => void): unknown;
  close(): void;
}

export interface LaunchGuardianRootCommand {
  readonly executable: string;
  readonly arguments: readonly string[];
}

export interface LaunchGuardianOptions {
  readonly profileId: LaunchProfileId;
  readonly releaseRoot: string;
  readonly uiEntry: string;
  readonly sessionSelection?: SessionSelection;
  readonly rootCommand?: LaunchGuardianRootCommand;
  readonly environment?: NodeJS.ProcessEnv;
  readonly cwd?: string;
  readonly helperPath?: string;
  readonly inspector?: NativeProcessInspector;
  readonly control?: GuardianControl;
  readonly containment?: ProcessContainment;
  readonly addon?: ProcessGuardianAddon;
  readonly ensureHelper?: (path: string) => Promise<void>;
}

export async function runLaunchGuardian(options: LaunchGuardianOptions): Promise<number> {
  assertLaunchProfileId(options.profileId);
  const sessionArgs = sessionSelectionArguments(options.sessionSelection);
  if (sessionArgs.length > 0 && options.profileId !== "a1") throw new Error("session selection requires the normal A1 profile");
  const environment = { ...(options.environment ?? process.env) };
  const paths = resolveProductPaths(environment);
  const instanceId = randomUUID();
  const helperPath = options.helperPath ?? resolveProcessGuardianPath(options.releaseRoot, environment);
  await (options.ensureHelper ?? verifyProcessGuardianArtifact)(helperPath);
  // Tests that inject both process boundaries need no native module; every production path loads the
  // exact artifact only after its manifest and digest have been verified.
  const addon = options.addon ?? (options.containment && options.inspector ? null : loadProcessGuardianAddon(helperPath));
  const inspector = options.inspector ?? platformInspector(requireAddon(addon));
  const guardianIdentity = await inspector.observe(process.pid);
  if (!guardianIdentity) throw diagnosticError("launch guardian cannot verify its own native process identity", "PROCESS_IDENTITY_UNAVAILABLE");

  const context = readLaunchContext(environment);
  const client = options.control ?? new SupervisorClient(context.releaseId);
  // Invariant: an instance belongs to the cohort that launched it and talks to that cohort's endpoint
  // for its whole life, whatever release becomes the active one meanwhile.
  const releaseId = context.releaseId;
  const endpoint = releaseId
    ? resolveCohortEndpoint(paths, releaseId, environment).endpoint
    : paths.endpoint;
  await client.connect(endpoint);
  await markStartupPhase(environment, "guardian-connected");
  const exitNoticePath = resolve(paths.runtimeDir, "launch-instances", `${instanceId}.exit-notice`);
  const containment = options.containment ?? new AddonContainment(
    instanceId,
    helperPath,
    exitNoticePath,
    requireAddon(addon),
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
    let encodedModes: string | null = null;
    try {
      const rootCommand = options.rootCommand ?? { executable: process.execPath, arguments: [options.uiEntry, ...sessionArgs] };
      encodedModes = addon?.captureTerminalModes() ?? null;
      handle = await containment.spawn(rootCommand.executable, [...rootCommand.arguments], {
        cwd: options.cwd ?? process.cwd(),
        environment: environmentEntries(environment),
        ...(environment.TERM ? { terminalType: environment.TERM } : {}),
      });
      rootIdentity = handle.identity;
      if (addon && encodedModes !== null) {
        await startExitWatcher(addon, {
          addonPath: helperPath,
          noticePath: exitNoticePath,
          encodedModes,
          runtimePid: handle.identity.pid,
          processGroup: handle.processGroup ?? null,
          foregroundGroup: handle.foregroundGroup ?? null,
        });
      }
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
        if (reason === "supervisor-disconnect" && result.outcome.kind === "stopped") {
          return {
            kind: "interrupted",
            reason,
            message: "supervisor disconnected after local launch-instance containment closed",
          } satisfies LaunchInstanceOutcome;
        }
        return result.outcome;
      }),
    ]);

    // Invariant: the root removes a clean notice. If it left the notice armed, the guardian claims,
    // restores, and prints it before closing the native containment handle.
    if (addon && encodedModes !== null) addon.deliverExitNotice(exitNoticePath, encodedModes);
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

async function startExitWatcher(
  addon: ProcessGuardianAddon,
  options: {
    readonly addonPath: string;
    readonly noticePath: string;
    readonly encodedModes: string;
    readonly runtimePid: number;
    readonly processGroup: number | null;
    readonly foregroundGroup: number | null;
  },
): Promise<void> {
  const entry = fileURLToPath(new URL("./exit-watcher.js", import.meta.url));
  const arguments_ = [entry, ...exitWatcherArguments({
    guardianPid: process.pid,
    ...options,
  })];
  if (process.platform === "win32") {
    addon.spawnWatcher({ executable: process.execPath, arguments: arguments_ });
    return;
  }
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const watcher = spawn(process.execPath, arguments_, {
      stdio: "inherit",
      detached: false,
      windowsHide: false,
    });
    watcher.once("error", rejectPromise);
    watcher.once("spawn", () => {
      watcher.off("error", rejectPromise);
      watcher.unref();
      resolvePromise();
    });
  });
}

function platformInspector(addon: ProcessGuardianAddon): NativeProcessInspector {
  if (process.platform === "win32") return new AddonProcessInspector(addon, "windows-filetime:");
  if (process.platform === "linux") return new LinuxNativeProcessInspector();
  if (process.platform === "darwin") return new AddonProcessInspector(addon, "darwin-proc-start:");
  throw diagnosticError(`launch-instance process containment is unsupported on ${process.platform}`, "CONTAINMENT_UNSUPPORTED");
}

function requireAddon(addon: ProcessGuardianAddon | null): ProcessGuardianAddon {
  if (!addon) throw diagnosticError("process guardian addon is unavailable", "CONTAINMENT_ARTIFACT_MISSING");
  return addon;
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
  return Object.assign(new Error(`${PRODUCT_TEXT.displayName}: ${message}`), { code });
}
