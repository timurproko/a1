import { writeSync } from "node:fs";
import { boundedCleanup, restoreProcessTerminal } from "./terminal-reset.js";

export interface FatalExitOptions {
  readonly directory: string;
  readonly releaseId?: string;
  readonly restore?: () => void;
  readonly dispose?: () => Promise<unknown> | void;
  readonly timeoutMs?: number;
}

export async function writeFatalDiagnostic(directory: string, origin: string, error: unknown, releaseId?: string): Promise<string | null> {
  try { return await (await import("./fatal-diagnostic.js")).writeFatalDiagnostic(directory, origin, error, releaseId); }
  catch { return null; }
}

export function installFatalExit(options: FatalExitOptions): { fail(error: unknown): void; remove(): void } {
  let failing = false;
  const restore = () => { try { (options.restore ?? restoreProcessTerminal)(); } catch {} };
  const terminate = (origin: string, error: unknown) => {
    if (failing) return;
    failing = true;
    process.exitCode = 1;
    // Security: stop accepting input immediately; fatal errors never resume normal work.
    try { process.stdin.pause(); process.stdin.removeAllListeners("data"); } catch {}
    restore();
    let record: string | null = null;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      restore();
      try {
        const location = record?.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 512);
        writeSync(2, `A1 stopped after an unexpected error.${location ? ` Diagnostic: ${location}` : " Diagnostic storage unavailable."}\n`);
      } catch {}
      process.exit(1);
    };
    const cleanupTimeoutMs = options.timeoutMs ?? 1000;
    // Rationale: a short cleanup budget must not terminate the process while its bounded diagnostic write is still in flight.
    const deadline = setTimeout(finish, Math.max(1000, cleanupTimeoutMs));
    void Promise.all([
      writeFatalDiagnostic(options.directory, origin, error, options.releaseId).then(path => { record = path; }),
      boundedCleanup(() => options.dispose?.(), cleanupTimeoutMs).catch(() => undefined),
    ]).then(() => { clearTimeout(deadline); finish(); }, finish);
  };
  const exception = (error: Error) => terminate("uncaughtException", error);
  const rejection = (error: unknown) => terminate("unhandledRejection", error);
  process.on("uncaughtException", exception);
  process.on("unhandledRejection", rejection);
  return {
    fail: error => terminate("entry", error),
    remove() { process.off("uncaughtException", exception); process.off("unhandledRejection", rejection); },
  };
}
