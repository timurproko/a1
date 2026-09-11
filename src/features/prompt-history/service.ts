import type { Worker } from "node:worker_threads";
import { assertPromptHistorySubmission, PROMPT_HISTORY_MAX_ENTRY_BYTES, PROMPT_HISTORY_MAX_PENDING, PROMPT_HISTORY_MAX_TEXT_BYTES, type PromptHistoryFailure, type PromptHistoryPort, type PromptHistoryResult, type PromptHistorySnapshot, type PromptHistorySubmission } from "../../contracts/owned-ui/index.js";
import type { HistoryWorkerRequest } from "./worker.js";
import { resolvePromptHistoryPath } from "./paths.js";

interface Work {
  request: HistoryWorkerRequest;
  done(value: unknown, ok: boolean): void;
}

/** Owns a finite asynchronous history queue; storage faults never throw into prompt dispatch. */
export class PromptHistoryService implements PromptHistoryPort {
  readonly #snapshots = new Set<(snapshot: PromptHistorySnapshot) => void>();
  readonly #failures = new Set<(code: PromptHistoryFailure) => void>();
  readonly #reported = new Set<PromptHistoryFailure>();
  readonly #queue: Work[] = [];
  #worker: Worker | undefined;
  #active: Work | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #poll: ReturnType<typeof setInterval> | undefined;
  #sequence = 0;
  #bytes = 0;
  #writes = 0;
  #started = false;
  #ready = false;
  #failed = false;
  #closing = false;
  #reading = false;
  #refreshPending = false;
  #lastRevision = -1;
  #closePromise: Promise<void> | undefined;

  constructor(readonly options: { dataDir: string; profileRoot: string; limit: number; createWorker?: () => Worker }) {}

  start(): void {
    if (this.#started || this.#closing) return;
    this.#started = true;
    setImmediate(() => { void this.#open().catch(() => this.#fail("unavailable")); });
  }

  record(submission: PromptHistorySubmission): Promise<PromptHistoryResult> {
    if (this.#failed || this.#closing) return Promise.resolve("skipped");
    try { assertPromptHistorySubmission(submission); } catch { this.#report("unavailable"); return Promise.resolve("skipped"); }
    const bytes = Buffer.byteLength(submission.text);
    if (bytes > PROMPT_HISTORY_MAX_ENTRY_BYTES) { this.#report("oversized"); return Promise.resolve("skipped"); }
    if (this.#writes >= PROMPT_HISTORY_MAX_PENDING || this.#bytes + bytes > PROMPT_HISTORY_MAX_TEXT_BYTES) {
      this.#report("capacity"); return Promise.resolve("skipped");
    }
    const candidate: PromptHistorySubmission = {
      id: submission.id, text: submission.text, timestamp: submission.timestamp, kind: submission.kind,
      ...(submission.cwd !== undefined && Buffer.byteLength(submission.cwd) <= 8192 ? { cwd: submission.cwd } : {}),
      ...(submission.sessionId !== undefined && Buffer.byteLength(submission.sessionId) <= 256 ? { sessionId: submission.sessionId } : {}),
    };
    this.start(); this.#writes++; this.#bytes += bytes;
    return new Promise(resolve => {
      this.#queue.push({ request: { id: ++this.#sequence, kind: "record", submission: candidate }, done: (_value, ok) => {
        this.#writes--; this.#bytes -= bytes;
        resolve(ok ? "committed" : "skipped");
        if (ok) this.refresh();
      } });
      this.#drain();
    });
  }

  refresh(): void {
    if (this.#closing || this.#failed) return;
    this.start();
    if (this.#reading) { this.#refreshPending = true; return; }
    this.#reading = true;
    const observers = [...this.#snapshots];
    this.#queue.push({ request: { id: ++this.#sequence, kind: "read" }, done: (value, ok) => {
      this.#reading = false;
      if (ok) {
        if (!isSnapshot(value)) { this.#fail("corrupt"); return; }
        if (value.revision !== this.#lastRevision && observers.some(listener => this.#snapshots.has(listener))) {
          this.#lastRevision = value.revision;
          for (const listener of observers) {
            if (!this.#snapshots.has(listener)) continue;
            try { listener(value); } catch { /* Security: observer errors must not escape the worker event handler. */ }
          }
        }
      }
      if (this.#refreshPending) { this.#refreshPending = false; this.refresh(); }
    } });
    this.#drain();
  }

  onSnapshot(listener: (snapshot: PromptHistorySnapshot) => void): () => void {
    this.#snapshots.add(listener);
    this.#lastRevision = -1;
    return () => this.#snapshots.delete(listener);
  }
  onFailure(listener: (code: PromptHistoryFailure) => void): () => void {
    this.#failures.add(listener); return () => this.#failures.delete(listener);
  }

  close(): Promise<void> {
    if (this.#closePromise !== undefined) return this.#closePromise;
    this.#closing = true;
    if (this.#poll !== undefined) clearInterval(this.#poll);
    this.#closePromise = new Promise(resolve => {
      if (!this.#started || this.#failed) { resolve(); return; }
      const deadline = setTimeout(() => { this.#report("shutdown"); this.#fail("shutdown"); resolve(); }, 2000);
      this.#queue.push({ request: { id: ++this.#sequence, kind: "close" }, done: (_value, ok) => {
        if (!ok) this.#report("shutdown");
        const stopped = this.#worker?.terminate() ?? Promise.resolve();
        void stopped.catch(() => {}).finally(() => { clearTimeout(deadline); resolve(); });
      } });
      this.#drain();
    });
    return this.#closePromise;
  }

  async #open(): Promise<void> {
    if (this.#failed) return;
    const { Worker } = await import("node:worker_threads");
    if (this.#failed) return;
    const location = resolvePromptHistoryPath(this.options.dataDir, this.options.profileRoot);
    const source = import.meta.url.endsWith(".ts");
    const entry = new URL(source ? "./worker.ts" : "./worker.js", import.meta.url);
    const options = { workerData: { ...location, limit: this.options.limit }, stdout: true, stderr: true };
    this.#worker = this.options.createWorker?.() ?? (source
      ? new Worker(`import('tsx/esm/api').then(({ tsImport }) => tsImport(${JSON.stringify(entry.href)}, ${JSON.stringify(import.meta.url)}))`, { ...options, eval: true })
      : new Worker(entry, options));
    this.#worker.stdout!.resume(); this.#worker.stderr!.resume();
    this.#timer = setTimeout(() => this.#fail("unavailable"), 5000);
    this.#worker.on("message", (message: { id: number; ok: boolean; value?: unknown; code?: unknown }) => {
      if (this.#failed) return;
      clearTimeout(this.#timer);
      if (message === null || typeof message !== "object" || !Number.isSafeInteger(message.id) || typeof message.ok !== "boolean") {
        this.#fail("unavailable"); return;
      }
      if (!message.ok) { this.#fail(failureCode(message.code)); return; }
      if (message.id === 0) {
        this.#ready = true;
        if (!this.#closing) {
          this.refresh();
          this.#poll = setInterval(() => this.refresh(), 1000); this.#poll.unref();
        }
      } else {
        const item = this.#active;
        if (item?.request.id !== message.id) { this.#fail("unavailable"); return; }
        this.#active = undefined;
        item.done(message.value, true);
      }
      this.#drain();
    });
    this.#worker.on("error", () => this.#fail("unavailable"));
    this.#worker.on("exit", () => { if (!this.#closing || this.#active !== undefined || this.#queue.length > 0) this.#fail("unavailable"); });
  }

  #drain(): void {
    if (!this.#ready || this.#failed || this.#active !== undefined) return;
    const next = this.#queue.shift();
    if (next === undefined) return;
    this.#active = next;
    this.#timer = setTimeout(() => this.#fail("busy"), 1500);
    try { this.#worker!.postMessage(next.request); } catch { this.#fail("unavailable"); }
  }

  #report(code: PromptHistoryFailure): void {
    if (this.#reported.has(code)) return;
    this.#reported.add(code);
    for (const listener of this.#failures) {
      try { listener(code); } catch { /* Security: caller exceptions are not persistence diagnostics. */ }
    }
  }

  #fail(code: PromptHistoryFailure): void {
    if (this.#failed) return;
    this.#failed = true;
    clearTimeout(this.#timer); clearInterval(this.#poll);
    this.#report(code);
    const active = this.#active; this.#active = undefined;
    active?.done(undefined, false);
    for (const item of this.#queue.splice(0)) item.done(undefined, false);
    this.#worker?.unref();
    void this.#worker?.terminate().catch(() => {});
  }
}

function failureCode(value: unknown): PromptHistoryFailure {
  switch (value) {
    case "busy": case "capacity": case "oversized": case "schema": case "corrupt": case "shutdown": return value;
    default: return "unavailable";
  }
}

function isSnapshot(value: unknown): value is PromptHistorySnapshot {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as PromptHistorySnapshot;
  if (!Number.isSafeInteger(candidate.revision) || candidate.revision < 0 || !Number.isInteger(candidate.limit)
    || candidate.limit < 10 || candidate.limit > 100 || candidate.limit % 10 !== 0
    || !Array.isArray(candidate.entries) || candidate.entries.length > candidate.limit) return false;
  let bytes = 0;
  return candidate.entries.every(item => {
    if (typeof item?.text !== "string" || item.text !== item.text.trim()
      || typeof item.submissionId !== "string" || item.submissionId.length > 128) return false;
    const size = Buffer.byteLength(item.text); bytes += size;
    return size > 0 && size <= PROMPT_HISTORY_MAX_ENTRY_BYTES && bytes <= PROMPT_HISTORY_MAX_TEXT_BYTES;
  });
}
