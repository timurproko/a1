import { writeFile } from "node:fs/promises";
import {
  SUGGESTION_DECISION_REASONS, SUGGESTION_DIAGNOSTIC_EVENTS,
  type SuggestionDiagnosticObserver, type SuggestionDiagnosticRecord,
} from "../../contracts/owned-ui/index.js";

export interface SuggestionDiagnosticCaptureOptions {
  readonly enabled?: boolean;
  /** Explicit local destination, or an injected sink for deterministic I/O tests. */
  readonly destination?: string;
  readonly writeSnapshot?: (snapshot: string) => Promise<void>;
}

/** Bounded metadata snapshots; one in-flight write and one replaceable latest snapshot. */
export class SuggestionDiagnosticCapture implements SuggestionDiagnosticObserver {
  #records: SuggestionDiagnosticRecord[] = [];
  #pending: string | undefined;
  #writing: Promise<void> | undefined;
  #disposed = false;
  readonly #write: ((snapshot: string) => Promise<void>) | undefined;

  constructor(readonly options: SuggestionDiagnosticCaptureOptions = {}) {
    this.#write = options.writeSnapshot ?? (options.destination === undefined ? undefined
      : snapshot => writeFile(options.destination!, snapshot, { encoding: "utf8", mode: 0o600 }));
  }

  record(record: SuggestionDiagnosticRecord): void {
    if (!this.options.enabled || this.#disposed) return;
    const safe = sanitize(record);
    if (safe === null) return;
    this.#records.push(safe);
    if (this.#records.length > 128) this.#records.shift();
    let snapshot = this.#serialize();
    while (Buffer.byteLength(snapshot, "utf8") > 65_536) {
      this.#records.shift();
      snapshot = this.#serialize();
    }
    if (this.#write) {
      this.#pending = snapshot;
      this.#pump();
    }
  }

  snapshot(): readonly SuggestionDiagnosticRecord[] { return this.#records.map(record => ({ ...record })); }

  /** Explicit evidence boundary, never awaited by input or rendering. */
  async flush(): Promise<void> {
    while (this.#writing) await this.#writing;
  }

  dispose(): void {
    this.#disposed = true;
    this.#records = [];
    this.#pending = undefined;
  }

  #serialize(): string { return JSON.stringify({ schema: "prompt-suggestion-diagnostics-v1", records: this.#records }); }

  #pump(): void {
    if (this.#writing || this.#pending === undefined || !this.#write || this.#disposed) return;
    const snapshot = this.#pending;
    this.#pending = undefined;
    this.#writing = Promise.resolve().then(() => this.#write!(snapshot)).catch(() => {
      // Security: do not retain or display raw filesystem/provider errors.
    }).finally(() => {
      this.#writing = undefined;
      this.#pump();
    });
  }
}

function sanitize(record: SuggestionDiagnosticRecord): SuggestionDiagnosticRecord | null {
  if (!SUGGESTION_DIAGNOSTIC_EVENTS.includes(record.event)) return null;
  const reasoning = ["ordinary", "off", "minimal", "low", "medium", "high", "xhigh", "max", "unavailable"].includes(record.reasoning)
    ? record.reasoning : "unavailable";
  const reason = record.reason !== undefined && SUGGESTION_DECISION_REASONS.includes(record.reason) ? record.reason : undefined;
  // Security: explicit projection prevents arbitrary extra fields, including raw error payloads, from escaping.
  return {
    event: record.event, ...(reason === undefined ? {} : { reason }),
    session: boundedNumber(record.session), run: boundedNumber(record.run), response: boundedNumber(record.response),
    request: boundedNumber(record.request), provider: identifier(record.provider), model: identifier(record.model),
    reasoning, elapsedMs: boundedNumber(record.elapsedMs),
  };
}

function boundedNumber(value: number): number {
  return Number.isFinite(value) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))) : 0;
}

function identifier(value: string): string {
  // Security: identifiers are metadata, not display names or arbitrary JSON. Reject controls/path-shaped values.
  if (typeof value !== "string" || /[\p{C}\\\s]/u.test(value) || value.includes(":") || value.startsWith("/")) return "redacted";
  return value.slice(0, 64);
}
