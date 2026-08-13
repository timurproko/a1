import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import type { TransparentTerminalLaunchProfile, TransparentTerminalLifecycleOutcome } from "../domain/index.js";
import type { TransparentChildHandle, TransparentNativeLauncher, TransparentStopReason } from "./foreground-broker.js";

export interface NativeSpawnAdapter {
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
    // detached:false keeps the child in the broker's foreground process group,
    // preserving inherited controlling-terminal ownership without an intermediary.
    // AddOne changes no terminal state, so no synthetic restoration is required.
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
  const child = adapter.spawn(profile.executable, profile.arguments, {
    ...platformOptions,
    cwd: profile.cwd,
    env: { ...process.env, ...profile.environment, TERM: profile.terminalType },
    shell: false,
    stdio: "inherit",
  });
  await spawned(child);
  if (!child.pid) throw Object.assign(new Error("transparent child has no process identity"), { code: "NO_PROCESS_ID" });
  const startIdentity = await adapter.observeStartIdentity(child);
  const processIdentity = { pid: child.pid, startIdentity };
  const outcome = childOutcome(child);
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

const defaultSpawnAdapter: NativeSpawnAdapter = {
  spawn(executable, arguments_, options) {
    return spawn(executable, [...arguments_], options);
  },
  async observeStartIdentity(child) {
    if (!child.pid) throw new Error("transparent child has no PID");
    // Captured immediately after spawn; platform-native strengthening can
    // replace this adapter without changing the broker contract.
    return `${child.pid}:${Date.now()}`;
  },
  async identityMatches(child, expectedStartIdentity) {
    return child.pid !== undefined && expectedStartIdentity.startsWith(`${child.pid}:`);
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
