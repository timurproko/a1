import { parentPort, workerData } from "node:worker_threads";
import { setTimeout as delay } from "node:timers/promises";
import type { PromptHistorySubmission } from "../../contracts/owned-ui/index.js";
import { HistoryStorageError, PromptHistoryStore, classifyHistoryError } from "./store.js";

export type HistoryWorkerRequest = { id: number; kind: "read" | "close" } | { id: number; kind: "record"; submission: PromptHistorySubmission };
const port = parentPort;
if (port !== null) {
  let store: PromptHistoryStore | undefined;
  let chain = Promise.resolve();
  const options = workerData as { path: string; profileId: string; limit: number; imagesDir?: string };
  const open = retry(() => { store = new PromptHistoryStore(options.path, options.profileId, options.limit, options.imagesDir); });
  void open.then(() => port.postMessage({ id: 0, ok: true }), error => port.postMessage({ id: 0, ok: false, code: classifyHistoryError(error) }));
  port.on("message", (request: HistoryWorkerRequest) => {
    chain = chain.then(async () => {
      try {
        await open;
        if (request.kind === "close") {
          store!.close(); port.postMessage({ id: request.id, ok: true }); port.close(); return;
        }
        const value = await retry(() => request.kind === "record" ? store!.record(request.submission) : store!.snapshot());
        port.postMessage({ id: request.id, ok: true, value });
      } catch (error) {
        port.postMessage({ id: request.id, ok: false, code: classifyHistoryError(error),
          certainty: error instanceof HistoryStorageError ? error.certainty : "unknown" });
      }
    });
  });
}

async function retry<T>(operation: () => T): Promise<T> {
  const deadline = performance.now() + 1000;
  for (;;) {
    try { return operation(); }
    catch (error) {
      if (classifyHistoryError(error) !== "busy"
        || error instanceof HistoryStorageError && error.certainty === "unknown"
        || performance.now() >= deadline) throw error;
      await delay(25);
    }
  }
}
