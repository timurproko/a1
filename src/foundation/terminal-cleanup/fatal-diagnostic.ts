import { randomUUID } from "node:crypto";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Loaded only on a failure; persistence must never impede terminal restoration. */
export async function writeFatalDiagnostic(directory: string, origin: string, error: unknown, releaseId?: string): Promise<string | null> {
  try {
    // Security: only known classifications and code locations are retained, never private messages or objects.
    const cleanupFailed = error instanceof AggregateError && error.cause instanceof Error;
    const primary = cleanupFailed ? (error as AggregateError).cause : error;
    const classification = primary instanceof TypeError ? "TypeError" : primary instanceof RangeError ? "RangeError" : "Error";
    const stack = primary instanceof Error && typeof primary.stack === "string" ? primary.stack.slice(0, 32768) : "";
    const locations = stack.split("\n").slice(1).flatMap(line => {
      const match = /\/(?:dist|src)\/([a-zA-Z0-9_./-]+\.[cm]?[jt]s):(\d+):(\d+)\)?$/.exec(line.replaceAll("\\", "/"));
      return match ? [{ file: match[1]!.slice(0, 160), line: Number(match[2]), column: Number(match[3]) }] : [];
    }).slice(0, 16);
    const delivery = deliveryFailure(primary);
    const record = {
      timestamp: new Date().toISOString(),
      origin: ["uncaughtException", "unhandledRejection", "entry", "delivery"].includes(origin) ? origin : "entry",
      ...(delivery === null ? {} : { deliveryFailure: delivery }),
      classification, cleanupFailed, locations, node: process.version, platform: process.platform,
      releaseId: releaseId && /^[a-zA-Z0-9._-]{1,128}$/.test(releaseId) ? releaseId : "unknown",
    };
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const name = `${origin === "delivery" ? "delivery" : "fatal"}-${Date.now()}-${randomUUID()}.json`;
    const path = join(directory, name);
    const text = JSON.stringify(record, null, 2);
    if (Buffer.byteLength(text) > 16 * 1024) return null;
    await writeFile(path, text, { flag: "wx", mode: 0o600 });
    const names = (await readdir(directory)).filter(file => /^(?:fatal|delivery)-\d+-[a-f0-9-]+\.json$/.test(file))
      .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
    await Promise.all(names.slice(10).map(file => unlink(join(directory, file)).catch(() => undefined)));
    return path;
  } catch { return null; }
}

function deliveryFailure(error: unknown): Record<string, string | number> | null {
  if (!(error instanceof Error) || !("deliveryFailure" in error)) return null;
  const value = error.deliveryFailure;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!["event-count", "retained-bytes", "listener"].includes(String(record.reason))
    || !["snapshot", "session-view", "transcript-block", "session-lifecycle", "status", "editor-state", "terminal-surface",
      "agent-run-started", "agent-run-settled", "assistant-message-completed", "command-outcome", "diagnostic"].includes(String(record.event))) return null;
  const result: Record<string, string | number> = { reason: String(record.reason), event: String(record.event) };
  for (const key of ["generation", "pending", "bytes"]) {
    const number = record[key];
    if (typeof number !== "number" || !Number.isSafeInteger(number) || number < 0) return null;
    result[key] = number;
  }
  return result;
}
