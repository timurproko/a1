import { open, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const MAX_TRACE_CHARACTERS = 65_536;
const MAX_TRACE_EVENTS = 64;
const MAX_FATAL_BYTES = 16 * 1024;
const knownPhases = new Set([
  "command-invoked", "bootstrap-start", "bootstrap-selected",
  "durable-validation-start", "durable-validation-complete",
  "ui-entry", "ui-modules-loaded",
  "pi-services", "resource-discovery", "session-created", "settings-loaded",
  "first-input-ready-render",
]);

/** Keeps bounded phase timings, never trace paths, profile data, unknown fields, or malformed content. */
export function summarizeResumeTrace(source: string) {
  const phases: Array<{ phase: string; elapsedMs: number }> = [];
  const bounded = source.slice(0, MAX_TRACE_CHARACTERS);
  const lines = bounded.split(/\r?\n/).filter(Boolean);
  let invalidRecords = 0;
  for (const line of lines.slice(0, MAX_TRACE_EVENTS)) {
    try {
      const value: unknown = JSON.parse(line);
      if (typeof value !== "object" || value === null) throw new Error("invalid record");
      const event = value as Record<string, unknown>;
      if (event.schema !== "a1-startup-trace-v1" || typeof event.phase !== "string" || !knownPhases.has(event.phase)
        || typeof event.elapsedMs !== "number" || !Number.isFinite(event.elapsedMs) || event.elapsedMs < 0) throw new Error("invalid record");
      phases.push({ phase: event.phase, elapsedMs: Math.round(event.elapsedMs) });
    } catch { invalidRecords++; }
  }
  phases.sort((left, right) => left.elapsedMs - right.elapsedMs);
  return {
    tracePresent: source.length > 0,
    truncated: source.length > MAX_TRACE_CHARACTERS || lines.length > MAX_TRACE_EVENTS,
    invalidRecords,
    readyTrace: phases.some(event => event.phase === "first-input-ready-render"),
    lastPhase: phases.at(-1)?.phase ?? null,
    phases,
  };
}

/** Keeps failure classification and owned code locations, never messages, paths, or session data. */
export function summarizeResumeFatal(source: string) {
  if (Buffer.byteLength(source) > MAX_FATAL_BYTES) return null;
  try {
    const value = JSON.parse(source) as Record<string, unknown>;
    if (!value || !["uncaughtException", "unhandledRejection", "entry", "delivery"].includes(String(value.origin))
      || !["Error", "TypeError", "RangeError"].includes(String(value.classification)) || typeof value.cleanupFailed !== "boolean"
      || !Array.isArray(value.locations)) return null;
    const locations: Array<{ file: string; line: number; column: number }> = [];
    for (const entry of value.locations.slice(0, 16)) {
      if (!entry || typeof entry !== "object") continue;
      const { file, line, column } = entry as Record<string, unknown>;
      if (typeof file !== "string" || file.length > 160 || !/^(?:foundation|integrations|features|cli|composition|app|ui|contracts)\/[a-zA-Z0-9_./-]+\.[cm]?[jt]s$/u.test(file)
        || file.split("/").includes("..") || !Number.isSafeInteger(line) || Number(line) < 1 || !Number.isSafeInteger(column) || Number(column) < 1) continue;
      locations.push({ file, line: Number(line), column: Number(column) });
    }
    return { origin: String(value.origin), classification: String(value.classification), cleanupFailed: value.cleanupFailed, locations };
  } catch { return null; }
}

/** Read only bounded fatal records from the disposable runtime before its cleanup removes them. */
export async function readResumeFatalDiagnostics(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const records: NonNullable<ReturnType<typeof summarizeResumeFatal>>[] = [];
  for (const entry of entries.filter(entry => entry.isFile() && /^fatal-\d+-[a-f0-9-]+\.json$/u.test(entry.name)).sort((a, b) => b.name.localeCompare(a.name)).slice(0, 3)) {
    const file = await open(resolve(directory, entry.name), "r").catch(() => null);
    if (!file) continue;
    try {
      const { size } = await file.stat();
      if (size > MAX_FATAL_BYTES) continue;
      const buffer = Buffer.alloc(size);
      const { bytesRead } = await file.read(buffer, 0, size, 0);
      const record = summarizeResumeFatal(buffer.subarray(0, bytesRead).toString("utf8"));
      if (record) records.push(record);
    } finally { await file.close(); }
  }
  return records;
}
