import { describe, expect, it } from "vitest";
import { captureWindowsConsoleInputMode, ChildKeyboardModeTracker, restoreCookedTerminalInput, type PowerShellRunner } from "../../src/ui/terminal-input-cleanup.js";

describe("terminal input cleanup", () => {
  it("cleans only child keyboard protocol modes that remain owned at exit", () => {
    const tracker = new ChildKeyboardModeTracker();
    tracker.observe("\x1b[>7u\x1b[>4;");
    tracker.observe("2m");
    expect(tracker.cleanupSequence()).toBe("\x1b[<u\x1b[>4;0m");

    tracker.observe("\x1b[<u\x1b[>4;0m");
    expect(tracker.cleanupSequence()).toBe("");
  });

  it("captures and restores the exact Windows console input mode", () => {
    const scripts: string[] = [];
    const runner: PowerShellRunner = script => {
      scripts.push(script);
      return { ok: true, stdout: scripts.length === 1 ? "503" : "" };
    };
    const originalMode = captureWindowsConsoleInputMode("win32", runner);
    const transitions: boolean[] = [];
    const input = {
      isTTY: true,
      setRawMode(value: boolean) { transitions.push(value); },
    } as unknown as NodeJS.ReadStream;

    restoreCookedTerminalInput(input, originalMode, "win32", runner);
    expect(originalMode).toBe(503);
    expect(transitions).toEqual([false]);
    expect(scripts[1]).toContain("SetConsoleMode");
    expect(scripts[1]).toContain("[uint32]503");
  });

  it("falls back to a Windows raw-to-cooked transition when exact capture fails", () => {
    const transitions: boolean[] = [];
    const input = {
      isTTY: true,
      setRawMode(value: boolean) { transitions.push(value); },
    } as unknown as NodeJS.ReadStream;

    restoreCookedTerminalInput(input, null, "win32", () => ({ ok: false, stdout: "" }));
    expect(transitions).toEqual([true, false]);
  });

  it("restores cooked mode directly on non-Windows terminals", () => {
    const transitions: boolean[] = [];
    const input = {
      isTTY: true,
      setRawMode(value: boolean) { transitions.push(value); },
    } as unknown as NodeJS.ReadStream;

    restoreCookedTerminalInput(input, null, "linux");
    expect(transitions).toEqual([false]);
  });
});
