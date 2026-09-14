import { writeFile } from "node:fs/promises";
import type { PiTuiInputDiagnosticsEvent } from "../tui-runtime/index.js";
import type { ResponseCopyEvent } from "./response-copy-protocol.js";
import type { PasteEvent } from "./paste-protocol.js";

const PHASES = new Set(["capture", "selection-clear", "queued", "preparing", "extracted", "encoded", "submitting", "settled", "cleanup",
  "framing", "admitted", "predecessor", "acquiring", "acquired-text", "acquired-image", "classifying", "path-fallback", "prepared", "inserting",
  "receipt", "semantic-start", "semantic-end", "composition-start", "composition-end", "write-start", "write-end", "heartbeat"]);
interface RecordRow { readonly source: string; readonly phase: string; readonly atMs: number; readonly request: number; readonly pending: number; readonly bytes: number; readonly elapsedMs: number; readonly transport: string; readonly outcome: string; readonly sourceUnits: number; readonly pendingBytes: number }

/** Opt-in scalar-only snapshots, bounded to 128 rows and one pending asynchronous write. */
export class ClipboardDiagnosticCapture {
  #records: RecordRow[] = [];
  readonly #payloads = new Map<string, number>();
  #pending: string | undefined;
  #writing: Promise<void> | undefined;
  #disposed = false;
  readonly #heartbeat: ReturnType<typeof setInterval>;
  constructor(private readonly destination: string, private readonly write = (file: string, data: string) => writeFile(file, data, { encoding: "utf8", mode: 0o600 })) {
    this.#heartbeat = setInterval(() => this.#record("heartbeat", { phase: "heartbeat", atMs: performance.now() }), 100);
    this.#heartbeat.unref();
  }
  copy(event: ResponseCopyEvent): void { this.#record("copy", event); }
  paste(event: PasteEvent): void { this.#record("paste", event); }
  runtime(event: PiTuiInputDiagnosticsEvent): void {
    this.#record("runtime", { phase: event.phase, atMs: event.atMs, request: event.revision, pending: event.pendingDepth });
  }
  #record(source: string, event: { phase: string; atMs: number; request?: number; pending?: number; bytes?: number; elapsedMs?: number; transport?: string; outcome?: string; sourceUnits?: number }): void {
    if (this.#disposed || !PHASES.has(event.phase)) return;
    const key = `${source}:${event.request ?? 0}`;
    if (["capture", "admitted"].includes(event.phase) && this.#payloads.size < 10) this.#payloads.set(key, scalar(event.sourceUnits) * 2);
    if (this.#payloads.has(key) && event.bytes !== undefined) this.#payloads.set(key, Math.max(this.#payloads.get(key)!, scalar(event.bytes)));
    if (event.phase === "settled" || event.phase === "cleanup") this.#payloads.delete(key);
    // Rationale: observed payload/source bytes, not an assertion about opaque native allocator overhead.
    const pendingBytes = scalar([...this.#payloads.values()].reduce((sum, bytes) => sum + bytes, 0));
    // Security: project only declared scalar fields. Never serialize the supplied event object or raw errors.
    this.#records.push({ source, phase: event.phase, atMs: scalar(event.atMs), request: event.request !== undefined && event.request < 0 ? -scalar(-event.request) : scalar(event.request), pending: scalar(event.pending), bytes: scalar(event.bytes), elapsedMs: scalar(event.elapsedMs),
      sourceUnits: scalar(event.sourceUnits), pendingBytes,
      transport: ["native", "terminal", "provided", "injected"].includes(event.transport ?? "") ? event.transport! : "none",
      outcome: ["ready", "failed", "canceled", "delivered", "submitted-unverified", "timed-out", "superseded"].includes(event.outcome ?? "") ? event.outcome! : "none" });
    if (this.#records.length > 128) this.#records.shift();
    this.#pending = JSON.stringify({ schema: "clipboard-diagnostics-v1", records: this.#records });
    this.#pump();
  }
  #pump(): void {
    if (this.#disposed || this.#writing || this.#pending === undefined) return;
    const snapshot = this.#pending;
    this.#pending = undefined;
    this.#writing = Promise.resolve().then(() => this.write(this.destination, snapshot)).catch(() => {
      // Security: diagnostics failure must not enter the normal terminal or block clipboard work.
    }).finally(() => { this.#writing = undefined; this.#pump(); });
  }
  /** Explicit test/evidence boundary; the interactive UI never waits for disk diagnostics. */
  async flush(): Promise<void> { while (this.#writing) await this.#writing; }
  dispose(): void { this.#disposed = true; clearInterval(this.#heartbeat); this.#pending = undefined; this.#records = []; this.#payloads.clear(); }
}
function scalar(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, value)) : 0;
}
