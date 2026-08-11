import { platform } from "node:os";
import { CONSOLE_MODE_DECLARATION, runPowerShell, type PowerShellRunner } from "../windows-console-mode.js";

export type { PowerShellRunner } from "../windows-console-mode.js";

const KITTY_PUSH_OR_POP = /\x1b\[(?:(>)(\d+)u|(<)(\d*)u|>4;([012])m)/g;

/** Tracks only keyboard modes that the child enabled and did not restore. */
export class ChildKeyboardModeTracker {
  #kittyStackDepth = 0;
  #modifyOtherKeysActive = false;
  #tail = "";

  observe(data: Buffer | string): void {
    const chunk = typeof data === "string" ? data : data.toString("utf8");
    const previousLength = this.#tail.length;
    const combined = `${this.#tail}${chunk}`;
    for (const match of combined.matchAll(KITTY_PUSH_OR_POP)) {
      const end = (match.index ?? 0) + match[0].length;
      if (end <= previousLength) continue;
      if (match[1] === ">") this.#kittyStackDepth += 1;
      if (match[3] === "<") {
        const count = Math.max(1, Number(match[4] || 1));
        this.#kittyStackDepth = Math.max(0, this.#kittyStackDepth - count);
      }
      if (match[5] !== undefined) this.#modifyOtherKeysActive = match[5] !== "0";
    }
    this.#tail = combined.slice(-64);
  }

  cleanupSequence(): string {
    return `${"\x1b[<u".repeat(this.#kittyStackDepth)}${this.#modifyOtherKeysActive ? "\x1b[>4;0m" : ""}`;
  }
}

export async function drainPendingTerminalInput(input: NodeJS.ReadStream, maxMs = 1_000, idleMs = 50): Promise<void> {
  if (!input.isTTY) return;
  let lastInputAt = Date.now();
  const observe = () => { lastInputAt = Date.now(); };
  input.on("data", observe);
  input.resume();
  const deadline = Date.now() + maxMs;
  try {
    while (Date.now() < deadline) {
      const remainingIdle = idleMs - (Date.now() - lastInputAt);
      if (remainingIdle <= 0) break;
      await new Promise(resolve => setTimeout(resolve, Math.min(remainingIdle, 10)));
    }
  } finally {
    input.off("data", observe);
  }
}

export function captureWindowsConsoleInputMode(
  currentPlatform = platform(),
  runner: PowerShellRunner = runPowerShell,
): number | null {
  if (currentPlatform !== "win32") return null;
  const result = runner(`Add-Type -TypeDefinition @'\n${CONSOLE_MODE_DECLARATION}\n'@; $h=[AddOneConsoleMode]::GetStdHandle(-10); [uint32]$m=0; if(-not [AddOneConsoleMode]::GetConsoleMode($h,[ref]$m)){exit 1}; [Console]::Out.Write($m)`);
  if (!result.ok || !/^\d+$/.test(result.stdout.trim())) return null;
  const mode = Number(result.stdout.trim());
  return Number.isSafeInteger(mode) && mode >= 0 && mode <= 0xffff_ffff ? mode : null;
}

export function restoreCookedTerminalInput(
  input: NodeJS.ReadStream,
  originalWindowsMode: number | null,
  currentPlatform = platform(),
  runner: PowerShellRunner = runPowerShell,
): void {
  if (!input.isTTY || !input.setRawMode) return;
  if (currentPlatform === "win32" && originalWindowsMode === null) {
    // Best-effort fallback when the exact console mode cannot be queried.
    input.setRawMode(true);
  }
  input.setRawMode(false);
  if (currentPlatform === "win32" && originalWindowsMode !== null) {
    runner(`Add-Type -TypeDefinition @'\n${CONSOLE_MODE_DECLARATION}\n'@; $h=[AddOneConsoleMode]::GetStdHandle(-10); if(-not [AddOneConsoleMode]::SetConsoleMode($h,[uint32]${originalWindowsMode})){exit 1}`);
  }
}
