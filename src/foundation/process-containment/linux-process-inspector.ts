import { readFile } from "node:fs/promises";
import type { NativeProcessIdentity } from "../lifecycle/index.js";
import type { NativeProcessInspector } from "./contracts.js";

export class LinuxNativeProcessInspector implements NativeProcessInspector {
  async observe(pid: number): Promise<NativeProcessIdentity | null> {
    if (!Number.isSafeInteger(pid) || pid <= 0) throw new TypeError("inspected PID must be a positive safe integer");
    let stat: string;
    try {
      stat = await readFile(`/proc/${pid}/stat`, "utf8");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
      throw error;
    }
    const commandEnd = stat.lastIndexOf(")");
    const fields = commandEnd >= 0 ? stat.slice(commandEnd + 1).trim().split(/\s+/) : [];
    const startTicks = fields[19];
    if (!startTicks || !/^\d+$/.test(startTicks)) throw new Error("process stat has no valid start-time field");
    return { pid, startIdentity: `linux-proc-start:${startTicks}` };
  }

  async matches(identity: NativeProcessIdentity): Promise<boolean> {
    const observed = await this.observe(identity.pid);
    return observed !== null && observed.startIdentity === identity.startIdentity;
  }
}
