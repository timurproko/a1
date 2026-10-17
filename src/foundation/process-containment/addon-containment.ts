import { constants } from "node:os";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import type { LaunchInstanceOutcome, NativeProcessIdentity, ProcessContainmentIdentity } from "../lifecycle/index.js";
import { loadProcessGuardianAddon, type ProcessGuardianAddon, type ProcessGuardianRuntime } from "./addon.js";
import type { ContainedProcessHandle, ContainedSpawnOptions, ProcessContainment } from "./contracts.js";

/** Owns one native containment object in the launch guardian's Node process. */
export class AddonContainment implements ProcessContainment {
  #identity: ProcessContainmentIdentity;
  #rootIdentity: NativeProcessIdentity | null = null;
  #runtime: ProcessGuardianRuntime | null = null;
  #outcome: Promise<LaunchInstanceOutcome> | null = null;
  #settled = false;

  readonly instanceId: string;
  readonly addonPath: string;
  readonly exitNoticePath: string | null;
  readonly addon: ProcessGuardianAddon;
  private readonly platform: NodeJS.Platform;

  constructor(
    instanceId: string,
    addonPath: string,
    exitNoticePath: string | null = null,
    addon: ProcessGuardianAddon = loadProcessGuardianAddon(addonPath),
    platform: NodeJS.Platform = process.platform,
  ) {
    this.instanceId = instanceId;
    this.addonPath = addonPath;
    this.exitNoticePath = exitNoticePath;
    this.addon = addon;
    this.platform = platform;
    this.#identity = { provider: "native-addon-pending", token: instanceId };
  }

  get identity(): ProcessContainmentIdentity {
    return this.#identity;
  }

  async spawn(executable: string, arguments_: readonly string[], options: ContainedSpawnOptions): Promise<ContainedProcessHandle> {
    if (this.#runtime) throw new Error("process containment already has a root runtime");
    if (this.exitNoticePath) {
      await mkdir(dirname(this.exitNoticePath), { recursive: true, mode: 0o700 });
      await rm(this.exitNoticePath, { force: true });
    }
    const runtime = this.addon.spawnContained({
      executable,
      arguments: [...arguments_],
      cwd: options.cwd,
      environment: {
        ...options.environment,
        ...(options.terminalType ? { TERM: options.terminalType } : {}),
        ...(this.exitNoticePath ? { [PRODUCT_IDENTITY.environment.exitNoticePath]: this.exitNoticePath } : {}),
      },
      instanceId: this.instanceId,
    });
    assertRuntime(runtime);
    this.#runtime = runtime;
    this.#rootIdentity = { pid: runtime.pid, startIdentity: runtime.startIdentity };
    this.#identity = { provider: runtime.containmentProvider, token: runtime.containmentToken };
    const outcome: Promise<LaunchInstanceOutcome> = runtime.wait().then(
      exitCode => outcomeFromExitCode(exitCode, this.platform),
      error => ({
        kind: "guardian-error" as const,
        message: errorMessage(error),
        code: errorCode(error),
      }),
    ).finally(() => { this.#settled = true; });
    this.#outcome = outcome;
    return {
      identity: this.#rootIdentity,
      outcome,
      ...(runtime.processGroup === null ? {} : { processGroup: runtime.processGroup }),
    };
  }

  async contains(identity: NativeProcessIdentity): Promise<boolean> {
    return this.#rootIdentity !== null
      && identity.pid === this.#rootIdentity.pid
      && identity.startIdentity === this.#rootIdentity.startIdentity;
  }

  async stop(force: boolean): Promise<void> {
    const runtime = this.#runtime;
    if (!runtime || this.#settled) return;
    try {
      if (force) runtime.terminate(137);
      else if (this.platform === "win32") process.kill(runtime.pid, "SIGTERM");
      else runtime.stop();
    } catch (error) {
      if (errorCode(error) !== "ESRCH") throw error;
    }
  }

  async waitForEmpty(timeoutMs: number): Promise<boolean> {
    if (this.#settled || !this.#outcome) return true;
    return await Promise.race([
      this.#outcome.then(() => true),
      new Promise<boolean>(resolvePromise => {
        const timer = setTimeout(() => resolvePromise(false), timeoutMs);
        timer.unref();
      }),
    ]);
  }

  async close(): Promise<void> {
    const runtime = this.#runtime;
    if (!runtime) return;
    runtime.close();
    await this.waitForEmpty(1_500);
  }
}

export function resolveProcessGuardianPath(
  releaseRoot: string,
  environment: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  architecture: string = process.arch,
): string {
  const override = environment[PRODUCT_IDENTITY.environment.processGuardianPath]?.trim();
  if (override) return resolve(override);
  return resolve(
    releaseRoot,
    "dist",
    "native",
    `${platform}-${architecture}`,
    `${PRODUCT_IDENTITY.artifacts.processGuardianAddon}.node`,
  );
}

function assertRuntime(runtime: ProcessGuardianRuntime): void {
  if (!Number.isSafeInteger(runtime.pid) || runtime.pid <= 0
    || typeof runtime.startIdentity !== "string" || runtime.startIdentity.length === 0
    || typeof runtime.containmentProvider !== "string" || runtime.containmentProvider.length === 0
    || typeof runtime.containmentToken !== "string" || runtime.containmentToken.length === 0
    || (runtime.processGroup !== null && (!Number.isSafeInteger(runtime.processGroup) || runtime.processGroup <= 0))) {
    runtime.close();
    throw Object.assign(new Error("process guardian addon returned invalid containment identity"), { code: "CONTAINMENT_ARTIFACT_INCOMPATIBLE" });
  }
}

function outcomeFromExitCode(exitCode: number, platform: NodeJS.Platform): LaunchInstanceOutcome {
  if (!Number.isSafeInteger(exitCode) || exitCode < 0 || exitCode > 255) {
    return { kind: "guardian-error", message: "process guardian addon returned an invalid exit code", code: "CONTAINMENT_OUTCOME_INVALID" };
  }
  if (platform !== "win32" && exitCode >= 128) {
    const signalNumber = exitCode - 128;
    const signal = Object.entries(constants.signals).find(([, value]) => value === signalNumber)?.[0] as NodeJS.Signals | undefined;
    if (signal) return { kind: "signaled", signal };
  }
  return { kind: "exited", exitCode };
}

function errorCode(error: unknown): string | null {
  return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
