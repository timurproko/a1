import { readFileSync, rmSync } from "node:fs";
import { restoreProcessTerminal } from "./terminal-reset.js";

/** Notices are a few plain lines; anything larger is not one this build wrote. */
const MAX_NOTICE_BYTES = 4096;

/**
 * The launcher's half of the unclean-exit protocol. The UI arms a notice file while it runs and
 * removes it on a clean exit, so a notice that is still present when the UI ends means the UI was
 * stopped unexpectedly: restore the terminal, print the notice as plain text, and consume it.
 */
export function deliverExitNotice(
  path: string,
  write: (text: string) => void,
  restore: () => void = restoreProcessTerminal,
): boolean {
  let text: string;
  try {
    const bytes = readFileSync(path);
    text = bytes.byteLength > MAX_NOTICE_BYTES ? "" : bytes.toString("utf8");
  } catch {
    return false;
  }
  try { rmSync(path, { force: true }); } catch {}
  // Security: the notice is printed after the UI is gone, so it must not carry terminal controls.
  const lines = text.split(/\r?\n/u).map(line => line.replace(/[\x00-\x1f\x7f-\x9f]/gu, "")).filter(line => line.length > 0);
  if (lines.length === 0) return false;
  try { restore(); } catch {}
  try { write(`\n${lines.join("\n")}\n`); } catch {}
  return true;
}
