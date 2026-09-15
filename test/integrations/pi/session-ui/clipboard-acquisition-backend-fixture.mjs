import { appendFileSync } from "node:fs";

const { mode, text, trace } = JSON.parse(new URL(import.meta.url).searchParams.get("fixture"));
if (!["native", "empty", "denied", "fallback", "blocked-command", "slow-path"].includes(mode) || typeof text !== "string") throw new Error("invalid clipboard fixture configuration");
let violated = false;
let observations = 0;
function observe(operation) {
  if (++observations > 32) throw new Error("clipboard fixture observation limit");
  if (trace) appendFileSync(trace, `${operation}\n`);
}

export function hasImage() { return false; }
export function availableFormats() { return ["text"]; }
export async function getText() {
  observe("native-text");
  if (violated || ["denied", "fallback", "blocked-command"].includes(mode)) throw new Error("fixture unavailable");
  return mode === "empty" ? "" : text;
}
export async function setText(value) {
  observe("native-write");
  if (value !== text) throw new Error("incorrect fixture payload");
}

const powershellScript = [
  "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8",
  "$t=Get-Clipboard -Raw -ErrorAction SilentlyContinue",
  "if ($null -ne $t -and $t.Length -gt 0) {[Console]::Out.Write($t)} else {$f=Get-Clipboard -Format FileDropList -ErrorAction SilentlyContinue; if ($f) {[Console]::Out.Write(($f | ForEach-Object {$_.FullName}) -join [Environment]::NewLine)}}",
].join("; ");

/** Asynchronous OS-boundary responses only; no command is forwarded to the host. */
export function execFile(command, args, options, callback) {
  const contracts = process.platform === "win32"
    ? { "powershell.exe": ["-NoProfile", "-NonInteractive", "-Command", powershellScript] }
    : process.platform === "darwin" ? { pbpaste: [] }
      : { "wl-paste": ["--no-newline", "--type", "text"], xclip: ["-selection", "clipboard", "-o"] };
  if (!Object.hasOwn(contracts, command) || JSON.stringify(args) !== JSON.stringify(contracts[command])) {
    violated = true; observe("unexpected");
  } else observe(command);
  // Security: an invalid first backend stays failed even if production subsequently attempts a fallback.
  const denied = violated || mode === "denied" || mode === "blocked-command" || (mode === "fallback" && command === "wl-paste");
  queueMicrotask(() => callback(denied || options.signal?.aborted ? new Error("fixture unavailable") : null, denied ? "" : mode === "empty" ? "" : text));
}
