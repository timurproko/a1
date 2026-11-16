import { execFile } from "node:child_process";
import type { ProcessIdentity } from "./model.js";

/**
 * The identity every record written by this build carries. Liveness is a pid probe, so the
 * identity only distinguishes records this build wrote from records an older build left.
 */
export const PID_LIVENESS_IDENTITY = "pid-liveness";

/** Seams for tests; production uses the real signal probe, platform and process table. */
export interface ProcessLivenessOptions {
  readonly platform?: NodeJS.Platform;
  readonly kill?: (pid: number, signal: 0) => void;
  readonly listProcessIds?: () => Promise<ReadonlySet<number> | null>;
}

// Performance: a sweep over hundreds of records must not spawn a process table per record.
const SNAPSHOT_TTL_MS = 2000;
let snapshot: { readonly at: number; readonly pids: ReadonlySet<number> } | undefined;

/** The live Windows process ids from one `tasklist` run, cached briefly; null when unavailable. */
async function windowsProcessIds(): Promise<ReadonlySet<number> | null> {
  if (snapshot !== undefined && Date.now() - snapshot.at < SNAPSHOT_TTL_MS) return snapshot.pids;
  const stdout = await new Promise<string | null>(done => {
    execFile("tasklist", ["/FO", "CSV", "/NH"], { windowsHide: true, timeout: 5000, maxBuffer: 8 * 1024 * 1024 }, (error, output) => done(error ? null : String(output)));
  });
  if (stdout === null) return null;
  const pids = new Set<number>();
  for (const line of stdout.split(/\r?\n/)) {
    const match = /^"[^"]*","(\d+)"/.exec(line);
    if (match) pids.add(Number(match[1]));
  }
  if (pids.size === 0) return null;
  snapshot = { at: Date.now(), pids };
  return pids;
}

/**
 * Observe whether a process is running. A permission refusal proves the pid exists on Unix;
 * on Windows it does not: process and thread ids share one number space and opening a
 * thread id (or a terminated process whose handles are still held) fails with access denied,
 * so an `EPERM` there is confirmed against the process table. An unavailable table keeps
 * the conservative answer (alive), never inventing a dead process.
 */
export async function inspectLiveProcess(pid: number, options: ProcessLivenessOptions = {}): Promise<ProcessIdentity | null> {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  try {
    (options.kill ?? ((target, signal) => { process.kill(target, signal); }))(pid, 0);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EPERM")) return null;
    if ((options.platform ?? process.platform) === "win32") {
      const live = await (options.listProcessIds ?? windowsProcessIds)();
      if (live !== null && !live.has(pid)) return null;
    }
  }
  return { pid, startIdentity: PID_LIVENESS_IDENTITY };
}
