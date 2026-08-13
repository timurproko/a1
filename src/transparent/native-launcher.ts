import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import type { TransparentTerminalLaunchProfile, TransparentTerminalLifecycleOutcome } from "../domain/index.js";
import type { TransparentChildHandle, TransparentNativeLauncher } from "./foreground-broker.js";

export interface NativeSpawnAdapter {
  spawn(executable: string, arguments_: readonly string[], options: SpawnOptions): ChildProcess;
  observeStartIdentity(child: ChildProcess): Promise<string>;
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
  return { processIdentity, outcome };
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

function errorCode(error: Error): string | null {
  return "code" in error && typeof error.code === "string" ? error.code : null;
}

const defaultSpawnAdapter: NativeSpawnAdapter = {
  spawn(executable, arguments_, options) {
    return spawn(executable, [...arguments_], options);
  },
  async observeStartIdentity(child) {
    if (!child.pid) throw new Error("transparent child has no PID");
    // This identity is captured immediately after the spawn event and is never
    // reconstructed from a later PID-only lookup. Platform-native strengthening
    // can replace this adapter without changing the broker contract.
    return `${child.pid}:${Date.now()}`;
  },
};
