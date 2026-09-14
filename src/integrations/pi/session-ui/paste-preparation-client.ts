import { ImageAttachmentError } from "../../../contracts/owned-ui/index.js";
import type { PiShellClipboardContent } from "../components/index.js";
import { startPasteExecutor, type PasteExecutorJob } from "./paste-executor.js";
import { PASTE_READ_MS, PASTE_REQUESTS, PASTE_STOP_MS, PASTE_TOTAL_MS, type PasteEvent, type PasteSource, type PreparedPaste } from "./paste-protocol.js";

export interface PreparedPasteJob<T> {
  readonly result: Promise<T>;
  cancel(): void;
  complete(): void;
  isCurrent(): boolean;
}
interface ActivePaste { readonly controller: AbortController; readonly stopped: Promise<void> }

/** Keeps eight distinct paste transactions alive through insertion; canceled executors retain capacity until fenced. */
export class PastePreparationClient {
  readonly #active = new Set<ActivePaste>();
  #sequence = 0;
  #disposed = false;
  constructor(private readonly onEvent?: (event: PasteEvent) => void) {}

  start<T>(source: PasteSource, adopt: (value: PreparedPaste, signal: AbortSignal) => Promise<T> | T, onImage: () => void, onText: () => void = () => {}): PreparedPasteJob<T> {
    const controller = new AbortController();
    const id = ++this.#sequence;
    const admitted = performance.now();
    let resolve!: (value: T) => void, reject!: (error: unknown) => void, finish!: () => void;
    let settled = false;
    let executor: PasteExecutorJob | undefined;
    const committed = new Promise<void>(done => { finish = done; });
    const result = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
    const emit = (phase: PasteEvent["phase"], bytes?: number, outcome?: PasteEvent["outcome"]) => {
      const atMs = performance.now();
      try { this.onEvent?.({ request: id, phase, atMs, elapsedMs: atMs - admitted, pending: this.#active.size, transport: source.kind === "text" ? "terminal" : source.kind,
        ...(bytes === undefined ? {} : { bytes }), ...(outcome === undefined ? {} : { outcome }) }); } catch { /* Invariant: observations never affect input. */ }
    };
    const total = setTimeout(() => controller.abort(new ImageAttachmentError("paste-timeout")), PASTE_TOTAL_MS);
    let reading: ReturnType<typeof setTimeout> | undefined = source.kind === "text" ? undefined
      : setTimeout(() => controller.abort(new ImageAttachmentError("paste-timeout")), PASTE_READ_MS);
    const clearRead = () => { if (reading) clearTimeout(reading); reading = undefined; };
    const complete = (outcome: PasteEvent["outcome"] = "ready") => {
      if (settled) return;
      settled = true; clearTimeout(total); clearRead(); finish(); emit("settled", undefined, outcome);
    };
    controller.signal.addEventListener("abort", () => {
      if (settled) return;
      settled = true;
      executor?.cancel(); clearTimeout(total); clearRead(); finish();
      reject(controller.signal.reason ?? new ImageAttachmentError("image-canceled"));
      const reason: unknown = controller.signal.reason;
      emit("settled", undefined, reason instanceof ImageAttachmentError && reason.code === "paste-timeout" ? "timed-out"
        : reason instanceof ImageAttachmentError && reason.code === "paste-busy" ? "failed" : "canceled");
    }, { once: true });
    const job: PreparedPasteJob<T> = {
      result, complete: () => complete(), isCurrent: () => !controller.signal.aborted,
      cancel: () => { if (!settled) controller.abort(new ImageAttachmentError("image-canceled")); },
    };
    void result.catch(() => {});
    if (this.#disposed || this.#active.size >= PASTE_REQUESTS) {
      controller.abort(new ImageAttachmentError(this.#disposed ? "image-canceled" : "paste-busy"));
      return job;
    }
    let stopped!: () => void;
    const active: ActivePaste = { controller, stopped: new Promise<void>(done => { stopped = done; }) };
    this.#active.add(active);
    emit("admitted");
    // Concurrency: admission/reservation occurs in the input turn; startup and preparation get a later turn.
    setImmediate(() => {
      void (async () => {
        try {
          if (controller.signal.aborted) return;
          let content: PiShellClipboardContent | undefined;
          if (source.kind !== "text" && source.before) {
            emit("predecessor");
            if (!await source.before(controller.signal)) throw new ImageAttachmentError("paste-write-failed");
          }
          if (controller.signal.aborted) return;
          emit("acquiring");
          if (source.kind === "text") content = { kind: "text", text: source.text };
          else if (source.kind === "provided") {
            const read = await source.read(controller.signal);
            clearRead();
            if (controller.signal.aborted) return;
            if (read?.kind !== "image") onText();
            if (read === null) { emit("inserting"); resolve(await adopt(null, controller.signal)); await committed; return; }
            content = read;
          }
          executor = startPasteExecutor(content, controller.signal, (phase, bytes) => {
            if (phase === "acquired-text" || phase === "acquired-image") clearRead();
            if (controller.signal.aborted) return;
            if (phase === "acquired-image") onImage();
            if (phase === "acquired-text") onText();
            emit(phase, bytes);
          });
          const value = await executor.result;
          if (controller.signal.aborted) return;
          emit("inserting");
          const insertion = await adopt(value, controller.signal);
          if (controller.signal.aborted) return;
          resolve(insertion);
          await committed;
        } catch (error) {
          if (!controller.signal.aborted) {
            reject(error instanceof ImageAttachmentError ? error : new ImageAttachmentError("paste-unavailable"));
            complete("failed");
          }
        } finally {
          // Invariant: capacity cannot be reused while an old native/codec executor can still consume resources.
          await executor?.stopped;
          clearTimeout(total); clearRead(); this.#active.delete(active); stopped(); emit("cleanup");
        }
      })();
    });
    return job;
  }

  reset(): void {
    for (const active of this.#active) active.controller.abort(new ImageAttachmentError("image-canceled"));
  }

  async dispose(): Promise<void> {
    this.#disposed = true; this.reset();
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([Promise.all([...this.#active].map(active => active.stopped)),
      new Promise<void>(resolve => { timer = setTimeout(resolve, PASTE_STOP_MS); timer.unref(); })]);
    if (timer) clearTimeout(timer);
  }
}
