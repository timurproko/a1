import { execFile } from "node:child_process";
import type { PiShellClipboardContent } from "../components/index.js";
import { canonicalizeClipboardImage } from "./clipboard-image.js";

const MAX_CLIPBOARD_BYTES = 16 * 1024 * 1024;

type NativeClipboard = typeof import("@mariozechner/clipboard");

export interface SystemClipboardImageReader {
  hasImage(): boolean;
  getImageBinary?(): Promise<readonly number[]>;
  getImageBase64?(): Promise<string>;
}

let nativeClipboardPromise: Promise<NativeClipboard | null> | undefined;
let pendingClipboardWrite: Promise<void> = Promise.resolve();

/** Load the native adapter during shell startup so the first paste is warm. */
export function preloadSystemClipboard(): void {
  if (process.platform === "win32" || process.platform === "darwin") void nativeClipboard();
}

/**
 * Reads plain text through platform clipboard commands without importing Pi's
 * private clipboard module. Failures are deliberately non-fatal: a denied or
 * unavailable clipboard simply makes the paste action a no-op.
 */
export async function readSystemClipboardContent(): Promise<PiShellClipboardContent | null> {
  await pendingClipboardWrite;
  const native = await nativeClipboard();
  if (native !== null) {
    try {
      if (process.platform === "win32" && native.availableFormats().some(isFileDropFormat)) {
        const files = await readSystemClipboardText();
        if (files !== null) return { kind: "text", text: files };
      }
      const image = await readSystemClipboardImage(native);
      if (image !== null) return { kind: "image", ...image };
    } catch {
      // Compatibility: fall through to text and platform readers.
    }
  }
  const text = await readSystemClipboardText();
  return text === null ? null : { kind: "text", text };
}

export async function readSystemClipboardImage(
  reader: SystemClipboardImageReader,
): Promise<{ readonly data: string; readonly mimeType: string } | null> {
  if (!reader.hasImage()) return null;

  if (reader.getImageBinary !== undefined) {
    try {
      const bytes = await reader.getImageBinary();
      if (bytes.length > 0 && bytes.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
        return canonicalizeClipboardImage({
          data: Buffer.from(bytes).toString("base64"),
          mimeType: "image/png",
        });
      }
    } catch {
      // Compatibility: older or partially available native bindings may still expose base64.
    }
  }

  if (reader.getImageBase64 !== undefined) {
    try {
      return canonicalizeClipboardImage({
        data: await reader.getImageBase64(),
        mimeType: "image/png",
      });
    } catch {
      // Compatibility: fall through to the caller's text path.
    }
  }
  return null;
}

export async function readSystemClipboardText(): Promise<string | null> {
  // Concurrency: Ctrl+C/Ctrl+X and Ctrl+V can arrive in adjacent input turns. Serialize the
  // read behind our native write so paste never observes the previous value.
  await pendingClipboardWrite;
  if (process.platform === "win32" || process.platform === "darwin") {
    const native = await nativeClipboard();
    if (native !== null) {
      try {
        const text = await native.getText();
        if (text.length > 0) return text;
      } catch {
        // Compatibility: fall through to the platform command.
      }
    }
  }
  if (process.platform === "win32") {
    const script = [
      "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8",
      "$t=Get-Clipboard -Raw -ErrorAction SilentlyContinue",
      "if ($null -ne $t -and $t.Length -gt 0) {[Console]::Out.Write($t)} else {$f=Get-Clipboard -Format FileDropList -ErrorAction SilentlyContinue; if ($f) {[Console]::Out.Write(($f | ForEach-Object {$_.FullName}) -join [Environment]::NewLine)}}",
    ].join("; ");
    return execClipboard("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
  }
  if (process.platform === "darwin") return execClipboard("pbpaste", []);
  return (await execClipboard("wl-paste", ["--no-newline", "--type", "text"]))
    ?? execClipboard("xclip", ["-selection", "clipboard", "-o"]);
}

export function writeSystemClipboardText(text: string): Promise<void> {
  const write = async (): Promise<void> => {
    const native = await nativeClipboard();
    if (native !== null) {
      try {
        await native.setText(text);
        return;
      } catch {
        // Compatibility: the caller still emits its terminal clipboard fallback.
      }
    }
  };
  const operation = pendingClipboardWrite.then(write, write);
  pendingClipboardWrite = operation.catch(() => {});
  return operation;
}

function nativeClipboard(): Promise<NativeClipboard | null> {
  nativeClipboardPromise ??= import("@mariozechner/clipboard").catch(() => null);
  return nativeClipboardPromise;
}

function isFileDropFormat(format: string): boolean {
  return /(?:filedrop|hdrop|shell idlist)/iu.test(format);
}

function execClipboard(command: string, args: readonly string[]): Promise<string | null> {
  return new Promise(resolve => {
    execFile(command, args, {
      encoding: "utf8",
      maxBuffer: MAX_CLIPBOARD_BYTES,
      timeout: 5_000,
      windowsHide: true,
    }, (error, stdout) => resolve(error || stdout.length === 0 ? null : stdout));
  });
}
