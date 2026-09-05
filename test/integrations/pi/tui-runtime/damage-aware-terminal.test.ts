import { describe, expect, it, vi } from "vitest";
import { readVisibleHyperlinks } from "../../../../src/ui/components/visible-hyperlinks.js";
import {
  DamageAwareTerminalAdapter,
  PINNED_PI_TUI_DAMAGE_GRAMMAR,
  type PiTuiDamageFrameDescriptor,
  type PiTuiDamageFrameSafety,
  type PiTuiTerminalPort,
} from "../../../../src/integrations/pi/tui-runtime/index.js";
import { classifyTerminalPaint, replayTerminalPaint } from "../../../support/rendering/terminal-paint-evidence.js";

const SAFE: PiTuiDamageFrameSafety = {
  overlayActive: false,
  selectionActive: false,
  replacementSurfaceActive: false,
};
const initialRows = ["A", "B", "C", "D", "E", "F", "editor", "footer"];

class RecordingTerminal implements PiTuiTerminalPort {
  readonly writes: string[] = [];
  readonly kittyProtocolActive = false;
  constructor(public columns = 40, public rows = 8) {}
  onResize: (() => void) | undefined;
  onWrite: (() => void) | undefined;
  start(_input?: (data: string) => void, onResize?: () => void): void { this.onResize = onResize; }
  stop(): void {}
  async drainInput(): Promise<void> {}
  write(data: string): void { this.writes.push(data); this.onWrite?.(); }
  moveBy(): void {}
  hideCursor(): void {}
  showCursor(): void {}
  clearLine(): void {}
  clearFromCursor(): void {}
  clearScreen(): void {}
  setTitle(): void {}
  setProgress(): void {}
}

function descriptor(frameId: number, shift = 0, safe = false): PiTuiDamageFrameDescriptor {
  return {
    frameId,
    width: 40,
    height: 8,
    transcript: { rowStart: 1, rowEnd: 6 },
    dock: { rowStart: 7, rowEnd: 8 },
    verticalShiftRows: shift,
    safeVerticalShift: safe,
    cause: safe ? "follow-shift" : "initial",
  };
}

function fullscreenWrite(rows: readonly string[], rowStart = 1, cursorRow = 7): string {
  const paints = rows.map((content, index) => `\u001b[${rowStart + index};1H\u001b[2K${content}`).join("");
  return `\u001b[?2026h${paints}\u001b[${cursorRow};1H\u001b[?25l\u001b[?2026l`;
}

function initialized(options: { readonly regionalScroll?: boolean } = {}) {
  const terminal = new RecordingTerminal();
  const adapter = new DamageAwareTerminalAdapter(terminal, { regionalScroll: options.regionalScroll ?? true, inspectHyperlinks: readVisibleHyperlinks });
  const initial = fullscreenWrite(initialRows);
  adapter.arm(descriptor(1), SAFE);
  adapter.write(initial);
  return { adapter, terminal, initial };
}

describe("A1-owned damage-aware terminal adapter", () => {
  it("pins one public-boundary grammar to the installed Pi package identity", () => {
    expect(PINNED_PI_TUI_DAMAGE_GRAMMAR).toBe("@earendil-works/pi-tui@0.84.2:tui-alt-screen-one-write-v1");
  });

  it("replaces a broad one-row follow rewrite with regional movement and exposed-row paint", async () => {
    const { adapter, terminal, initial } = initialized();
    const broad = fullscreenWrite(["B", "C", "D", "E", "F", "G"]);
    adapter.arm(descriptor(2, 1, true), SAFE);
    adapter.write(broad);

    expect(adapter.lastDecision).toEqual({
      frameId: 2,
      transformed: true,
      reason: "transformed",
      shiftRows: 1,
      paintedRows: [6],
    });
    const transformed = terminal.writes.at(-1)!;
    expect(transformed).toContain("\u001b[1;6r\u001b[1;1H\u001b[1S\u001b[r");
    expect(classifyTerminalPaint([{ data: transformed, atMs: 1 }])).toMatchObject({
      rowClears: 1,
      addressedRowWrites: [6],
      scrollUpRows: 1,
    });

    const actual = await replayTerminalPaint([
      { data: initial, atMs: 0 },
      { data: transformed, atMs: 1 },
    ], { columns: 40, rows: 8, synchronizedUpdates: "honor" });
    const reference = await replayTerminalPaint([
      { data: initial, atMs: 0 },
      { data: broad, atMs: 1 },
    ], { columns: 40, rows: 8, synchronizedUpdates: "honor" });
    expect(actual.final).toEqual(reference.final);
    expect(actual.final.rows.slice(0, 8)).toEqual(["B", "C", "D", "E", "F", "G", "editor", "footer"]);
  });

  it("forwards a dock-only input differential without touching stable transcript rows", () => {
    const { adapter, terminal } = initialized();
    const dockWrite = fullscreenWrite(["edited"], 7, 7);
    adapter.arm({ ...descriptor(2), cause: "dock-input" }, { ...SAFE, replacementSurfaceActive: true });
    adapter.write(dockWrite);
    expect(adapter.lastDecision).toMatchObject({ frameId: 2, transformed: false, reason: "unsafe-frame" });
    expect(classifyTerminalPaint([{ data: terminal.writes.at(-1)!, atMs: 1 }])).toMatchObject({
      fullScreenClears: 0,
      addressedRowWrites: [7],
      rowClears: 1,
    });
  });

  it("moves multiple rows and repaints only the exposed suffix", () => {
    const { adapter, terminal } = initialized();
    adapter.arm(descriptor(2, 2, true), SAFE);
    adapter.write(fullscreenWrite(["C", "D", "E", "F", "G", "H"]));
    expect(adapter.lastDecision).toMatchObject({ transformed: true, shiftRows: 2, paintedRows: [5, 6] });
    expect(classifyTerminalPaint([{ data: terminal.writes.at(-1)!, atMs: 1 }])).toMatchObject({
      rowClears: 2,
      addressedRowWrites: [5, 6],
      scrollUpRows: 2,
    });
  });

  it("repaints one genuinely changed sticky/source row in addition to the exposed row", () => {
    const { adapter } = initialized();
    adapter.arm(descriptor(2, 1, true), SAFE);
    adapter.write(fullscreenWrite(["styled B", "C", "D", "E", "F", "G"]));
    expect(adapter.lastDecision).toMatchObject({ transformed: true, paintedRows: [1, 6] });
  });

  it.each([
    ["overlay", { ...SAFE, overlayActive: true }, "unsafe-frame"],
    ["selection", { ...SAFE, selectionActive: true }, "unsafe-frame"],
    ["replacement", { ...SAFE, replacementSurfaceActive: true }, "unsafe-frame"],
  ] as const)("forwards Pi's complete write for active %s state", (_name, safety, reason) => {
    const { adapter, terminal } = initialized();
    const broad = fullscreenWrite(["B", "C", "D", "E", "F", "G"]);
    adapter.arm(descriptor(2, 1, true), safety);
    adapter.write(broad);
    expect(terminal.writes.at(-1)).toBe(broad);
    expect(adapter.lastDecision).toMatchObject({ transformed: false, reason });
  });

  it("removes a redundant same-geometry full clear but preserves structural entry and resize clears", () => {
    const ready = initialized();
    const forced = fullscreenWrite(initialRows).replace("\u001b[?2026h", "\u001b[?2026h\u001b[2J");
    ready.adapter.arm(descriptor(2), SAFE);
    ready.adapter.write(forced);
    expect(ready.adapter.lastDecision).toMatchObject({ transformed: true, reason: "suppressed-redundant-clear" });
    expect(ready.terminal.writes.at(-1)).not.toContain("\u001b[2J");

    const coldTerminal = new RecordingTerminal();
    const cold = new DamageAwareTerminalAdapter(coldTerminal, { regionalScroll: true, inspectHyperlinks: readVisibleHyperlinks });
    cold.arm(descriptor(1), SAFE);
    cold.write(forced);
    expect(coldTerminal.writes.at(-1)).toBe(forced);

    ready.terminal.columns = 41;
    const resized = { ...descriptor(3), width: 41 };
    ready.adapter.arm(resized, SAFE);
    ready.adapter.write(forced);
    expect(ready.terminal.writes.at(-1)).toBe(forced);
  });

  it("preserves a forced cleanup when the last visible hyperlink disappears", () => {
    const { adapter, terminal } = initialized();
    const link = "\u001b]8;;https://example.test/full\u0007long linked label\u001b]8;;\u0007";
    adapter.arm(descriptor(2), SAFE);
    adapter.write(fullscreenWrite([link, ...initialRows.slice(1)]));
    const replacement = fullscreenWrite(["", ...initialRows.slice(1)])
      .replace("\u001b[?2026h", "\u001b[?2026h\u001b[2J");
    adapter.arm(descriptor(3), SAFE);
    adapter.write(replacement);

    // Invariant: safety depends on the previously presented link, not just
    // the link-free replacement. Row clears cannot stand in for this cleanup.
    expect(terminal.writes.at(-1)).toBe(replacement);
  });

  it.each(["https://example.test/long", "file:///C:/work/source.ts", "C:/work/source.ts", "package.json"])(
    "preserves cleanup for the host-detected label %s without OSC 8", label => {
      const { adapter, terminal } = initialized();
      adapter.arm(descriptor(2), SAFE);
      adapter.write(fullscreenWrite([label, ...initialRows.slice(1)]));
      const replacement = fullscreenWrite(["plain", ...initialRows.slice(1)])
        .replace("\u001b[?2026h", "\u001b[?2026h\u001b[2J");
      adapter.arm(descriptor(3), SAFE);
      adapter.write(replacement);
      expect(terminal.writes.at(-1)).toBe(replacement);
      expect(adapter.lastDecision.reason).toBe("hyperlink-cleanup");
      expect(adapter.hyperlinkCleanupPending).toBe(false);
    },
  );

  it.each(["honor", "ignore"] as const)("upgrades a link differential to one complete current frame (%s sync)", async synchronizedUpdates => {
    const { adapter, terminal } = initialized();
    adapter.arm(descriptor(2), SAFE);
    adapter.write(fullscreenWrite(["https://example.test", ...initialRows.slice(1)]));
    const before = terminal.writes.at(-1)!;
    adapter.arm(descriptor(3), SAFE);
    adapter.write(fullscreenWrite(["latest plain content"]));
    const output = terminal.writes.at(-1)!;
    expect(adapter.lastDecision.reason).toBe("hyperlink-cleanup");
    expect(classifyTerminalPaint([{ data: output, atMs: 1 }])).toMatchObject({
      fullScreenClears: 1, rowClears: 8, frames: 1,
      synchronizedUpdates: { begins: 1, ends: 1, balanced: true },
    });
    const replay = await replayTerminalPaint([{ data: before, atMs: 0 }, { data: output, atMs: 1 }], {
      columns: 40, rows: 8, synchronizedUpdates,
    });
    expect(replay.final.rows.slice(0, 8)).toEqual(["latest plain content", ...initialRows.slice(1)]);
    expect(replay.final.cursor).toEqual({ row: 7, column: 1 });
    if (synchronizedUpdates === "honor") expect(replay.states.some(frame => frame.rows.every(row => row === ""))).toBe(false);
  });

  it.each(["honor", "ignore"] as const)("preserves all 192x54 cells and newest content during cleanup (%s sync)", async synchronizedUpdates => {
    const terminal = new RecordingTerminal(192, 54);
    const adapter = new DamageAwareTerminalAdapter(terminal, { regionalScroll: true, inspectHyperlinks: readVisibleHyperlinks });
    const frame = (id: number) => ({ ...descriptor(id), width: 192, height: 54,
      transcript: { rowStart: 1, rowEnd: 50 }, dock: { rowStart: 51, rowEnd: 54 } });
    const rows = Array.from({ length: 54 }, (_, index) => index === 0
      ? "https://example.test/previous" : `\u001b[38;2;80;120;160mstable ${index}\u001b[0m`);
    const initial = fullscreenWrite(rows, 1, 53);
    adapter.arm(frame(1), SAFE);
    adapter.write(initial);
    adapter.requestHyperlinkCleanup();
    adapter.arm(frame(2), SAFE);
    adapter.arm(frame(3), SAFE);
    adapter.write(fullscreenWrite(["\u001b[1mnewest\u001b[0m"], 1, 53));
    const output = terminal.writes.at(-1)!;
    expect(adapter.lastDecision).toMatchObject({ frameId: 3, reason: "hyperlink-cleanup" });
    expect(classifyTerminalPaint([{ data: output, atMs: 1 }])).toMatchObject({ fullScreenClears: 1, rowClears: 54, frames: 1 });
    for (let row = 1; row < rows.length; row += 1) expect(output).toContain(rows[row]);
    const replay = await replayTerminalPaint([{ data: initial, atMs: 0 }, { data: output, atMs: 1 }], {
      columns: 192, rows: 54, synchronizedUpdates,
    });
    expect(replay.final.rows).toEqual(["newest", ...Array.from({ length: 53 }, (_, index) => `stable ${index + 1}`)]);
    expect(replay.final.cursor).toEqual({ row: 53, column: 1 });
    if (synchronizedUpdates === "honor") expect(replay.states).toHaveLength(2);
  }, 20_000);

  it("reuses unchanged row analysis for dock-only paint", () => {
    const terminal = new RecordingTerminal();
    const inspect = vi.fn(readVisibleHyperlinks);
    const adapter = new DamageAwareTerminalAdapter(terminal, { regionalScroll: true, inspectHyperlinks: inspect });
    adapter.arm(descriptor(1), SAFE);
    adapter.write(fullscreenWrite(["https://example.test", ...initialRows.slice(1)]));
    inspect.mockClear();
    adapter.arm(descriptor(2), SAFE);
    adapter.write(fullscreenWrite(["edited"], 7));
    expect(inspect).toHaveBeenCalledTimes(1);
    expect(inspect).toHaveBeenCalledWith("edited");
  });

  it("does not clear a linked transcript for stable dock-only typing", () => {
    const { adapter, terminal } = initialized();
    adapter.arm(descriptor(2), SAFE);
    adapter.write(fullscreenWrite(["https://example.test", ...initialRows.slice(1)]));
    const input = fullscreenWrite(["edited"], 7);
    adapter.arm(descriptor(3), SAFE);
    adapter.write(input);
    expect(terminal.writes.at(-1)).toBe(input);
    expect(adapter.hyperlinkCleanupPending).toBe(false);
  });

  it("rejects regional movement over a cached link omitted from the incoming differential", () => {
    const { adapter, terminal } = initialized();
    adapter.arm(descriptor(2), SAFE);
    adapter.write(fullscreenWrite(["https://example.test"], 2));
    const partial = fullscreenWrite(["B"]);
    adapter.arm(descriptor(3, 1, true), SAFE);
    adapter.write(partial);
    expect(terminal.writes.at(-1)).toBe(partial);
    expect(adapter.lastDecision.reason).toBe("unsafe-terminal-content");
  });

  it("coalesces cleanup with the latest arm and never forwards an obsolete frame", () => {
    const { adapter, terminal } = initialized();
    adapter.requestHyperlinkCleanup();
    adapter.arm(descriptor(2), SAFE);
    adapter.arm(descriptor(3), SAFE);
    adapter.write(fullscreenWrite(["newest"]));
    expect(terminal.writes.at(-1)).toContain("newest");
    expect(adapter.hyperlinkCleanupPending).toBe(false);
    const count = terminal.writes.length;
    adapter.requestHyperlinkCleanup();
    adapter.arm(descriptor(2), SAFE);
    adapter.write(fullscreenWrite(["obsolete"]));
    expect(terminal.writes).toHaveLength(count);
    expect(adapter.hyperlinkCleanupPending).toBe(true);
  });

  it("does not acknowledge a newer cleanup requested while forwarding a frame", () => {
    const { adapter, terminal } = initialized();
    adapter.requestHyperlinkCleanup();
    terminal.onWrite = () => { terminal.onWrite = undefined; adapter.requestHyperlinkCleanup(); };
    adapter.arm(descriptor(2), SAFE);
    adapter.write(fullscreenWrite(["newest"]));
    expect(adapter.hyperlinkCleanupPending).toBe(true);
    adapter.arm(descriptor(3), SAFE);
    adapter.write(fullscreenWrite([], 1));
    expect(terminal.writes.at(-1)).toContain("\u001b[2J");
    expect(adapter.hyperlinkCleanupPending).toBe(false);
  });

  it("preserves unknown writes, requests one deferred full frame, and retains pending cleanup", async () => {
    const terminal = new RecordingTerminal();
    const recover = vi.fn();
    const adapter = new DamageAwareTerminalAdapter(terminal, { regionalScroll: true, inspectHyperlinks: readVisibleHyperlinks, onHyperlinkCleanupRequired: recover });
    adapter.arm(descriptor(1), SAFE);
    adapter.write(fullscreenWrite(["https://example.test", ...initialRows.slice(1)]));
    const unknown = "\u001b_Gunsupported-image\u001b\\";
    adapter.arm(descriptor(2), SAFE);
    adapter.write(unknown);
    expect(terminal.writes.at(-1)).toBe(unknown);
    expect(adapter.hyperlinkCleanupPending).toBe(true);
    expect(recover).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(recover).toHaveBeenCalledTimes(1);
    adapter.arm(descriptor(3), SAFE);
    adapter.write(unknown);
    await Promise.resolve();
    expect(recover).toHaveBeenCalledTimes(1);
    adapter.arm(descriptor(4), SAFE);
    adapter.write(fullscreenWrite(initialRows));
    expect(terminal.writes.at(-1)).toContain("\u001b[2J");
    expect(adapter.hyperlinkCleanupPending).toBe(false);
  });

  it("keeps link cleanup across resize but cancels deferred recovery on stop", async () => {
    const terminal = new RecordingTerminal();
    const recover = vi.fn();
    const adapter = new DamageAwareTerminalAdapter(terminal, { regionalScroll: true, inspectHyperlinks: readVisibleHyperlinks, onHyperlinkCleanupRequired: recover });
    adapter.start(() => {}, () => {});
    adapter.arm(descriptor(1), SAFE);
    adapter.write(fullscreenWrite(["https://example.test", ...initialRows.slice(1)]));
    terminal.columns = 41;
    terminal.onResize?.();
    expect(adapter.hyperlinkCleanupPending).toBe(true);
    adapter.arm({ ...descriptor(2), width: 41 }, SAFE);
    adapter.write(fullscreenWrite(initialRows));
    expect(terminal.writes.at(-1)).toContain("\u001b[2J");
    expect(adapter.hyperlinkCleanupPending).toBe(false);
    adapter.requestHyperlinkCleanup();
    adapter.write("unknown paint");
    adapter.stop();
    await Promise.resolve();
    expect(recover).not.toHaveBeenCalled();
    expect(adapter.hyperlinkCleanupPending).toBe(false);
    adapter.arm({ ...descriptor(1), width: 41 }, SAFE);
    adapter.write(fullscreenWrite(initialRows));
    expect(adapter.lastDecision.reason).not.toBe("stale-frame");
  });

  it("does not invalidate the presented row cache for clipboard/title controls", () => {
    const { adapter, terminal } = initialized();
    adapter.write("\u001b]52;c;YWJj\u0007");
    adapter.write("\u001b]2;fixture\u0007");
    adapter.requestHyperlinkCleanup();
    adapter.arm(descriptor(2), SAFE);
    adapter.write(fullscreenWrite(["edited"], 7));
    expect(adapter.lastDecision.reason).toBe("hyperlink-cleanup");
    expect(terminal.writes.at(-1)).toContain("\u001b[1;1H\u001b[2KA");
  });

  it("fails closed for unsupported region scrolling and geometry mismatch", () => {
    const unsupported = initialized({ regionalScroll: false });
    const broad = fullscreenWrite(["B", "C", "D", "E", "F", "G"]);
    unsupported.adapter.arm(descriptor(2, 1, true), SAFE);
    unsupported.adapter.write(broad);
    expect(unsupported.terminal.writes.at(-1)).toBe(broad);
    expect(unsupported.adapter.lastDecision.reason).toBe("unsupported-region-scroll");

    const mismatch = initialized();
    mismatch.adapter.arm({ ...descriptor(2, 1, true), width: 39 }, SAFE);
    mismatch.adapter.write(broad);
    expect(mismatch.terminal.writes.at(-1)).toBe(broad);
    expect(mismatch.adapter.lastDecision.reason).toBe("geometry-mismatch");
  });

  it("fails closed for incomplete grammar, hyperlinks, images, and excessive reflow", () => {
    for (const [write, reason] of [
      ["not-a-fullscreen-frame", "grammar-mismatch"],
      [fullscreenWrite(["B", "C", "D", "E", "F", "\u001b]8;;https://example.test\u0007G\u001b]8;;\u0007"]), "unsafe-terminal-content"],
      [fullscreenWrite(["B", "C", "D", "E", "F", "\u001b_Gimage\u001b\\"]), "unsafe-terminal-content"],
      [fullscreenWrite(["X", "Y", "Z", "Q", "R", "G"]), "excessive-real-damage"],
    ] as const) {
      const { adapter, terminal } = initialized();
      adapter.arm(descriptor(2, 1, true), SAFE);
      adapter.write(write);
      expect(terminal.writes.at(-1)).toBe(write);
      expect(adapter.lastDecision).toMatchObject({ transformed: false, reason });
    }
  });

  it("rejects a stale frame identity and a safe shift without a complete prior frame", () => {
    const ready = initialized();
    const broad = fullscreenWrite(["B", "C", "D", "E", "F", "G"]);
    ready.adapter.arm(descriptor(2, 1, true), SAFE);
    ready.adapter.write(broad);
    ready.adapter.arm(descriptor(2, 1, true), SAFE);
    ready.adapter.write(broad);
    expect(ready.adapter.lastDecision.reason).toBe("stale-frame");

    const terminal = new RecordingTerminal();
    const cold = new DamageAwareTerminalAdapter(terminal, { regionalScroll: true, inspectHyperlinks: readVisibleHyperlinks });
    cold.arm(descriptor(1, 1, true), SAFE);
    cold.write(broad);
    expect(cold.lastDecision.reason).toBe("incomplete-prior-frame");
    expect(terminal.writes.at(-1)).toBe(broad);
  });
});
