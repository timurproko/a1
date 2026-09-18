import { MAX_COPY_ROWS, MAX_COPY_SOURCE_UNITS, selectionCopyRowText } from "../../ui/components/index.js";
import { COPY_CHUNK_UNITS, MAX_COPY_BYTES, MAX_COPY_CONTROL_BYTES, type CopyHelperInput, type CopyHelperOutput, type CopyResult } from "./response-copy-protocol.js";

// Security: this isolated executor never inherits the UI terminal and never logs clipboard contents.
let header: Extract<CopyHelperInput, { kind: "begin" }> | undefined;
let fragments: string[] = [];
let parts: string[] = [];
let rowIndex = 0, sourceUnits = 0, bytes = 0;
let finished = false;
let output: string | undefined;
let outputOffset = 0;

function nextOutput(): void {
  if (output === undefined) throw new Error("protocol");
  if (outputOffset === output.length) { output = undefined; finish({ outcome: "delivered" }); return; }
  let end = Math.min(output.length, outputOffset + COPY_CHUNK_UNITS);
  if (end < output.length && /[\uD800-\uDBFF]/u.test(output[end - 1]!) && /[\uDC00-\uDFFF]/u.test(output[end]!)) end--;
  const text = output.slice(outputOffset, end);
  outputOffset = end;
  send({ kind: "data", text });
}

function send(message: CopyHelperOutput): void { process.send?.(message); }
function finish(result: CopyResult, control?: string): void {
  if (finished) return;
  finished = true;
  fragments = []; parts = [];
  process.send?.({ kind: "result", result, ...(control === undefined ? {} : { control }) } satisfies CopyHelperOutput,
    () => process.exit(0));
}

async function receive(message: CopyHelperInput): Promise<void> {
  if (finished) return;
  if (message?.kind === "next" && header?.mode === "prepare") { nextOutput(); return; }
  if (message?.kind === "begin" && header === undefined) {
    if (!Number.isSafeInteger(message.rows) || message.rows < 1 || message.rows > MAX_COPY_ROWS
      || !["native", "terminal", "prepare"].includes(message.mode)) throw new Error("protocol");
    header = message;
  } else if (message?.kind === "row" && header !== undefined) {
    if (typeof message.text !== "string" || message.text.length > COPY_CHUNK_UNITS || rowIndex >= header.rows) throw new Error("protocol");
    sourceUnits += message.text.length;
    if (sourceUnits > MAX_COPY_SOURCE_UNITS) { finish({ outcome: "failed", failure: "size" }); return; }
    fragments.push(message.text);
    if (message.end) {
      const text = selectionCopyRowText(header, { text: fragments.join(""), ...(message.prompt === undefined ? {} : { prompt: message.prompt }) }, rowIndex);
      fragments = [];
      bytes += Buffer.byteLength(text, "utf8") + (rowIndex === 0 ? 0 : 1);
      if (bytes > MAX_COPY_BYTES) { finish({ outcome: "failed", failure: "size" }); return; }
      parts.push(text);
      rowIndex++;
    }
  } else if (message?.kind === "finish" && header !== undefined && rowIndex === header.rows && fragments.length === 0) {
    send({ kind: "phase", phase: "extracted", bytes });
    const text = parts.join("\n");
    parts = [];
    if (text.length === 0) { finish({ outcome: "failed", failure: "size" }); return; }
    if (header.mode === "prepare") {
      // Protocol: this success acknowledges prepared IPC only; the owner must still await its injected writer.
      output = text; nextOutput(); return;
    }
    if (header.mode === "terminal") {
      const limit = Math.min(MAX_COPY_CONTROL_BYTES, header.controlLimit);
      if (!Number.isSafeInteger(limit) || limit < 8 || 8 + 4 * Math.ceil(bytes / 3) > limit) {
        finish({ outcome: "failed", failure: "size" }); return;
      }
      const control = `\u001b]52;c;${Buffer.from(text, "utf8").toString("base64")}\u0007`;
      send({ kind: "phase", phase: "encoded", bytes });
      finish({ outcome: "submitted-unverified" }, control);
      return;
    }
    // Platform: even an async native binding may block internally; the parent can terminate this process.
    let native: typeof import("@mariozechner/clipboard");
    try { native = await import("@mariozechner/clipboard"); }
    catch { finish({ outcome: "failed", failure: "unavailable" }); return; }
    send({ kind: "phase", phase: "submitting", bytes });
    try { await native.setText(text); finish({ outcome: "delivered" }); }
    catch { finish({ outcome: "failed", failure: "denied" }); }
    return;
  } else throw new Error("protocol");
  send({ kind: "ready" });
}

process.on("message", message => {
  void receive(message as CopyHelperInput).catch(() => finish({ outcome: "failed", failure: "transport" }));
});
// Concurrency: a vanished owner must never leave a clipboard worker alive.
process.on("disconnect", () => process.exit(0));
send({ kind: "ready" });
