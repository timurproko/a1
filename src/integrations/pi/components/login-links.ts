import { spawn } from "node:child_process";
import { hyperlink, replaceControlCharacters } from "@earendil-works/pi-tui";

/** Login effects accept web URLs only; controls are encoded before any hyperlink or launcher sees them. */
export function loginWebUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

/** Keeps untrusted non-web instructions printable without granting them a hyperlink target. */
export function loginLink(value: string, label?: string): string {
  const url = loginWebUrl(value);
  const text = replaceControlCharacters(label ?? url ?? value);
  return url === undefined ? text : hyperlink(text, url);
}

/** Best-effort browser request with argv boundaries, no shell, and no dependency on the project cwd. */
export function openLoginBrowser(value: string): void {
  const url = loginWebUrl(value);
  if (url === undefined) return;
  const platform = process.platform;
  const executable = platform === "win32" ? "rundll32" : platform === "darwin" ? "open" : "xdg-open";
  const args = platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  try { spawn(executable, args, { stdio: "ignore", detached: true, cwd: "/" }).on("error", () => {}).unref(); }
  catch { /* Compatibility: a failed browser launch never interrupts provider authentication. */ }
}
