import type { NativeProcessIdentity } from "../lifecycle/index.js";
import type { ProcessGuardianAddon } from "./addon.js";
import type { NativeProcessInspector } from "./contracts.js";

/** Verifies native process identity through the process-guardian addon's bounded inspection call. */
export class AddonProcessInspector implements NativeProcessInspector {
  readonly addon: Pick<ProcessGuardianAddon, "inspectProcessStart">;
  readonly identityPrefix: string;

  constructor(addon: Pick<ProcessGuardianAddon, "inspectProcessStart">, identityPrefix: string) {
    if (!identityPrefix || identityPrefix.includes("\0")) throw new TypeError("process identity prefix is invalid");
    this.addon = addon;
    this.identityPrefix = identityPrefix;
  }

  async observe(pid: number): Promise<NativeProcessIdentity | null> {
    if (!Number.isSafeInteger(pid) || pid <= 0) throw new TypeError("inspected PID must be a positive safe integer");
    let startIdentity: string | null;
    try {
      startIdentity = this.addon.inspectProcessStart(pid);
    } catch (error) {
      throw Object.assign(new Error(`cannot inspect native process identity: ${errorMessage(error)}`), { code: "PROCESS_INSPECTION_FAILED" });
    }
    if (startIdentity === null) return null;
    if (typeof startIdentity !== "string" || startIdentity.length === 0 || startIdentity.length > 512
      || startIdentity.includes("\0") || !startIdentity.startsWith(this.identityPrefix)) {
      throw Object.assign(new Error("process guardian returned mismatched identity data"), { code: "PROCESS_INSPECTION_INVALID" });
    }
    return { pid, startIdentity };
  }

  async matches(identity: NativeProcessIdentity): Promise<boolean> {
    const observed = await this.observe(identity.pid);
    return observed !== null && observed.startIdentity === identity.startIdentity;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
