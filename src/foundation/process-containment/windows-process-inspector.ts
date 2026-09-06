import { execFile } from "node:child_process";
import type { NativeProcessIdentity } from "../lifecycle/index.js";
import type { NativeProcessInspector } from "./contracts.js";

export interface InspectorCommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface InspectorCommandRunner {
  run(executable: string, arguments_: readonly string[]): Promise<InspectorCommandResult>;
}

/** Verifies Windows process identity through the bounded process-guardian inspection command. */
export class WindowsNativeProcessInspector implements NativeProcessInspector {
  constructor(
    readonly helperPath: string,
    private readonly runner: InspectorCommandRunner = defaultRunner,
    private readonly identityPrefix = "windows-filetime:",
  ) {
    if (!helperPath || helperPath.includes("\0")) throw new TypeError("process guardian helper path is invalid");
  }

  async observe(pid: number): Promise<NativeProcessIdentity | null> {
    if (!Number.isSafeInteger(pid) || pid <= 0) throw new TypeError("inspected PID must be a positive safe integer");
    const result = await this.runner.run(this.helperPath, ["--inspect-pid", String(pid)]);
    if (result.exitCode === 3) return null;
    if (result.exitCode !== 0) {
      const detail = result.stderr.trim() || `helper exited ${result.exitCode}`;
      throw Object.assign(new Error(`cannot inspect native process identity: ${detail}`), { code: "PROCESS_INSPECTION_FAILED" });
    }
    let value: unknown;
    try {
      value = JSON.parse(result.stdout);
    } catch {
      throw Object.assign(new Error("process guardian returned malformed identity data"), { code: "PROCESS_INSPECTION_INVALID" });
    }
    if (!isIdentity(value) || value.pid !== pid || !value.startIdentity.startsWith(this.identityPrefix)) {
      throw Object.assign(new Error("process guardian returned mismatched identity data"), { code: "PROCESS_INSPECTION_INVALID" });
    }
    return value;
  }

  async matches(identity: NativeProcessIdentity): Promise<boolean> {
    const observed = await this.observe(identity.pid);
    return observed !== null && observed.startIdentity === identity.startIdentity;
  }
}

const defaultRunner: InspectorCommandRunner = {
  async run(executable, arguments_) {
    return await new Promise(resolvePromise => {
      execFile(executable, [...arguments_], { windowsHide: true, timeout: 2_000, maxBuffer: 8 * 1_024 }, (error, stdout, stderr) => {
        const exitCode = error && "code" in error && typeof error.code === "number" ? error.code : error ? 1 : 0;
        resolvePromise({ exitCode, stdout, stderr });
      });
    });
  },
};

function isIdentity(value: unknown): value is NativeProcessIdentity {
  return typeof value === "object" && value !== null
    && "pid" in value && Number.isSafeInteger(value.pid) && Number(value.pid) > 0
    && "startIdentity" in value && typeof value.startIdentity === "string"
    && value.startIdentity.length > 0 && value.startIdentity.length <= 512 && !value.startIdentity.includes("\0");
}
