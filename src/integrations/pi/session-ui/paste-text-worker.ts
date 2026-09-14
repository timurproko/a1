import { parentPort, workerData } from "node:worker_threads";
import { preparePasteText } from "./paste-text-preparation.js";

// Concurrency: the containing paste process can exit even if a filesystem probe blocks this worker.
try { parentPort?.postMessage({ ok: true, value: preparePasteText(workerData as string) }); }
catch { parentPort?.postMessage({ ok: false }); }
finally { parentPort?.close(); }
