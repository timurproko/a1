import { describe, expect, it } from "vitest";
import { FULL_VIEWPORT_NATIVE_PROJECTION, type CommandTerminalProfile, type TerminalDriverEvent } from "../../src/domain/index.js";
import { PtyTerminalDriver } from "../../src/drivers/terminal/pty-terminal-driver.js";
import type { TerminalProcess, TerminalProcessBackend } from "../../src/drivers/terminal/pty-backend.js";

class FakeTerminalProcess implements TerminalProcess {
  readonly pid = 101;
  readonly writes: string[] = [];
  readonly resizes: { columns: number; rows: number }[] = [];
  #data: ((data: string) => void)[] = [];
  #exit: ((event: { exitCode: number; signal?: number }) => void)[] = [];
  onData(listener: (data: string) => void): void { this.#data.push(listener); }
  onExit(listener: (event: { exitCode: number; signal?: number }) => void): void { this.#exit.push(listener); }
  write(data: string): void { this.writes.push(data); }
  resize(columns: number, rows: number): void { this.resizes.push({ columns, rows }); }
  kill(): void {}
  emitData(data: string): void { for (const listener of this.#data) listener(data); }
  emitExit(exitCode = 0): void { for (const listener of this.#exit) listener({ exitCode }); }
}

class FakeBackend implements TerminalProcessBackend {
  readonly process = new FakeTerminalProcess();
  constructor(readonly platform: NodeJS.Platform = "linux") {}
  spawn(): TerminalProcess { return this.process; }
  stop(): void {}
}

const profile: CommandTerminalProfile = {
  id: "generic-command", kind: "command", executable: "ignored", arguments: [], cwd: "/work",
  environment: {}, terminalType: "xterm-256color", dimensions: { columns: 8, rows: 3 },
  projection: FULL_VIEWPORT_NATIVE_PROJECTION, conptyMouseFallback: "none", resume: "none",
};

async function settle(): Promise<void> {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setTimeout(resolve, 70));
}

describe("application-agnostic PTY terminal driver transactions", () => {
  it("publishes one transaction for a split synchronized commit and suppresses a redundant cursor epilogue", async () => {
    const backend = new FakeBackend();
    const events: TerminalDriverEvent[] = [];
    await new PtyTerminalDriver(backend).start("agent", "generation", profile, event => events.push(event));

    backend.process.emitData("A");
    await settle();
    expect(events.map(event => event.type)).toEqual(["surface"]);

    backend.process.emitData("\x1b[1;2H");
    await settle();
    expect(events.map(event => event.type)).toEqual(["surface"]);

    backend.process.emitData("\x1b[?2026h\x1b[1;1H");
    backend.process.emitData("B\x1b[?2026l");
    await new Promise(resolve => setImmediate(resolve));
    expect(events.map(event => event.type)).toEqual(["surface"]);
    backend.process.emitData("\x1b[1;2H\x1b[?25h");
    await settle();

    const transactions = events.filter((event): event is Extract<TerminalDriverEvent, { type: "transaction" }> => event.type === "transaction");
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.transaction).toMatchObject({
      sourceSequence: { start: 3, end: 5 },
      atomicBoundary: "synchronized-output",
      baseRevision: 1,
      revision: 2,
    });
    expect(transactions[0]?.transaction.dirtyRanges).toHaveLength(1);
  });

  it("applies an explicit alternate-screen SGR mouse fallback when ConPTY consumes child modes", async () => {
    const backend = new FakeBackend("win32");
    const events: TerminalDriverEvent[] = [];
    const handle = await new PtyTerminalDriver(backend).start("agent", "generation", {
      ...profile,
      conptyMouseFallback: "sgr-any-on-alternate-screen",
    }, event => events.push(event));

    backend.process.emitData("\x1b[?1049hALT");
    await settle();

    const surface = events.find((event): event is Extract<TerminalDriverEvent, { type: "surface" }> => event.type === "surface")?.surface;
    expect(surface).toMatchObject({ activeScreen: "alternate", modes: { mouseTracking: "any", mouseProtocol: "sgr" } });
    handle.input({
      type: "mouse", action: "press", button: "left", modifiers: { shift: false, alt: false, control: false, meta: false },
      column: 4, row: 1, wheelDelta: 0,
    });
    expect(backend.process.writes).toContain("\x1b[<0;5;2M");
  });

  it("preserves distinct Ctrl+C and Ctrl+P identities after a Windows child requests modifyOtherKeys", async () => {
    const backend = new FakeBackend("win32");
    const events: TerminalDriverEvent[] = [];
    const handle = await new PtyTerminalDriver(backend).start("agent", "generation", profile, event => events.push(event));
    backend.process.emitData("\x1b[>4;2mREADY");
    await settle();

    handle.inputBatch?.([
      { type: "key", key: "c", text: null, modifiers: { shift: false, alt: false, control: true, meta: false }, action: "press" },
      { type: "key", key: "p", text: null, modifiers: { shift: false, alt: false, control: true, meta: false }, action: "press" },
    ]);

    expect(backend.process.writes.at(-1)).toBe("\x1b[27;5;99~\x1b[27;5;112~");
  });

  it("uses structured Win32 child input when the PTY exposes that negotiated mode", async () => {
    const backend = new FakeBackend("linux");
    const events: TerminalDriverEvent[] = [];
    const handle = await new PtyTerminalDriver(backend).start("agent", "generation", profile, event => events.push(event));
    backend.process.emitData("\x1b[?9001hREADY");
    await settle();
    expect(events.at(-1)).toMatchObject({ type: "surface", surface: { modes: { keyboardProtocol: "win32", win32InputMode: true } } });

    handle.input({ type: "key", key: "c", text: null, modifiers: { shift: false, alt: false, control: true, meta: false }, action: "press" });
    handle.input({ type: "key", key: "p", text: null, modifiers: { shift: false, alt: false, control: true, meta: false }, action: "press" });
    expect(backend.process.writes.slice(-2)).toEqual(["\x1b[67;0;3;1;8;1_", "\x1b[80;0;16;1;8;1_"]);
  });

  it("orders pending output before resize resynchronization", async () => {
    const backend = new FakeBackend();
    const events: TerminalDriverEvent[] = [];
    const handle = await new PtyTerminalDriver(backend).start("agent", "generation", profile, event => events.push(event));
    backend.process.emitData("A");
    await settle();
    events.length = 0;

    backend.process.emitData("B");
    handle.resize({ columns: 10, rows: 4 });
    await settle();

    expect(events.map(event => event.type)).toEqual(["transaction", "surface"]);
    expect(backend.process.resizes).toEqual([{ columns: 10, rows: 4 }]);
    expect(events[0]).toMatchObject({ type: "transaction", transaction: { sourceSequence: { start: 2, end: 2 } } });
    expect(events[1]).toMatchObject({ type: "surface", surface: { columns: 10, rows: 4 } });
  });
});
