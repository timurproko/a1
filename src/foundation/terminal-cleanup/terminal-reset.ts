import { writeSync } from "node:fs";

// Protocol: reset modes on both screens; setting keyboard flags to zero is idempotent,
// unlike repeatedly popping a keyboard-protocol stack owned by a parent application.
export const EMERGENCY_TERMINAL_RESET = "\x1b[?2026l\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1004l\x1b[?1006l"
  + "\x1b[?2004l\x1b[=0u\x1b[>4;0m\x1b]8;;\x1b\\\x1b[0m\x1b[r\x1b[?7h\x1b[?25h"
  + "\x1b[?1049l\x1b[r\x1b[?7h\x1b[?25h\x1b]9;4;0\x07";

export function restoreProcessTerminal(): void {
  try { if (process.stdout.isTTY) writeSync(process.stdout.fd, EMERGENCY_TERMINAL_RESET); } catch {}
  try { if (process.stdin.isTTY) process.stdin.setRawMode(false); } catch {}
}

export function restoreAfterOwnedExit(ownsTerminal: boolean, code: number | null, signal: string | null,
  restore: () => void = restoreProcessTerminal): number {
  const outcome = code ?? (signal ? 1 : 0);
  if (ownsTerminal && outcome !== 0) {
    try { restore(); } catch {}
  }
  return outcome;
}

export async function boundedCleanup(cleanup: () => Promise<unknown> | void, timeoutMs = 1000): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(cleanup),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Cleanup deadline exceeded")), timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}
