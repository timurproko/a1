const MAX_TRACE_CHARACTERS = 65_536;
const MAX_TRACE_EVENTS = 64;
const knownPhases = new Set([
  "command-invoked", "bootstrap-start", "bootstrap-selected",
  "durable-validation-start", "durable-validation-complete",
  "replacement-supervisor-start", "replacement-supervisor-ready",
  "guardian-start", "guardian-connected", "ui-entry", "ui-modules-loaded",
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
