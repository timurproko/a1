import { randomUUID } from "node:crypto";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { writeSync } from "node:fs";
import { join } from "node:path";
import { boundedCleanup, restoreProcessTerminal } from "./terminal-reset.js";

export interface FatalExitOptions {
  readonly directory: string;
  readonly releaseId?: string;
  readonly restore?: () => void;
  readonly dispose?: () => Promise<unknown> | void;
  readonly timeoutMs?: number;
}

export async function writeFatalDiagnostic(directory: string, origin: string, error: unknown, releaseId?: string): Promise<string | null> {
  try {
    // Security: only known classifications and code locations are retained. Error messages,
    // function names, arbitrary paths, and request objects are never persisted.
    const cleanupFailed = error instanceof AggregateError && error.cause instanceof Error;
    const primary = cleanupFailed ? (error as AggregateError).cause : error;
    const classification = primary instanceof TypeError ? "TypeError" : primary instanceof RangeError ? "RangeError" : "Error";
    const stack = primary instanceof Error && typeof primary.stack === "string" ? primary.stack.slice(0, 32768) : "";
    const locations = stack.split("\n").slice(1).flatMap(line => {
      const match = /\/(?:dist|src)\/([a-zA-Z0-9_./-]+\.[cm]?[jt]s):(\d+):(\d+)\)?$/.exec(line.replaceAll("\\", "/"));
      return match ? [{ file: match[1]!.slice(0, 160), line: Number(match[2]), column: Number(match[3]) }] : [];
    }).slice(0, 16);
    const record = {
      timestamp: new Date().toISOString(),
      origin: ["uncaughtException", "unhandledRejection", "entry"].includes(origin) ? origin : "entry",
      classification, cleanupFailed, locations, node: process.version, platform: process.platform,
      releaseId: releaseId && /^[a-zA-Z0-9._-]{1,128}$/.test(releaseId) ? releaseId : "unknown",
    };
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const name = `fatal-${Date.now()}-${randomUUID()}.json`;
    const path = join(directory, name);
    const text = JSON.stringify(record, null, 2);
    if (Buffer.byteLength(text) > 16 * 1024) return null;
    await writeFile(path, text, { flag: "wx", mode: 0o600 });
    const names = (await readdir(directory)).filter(file => /^fatal-\d+-[a-f0-9-]+\.json$/.test(file)).sort().reverse();
    await Promise.all(names.slice(10).map(file => unlink(join(directory, file)).catch(() => undefined)));
    return path;
  } catch { return null; }
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
    const deadline = setTimeout(finish, options.timeoutMs ?? 1000);
    void Promise.all([
      writeFatalDiagnostic(options.directory, origin, error, options.releaseId).then(path => { record = path; }),
      boundedCleanup(() => options.dispose?.(), options.timeoutMs ?? 1000).catch(() => undefined),
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
