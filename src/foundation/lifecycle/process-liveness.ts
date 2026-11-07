import type { ProcessIdentity } from "./model.js";

/**
 * The identity every record written by this build carries. Liveness is a pid probe, so the
 * identity only distinguishes records this build wrote from records an older build left.
 */
export const PID_LIVENESS_IDENTITY = "pid-liveness";

/** Observe whether a process is running; a permission refusal still proves the pid exists. */
export async function inspectLiveProcess(pid: number): Promise<ProcessIdentity | null> {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  try {
    process.kill(pid, 0);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EPERM")) return null;
  }
  return { pid, startIdentity: PID_LIVENESS_IDENTITY };
}
