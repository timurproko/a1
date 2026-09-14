import { MAX_COPY_SOURCE_UNITS, type SelectionCopySnapshot } from "../../../ui/components/index.js";
import { COPY_CLEANUP_MS, COPY_DEADLINE_MS, type CopyResult, type ResponseCopyEvent } from "./response-copy-protocol.js";
import type { ResponseCopyExecutor, ResponseCopyJob } from "./response-copy-transport.js";

interface Request {
  readonly id: number;
  readonly epoch: number;
  readonly admitted: number;
  readonly sourceUnits: number;
  snapshot: SelectionCopySnapshot | undefined;
  readonly before: Promise<void>;
  readonly resolve: (result: CopyResult) => void;
  readonly timer: ReturnType<typeof setTimeout>;
  done: boolean;
  submitting: boolean;
  job?: ResponseCopyJob;
}

/** Owns one delivery and one newest pending copy, including expiry and side-effect fencing. */
export class ResponseCopyCoordinator {
  #sequence = 0;
  #epoch = 0;
  #active: Request | undefined;
  #pending: Request | undefined;
  #latest: Promise<CopyResult> = Promise.resolve({ outcome: "delivered" });
  #latestPending = false;
  #disposed = false;
  #quarantined = false;
  constructor(private readonly options: {
    readonly execute: ResponseCopyExecutor;
    readonly onEvent?: (event: ResponseCopyEvent) => void;
    readonly onFailure?: (result: CopyResult) => void;
    readonly now?: () => number;
  }) {}

  get busy(): boolean { return this.#active !== undefined || this.#pending !== undefined; }
  get latest(): Promise<CopyResult> { return this.#latest; }

  /** Exact prompt copy/cut shares the write lifetime without transcript text transformations. */
  submitText(text: string): Promise<CopyResult> {
    return this.submit(Object.freeze({
      literal: true, revision: 0, sourceUnits: text.length,
      selection: Object.freeze({ start: Object.freeze({ line: 0, column: 0 }), end: Object.freeze({ line: 0, column: Number.MAX_SAFE_INTEGER }) }),
      rows: Object.freeze(text.length > MAX_COPY_SOURCE_UNITS ? [] : [Object.freeze({ text })]),
      ...(text.length > MAX_COPY_SOURCE_UNITS ? { rejected: "size" as const } : {}),
    }));
  }

  /** Admission is synchronous, but preparation/startup never runs in the input handler's stack. */
  submit(snapshot: SelectionCopySnapshot, before = Promise.resolve()): Promise<CopyResult> {
    const id = ++this.#sequence;
    const admitted = this.#now() - (snapshot.captureMs ?? 0);
    let resolve!: (result: CopyResult) => void;
    const result = new Promise<CopyResult>(done => { resolve = done; });
    this.#latest = result;
    this.#latestPending = true;
    const request: Request = {
      id, epoch: this.#epoch, admitted, sourceUnits: snapshot.sourceUnits, snapshot, before, resolve, done: false, submitting: false,
      timer: setTimeout(() => this.#cancel(request, { outcome: "timed-out" }), Math.max(0, COPY_DEADLINE_MS - (snapshot.captureMs ?? 0))),
    };
    request.timer.unref?.();
    this.#trace(request, "capture", { elapsedMs: snapshot.captureMs ?? 0 });
    this.#trace(request, "selection-clear");
    if (this.#disposed || this.#quarantined || snapshot.rejected) {
      this.#settle(request, { outcome: this.#disposed ? "canceled" : "failed", failure: snapshot.rejected ? "size" : "unsafe" });
      return result;
    }
    if (this.#pending) this.#cancel(this.#pending, { outcome: "superseded" });
    this.#pending = request;
    if (this.#active && !this.#active.submitting) this.#cancel(this.#active, { outcome: "superseded" });
    this.#trace(request, "queued");
    this.#drain();
    return result;
  }

  /** Capture the current copy barrier, without making later copies retroactively delay this paste. */
  canPaste(signal: AbortSignal): Promise<boolean> { return this.capturePasteBarrier()(signal); }

  /** Only a pending write is a prerequisite; a completed failure cannot poison independent future reads. */
  capturePasteBarrier(): (signal: AbortSignal) => Promise<boolean> {
    const latest = this.#latestPending ? this.#latest : undefined;
    return async signal => {
      if (signal.aborted) return false;
      if (latest === undefined) return true;
      return new Promise(resolve => {
        const abort = () => resolve(false);
        signal.addEventListener("abort", abort, { once: true });
        void latest.then(result => {
          signal.removeEventListener("abort", abort);
          resolve(!signal.aborted && (result.outcome === "delivered" || result.outcome === "submitted-unverified"));
        });
      });
    };
  }

  /** Session replacement fences the old executor rather than discarding its live side effects. */
  reset(): void {
    this.#epoch++;
    if (this.#pending) this.#cancel(this.#pending, { outcome: "canceled" });
    if (this.#active) this.#cancel(this.#active, { outcome: "canceled" });
    this.#latestPending = false;
    this.#latest = Promise.resolve({ outcome: "delivered" });
  }

  dispose(): void { this.#disposed = true; this.reset(); }

  #drain(): void {
    if (this.#active || this.#disposed || this.#quarantined) return;
    const request = this.#pending;
    this.#pending = undefined;
    if (!request || request.done) return;
    this.#active = request;
    // Concurrency: render and input get an event-loop turn before child startup or source transfer.
    setImmediate(() => {
      if (request.done) { this.#release(request); return; }
      let canceled = false;
      let executor: ResponseCopyJob | undefined;
      const run = request.before.then(async (): Promise<CopyResult> => {
        if (canceled || request.done || request.snapshot === undefined) return { outcome: "canceled" };
        this.#trace(request, "preparing");
        executor = this.options.execute(request.snapshot, (phase, bytes, transport) => {
          if (request.done) return;
          if (phase === "submitting") request.submitting = true;
          this.#trace(request, phase, { bytes, transport });
        });
        return executor.result;
      }).catch((): CopyResult => ({ outcome: "failed", failure: "transport" }));
      // Concurrency: a canceled gate has not started any side effect. Do not wait for an unrelated prior prompt indefinitely.
      let cancelGate!: () => void;
      const gateStopped = new Promise<void>(resolve => { cancelGate = resolve; });
      const stopped = Promise.race([
        run.then(async () => { await executor?.stopped; }), gateStopped,
      ]);
      request.job = { result: run, stopped, cancel: () => {
        canceled = true;
        if (executor) executor.cancel(); else cancelGate();
      } };
      void run.then(result => this.#settle(request, result));
      void stopped.then(() => this.#release(request));
    });
  }

  #cancel(request: Request, result: CopyResult): void {
    if (request.done) return;
    this.#settle(request, result);
    request.job?.cancel();
    if (this.#pending === request) this.#pending = undefined;
    if (this.#active === request && request.job) {
      const cleanup = setTimeout(() => {
        if (this.#active !== request) return;
        this.#quarantined = true;
        this.#trace(request, "cleanup");
        if (this.#pending) this.#cancel(this.#pending, { outcome: "failed", failure: "unsafe" });
      }, COPY_CLEANUP_MS);
      cleanup.unref?.();
      void request.job.stopped.then(() => clearTimeout(cleanup));
    }
  }

  #settle(request: Request, result: CopyResult): void {
    if (request.done) return;
    request.done = true;
    if (request.id === this.#sequence) this.#latestPending = false;
    request.snapshot = undefined;
    clearTimeout(request.timer);
    this.#trace(request, "settled", { outcome: result.outcome });
    request.resolve(result);
    if (!this.#disposed && request.epoch === this.#epoch && request.id === this.#sequence
      && (result.outcome === "failed" || result.outcome === "timed-out")) {
      this.options.onFailure?.(result);
    }
  }

  #release(request: Request): void {
    if (this.#active !== request) return;
    this.#active = undefined;
    this.#quarantined = false;
    this.#trace(request, "cleanup");
    this.#drain();
  }

  #now(): number { return this.options.now?.() ?? performance.now(); }
  #trace(request: Request, phase: ResponseCopyEvent["phase"], extra: Partial<ResponseCopyEvent> = {}): void {
    if (this.options.onEvent === undefined) return;
    const atMs = this.#now();
    // Security: observations contain only bounded scalar metadata, never copied source or encoded content.
    try {
      this.options.onEvent({ request: request.id, phase, atMs, elapsedMs: atMs - request.admitted,
        sourceUnits: request.sourceUnits, pending: Number(this.#active !== undefined) + Number(this.#pending !== undefined), ...extra });
    } catch { /* Invariant: diagnostics must not alter copy semantics. */ }
  }
}
