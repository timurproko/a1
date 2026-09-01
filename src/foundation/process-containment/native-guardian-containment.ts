import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import type { LaunchInstanceOutcome, NativeProcessIdentity, ProcessContainmentIdentity } from "../lifecycle/index.js";
import type { ContainedProcessHandle, ContainedSpawnOptions, ProcessContainment } from "./contracts.js";

interface ReadyStatus extends NativeProcessIdentity {
  readonly containmentProvider: string;
  readonly containmentToken: string;
}

/** Delegates one root runtime to the native guardian and exposes its verified containment identity. */
export class NativeGuardianContainment implements ProcessContainment {
  #identity: ProcessContainmentIdentity;
  #helper: ChildProcess | null = null;
  #rootIdentity: NativeProcessIdentity | null = null;
  #outcome: Promise<LaunchInstanceOutcome> | null = null;

  constructor(
    readonly instanceId: string,
    readonly helperPath: string,
    readonly statusPath: string,
  ) {
    this.#identity = { provider: "native-guardian-pending", token: instanceId };
  }

  get identity(): ProcessContainmentIdentity {
    return this.#identity;
  }

  async spawn(executable: string, arguments_: readonly string[], options: ContainedSpawnOptions): Promise<ContainedProcessHandle> {
    if (this.#helper) throw new Error("process containment already has a root runtime");
    await mkdir(dirname(this.statusPath), { recursive: true, mode: 0o700 });
    await rm(this.statusPath, { force: true });
    const helper = spawn(this.helperPath, [
      "--parent-pid", String(process.pid),
      "--instance", this.instanceId,
      "--status-file", this.statusPath,
      "--", executable, ...arguments_,
    ], {
      cwd: options.cwd,
      env: { ...options.environment, ...(options.terminalType ? { TERM: options.terminalType } : {}) },
      shell: false,
      stdio: "inherit",
      windowsHide: false,
    });
    this.#helper = helper;
    this.#outcome = helperOutcome(helper);
    const status = await waitForReadyStatus(this.statusPath, this.#outcome, 5_000);
    this.#rootIdentity = { pid: status.pid, startIdentity: status.startIdentity };
    this.#identity = { provider: status.containmentProvider, token: status.containmentToken };
    return { identity: this.#rootIdentity, outcome: this.#outcome };
  }

  async contains(identity: NativeProcessIdentity): Promise<boolean> {
    return this.#rootIdentity !== null
      && identity.pid === this.#rootIdentity.pid
      && identity.startIdentity === this.#rootIdentity.startIdentity;
  }

  async stop(force: boolean): Promise<void> {
    const root = this.#rootIdentity;
    if (!root) return;
    try { process.kill(root.pid, force ? "SIGKILL" : "SIGTERM"); } catch {}
  }

  async waitForEmpty(timeoutMs: number): Promise<boolean> {
    if (!this.#helper || this.#helper.exitCode !== null || this.#helper.signalCode !== null) return true;
    return await new Promise(resolvePromise => {
      const timer = setTimeout(() => finish(false), timeoutMs);
      timer.unref();
      const finish = (empty: boolean) => {
        clearTimeout(timer);
        this.#helper?.off("close", onClose);
        resolvePromise(empty);
      };
      const onClose = () => finish(true);
      this.#helper?.once("close", onClose);
    });
  }

  async close(): Promise<void> {
    const helper = this.#helper;
    if (helper && helper.exitCode === null && helper.signalCode === null) helper.kill("SIGKILL");
    await this.waitForEmpty(1_500);
    await rm(this.statusPath, { force: true });
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
  const executable = platform === "win32"
    ? `${PRODUCT_IDENTITY.artifacts.processGuardianExecutable}.exe`
    : PRODUCT_IDENTITY.artifacts.processGuardianExecutable;
  return resolve(releaseRoot, "dist", "native", `${platform}-${architecture}`, executable);
}

function helperOutcome(helper: ChildProcess): Promise<LaunchInstanceOutcome> {
  return new Promise(resolvePromise => {
    let settled = false;
    const settle = (outcome: LaunchInstanceOutcome) => {
      if (settled) return;
      settled = true;
      resolvePromise(outcome);
    };
    helper.once("error", error => settle({ kind: "guardian-error", message: error.message, code: errorCode(error) }));
    helper.once("close", (code, signal) => {
      if (signal) settle({ kind: "signaled", signal });
      else settle({ kind: "exited", exitCode: code ?? 1 });
    });
  });
}

async function waitForReadyStatus(path: string, outcome: Promise<LaunchInstanceOutcome>, timeoutMs: number): Promise<ReadyStatus> {
  const deadline = Date.now() + timeoutMs;
  let terminalOutcome: LaunchInstanceOutcome | null = null;
  void outcome.then(value => { terminalOutcome = value; });
  while (Date.now() < deadline) {
    try {
      const value = JSON.parse(await readFile(path, "utf8")) as Partial<ReadyStatus>;
      if (isReadyStatus(value)) return value;
      throw new Error("process guardian published invalid ready status");
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    if (terminalOutcome) throw new Error(`process guardian exited before readiness: ${JSON.stringify(terminalOutcome)}`);
    await new Promise(resolvePromise => setTimeout(resolvePromise, 20));
  }
  throw new Error(`process guardian did not publish readiness within ${timeoutMs}ms`);
}

function isReadyStatus(value: Partial<ReadyStatus>): value is ReadyStatus {
  return Number.isSafeInteger(value.pid) && Number(value.pid) > 0
    && typeof value.startIdentity === "string" && value.startIdentity.length > 0
    && typeof value.containmentProvider === "string" && value.containmentProvider.length > 0
    && typeof value.containmentToken === "string" && value.containmentToken.length > 0;
}

function errorCode(error: Error): string | null {
  return "code" in error && typeof error.code === "string" ? error.code : null;
}
