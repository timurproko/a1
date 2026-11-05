import { mkdir, realpath } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { acquireSupervisorGate } from "./supervisor-identity.js";

/** Serialize endpoint publication and retirement using a lock released by the OS on process death. */
export async function withEndpointLock<T>(metadataPath: string, operation: () => Promise<T>): Promise<T> {
  await mkdir(dirname(metadataPath), { recursive: true, mode: 0o700 });
  const authority = join(await realpath(dirname(metadataPath)), `${basename(metadataPath)}.authority`);
  const deadline = Date.now() + 3_000;
  for (;;) {
    let gate;
    try { gate = acquireSupervisorGate(authority); }
    catch (cause) {
      throw Object.assign(new Error("cannot access A1 startup coordination; check installation and runtime-directory permissions", { cause }), { code: "SUPERVISOR_RECOVERY_UNAVAILABLE" });
    }
    if (gate.acquired) {
      try { return await operation(); }
      finally { gate.release(); }
    }
    gate.release();
    if (Date.now() >= deadline) throw Object.assign(new Error("another A1 startup is still preparing; retry shortly"), { code: "SUPERVISOR_RECOVERY_BUSY" });
    await delay(20);
  }
}
