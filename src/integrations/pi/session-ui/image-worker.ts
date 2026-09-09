import { parentPort, workerData } from "node:worker_threads";
import { ImageAttachmentError } from "../../../contracts/owned-ui/index.js";
import { prepareImage, type ImagePreparationLimits } from "./image-preparation.js";
import { canonicalizeClipboardImage } from "./clipboard-image.js";
import { readSystemClipboardContent } from "./system-clipboard.js";

export type ImageWorkerRequest =
  | { readonly kind: "clipboard" }
  | { readonly kind: "canonicalize"; readonly source: { readonly data: string; readonly mimeType: string } }
  | { readonly kind: "prepare"; readonly source: { readonly data: string; readonly mimeType: string }; readonly limits?: ImagePreparationLimits };

const controller = new AbortController();
parentPort?.on("message", message => { if (message === "cancel") controller.abort(); });
const request = workerData as ImageWorkerRequest;
try {
  const value = request.kind === "clipboard"
    ? await readSystemClipboardContent(controller.signal)
    : request.kind === "canonicalize" ? canonicalizeClipboardImage(request.source, true)
    : await prepareImage(request.source, request.limits);
  parentPort?.postMessage({ ok: true, value });
} catch (error) {
  // Security: never forward native/codec exceptions which may contain input data.
  parentPort?.postMessage({ ok: false, code: error instanceof ImageAttachmentError ? error.code : "image-codec" });
} finally { parentPort?.close(); }
