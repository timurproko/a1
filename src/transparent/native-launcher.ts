import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { TransparentTerminalLaunchProfile, TransparentTerminalLifecycleOutcome } from "../domain/index.js";
import type { TransparentChildHandle, TransparentNativeLauncher, TransparentStopReason } from "./foreground-broker.js";
import { resolveTransparentCommand } from "./command-resolution.js";

export interface NativeSpawnAdapter {
  resolveCommand(profile: TransparentTerminalLaunchProfile): Promise<{ readonly executable: string; readonly arguments: readonly string[] }>;
  spawn(executable: string, arguments_: readonly string[], options: SpawnOptions): ChildProcess;
  observeStartIdentity(child: ChildProcess): Promise<string>;
  identityMatches(child: ChildProcess, expectedStartIdentity: string): Promise<boolean>;
  stop(child: ChildProcess, force: boolean): Promise<void>;
  waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean>;
}

export function createPlatformTransparentLauncher(
  platform: NodeJS.Platform = process.platform,
  adapter: NativeSpawnAdapter = defaultSpawnAdapter,
): TransparentNativeLauncher {
  if (platform === "win32") return new WindowsTransparentLauncher(adapter);
  if (platform === "linux" || platform === "darwin") return new UnixTransparentLauncher(adapter);
  throw new Error(`transparent terminal attachment is unsupported on ${platform}`);
}

export class WindowsTransparentLauncher implements TransparentNativeLauncher {
  constructor(private readonly adapter: NativeSpawnAdapter = defaultSpawnAdapter) {}

  async launch(profile: TransparentTerminalLaunchProfile): Promise<TransparentChildHandle> {
    return await launchInherited(profile, this.adapter, {
      windowsHide: true,
      windowsVerbatimArguments: false,
      detached: false,
    });
  }
}

export class UnixTransparentLauncher implements TransparentNativeLauncher {
  constructor(private readonly adapter: NativeSpawnAdapter = defaultSpawnAdapter) {}

  async launch(profile: TransparentTerminalLaunchProfile): Promise<TransparentChildHandle> {
    // Staying in the foreground process group preserves the inherited controlling
    // terminal without an intermediary or synthetic terminal restoration.
    return await launchInherited(profile, this.adapter, {
      detached: false,
    });
  }
}

async function launchInherited(
  profile: TransparentTerminalLaunchProfile,
  adapter: NativeSpawnAdapter,
  platformOptions: Pick<SpawnOptions, "windowsHide" | "windowsVerbatimArguments" | "detached">,
): Promise<TransparentChildHandle> {
  const command = await adapter.resolveCommand(profile);
  const child = adapter.spawn(command.executable, command.arguments, {
    ...platformOptions,
    cwd: profile.cwd,
    env: { ...profile.environment, TERM: profile.terminalType },
    shell: false,
    stdio: "inherit",
  });
  await spawned(child);
  if (!child.pid) throw Object.assign(new Error("transparent child has no process identity"), { code: "NO_PROCESS_ID" });
  const outcome = childOutcome(child);
  const startIdentity = await adapter.observeStartIdentity(child);
  const processIdentity = { pid: child.pid, startIdentity };
  let stopOutcome: Promise<TransparentTerminalLifecycleOutcome> | null = null;
  return {
    processIdentity,
    outcome,
    stop(reason) {
      stopOutcome ??= stopOwnedChild(child, adapter, processIdentity.startIdentity, reason);
      return stopOutcome;
    },
  };
}

function spawned(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    if (child.pid) {
      resolve();
      return;
    }
    child.once("spawn", resolve);
    child.once("error", reject);
  });
}

function childOutcome(child: ChildProcess): Promise<TransparentTerminalLifecycleOutcome> {
  return new Promise(resolve => {
    child.once("error", error => resolve({ kind: "broker-error", message: error.message, code: errorCode(error) }));
    child.once("close", (exitCode, signal) => {
      if (signal) resolve({ kind: "signaled", signal });
      else resolve({ kind: "exited", exitCode: exitCode ?? 1 });
    });
  });
}

async function stopOwnedChild(
  child: ChildProcess,
  adapter: NativeSpawnAdapter,
  expectedStartIdentity: string,
  reason: TransparentStopReason,
): Promise<TransparentTerminalLifecycleOutcome> {
  if (!await adapter.identityMatches(child, expectedStartIdentity)) {
    return { kind: "broker-error", message: "refusing cleanup because transparent child ownership changed", code: "PROCESS_IDENTITY_MISMATCH" };
  }
  await adapter.stop(child, false);
  if (!await adapter.waitForExit(child, 1_500)) {
    if (!await adapter.identityMatches(child, expectedStartIdentity)) {
      return { kind: "broker-error", message: "refusing forced cleanup because transparent child ownership changed", code: "PROCESS_IDENTITY_MISMATCH" };
    }
    await adapter.stop(child, true);
    if (!await adapter.waitForExit(child, 1_500)) {
      return { kind: "broker-error", message: "transparent child did not exit within the bounded cleanup deadline", code: "CLEANUP_TIMEOUT" };
    }
  }
  return { kind: "stopped", reason };
}

function errorCode(error: Error): string | null {
  return "code" in error && typeof error.code === "string" ? error.code : null;
}

const observedStartIdentities = new WeakMap<ChildProcess, string>();

const defaultSpawnAdapter: NativeSpawnAdapter = {
  async resolveCommand(profile) {
    return await resolveTransparentCommand(profile.executable, profile.arguments, {
      cwd: profile.cwd,
      environment: profile.environment,
    });
  },
  spawn(executable, arguments_, options) {
    return spawn(executable, [...arguments_], options);
  },
  async observeStartIdentity(child) {
    if (!child.pid) throw new Error("transparent child has no PID");
    const identity = `${child.pid}:${randomUUID()}`;
    observedStartIdentities.set(child, identity);
    return identity;
  },
  async identityMatches(child, expectedStartIdentity) {
    return child.pid !== undefined
      && child.exitCode === null
      && child.signalCode === null
      && observedStartIdentities.get(child) === expectedStartIdentity;
  },
  async stop(child, force) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    child.kill(force ? "SIGKILL" : "SIGTERM");
  },
  async waitForExit(child, timeoutMs) {
    if (child.exitCode !== null || child.signalCode !== null) return true;
    return await new Promise(resolve => {
      const timer = setTimeout(() => finish(false), timeoutMs);
      timer.unref();
      const finish = (exited: boolean) => {
        clearTimeout(timer);
        child.off("close", onClose);
        resolve(exited);
      };
      const onClose = () => finish(true);
      child.once("close", onClose);
    });
  },
};
