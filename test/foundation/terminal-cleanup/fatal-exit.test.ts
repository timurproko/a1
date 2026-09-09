import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";
import { Terminal } from "@xterm/headless";
import { EMERGENCY_TERMINAL_RESET, installFatalExit, restoreAfterOwnedExit, writeFatalDiagnostic } from "../../../src/foundation/terminal-cleanup/index.js";

const exec = promisify(execFile);

async function run(mode: string, directory: string) {
  try {
    const output = await exec(process.execPath, ["--import", "tsx", resolve("test/fixtures/owned-ui-fatal.ts"), mode, directory], { timeout: 10000 });
    return { code: 0, ...output };
  } catch (error) {
    const result = error as { code: number; stdout: string; stderr: string; killed?: boolean };
    expect(result.killed).not.toBe(true);
    return result;
  }
}

describe("owned terminal failure cleanup", () => {
  it.each(["exception", "rejection", "stall", "dispose-error", "duplicate", "owner"])("restores after %s without leaking private errors", async mode => {
    const directory = await mkdtemp(join(tmpdir(), "a1-fatal-"));
    try {
      const result = await run(mode, directory);
      expect(result.code).toBe(mode === "owner" ? 9 : 1);
      expect(result.stdout.lastIndexOf(EMERGENCY_TERMINAL_RESET)).toBeGreaterThan(result.stdout.indexOf("CHILD-LAST"));
      expect(result.stderr).not.toContain("private");
      if (mode !== "owner") {
        expect(result.stderr.match(/A1 stopped/g)).toHaveLength(1);
        const records = await readdir(directory);
        expect(records).toHaveLength(1);
        const record = await readFile(join(directory, records[0]!), "utf8");
        expect(record).toContain("test-release");
        expect(record).not.toContain("private");
        expect(Buffer.byteLength(record)).toBeLessThan(16 * 1024);
      }
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("preserves normal status/output and removes process listeners", async () => {
    const directory = await mkdtemp(join(tmpdir(), "a1-fatal-"));
    try {
      const count = process.listenerCount("uncaughtException");
      const handler = installFatalExit({ directory });
      handler.remove(); handler.remove();
      expect(process.listenerCount("uncaughtException")).toBe(count);
      const result = await run("normal", directory);
      expect(result.code).toBe(0);
      expect(result.stdout.match(/NORMAL-EXIT/g)).toHaveLength(1);
      expect(await readdir(directory)).toEqual([]);
      const restore = vi.fn();
      expect(restoreAfterOwnedExit(true, 0, null, restore)).toBe(0);
      expect(restoreAfterOwnedExit(false, 9, null, restore)).toBe(9);
      expect(restore).not.toHaveBeenCalled();
      expect(restoreAfterOwnedExit(true, null, "SIGTERM", restore)).toBe(1);
      expect(restore).toHaveBeenCalledOnce();
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("bounds diagnostic retention and ignores unsafe error text and storage failures", async () => {
    const directory = await mkdtemp(join(tmpdir(), "a1-fatal-"));
    try {
      const error = new Error("PRIVATE PROMPT " + "X".repeat(50000));
      error.stack = "TypeError: PRIVATE PROMPT\n    at handler (file:///project/src/contracts/owned-ui/validation.ts:80:10)";
      for (let i = 0; i < 12; i++) await writeFatalDiagnostic(directory, "entry", error, "test");
      const names = await readdir(directory);
      expect(names).toHaveLength(10);
      const record = await readFile(join(directory, names[0]!), "utf8");
      expect(record).toContain("contracts/owned-ui/validation.ts");
      expect(record).not.toContain("PRIVATE");
      const blocked = join(directory, "file");
      await writeFile(blocked, "not a directory");
      expect(await writeFatalDiagnostic(blocked, "entry", error)).toBeNull();
      const result = await run("rejection", blocked);
      expect(result.code).toBe(1);
      expect(result.stdout).toContain(EMERGENCY_TERMINAL_RESET);
      expect(result.stderr).toContain("storage unavailable");
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("leaves a simulated terminal out of alternate screen and mouse tracking after repeated reset", async () => {
    const terminal = new Terminal({ cols: 40, rows: 10, allowProposedApi: true });
    const write = (text: string) => new Promise<void>(done => terminal.write(text, done));
    try {
      await write("SHELL\x1b[?1049h\x1b[?1003h\x1b[?2004h\x1b[?7l\x1b[?25l");
      await write(EMERGENCY_TERMINAL_RESET.repeat(2));
      expect(terminal.buffer.active.type).toBe("normal");
      expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe("SHELL");
      expect(terminal.modes.mouseTrackingMode).toBe("none");
      expect(terminal.modes.bracketedPasteMode).toBe(false);
      expect(terminal.modes.wraparoundMode).toBe(true);
    } finally { terminal.dispose(); }
  });
});
