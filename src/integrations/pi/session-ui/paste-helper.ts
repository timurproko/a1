import { Worker } from "node:worker_threads";
import { ImageAttachmentError } from "../../../contracts/owned-ui/index.js";
import type { PiShellClipboardContent } from "../components/index.js";
import { readSystemClipboardContent } from "./system-clipboard.js";
import { MAX_SOURCE_IMAGE_BYTES } from "./image-source.js";
import { preparePasteText, type PreparedPasteText } from "./paste-text-preparation.js";
import { PASTE_CHUNK_UNITS, PASTE_TEXT_BYTES, pasteFragments, type PasteHelperInput, type PasteHelperOutput, type PreparedPaste } from "./paste-protocol.js";

const abort = new AbortController();
let header: Extract<PasteHelperInput, { kind: "begin" }> | undefined;
let fragments: string[] = [], bytes = 0;
let image: Extract<PiShellClipboardContent, { kind: "image" }> | undefined;
let output: Generator<PasteHelperOutput> | undefined;
let finished = false;
function send(message: PasteHelperOutput): void { process.send?.(message); }
function fail(error: unknown): void {
  if (finished) return;
  finished = true;
  process.send?.({ kind: "error", code: error instanceof ImageAttachmentError ? error.code : "paste-unavailable" } satisfies PasteHelperOutput, () => process.exit(1));
}

function workerFor(name: string, data: unknown): Worker {
  const source = new URL(import.meta.url).pathname.endsWith(".ts");
  const entry = new URL(`./${name}.${source ? "ts" : "js"}`, import.meta.url);
  const worker = source
    ? new Worker(`import('tsx/esm/api').then(({ tsImport }) => tsImport(${JSON.stringify(entry.href)}, ${JSON.stringify(import.meta.url)}))`, { eval: true, workerData: data, stdout: true, stderr: true })
    : new Worker(entry, { workerData: data, stdout: true, stderr: true });
  worker.stdout.resume(); worker.stderr.resume();
  return worker;
}

async function classifyText(text: string): Promise<PreparedPasteText> {
  const worker = workerFor("paste-text-worker", text);
  return new Promise(resolve => {
    let done = false;
    const complete = (prepared?: PreparedPasteText) => {
      if (done) return;
      done = true; clearTimeout(timer);
      // Concurrency: a worker may be in a blocked native filesystem call. Never await its termination here;
      // this child exits after transferring the safe text fallback and kills all its own threads.
      void worker.terminate().catch(() => {});
      if (!prepared) send({ kind: "phase", phase: "path-fallback" });
      resolve(prepared ?? preparePasteText(text, true));
    };
    const timer = setTimeout(() => complete(), 1_000);
    worker.once("message", message => complete(message?.ok ? message.value as PreparedPasteText : undefined));
    worker.once("error", () => complete());
    worker.once("exit", () => complete());
  });
}

function imagePreparation(source: Extract<PiShellClipboardContent, { kind: "image" }>): Promise<PreparedPaste> {
  const worker = workerFor("image-worker", { kind: "prepare", source });
  return new Promise((resolve, reject) => {
    let done = false;
    worker.once("message", message => {
      done = true;
      if (message?.ok) resolve({ kind: "image", ...message.value });
      else reject(new ImageAttachmentError(message?.code ?? "image-codec"));
      void worker.terminate().catch(() => {});
    });
    worker.once("error", () => reject(new ImageAttachmentError("image-codec")));
    worker.once("exit", () => { if (!done) reject(new ImageAttachmentError("image-codec")); });
  });
}

function* outputMessages(value: PreparedPaste): Generator<PasteHelperOutput> {
  if (value === null) yield { kind: "output", type: "empty" };
  else if (value.kind === "paths") {
    yield { kind: "output", type: "paths" };
    for (const path of value.paths) yield { kind: "path", path };
  } else {
    if (value.kind === "image") yield { kind: "output", type: "image", mimeType: value.mimeType, width: value.width, height: value.height, transformed: value.transformed };
    else yield { kind: "output", type: value.kind, ...(value.label === undefined ? {} : { label: value.label }) };
    const data = value.kind === "text" ? value.text : value.kind === "url" ? value.url : value.data;
    for (const fragment of pasteFragments(data)) yield { kind: "data", data: fragment };
  }
  yield { kind: "done" };
}
function present(value: PreparedPaste): void {
  const bytes = value === null ? 0 : value.kind === "paths" ? value.paths.reduce((sum, path) => sum + Buffer.byteLength(path.fullPath), 0)
    : Buffer.byteLength(value.kind === "image" ? value.data : value.kind === "url" ? value.url : value.text);
  if (value !== null && value.kind !== "image" && bytes > PASTE_TEXT_BYTES) throw new ImageAttachmentError("paste-size");
  send({ kind: "phase", phase: "prepared", bytes });
  output = outputMessages(value);
  nextOutput();
}
function nextOutput(): void {
  const next = output?.next();
  if (!next || next.done) throw new Error("protocol");
  if (next.value.kind === "done") {
    finished = true; output = undefined;
    process.send?.(next.value, () => process.exit(0));
  } else send(next.value);
}

async function receive(message: PasteHelperInput): Promise<void> {
  if (message?.kind === "cancel") {
    abort.abort(); fragments = []; image = undefined; output = undefined;
    // Concurrency: allow an outstanding command read's AbortSignal to terminate its subprocess before exit.
    setTimeout(() => process.exit(1), 100).unref(); return;
  }
  if (abort.signal.aborted || finished) return;
  if (message?.kind === "begin" && !header) {
    if (!["native", "text", "image"].includes(message.source) || (message.mimeType?.length ?? 0) > 256) throw new Error("protocol");
    header = message; send({ kind: "ready" });
  } else if (message?.kind === "data" && header && header.source !== "native") {
    if (typeof message.data !== "string" || message.data.length > PASTE_CHUNK_UNITS) throw new Error("protocol");
    bytes += Buffer.byteLength(message.data);
    if (bytes > (header.source === "text" ? PASTE_TEXT_BYTES : Math.ceil(MAX_SOURCE_IMAGE_BYTES / 3) * 4 + 4)) throw new ImageAttachmentError(header.source === "text" ? "paste-size" : "image-source-size");
    fragments.push(message.data); send({ kind: "ready" });
  } else if (message?.kind === "finish" && header) {
    const content: PiShellClipboardContent | null = header.source === "native" ? await readSystemClipboardContent(abort.signal, true)
      : header.source === "image" ? { kind: "image", mimeType: header.mimeType ?? "", data: fragments.join("") }
      : { kind: "text", text: fragments.join("") };
    fragments = [];
    if (abort.signal.aborted) return;
    if (content?.kind === "image") {
      image = content; send({ kind: "phase", phase: "acquired-image", bytes: Buffer.byteLength(content.data) });
    } else {
      const text = content?.text ?? "";
      const size = Buffer.byteLength(text);
      if (size > PASTE_TEXT_BYTES) throw new ImageAttachmentError("paste-size");
      send({ kind: "phase", phase: "acquired-text", bytes: size });
      if (!text) { present(null); return; }
      send({ kind: "phase", phase: "classifying", bytes: size });
      present(await classifyText(text));
    }
  } else if (message?.kind === "convert" && image) {
    const source = image; image = undefined;
    present(await imagePreparation(source));
  } else if (message?.kind === "next" && output) nextOutput();
  else throw new Error("protocol");
}

process.on("message", message => { void receive(message as PasteHelperInput).catch(fail); });
process.on("disconnect", () => { abort.abort(); process.exit(0); });
send({ kind: "ready" });
