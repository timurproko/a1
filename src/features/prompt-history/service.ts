import type { Worker } from "node:worker_threads";
import { assertPromptHistorySubmission, PROMPT_HISTORY_MAX_ENTRY_BYTES, PROMPT_HISTORY_MAX_PENDING, PROMPT_HISTORY_MAX_TEXT_BYTES, type PromptHistoryFailure, type PromptHistoryPort, type PromptHistoryResult, type PromptHistorySnapshot, type PromptHistorySubmission } from "../../contracts/owned-ui/index.js";
import type { HistoryWorkerRequest } from "./worker.js";
import { resolvePromptHistoryPath } from "./paths.js";

export type HistoryRecoveryState = "starting" | "ready" | "recovering" | "blocked-storage" | "closing" | "closed";
export interface HistoryClock {
  now(): number;
  setTimeout(callback: () => void, milliseconds: number): ReturnType<typeof setTimeout>;
  clearTimeout(timer: ReturnType<typeof setTimeout> | undefined): void;
}
const clock: HistoryClock = { now: () => Date.now(), setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: timer => clearTimeout(timer) };
const RETENTION_MS = 30_000;
const LIVENESS_MS = 10_000;
interface Work {
  readonly submission: PromptHistorySubmission;
  readonly expires: number;
  readonly bytes: number;
  done(result: PromptHistoryResult): void;
}
interface Attempt { readonly id: number; readonly work?: Work; readonly observers?: readonly ((snapshot: PromptHistorySnapshot) => void)[] }

/** One generation owns storage work; only proven non-commits may be retried. No default output sink. */
export class PromptHistoryService implements PromptHistoryPort {
  readonly #snapshots = new Set<(snapshot: PromptHistorySnapshot) => void>();
  readonly #failures = new Set<(code: PromptHistoryFailure) => void>();
  readonly #counts: Partial<Record<PromptHistoryFailure, number>> = {};
  readonly #queue: Work[] = [];
  readonly #clock: HistoryClock;
  #state: HistoryRecoveryState = "starting";
  #worker: Worker | undefined;
  #stopping: Promise<void> | undefined;
  #active: Attempt | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #expiry: ReturnType<typeof setTimeout> | undefined;
  #poll: ReturnType<typeof setTimeout> | undefined;
  #closeTimer: ReturnType<typeof setTimeout> | undefined;
  #sequence = 0;
  #generation = 0;
  #bytes = 0;
  #started = false;
  #ready = false;
  #refreshPending = false;
  #lastRevision = -1;
  #backoff = 100;
  #recoveries = 0;
  #closePromise: Promise<void> | undefined;
  #resolveClose: (() => void) | undefined;

  constructor(readonly options: { dataDir: string; profileRoot: string; limit: number; createWorker?: () => Worker; clock?: HistoryClock; random?: () => number }) {
    this.#clock = options.clock ?? clock;
  }

  /** Explicit developer inspection: bounded classified counters, never exception or prompt payloads. */
  diagnostics() {
    return { state: this.#state, generation: this.#generation, attempts: this.#sequence, recoveries: this.#recoveries,
      pending: this.#queue.length, bytes: this.#bytes, active: this.#active !== undefined,
      timers: [this.#timer, this.#expiry, this.#poll, this.#closeTimer].filter(value => value !== undefined).length,
      failures: { ...this.#counts } };
  }

  start(): void {
    if (this.#started || this.#isClosed()) return;
    this.#started = true;
    void this.#open();
  }

  record(submission: PromptHistorySubmission): Promise<PromptHistoryResult> {
    if (this.#isClosed() || this.#state === "blocked-storage") return Promise.resolve("skipped");
    try { assertPromptHistorySubmission(submission); } catch { this.#report("unavailable"); return Promise.resolve("skipped"); }
    const bytes = Buffer.byteLength(submission.text);
    if (bytes > PROMPT_HISTORY_MAX_ENTRY_BYTES) { this.#report("oversized"); return Promise.resolve("skipped"); }
    if (this.#queue.length >= PROMPT_HISTORY_MAX_PENDING || this.#bytes + bytes > PROMPT_HISTORY_MAX_TEXT_BYTES) {
      this.#report("capacity"); return Promise.resolve("skipped");
    }
    const candidate: PromptHistorySubmission = {
      id: submission.id, text: submission.text, timestamp: submission.timestamp, kind: submission.kind,
      ...(submission.cwd !== undefined && Buffer.byteLength(submission.cwd) <= 8192 ? { cwd: submission.cwd } : {}),
      ...(submission.sessionId !== undefined && Buffer.byteLength(submission.sessionId) <= 256 ? { sessionId: submission.sessionId } : {}),
    };
    this.start(); this.#bytes += bytes;
    return new Promise(resolve => {
      this.#queue.push({ submission: candidate, expires: this.#clock.now() + RETENTION_MS, bytes, done: resolve });
      this.#armExpiry(); this.#drain();
    });
  }

  refresh(): void {
    if (this.#isClosed() || this.#state === "blocked-storage") return;
    this.start(); this.#refreshPending = true; this.#drain();
  }

  onSnapshot(listener: (snapshot: PromptHistorySnapshot) => void): () => void {
    this.#snapshots.add(listener); this.#lastRevision = -1;
    return () => this.#snapshots.delete(listener);
  }
  // Security: this classified observer is developer-only, never wired to shell notifications.
  onFailure(listener: (code: PromptHistoryFailure) => void): () => void {
    this.#failures.add(listener); return () => this.#failures.delete(listener);
  }

  close(): Promise<void> {
    if (this.#closePromise !== undefined) return this.#closePromise;
    this.#state = "closing";
    this.#clock.clearTimeout(this.#poll); this.#poll = undefined;
    this.#clock.clearTimeout(this.#expiry); this.#expiry = undefined;
    this.#refreshPending = false;
    this.#closePromise = new Promise(resolve => { this.#resolveClose = resolve; });
    this.#closeTimer = this.#clock.setTimeout(() => {
      this.#report("shutdown"); this.#finishClose();
    }, 2000);
    if (!this.#started || !this.#ready && this.#worker === undefined) this.#finishClose();
    else if (this.#active === undefined && this.#ready) {
      this.#clock.clearTimeout(this.#timer); this.#timer = undefined;
      this.#drain();
    }
    return this.#closePromise;
  }

  #isClosed(): boolean { return this.#state === "closing" || this.#state === "closed"; }

  async #open(): Promise<void> {
    if (this.#isClosed() || this.#state === "blocked-storage" || this.#worker !== undefined || this.#stopping !== undefined) return;
    const generation = ++this.#generation;
    this.#state = "starting";
    try {
      const { Worker } = await import("node:worker_threads");
      if (this.#isClosed() || generation !== this.#generation) return;
      const location = resolvePromptHistoryPath(this.options.dataDir, this.options.profileRoot);
      const source = import.meta.url.endsWith(".ts");
      const entry = new URL(source ? "./worker.ts" : "./worker.js", import.meta.url);
      const options = { workerData: { ...location, limit: this.options.limit }, stdout: true, stderr: true };
      const worker = this.options.createWorker?.() ?? (source
        ? new Worker(`import('tsx/esm/api').then(({ tsImport }) => tsImport(${JSON.stringify(entry.href)}, ${JSON.stringify(import.meta.url)}))`, { ...options, eval: true })
        : new Worker(entry, options));
      this.#worker = worker;
      worker.stdout?.resume(); worker.stderr?.resume();
      this.#timer = this.#clock.setTimeout(() => this.#lost("unavailable"), LIVENESS_MS);
      worker.on("message", (message: unknown) => {
        if (generation !== this.#generation || this.#state === "closed") return;
        this.#response(message);
      });
      worker.on("error", () => { if (generation === this.#generation) this.#lost("unavailable"); });
      worker.on("exit", () => { if (generation === this.#generation) this.#lost("unavailable"); });
    } catch { if (generation === this.#generation) this.#lost("unavailable"); }
  }

  #response(value: unknown): void {
    if (value === null || typeof value !== "object") { this.#lost("unavailable"); return; }
    const message = value as { id?: number; ok?: boolean; code?: unknown; value?: unknown; certainty?: unknown };
    if (!Number.isSafeInteger(message.id) || typeof message.ok !== "boolean") { this.#lost("unavailable"); return; }
    // Concurrency: late/duplicate attempt replies cannot clear another attempt's liveness timer.
    if (message.id !== (this.#ready ? this.#active?.id : 0)) return;
    this.#clock.clearTimeout(this.#timer); this.#timer = undefined;
    const attempt = this.#active; this.#active = undefined;
    if (!message.ok) {
      const code = failureCode(message.code); this.#report(code);
      if (code === "schema" || code === "corrupt") {
        this.#state = this.#isClosed() ? "closing" : "blocked-storage";
        this.#settleAll(); void this.#stopWorker();
        if (this.#isClosed()) this.#finishClose();
        return;
      }
      if (attempt?.work !== undefined && message.certainty !== "uncommitted") {
        this.#settle(attempt.work, "skipped"); this.#lost(code); return;
      }
      if (attempt?.work !== undefined && code === "oversized") this.#settle(attempt.work, "skipped");
      if (this.#isClosed()) { this.#report("shutdown"); this.#finishClose(); return; }
      if (!this.#ready) void this.#stopWorker().then(() => this.#recover());
      else this.#recover();
      return;
    }
    if (!this.#ready) {
      this.#ready = true;
      if (!this.#isClosed()) { this.#state = "ready"; this.#refreshPending = true; this.#schedulePoll(); }
    } else if (attempt?.work !== undefined) {
      this.#settle(attempt.work, "committed"); this.#refreshPending = !this.#isClosed();
    } else if (attempt?.observers !== undefined) {
      if (!isSnapshot(message.value)) { this.#lost("corrupt"); return; }
      const snapshot = message.value;
      if (snapshot.revision !== this.#lastRevision && attempt.observers.some(listener => this.#snapshots.has(listener))) {
        this.#lastRevision = snapshot.revision;
        for (const listener of attempt.observers) {
          if (!this.#snapshots.has(listener) || this.#isClosed()) continue;
          try { listener(snapshot); } catch { /* Security: observer exceptions are not storage failures. */ }
        }
      }
    } else if (this.#isClosed()) { this.#finishClose(); return; }
    this.#backoff = 100;
    if (!this.#isClosed()) this.#state = "ready";
    this.#drain();
  }

  #drain(): void {
    if (!this.#ready || this.#active !== undefined || this.#timer !== undefined || this.#state === "blocked-storage" || this.#state === "closed") return;
    const work = this.#queue[0];
    const id = ++this.#sequence;
    let request: HistoryWorkerRequest;
    if (work !== undefined) { this.#active = { id, work }; request = { id, kind: "record", submission: work.submission }; }
    else if (this.#isClosed()) { this.#active = { id }; request = { id, kind: "close" }; }
    else if (this.#refreshPending) {
      this.#refreshPending = false;
      this.#active = { id, observers: [...this.#snapshots] }; request = { id, kind: "read" };
    } else return;
    this.#timer = this.#clock.setTimeout(() => this.#lost("unavailable"), LIVENESS_MS);
    try { this.#worker!.postMessage(request); } catch { this.#lost("unavailable"); }
  }

  #settle(work: Work, result: PromptHistoryResult): void {
    const index = this.#queue.indexOf(work);
    if (index < 0) return;
    this.#queue.splice(index, 1); this.#bytes -= work.bytes; work.done(result); this.#armExpiry();
  }
  #settleAll(): void { for (const work of [...this.#queue]) this.#settle(work, "skipped"); }

  #armExpiry(): void {
    this.#clock.clearTimeout(this.#expiry); this.#expiry = undefined;
    if (this.#isClosed() || this.#queue.length === 0) return;
    this.#expiry = this.#clock.setTimeout(() => {
      this.#expiry = undefined;
      for (const work of [...this.#queue]) {
        if (work.expires > this.#clock.now()) break;
        if (this.#active?.work === work) this.#lost("unavailable");
        this.#settle(work, "skipped");
      }
      this.#armExpiry();
    }, Math.max(0, this.#queue[0]!.expires - this.#clock.now()));
  }

  #schedulePoll(): void {
    this.#clock.clearTimeout(this.#poll);
    this.#poll = this.#clock.setTimeout(() => {
      this.#poll = undefined;
      if (this.#isClosed() || this.#state === "blocked-storage") return;
      this.refresh(); this.#schedulePoll();
    }, 1000);
    this.#poll.unref?.();
  }

  #recover(): void {
    if (this.#isClosed() || this.#state === "blocked-storage") return;
    this.#state = "recovering"; this.#recoveries = Math.min(Number.MAX_SAFE_INTEGER, this.#recoveries + 1);
    this.#clock.clearTimeout(this.#timer);
    const jitter = Math.max(0, Math.min(1, (this.options.random ?? Math.random)()));
    const delay = Math.min(5000, this.#backoff * (1 + jitter * 0.2));
    this.#backoff = Math.min(5000, this.#backoff * 2);
    this.#timer = this.#clock.setTimeout(() => {
      this.#timer = undefined;
      if (this.#isClosed()) return;
      if (this.#ready) { this.#state = "ready"; this.#refreshPending = true; this.#drain(); }
      else void this.#open();
    }, delay);
  }

  #lost(code: PromptHistoryFailure): void {
    if (this.#state === "closed") return;
    this.#report(code);
    const active = this.#active; this.#active = undefined;
    if (active?.work !== undefined) this.#settle(active.work, "skipped");
    if (code === "schema" || code === "corrupt") { this.#state = this.#isClosed() ? "closing" : "blocked-storage"; this.#settleAll(); }
    if (this.#isClosed()) { this.#report("shutdown"); this.#finishClose(); return; }
    void this.#stopWorker().then(() => this.#recover());
  }

  #stopWorker(): Promise<void> {
    if (this.#stopping !== undefined) return this.#stopping;
    this.#clock.clearTimeout(this.#timer); this.#timer = undefined;
    this.#clock.clearTimeout(this.#poll); this.#poll = undefined;
    this.#ready = false; ++this.#generation;
    const worker = this.#worker; this.#worker = undefined;
    if (worker === undefined) return Promise.resolve();
    worker.unref();
    // Invariant: a rejected terminate is not proof of death. Wait for exit before opening a replacement.
    const exited = new Promise<void>(resolve => worker.once("exit", () => resolve()));
    this.#stopping = worker.terminate().then(() => {}, () => exited).then(() => { this.#stopping = undefined; });
    return this.#stopping;
  }

  #finishClose(): void {
    if (this.#queue.length > 0) this.#report("shutdown");
    this.#state = "closed"; this.#active = undefined; this.#settleAll();
    for (const timer of [this.#timer, this.#poll, this.#expiry, this.#closeTimer]) this.#clock.clearTimeout(timer);
    this.#timer = this.#poll = this.#expiry = this.#closeTimer = undefined;
    void this.#stopWorker();
    this.#resolveClose?.(); this.#resolveClose = undefined;
  }

  #report(code: PromptHistoryFailure): void {
    const count = this.#counts[code] ?? 0;
    this.#counts[code] = Math.min(Number.MAX_SAFE_INTEGER, count + 1);
    if (count > 0) return;
    for (const listener of this.#failures) {
      try { listener(code); } catch { /* Security: never forward arbitrary observer errors. */ }
    }
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
