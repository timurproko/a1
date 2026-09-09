import { Worker } from "node:worker_threads";
import { ImageAttachmentError } from "../../../contracts/owned-ui/index.js";
import type { PiShellClipboardContent } from "../components/index.js";
import type { ImagePreparationLimits, PreparedImage } from "./image-preparation.js";
import type { ImageWorkerRequest } from "./image-worker.js";
import { IMAGE_PREPARATION_MS, MAX_SOURCE_IMAGE_BYTES } from "./image-source.js";

export type PreparedClipboardContent =
  | { readonly kind: "text"; readonly text: string }
  | ({ readonly kind: "image" } & PreparedImage)
  | null;
export interface ImagePasteJob {
  readonly result: Promise<PreparedClipboardContent>;
  cancel(): void;
}
interface WaitingConversion {
  readonly run: () => Promise<void>;
  readonly signal: AbortSignal;
}

/** Owns bounded paste acquisition and one off-thread conversion, canceled on session disposal. */
export class ImagePreparationClient {
  readonly #active = new Set<AbortController>();
  readonly #queue: WaitingConversion[] = [];
  readonly #stopping = new Set<Promise<void>>();
  #converting = false;
  #disposed = false;

  start(read?: (signal: AbortSignal) => Promise<PiShellClipboardContent | null>, limits: ImagePreparationLimits = {}): ImagePasteJob {
    const controller = new AbortController();
    if (this.#disposed || this.#active.size >= 8) {
      const result = Promise.reject(new ImageAttachmentError(this.#disposed ? "image-canceled" : "image-busy"));
      void result.catch(() => {});
      return { result, cancel: () => {} };
    }
    this.#active.add(controller);
    const deadline = setTimeout(() => controller.abort(new ImageAttachmentError("image-timeout")), IMAGE_PREPARATION_MS);
    const result = new Promise<PreparedClipboardContent>((resolve, reject) => {
      controller.signal.addEventListener("abort", () => reject(abortError(controller.signal)), { once: true });
      // Concurrency: the pending marker gets a render opportunity before any acquisition starts.
      setImmediate(() => {
        if (controller.signal.aborted) return;
        const acquire = read === undefined
          ? runImageWorker<PiShellClipboardContent | null>({ kind: "clipboard" }, controller.signal)
          : Promise.resolve().then(() => read(controller.signal));
        void acquire.then(content => {
          if (controller.signal.aborted) return;
          if (content?.kind !== "image") { resolve(content); return; }
          if (Math.ceil(content.data.length / 4) * 3 > MAX_SOURCE_IMAGE_BYTES + 2) throw new ImageAttachmentError("image-source-size");
          this.#queue.push({ signal: controller.signal, run: async () => {
            try {
              const image = await runImageWorker<PreparedImage>({ kind: "prepare", source: content, limits }, controller.signal);
              resolve({ kind: "image", ...image });
            } catch (error) { reject(error); }
          } });
          this.#drain();
        }).catch(reject);
      });
    }).finally(() => {
      clearTimeout(deadline);
      this.#active.delete(controller);
      const stopped = waitForImageWorkers(controller.signal);
      this.#stopping.add(stopped);
      void stopped.finally(() => this.#stopping.delete(stopped));
      const index = this.#queue.findIndex(item => item.signal === controller.signal);
      if (index >= 0) this.#queue.splice(index, 1);
    });
    void result.catch(() => {});
    return { result, cancel: () => controller.abort(new ImageAttachmentError("image-canceled")) };
  }

  async dispose(): Promise<void> {
    this.#disposed = true;
    for (const controller of this.#active) controller.abort(new ImageAttachmentError("image-canceled"));
    this.#queue.length = 0;
    await Promise.resolve();
    await Promise.all(this.#stopping);
  }

  #drain(): void {
    if (this.#converting) return;
    const next = this.#queue.shift();
    if (next === undefined) return;
    if (next.signal.aborted) { this.#drain(); return; }
    this.#converting = true;
    void next.run().finally(() => { this.#converting = false; this.#drain(); });
  }
}

const ACTIVE_IMAGE_WORKERS = new Map<Worker, AbortSignal>();

async function waitForImageWorkers(signal: AbortSignal): Promise<void> {
  await Promise.all([...ACTIVE_IMAGE_WORKERS].filter(([, owner]) => owner === signal)
    .map(([worker]) => new Promise<void>(resolve => { worker.once("exit", () => resolve()); })));
}

export function runImageWorker<T>(request: ImageWorkerRequest, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(abortError(signal)); return; }
    if (ACTIVE_IMAGE_WORKERS.size >= 8) { reject(new ImageAttachmentError("image-busy")); return; }
    // Compatibility: production uses the emitted sibling; source tests load TypeScript through tsx.
    const source = import.meta.url.endsWith(".ts");
    const entry = new URL(source ? "./image-worker.ts" : "./image-worker.js", import.meta.url);
    const worker = source
      ? new Worker(`import('tsx/esm/api').then(({ tsImport }) => tsImport(${JSON.stringify(entry.href)}, ${JSON.stringify(import.meta.url)}))`, { eval: true, workerData: request, stdout: true, stderr: true })
      : new Worker(entry, { workerData: request, stdout: true, stderr: true });
    // Security: native/codec output is not trusted diagnostics and must never reach the terminal or logs.
    worker.stdout.resume(); worker.stderr.resume();
    ACTIVE_IMAGE_WORKERS.set(worker, signal);
    let outcome: { value?: T; error?: ImageAttachmentError } | undefined;
    let stop: ReturnType<typeof setTimeout> | undefined;
    const requestStop = (): void => {
      if (stop !== undefined) return;
      worker.postMessage("cancel");
      // Security: allow clipboard subprocess abort first; a busy codec cannot handle messages.
      stop = setTimeout(() => { void worker.terminate().catch(() => {}); }, 50);
      stop.unref();
    };
    const abort = (): void => { outcome = { error: abortError(signal) }; requestStop(); };
    signal.addEventListener("abort", abort, { once: true });
    worker.once("message", (message: { ok: boolean; value?: T; code?: ImageAttachmentError["code"] }) => {
      if (!signal.aborted) outcome = message?.ok === true
        ? { value: message.value as T }
        : { error: new ImageAttachmentError(message?.code ?? "image-codec") };
      requestStop();
    });
    worker.once("error", () => { outcome = { error: new ImageAttachmentError("image-codec") }; requestStop(); });
    worker.once("exit", () => {
      ACTIVE_IMAGE_WORKERS.delete(worker);
      if (stop !== undefined) clearTimeout(stop);
      signal.removeEventListener("abort", abort);
      // Concurrency: release the conversion slot only after the old executor has actually stopped.
      if (outcome === undefined || outcome.error !== undefined) reject(outcome?.error ?? new ImageAttachmentError("image-codec"));
      else resolve(outcome.value as T);
    });
  });
}

function abortError(signal: AbortSignal): ImageAttachmentError {
  return signal.reason instanceof ImageAttachmentError ? signal.reason : new ImageAttachmentError("image-canceled");
}
