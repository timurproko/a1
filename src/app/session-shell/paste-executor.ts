import { fork, type ChildProcess, type ForkOptions, type SpawnOptions } from "node:child_process";
import type { PiShellClipboardContent } from "../../integrations/pi/components/shell-shared-facade.js";
import { ImageAttachmentError } from "../../contracts/owned-ui/index.js";
import { MAX_SOURCE_IMAGE_BYTES } from "./image-source.js";
import { PASTE_CHUNK_UNITS, PASTE_REQUESTS, PASTE_STOP_MS, PASTE_TEXT_BYTES, pasteFragments, type PasteHelperInput, type PasteHelperOutput, type PreparedPaste, type PasteEvent } from "./paste-protocol.js";
import type { ClipboardPath } from "./paste-text-preparation.js";
import { HelperPool } from "./helper-pool.js";

export interface PasteExecutorJob { readonly result: Promise<PreparedPaste>; readonly stopped: Promise<void>; cancel(): void }
export type PastePhase = (phase: PasteEvent["phase"], bytes?: number) => void;
const live = new Set<ChildProcess>();
const conversionQueue: ChildProcess[] = [];
let converting: ChildProcess | undefined;

function permitConversion(): void {
  if (converting) return;
  const child = conversionQueue.shift();
  if (!child) return;
  if (!live.has(child) || !child.connected) { permitConversion(); return; }
  converting = child;
  child.send({ kind: "convert" } satisfies PasteHelperInput, () => {});
}

/** Forks one paste helper: no inherited descriptors, JSON IPC only, and its own process group on POSIX. */
export function forkPasteHelper(helper?: URL): ChildProcess {
  const source = new URL(import.meta.url).pathname.endsWith(".ts");
  const entry = helper ?? new URL(source ? "./paste-helper.ts" : "./paste-helper.js", import.meta.url);
  const options: ForkOptions & Pick<SpawnOptions, "windowsHide"> = {
    execArgv: entry.pathname.endsWith(".ts") ? ["--import", "tsx"] : [],
    stdio: ["ignore", "ignore", "ignore", "ipc"], serialization: "json", windowsHide: true,
    detached: process.platform !== "win32",
  };
  return fork(entry, [], options);
}

/** Kills a paste helper and everything it spawned, then lets the parent exit without waiting for it. */
export function stopPasteHelper(child: ChildProcess): void {
  // Concurrency: POSIX command fallbacks share this isolated process group; kill descendants too.
  if (process.platform !== "win32" && child.pid !== undefined) {
    try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
  } else child.kill("SIGKILL");
  child.unref(); child.channel?.unref();
}

/** A spare-of-one pool of paste helpers; `startPasteExecutor` takes its child and warms the next one after each paste. */
export function createPasteHelperPool(helper?: URL, idleMs?: number): HelperPool {
  return new HelperPool({ fork: () => forkPasteHelper(helper), stop: stopPasteHelper, ...(idleMs === undefined ? {} : { idleMs }) });
}

/** Streams bounded fragments through a killable child; native/codec/filesystem work never runs on the UI thread. */
export function startPasteExecutor(content: PiShellClipboardContent | undefined, signal: AbortSignal, phase: PastePhase = () => {}, helper?: URL, pool?: HelperPool): PasteExecutorJob {
  const tooLarge = content?.kind === "text" && content.text.length > PASTE_TEXT_BYTES;
  if (signal.aborted || live.size >= PASTE_REQUESTS || tooLarge) {
    const result = Promise.reject(new ImageAttachmentError(signal.aborted ? "image-canceled" : tooLarge ? "paste-size" : "paste-busy"));
    void result.catch(() => {});
    return { result, stopped: Promise.resolve(), cancel() {} };
  }
  // Performance: a warm spare skips fork and module load on the paste's own critical path.
  const spare = pool?.take();
  const child = spare?.child ?? forkPasteHelper(helper);
  const forceStop = () => stopPasteHelper(child);
  live.add(child);
  let input: Generator<PasteHelperInput> | undefined = sourceMessages(content);
  let canceled = false, done = false;
  let header: Extract<PasteHelperOutput, { kind: "output" }> | undefined;
  let payload = "", bytes = 0;
  let paths: ClipboardPath[] = [];
  let failure: ImageAttachmentError | undefined;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;
  const phases = new Set<string>();
  let resolve!: (value: PreparedPaste) => void, reject!: (error: ImageAttachmentError) => void, stopped!: () => void;
  const result = new Promise<PreparedPaste>((ok, fail) => { resolve = ok; reject = fail; });
  const exit = new Promise<void>(end => { stopped = end; });
  const send = (message: PasteHelperInput) => {
    if (!child.connected || canceled) return;
    child.send(message, error => { if (error) cancel(); });
  };
  const cancel = () => {
    if (canceled || !live.has(child)) return;
    canceled = true; input = undefined; payload = ""; paths = [];
    reject(failure ?? (signal.reason instanceof ImageAttachmentError ? signal.reason : new ImageAttachmentError("image-canceled")));
    const queued = conversionQueue.indexOf(child);
    if (queued >= 0) conversionQueue.splice(queued, 1);
    if (child.connected) child.send({ kind: "cancel" } satisfies PasteHelperInput, () => {});
    stopTimer = setTimeout(forceStop, PASTE_STOP_MS);
    stopTimer.unref();
  };
  const fail = (code: ImageAttachmentError["code"] = "paste-unavailable") => { failure = new ImageAttachmentError(code); cancel(); };
  const advance = () => {
    const next = input?.next();
    if (!next || next.done) { fail(); return; }
    send(next.value);
  };
  signal.addEventListener("abort", cancel, { once: true });
  child.on("message", value => {
    if (canceled) return;
    const message = value as PasteHelperOutput;
    try {
    if (message?.kind === "ready") {
      advance();
    } else if (message?.kind === "phase") {
      if (!["acquired-text", "acquired-image", "classifying", "path-fallback", "prepared"].includes(message.phase) || phases.has(message.phase)) { fail(); return; }
      phases.add(message.phase);
      phase(message.phase, message.bytes);
      // Concurrency: lifecycle observers may synchronously cancel; never grant new conversion work afterward.
      if (canceled) return;
      if (message.phase === "acquired-image") { conversionQueue.push(child); permitConversion(); }
    } else if (message?.kind === "output" && !header) {
      if (!["text", "url", "paths", "image", "empty"].includes(message.type) || (message.label?.length ?? 0) > 256
        || (message.mimeType?.length ?? 0) > 256) { fail(); return; }
      header = message; input = undefined;
      send({ kind: "next" });
    } else if (message?.kind === "data" && header && ["text", "url", "image"].includes(header.type)) {
      if (typeof message.data !== "string" || message.data.length > PASTE_CHUNK_UNITS) { fail(); return; }
      bytes += Buffer.byteLength(message.data);
      if (bytes > (header.type === "image" ? 8 * 1024 * 1024 : PASTE_TEXT_BYTES)) { fail("paste-size"); return; }
      // Performance: retain a rope of bounded fragments; no giant JSON parse/join is needed on the UI thread.
      payload += message.data;
      send({ kind: "next" });
    } else if (message?.kind === "path" && header?.type === "paths") {
      const item = message.path;
      if (!item || !["file", "folder"].includes(item.kind) || typeof item.fullPath !== "string" || item.fullPath.length > 32_768) { fail(); return; }
      bytes += Buffer.byteLength(item.fullPath);
      if (bytes > PASTE_TEXT_BYTES) { fail("paste-size"); return; }
      paths.push(item); send({ kind: "next" });
    } else if (message?.kind === "done" && header) {
      done = true;
      stopTimer = setTimeout(forceStop, PASTE_STOP_MS);
      stopTimer.unref();
    } else if (message?.kind === "error") {
      const candidate = new ImageAttachmentError(message.code as ImageAttachmentError["code"]);
      failure = candidate.message ? candidate : new ImageAttachmentError("paste-unavailable");
      cancel();
    } else fail();
    } catch (error) { fail(error instanceof ImageAttachmentError ? error.code : "paste-unavailable"); }
  });
  child.once("error", () => fail());
  const cleanup = () => {
    if (!live.delete(child)) return;
    if (canceled) forceStop();
    input = undefined;
    if (stopTimer) clearTimeout(stopTimer);
    signal.removeEventListener("abort", cancel);
    child.removeAllListeners("message");
    const queued = conversionQueue.indexOf(child);
    if (queued >= 0) conversionQueue.splice(queued, 1);
    if (converting === child) converting = undefined;
    permitConversion();
    if (!canceled && done && header) {
      if (header.type === "empty") resolve(null);
      else if (header.type === "text") resolve({ kind: "text", text: payload, ...(header.label === undefined ? {} : { label: header.label }) });
      else if (header.type === "url") resolve({ kind: "url", url: payload, label: header.label ?? "" });
      else if (header.type === "paths") resolve({ kind: "paths", paths });
      else if (header.mimeType && Number.isSafeInteger(header.width) && Number.isSafeInteger(header.height) && header.width! > 0 && header.height! > 0) resolve({
        kind: "image", data: payload, mimeType: header.mimeType, width: header.width!, height: header.height!, transformed: header.transformed === true,
      });
      else reject(new ImageAttachmentError("paste-unavailable"));
    } else reject(failure ?? new ImageAttachmentError(canceled ? "image-canceled" : "paste-unavailable"));
    payload = ""; paths = []; stopped();
    try { phase("cleanup"); } catch { /* Invariant: cleanup observation cannot retain an exited executor. */ }
    // Performance: the next paste finds a spare that was forked while nothing waited on it.
    pool?.replenish();
  };
  child.once("exit", cleanup); child.once("close", cleanup);
  // Protocol: a spare already announced itself while pooled, so its first request is sent now rather than on "ready".
  if (spare?.ready) advance();
  void result.catch(() => {});
  return { result, stopped: exit, cancel };
}

function* sourceMessages(content: PiShellClipboardContent | undefined): Generator<PasteHelperInput> {
  yield { kind: "begin", source: content?.kind ?? "native", ...(content?.kind === "image" ? { mimeType: content.mimeType } : {}) };
  if (content !== undefined) {
    const data = content.kind === "text" ? content.text : content.data;
    let bytes = 0;
    for (const fragment of pasteFragments(data)) {
      bytes += Buffer.byteLength(fragment);
      if (bytes > (content.kind === "text" ? PASTE_TEXT_BYTES : Math.ceil(MAX_SOURCE_IMAGE_BYTES / 3) * 4 + 4)) throw new ImageAttachmentError(content.kind === "text" ? "paste-size" : "image-source-size");
      yield { kind: "data", data: fragment };
    }
  }
  yield { kind: "finish" };
}
