import { fileURLToPath } from "node:url";
import { createNativeProcessInspector, loadProcessGuardianAddon, resolveProcessGuardianPath } from "../process-containment/index.js";
import type { NativeProcessIdentity } from "../lifecycle/index.js";
import type { SupervisorEndpointMetadata } from "./cohort-state.js";

export type SupervisorProcessState = "same" | "gone" | "unknown";
export type ObserveSupervisorProcess = (pid: number) => Promise<NativeProcessIdentity | null>;
const ownRoot = fileURLToPath(new URL("../../../", import.meta.url));

/** Inspection code comes from this runtime, never from a path in a stale endpoint record. */
export async function observeSupervisorProcess(pid: number): Promise<NativeProcessIdentity | null> {
  return await (await createNativeProcessInspector(process.env, process.platform, ownRoot)).observe(pid);
}

/** The current runtime also owns the OS gate ABI; metadata cannot choose a different addon. */
export function acquireSupervisorGate(path: string): { readonly acquired: boolean; release(): void } {
  const addon = loadProcessGuardianAddon(resolveProcessGuardianPath(ownRoot, process.env));
  if (!addon.tryAcquireProcessGate) throw new Error("this installation lacks startup recovery support; update or repair A1");
  return addon.tryAcquireProcessGate(path);
}

/** A failed inspection is uncertainty, never permission to erase a possibly live owner. */
export async function supervisorProcessState(
  metadata: SupervisorEndpointMetadata,
  observe: ObserveSupervisorProcess = observeSupervisorProcess,
): Promise<SupervisorProcessState> {
  let identity: NativeProcessIdentity | null;
  try { identity = await observe(metadata.pid); }
  catch { return "unknown"; }
  if (identity === null) return "gone";
  if (identity.pid !== metadata.pid) return "unknown";
  if (metadata.nativeStartIdentity !== undefined) {
    // Compatibility: only compare tokens of the same native format, not an old Node timestamp.
    if (!validNativeToken(metadata.nativeStartIdentity) || !validNativeToken(identity.startIdentity)
      || identity.startIdentity.split(":")[0] !== metadata.nativeStartIdentity.split(":")[0]) return "unknown";
    return identity.startIdentity === metadata.nativeStartIdentity ? "same" : "gone";
  }
  // Compatibility: legacy publication happened after process creation. A native creation time
  // strictly later than that publication (with a one-second clock margin) disproves ownership;
  // a near timestamp is NOT proof of ownership. Linux tick-only tokens cannot prove this.
  const published = Date.parse(metadata.startedAt);
  const created = nativeCreationTime(identity.startIdentity);
  return Number.isFinite(published) && created !== null && created > published + 1_000 ? "gone" : "unknown";
}

function validNativeToken(value: unknown): value is string {
  return typeof value === "string" && /^(?:windows-filetime:\d{1,20}|linux-proc-start:\d{1,20}|darwin-proc-start:\d{1,20}:\d{1,6})$/.test(value);
}

function nativeCreationTime(identity: string): number | null {
  const windows = /^windows-filetime:(\d+)$/.exec(identity);
  if (windows) return Number(BigInt(windows[1]!) / 10_000n - 11_644_473_600_000n);
  const darwin = /^darwin-proc-start:(\d+):(\d+)$/.exec(identity);
  return darwin ? Number(darwin[1]) * 1_000 + Number(darwin[2]) / 1_000 : null;
}
