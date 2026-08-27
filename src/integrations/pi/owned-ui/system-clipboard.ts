import { execFile } from "node:child_process";

const MAX_CLIPBOARD_BYTES = 16 * 1024 * 1024;

/**
 * Reads plain text through platform clipboard commands without importing Pi's
 * private clipboard module. Failures are deliberately non-fatal: a denied or
 * unavailable clipboard simply makes the paste action a no-op.
 */
export async function readSystemClipboardText(): Promise<string | null> {
  if (process.platform === "win32") {
    const script = [
      "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8",
      "$t=Get-Clipboard -Raw -ErrorAction SilentlyContinue",
      "if ($null -ne $t) {[Console]::Out.Write($t)}",
    ].join("; ");
    return execClipboard("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
  }
  if (process.platform === "darwin") return execClipboard("pbpaste", []);
  return (await execClipboard("wl-paste", ["--no-newline", "--type", "text"]))
    ?? execClipboard("xclip", ["-selection", "clipboard", "-o"]);
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
