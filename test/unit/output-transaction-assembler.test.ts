import { describe, expect, it } from "vitest";
import { PtyOutputTransactionAssembler, type AssembledPtyOutput, type OutputAssemblerScheduler } from "../../src/drivers/terminal/output-transaction-assembler.js";

class ManualIoTurnScheduler implements OutputAssemblerScheduler {
  readonly callbacks: (() => void)[] = [];
  scheduleEndOfIoTurn(callback: () => void): { cancel(): void } {
    let active = true;
    this.callbacks.push(() => { if (active) callback(); });
    return { cancel: () => { active = false; } };
  }
  flush(): void {
    for (const callback of this.callbacks.splice(0)) callback();
  }
}

class ManualAdaptiveScheduler extends ManualIoTurnScheduler {
  readonly delayed: { delayMs: number; run(): void }[] = [];
  scheduleAfterQuiescence(delayMs: number, callback: () => void): { cancel(): void } {
    let active = true;
    this.delayed.push({ delayMs, run: () => { if (active) callback(); } });
    return { cancel: () => { active = false; } };
  }
  flushDelayed(): void {
    for (const delayed of this.delayed.splice(0)) delayed.run();
  }
}

describe("generic PTY output transaction assembler", () => {
  it("combines adjacent unsynchronized reads and a cursor epilogue in one I/O-turn transaction", () => {
    const scheduler = new ManualIoTurnScheduler();
    const transactions: AssembledPtyOutput[] = [];
    const assembler = new PtyOutputTransactionAssembler(transaction => transactions.push(transaction), { scheduler });
    assembler.push("content");
    assembler.push("\x1b[2;3H");
    expect(transactions).toEqual([]);
    scheduler.flush();
    expect(transactions).toEqual([]);
    scheduler.flush();
    expect(transactions).toEqual([expect.objectContaining({
      data: "content\x1b[2;3H",
      sourceSequence: { start: 1, end: 2 },
      atomicBoundary: "io-turn",
      readCount: 2,
      requiresResynchronization: false,
    })]);
  });

  it("withholds a synchronized commit split across reads and includes its trailing epilogue", () => {
    const scheduler = new ManualIoTurnScheduler();
    const transactions: AssembledPtyOutput[] = [];
    const assembler = new PtyOutputTransactionAssembler(transaction => transactions.push(transaction), { scheduler });
    assembler.push("\x1b[?2026hpartial");
    scheduler.flush();
    expect(transactions).toEqual([]);
    assembler.push("complete\x1b[?20");
    assembler.push("26l");
    assembler.push("\x1b[4;8H\x1b[?25h");
    scheduler.flush();
    expect(transactions).toEqual([]);
    scheduler.flush();
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      sourceSequence: { start: 1, end: 4 },
      atomicBoundary: "synchronized-output",
      readCount: 4,
      requiresResynchronization: false,
    });
    expect(transactions[0]?.data).toContain("partialcomplete");
    expect(transactions[0]?.data.endsWith("\x1b[4;8H\x1b[?25h")).toBe(true);
  });

  it("preserves multiple explicit source commits delivered in one PTY read", () => {
    const scheduler = new ManualIoTurnScheduler();
    const transactions: AssembledPtyOutput[] = [];
    const assembler = new PtyOutputTransactionAssembler(transaction => transactions.push(transaction), { scheduler });

    assembler.push("\x1b[?2026h\x1b[1;1HSTATUS:THINKING\x1b[?2026l\x1b[?2026h\x1b[1;1HSTATUS:READY\x1b[?2026l");
    scheduler.flush();
    scheduler.flush();

    expect(transactions).toHaveLength(2);
    expect(transactions[0]?.data).toContain("STATUS:THINKING");
    expect(transactions[0]?.data).not.toContain("STATUS:READY");
    expect(transactions[1]?.data).toContain("STATUS:READY");
    expect(transactions.every(transaction => transaction.atomicBoundary === "synchronized-output")).toBe(true);
  });

  it("combines a synchronized commit with a cursor epilogue delivered in the following PTY I/O turn", () => {
    const scheduler = new ManualIoTurnScheduler();
    const transactions: AssembledPtyOutput[] = [];
    const assembler = new PtyOutputTransactionAssembler(transaction => transactions.push(transaction), { scheduler });
    assembler.push("\x1b[?2026hFRAME\x1b[?2026l");
    scheduler.flush();
    expect(transactions).toEqual([]);

    // ConPTY/native PTY may expose this source epilogue in the next poll turn.
    assembler.push("\x1b[4;8H\x1b[?25h");
    scheduler.flush();
    expect(transactions).toEqual([]);
    scheduler.flush();

    expect(transactions).toEqual([expect.objectContaining({
      data: "\x1b[?2026hFRAME\x1b[?2026l\x1b[4;8H\x1b[?25h",
      sourceSequence: { start: 1, end: 2 },
      atomicBoundary: "synchronized-output",
      readCount: 2,
    })]);
  });

  it("uses bounded maximum quiescence before synchronized transport cadence is known", () => {
    const scheduler = new ManualAdaptiveScheduler();
    const transactions: AssembledPtyOutput[] = [];
    const assembler = new PtyOutputTransactionAssembler(transaction => transactions.push(transaction), { scheduler });

    assembler.push("\x1b[?2026h\x1b[?25l\x1b[?2026l");
    expect(scheduler.delayed.at(-1)?.delayMs).toBe(32);
    scheduler.flush();
    scheduler.flush();
    expect(transactions).toEqual([]);
    assembler.push("\x1b[HSIMULATED CONVERSATION");
    scheduler.flushDelayed();
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.data).toContain("SIMULATED CONVERSATION");
  });

  it("keeps the accepted cadence-derived synchronized baseline and ignores same-burst fragments", () => {
    const scheduler = new ManualAdaptiveScheduler();
    const transactions: AssembledPtyOutput[] = [];
    let now = 0;
    const assembler = new PtyOutputTransactionAssembler(transaction => transactions.push(transaction), {
      scheduler,
      now: () => now,
    });

    assembler.push("seed");
    scheduler.flush();
    scheduler.flush();
    expect(transactions).toHaveLength(1);

    now = 16;
    assembler.push("\x1b[?2026h\x1b[?25l\x1b[?2026l");
    expect(scheduler.delayed.at(-1)?.delayMs).toBe(32);
    now = 17; // Same ConPTY burst; must not collapse marker-only wait.
    assembler.push("\x1b[1;1H");
    expect(scheduler.delayed.at(-1)?.delayMs).toBe(32);
    now = 32;
    assembler.push("FRAME\x1b[?25h");
    expect(scheduler.delayed.at(-1)?.delayMs).toBe(28);
    scheduler.flushDelayed();

    expect(transactions).toHaveLength(2);
    expect(transactions[1]).toMatchObject({ atomicBoundary: "synchronized-output" });
    expect(transactions[1]?.data).toContain("\x1b[?25l");
    expect(transactions[1]?.data).toContain("FRAME\x1b[?25h");
  });

  it("retains maximum quiescence for marker-only commits after cadence is learned", () => {
    const scheduler = new ManualAdaptiveScheduler();
    const transactions: AssembledPtyOutput[] = [];
    let now = 0;
    const assembler = new PtyOutputTransactionAssembler(transaction => transactions.push(transaction), { scheduler, now: () => now });
    assembler.push("seed");
    scheduler.flush();
    scheduler.flush();
    now = 16;
    assembler.push("\x1b[?2026h\x1b[?25l\x1b[?2026l");
    expect(scheduler.delayed.at(-1)?.delayMs).toBe(32);
    now = 17;
    assembler.push("RESTORATIVE CELLS\x1b[?25h");
    expect(scheduler.delayed.at(-1)?.delayMs).toBe(28);
    scheduler.flushDelayed();
    expect(transactions[1]?.data).toContain("RESTORATIVE CELLS");
  });

  it("applies transport quiescence after a synchronized commit even when printable cells arrived", () => {
    const scheduler = new ManualAdaptiveScheduler();
    const transactions: AssembledPtyOutput[] = [];
    let now = 0;
    const assembler = new PtyOutputTransactionAssembler(transaction => transactions.push(transaction), { scheduler, now: () => now });
    assembler.push("seed");
    scheduler.flush();
    scheduler.flush();
    now = 16;
    assembler.push("\x1b[?2026hTEXT\x1b[?25h\x1b[?2026l");

    expect(transactions).toHaveLength(1);
    expect(scheduler.delayed.at(-1)?.delayMs).toBe(28);
    scheduler.flushDelayed();
    expect(transactions[1]?.data).toContain("TEXT");
  });

  it("uses a bounded fallback and requests resynchronization rather than publishing an open synchronized region", () => {
    const scheduler = new ManualIoTurnScheduler();
    const transactions: AssembledPtyOutput[] = [];
    const assembler = new PtyOutputTransactionAssembler(transaction => transactions.push(transaction), { scheduler, maxBufferedBytes: 12 });
    assembler.push("\x1b[?2026hunclosed");
    expect(transactions).toEqual([expect.objectContaining({
      atomicBoundary: "bounded-fallback",
      requiresResynchronization: true,
    })]);
  });

  it("flushes pending output as a final transaction on exit", () => {
    const scheduler = new ManualIoTurnScheduler();
    const transactions: AssembledPtyOutput[] = [];
    const assembler = new PtyOutputTransactionAssembler(transaction => transactions.push(transaction), { scheduler });
    assembler.push("final");
    assembler.flushFinal();
    scheduler.flush();
    expect(transactions).toEqual([expect.objectContaining({ atomicBoundary: "exit", final: true })]);
  });
});
