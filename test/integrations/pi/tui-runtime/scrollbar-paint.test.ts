import HeadlessXterm from "@xterm/headless";
import { describe, expect, it } from "vitest";
import { DamageAwareTerminalAdapter } from "../../../../src/integrations/pi/tui-runtime/damage-aware-terminal.js";
import { paintScrollbarCells, validRailCells } from "../../../../src/integrations/pi/tui-runtime/scrollbar-paint.js";
import { TranscriptViewport, type TranscriptViewportFrame } from "../../../../src/ui/components/transcript-viewport.js";
import { readVisibleHyperlinks } from "../../../../src/ui/components/visible-hyperlinks.js";
import { displayWidth, stripAnsi } from "../../../../src/ui/components/text.js";
import { RecordingRenderingTerminal } from "../../../support/rendering/recording-rendering-terminal.js";

const ESC = "\u001b";
const SAFE = { overlayActive: false, selectionActive: false, replacementSurfaceActive: false };
const green = `${ESC}[48;2;20;80;40m`;
const theme = {
  track: (text: string) => `${ESC}[38;2;90;90;90m${text}${ESC}[39m`,
  thumb: (text: string) => `${ESC}[38;2;210;210;210m${text}${ESC}[39m`,
  sticky: (text: string) => text, quietSticky: (text: string) => text,
  bottomControl: (text: string) => text,
  selection: (text: string) => text, // Rationale: selection-specific colors use the ordinary viewport theme below.
};

function harness(width = 40, height = 8) {
  const terminal = new RecordingRenderingTerminal(width, height);
  const adapter = new DamageAwareTerminalAdapter(terminal, { regionalScroll: true, inspectHyperlinks: readVisibleHyperlinks });
  const screen = new HeadlessXterm.Terminal({ cols: width, rows: height, allowProposedApi: true, scrollback: 0 });
  let previous: readonly string[] = [];
  const write = (bytes: string) => new Promise<void>(resolve => screen.write(bytes, resolve));
  const present = async (frame: TranscriptViewportFrame, options: { batched?: boolean; clear?: boolean; shorten?: boolean } = {}) => {
    const rows = [...frame.terminalRows!];
    if (options.shorten) rows[1] = rows[1]!.slice(0, -1); // Invariant: independent content advance may be shorter than its logical width.
    const changed = rows.flatMap((text, index) => options.clear || text !== previous[index] ? [{ row: index + 1, text }] : []);
    const paints = options.batched
      ? changed.map(({ row }) => `${ESC}[${row};1H${ESC}[2K`).join("")
        + changed.map(({ row, text }) => `${ESC}[${row};1H${text}${ESC}[0m`).join("")
      : changed.map(({ row, text }) => `${ESC}[${row};1H${ESC}[2K${text}${ESC}[0m`).join("");
    const data = `${ESC}[?2026h${options.clear ? `${ESC}[2J` : ""}${paints}${ESC}[${rows.length};2H${ESC}[?25l${ESC}[?2026l`;
    adapter.arm(frame.descriptor, { ...SAFE, selectionActive: frame.descriptor.selectionRevision > 0 });
    adapter.write(data);
    await write(terminal.writes.at(-1)!.data);
    previous = rows;
    return terminal.writes.at(-1)!.data;
  };
  return { terminal, adapter, screen, present, write };
}

function assertRails(screen: HeadlessXterm.Terminal, viewportHeight: number, glyph: string | undefined, coveredRow?: number) {
  const width = screen.cols;
  for (let row = 0; row < screen.rows; row++) {
    const line = screen.buffer.active.getLine(row)!;
    for (let column = 0; column < width; column++) {
      const cell = line.getCell(column)!.getChars();
      if (/[┃▐]/u.test(cell)) {
        expect(column, `rail column at row ${row}`).toBe(width - 1);
        expect(row).toBeGreaterThan(0);
        expect(row).toBeLessThan(viewportHeight);
      }
    }
    if (width > 1 && glyph !== undefined && row > 0 && row < viewportHeight && row + 1 !== coveredRow) {
      expect(line.getCell(width - 1)!.getChars(), `rail row ${row}`).toBe(glyph);
    } else if (row + 1 !== coveredRow) expect(line.getCell(width - 1)!.getChars()).not.toMatch(/[┃▐]/u);
  }
}

describe("physical content-independent scrollbar paint", () => {
  it.each([1, 4, 40])("retains fixed cells through content, geometry, visibility, selection, and cached changes at width %i", async width => {
    const h = harness(width);
    const viewport = new TranscriptViewport();
    let dockRows = ["editor", "footer"];
    let documentRows = Array.from({ length: 20 }, (_, index) => `${green}${index}: a\u2060b 🖼 界${ESC}[49m`);
    let appearance: "always" | "auto" | "hidden" = "always";
    let style: "thin" | "thick" = "thin";
    let covered: number | undefined;
    const compose = () => {
      viewport.setConfig({ scrollbarAppearance: appearance, scrollbarStyle: style });
      viewport.setRailHovered(true);
      return viewport.compose({ width, height: 8, documentRows, dockRows, promptAnchors: [], now: 100,
        ...(covered === undefined ? {} : { coveredCells: [{ row: covered, columnStart: width - 1, columnEnd: width }] }),
      });
    };
    try {
      // Protocol: pinned Pi's fullscreen lifecycle already disables autowrap.
      await h.write(`${ESC}[?7l`);
      let frame = compose();
      expect(frame.terminalRows!.join("")).not.toMatch(/[┃▐]/u);
      await h.present(frame, { clear: true });
      assertRails(h.screen, 6, width > 1 ? "┃" : undefined);
      expect(h.screen.buffer.active.cursorX).toBe(1);
      expect(h.screen.buffer.active.cursorY).toBe(7);
      const cached = await h.present(compose());
      expect(cached).not.toContain(`${ESC}7`); // Performance: same rows and cell styling do no extra rail work.
      await h.present(compose(), { shorten: true });
      assertRails(h.screen, 6, width > 1 ? "┃" : undefined);
      documentRows = documentRows.map((_row, index) => index % 2 ? `Steering:\tx\ry ⏎ z` : `emoji ❤${ESC}[2m\ufe0f${ESC}[22m`);
      await h.present(compose());
      assertRails(h.screen, 6, width > 1 ? "┃" : undefined);
      viewport.scrollBy(-4, 100);
      await h.present(compose());
      assertRails(h.screen, 6, width > 1 ? "┃" : undefined);
      viewport.scrollToEnd();
      documentRows = [...documentRows, "new message"];
      await h.present(compose());
      assertRails(h.screen, 6, width > 1 ? "┃" : undefined);
      dockRows = ["widget", "editor", "footer"];
      await h.present(compose());
      assertRails(h.screen, 5, width > 1 ? "┃" : undefined);
      dockRows = ["editor", "footer"];
      style = "thick";
      await h.present(compose());
      assertRails(h.screen, 6, width > 1 ? "▐" : undefined);
      appearance = "hidden";
      await h.present(compose());
      assertRails(h.screen, 6, undefined);
      appearance = "auto";
      await h.present(compose());
      assertRails(h.screen, 6, width > 1 ? "▐" : undefined);
      if (width > 1) {
        viewport.pressSelection(1, 2, 1000);
        viewport.extendSelection(width - 1, 3, 1001, false);
        await h.present(compose());
        assertRails(h.screen, 6, "▐");
        expect(viewport.selectedText()).not.toMatch(/[┃▐]/u);
        viewport.clearSelection();
        covered = 3;
        frame = compose();
        expect(frame.descriptor.railCells!.some(cell => cell.row === 3)).toBe(false);
        // Compatibility: simulate the pinned overlay compositor replacing the covered cells.
        frame = { ...frame, terminalRows: frame.terminalRows!.map((row, index) => index === 2 ? `${" ".repeat(width - 1)}M` : row) };
        await h.present(frame);
        assertRails(h.screen, 6, "▐", 3);
        expect(h.screen.buffer.active.getLine(2)!.getCell(width - 1)!.getChars()).toBe("M");
        covered = undefined;
        await h.present(compose());
        assertRails(h.screen, 6, "▐");
      }
      for (const nextWidth of [7, 46, 2]) {
        width = nextWidth;
        h.terminal.resize(width, 8);
        h.screen.resize(width, 8);
        await h.present(compose(), { clear: true });
        assertRails(h.screen, 6, "▐");
      }
    } finally { h.screen.dispose(); }
  });

  it("paints true gutter backgrounds, foregrounds, and selection without inheriting source links", async () => {
    const h = harness();
    const viewport = new TranscriptViewport();
    viewport.setConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin" });
    const documentRows = Array.from({ length: 20 }, () => `${green}${ESC}]8;;https://example.com${ESC}\\abc${ESC}]8;;${ESC}\\${ESC}[49m`);
    const compose = () => viewport.compose({ width: 40, height: 8, documentRows, dockRows: ["editor", "footer"], promptAnchors: [], theme });
    try {
      await h.present(compose(), { clear: true });
      const cell = h.screen.buffer.active.getLine(2)!.getCell(39)!;
      expect(cell.getChars()).toBe("┃");
      expect(cell.isBgRGB()).toBe(true);
      expect(cell.getBgColor()).toBe(0x145028);
      expect(cell.getFgColor()).toBe(0x5a5a5a);
      const descriptor = compose().descriptor;
      expect(descriptor.railCells!.every(cell => !cell.text.includes("https://"))).toBe(true);
      viewport.pressSelection(1, 2, 1000);
      viewport.extendSelection(39, 3, 1001, false);
      const selected = viewport.compose({ width: 40, height: 8, documentRows, dockRows: ["editor", "footer"], promptAnchors: [] });
      await h.present(selected);
      expect(h.screen.buffer.active.getLine(1)!.getCell(39)!.getBgColor()).toBe(0x264f78);
    } finally { h.screen.dispose(); }
  });

  it("keeps regional scrolling, hyperlink cleanup, snapshots, and presentation resets consistent", async () => {
    const h = harness();
    const viewport = new TranscriptViewport();
    viewport.setConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin" });
    let documentRows = Array.from({ length: 20 }, (_, index) => `row ${index}`);
    const compose = () => viewport.compose({ width: 40, height: 8, documentRows, dockRows: ["editor", "footer"], promptAnchors: [] });
    try {
      await h.present(compose(), { clear: true });
      documentRows = [...documentRows, "row 20"];
      const shifted = await h.present(compose());
      expect(h.adapter.lastDecision.reason).toBe("transformed");
      expect(shifted).toContain(`${ESC}[1;6r${ESC}[1;1H${ESC}[1S${ESC}[r`);
      assertRails(h.screen, 6, "┃");
      expect(stripAnsi(h.adapter.presentedRows()[1]!)).toContain("┃");
      h.adapter.requestHyperlinkCleanup([2]);
      await h.present(compose());
      expect(h.adapter.lastDecision.reason).toBe("hyperlink-cleanup");
      assertRails(h.screen, 6, "┃");
      h.adapter.invalidatePresentation();
      await h.present(compose(), { clear: true });
      assertRails(h.screen, 6, "┃");
    } finally { h.screen.dispose(); }
  });

  it("preserves batched-image transport exactly once and rejects stale or malformed rail metadata", async () => {
    const h = harness();
    const viewport = new TranscriptViewport();
    viewport.setConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin" });
    const image = `${ESC}_Ga=T,f=100;AQID${ESC}\\`;
    const frame = viewport.compose({ width: 40, height: 8, documentRows: Array.from({ length: 20 }, (_, index) => index === 15 ? `${image}image` : `row ${index}`), dockRows: ["editor", "footer"], promptAnchors: [] });
    try {
      const bytes = await h.present(frame, { clear: true, batched: true });
      expect(bytes.split(image)).toHaveLength(2);
      expect(displayWidth(h.adapter.presentedRows()[1]!)).toBe(40);
      assertRails(h.screen, 6, "┃");
      const count = h.terminal.writes.length;
      h.adapter.arm(frame.descriptor, SAFE);
      h.adapter.write(`${ESC}[?2026h${ESC}[?25l${ESC}[?2026l`);
      expect(h.terminal.writes).toHaveLength(count);
      const bad = { ...frame.descriptor, railCells: [{ row: 2, column: 40, text: `${ESC}[2J┃` }] };
      expect(validRailCells(bad)).toBe(false);
      expect(paintScrollbarCells(bytes, bad, [], new Map(), null, false)).toBe(bytes);
    } finally { h.screen.dispose(); }
  });

  it("repairs rail-only changes even when Pi emits no content rows and leaves unassociated writes alone", async () => {
    const h = harness();
    const viewport = new TranscriptViewport();
    const compose = () => viewport.compose({ width: 40, height: 8, documentRows: Array.from({ length: 20 }, () => "same"), dockRows: ["editor", "footer"], promptAnchors: [], now: 2000 });
    try {
      viewport.setConfig({ scrollbarAppearance: "auto", scrollbarStyle: "thin" });
      await h.present(compose(), { clear: true });
      assertRails(h.screen, 6, undefined);
      viewport.setRailHovered(true);
      const shown = compose();
      const bytes = await h.present(shown);
      expect(bytes).not.toContain(`${ESC}[2K`);
      assertRails(h.screen, 6, "┃");
      viewport.setRailHovered(false);
      await h.present(compose());
      assertRails(h.screen, 6, undefined);
      const unassociated = `${ESC}[?2026h${ESC}[1;1H${ESC}[2Kplain${ESC}[?25l${ESC}[?2026l`;
      h.adapter.write(unassociated);
      expect(h.terminal.writes.at(-1)!.data).toBe(unassociated);
      expect(stripAnsi(shown.rows[1]!)).toContain("┃");
    } finally { h.screen.dispose(); }
  });
});
