import HeadlessXterm from "@xterm/headless";
import { describe, expect, it } from "vitest";
import { stripAnsi, TranscriptViewport } from "../../../src/ui/components/index.js";

// Legacy xterm is an independent cell oracle for narrow pictographs only.
// Modern emoji/VS16 geometry is checked against pinned Pi in its adapter tests.
function documentRows(symbol: string, width: number): string[] {
  return Array.from({ length: 4 }, () => [
    "ASCII row",
    `${symbol} file.png`,
    `${symbol}\uFE0E text presentation`,
    `${symbol}${symbol}${symbol} repeated`,
    `\u001b[31m${symbol}${symbol} styled\u001b[0m`,
    "",
    `${symbol}${symbol}${"x".repeat(width - 4)}Z`,
    "tail",
  ]).flat();
}

// Literal one-cell fixture columns, not A1's width/padding helpers, define the oracle.
async function replay(
  screen: HeadlessXterm.Terminal,
  frame: ReturnType<TranscriptViewport["compose"]>,
  visible: boolean,
): Promise<void> {
  const { width, height } = frame.descriptor;
  const bytes = frame.rows.map((row, index) =>
    `\u001b[${index + 1};1H${row}${index < frame.hits.viewportHeight ? "" : "\u001b[K"}`,
  ).join("");
  await new Promise<void>(resolve => screen.write(bytes, resolve));
  let rails = 0;
  for (let row = 0; row < height; row++) {
    const line = screen.buffer.active.getLine(row)!;
    const expected = [...stripAnsi(frame.rows[row]!).replaceAll("\uFE0E", "")];
    if (row < frame.hits.viewportHeight) expect(expected).toHaveLength(width);
    else while (expected.length < width) expected.push(" ");
    for (let column = 0; column < width; column++) {
      const chars = line.getCell(column)!.getChars().replaceAll("\uFE0E", "") || " ";
      expect(chars, `cell ${row},${column}`).toBe(expected[column]);
      if (/[┃▐]/u.test(chars)) {
        rails++;
        expect(column).toBe(width - 1);
      }
    }
  }
  if (visible) expect(rails).toBeGreaterThan(0);
  else expect(rails).toBe(0);
}

describe("pictograph viewport cell geometry", () => {
  it.each(["🖼", "🖨"])("keeps %s rails and copy boundaries through cached and changed frames", async symbol => {
    const viewport = new TranscriptViewport();
    viewport.setConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin" });
    let width = 24;
    const height = 9;
    let rows = documentRows(symbol, width);
    let dockRows = ["editor"];
    let now = 1_000;
    const compose = () => viewport.compose({ documentRows: rows, dockRows, promptAnchors: [], width, height, now: now++ });
    const screen = new HeadlessXterm.Terminal({ cols: width, rows: height, allowProposedApi: true, scrollback: 0 });
    try {
      const initial = compose();
      await replay(screen, initial, true);
      const cached = compose();
      expect(cached.rows).toEqual(initial.rows);
      expect(cached.selectionDamage.recomputedRows).toEqual([]);
      expect(cached.selectionDamage.reusedRows.length).toBeGreaterThan(0);
      await replay(screen, cached, true);

      // Replace the same rows in both directions, exercising paint-cache invalidation.
      rows = rows.map(row => row.replaceAll(symbol, "A").replaceAll("\uFE0E", ""));
      await replay(screen, compose(), true);
      rows = documentRows(symbol, width);
      await replay(screen, compose(), true);
      viewport.scrollBy(-8, now++);
      await replay(screen, compose(), true);
      viewport.scrollBy(4, now++);
      await replay(screen, compose(), true);
      viewport.scrollBy(-4, now++);
      await replay(screen, compose(), true);
      viewport.scrollBy(100, now++);
      await replay(screen, compose(), true);

      for (const nextWidth of [31, 20, 24]) {
        width = nextWidth;
        screen.resize(width, height);
        rows = documentRows(symbol, width);
        await replay(screen, compose(), true);
      }
      dockRows = ["one", "two", "three"];
      await replay(screen, compose(), true);
      dockRows = ["editor"];
      const frame = compose();
      await replay(screen, frame, true);

      // This literal-width row ends in Z at the final content cell, next to the gutter.
      const edgeRow = frame.rows.findIndex(row => stripAnsi(row).includes("xxxZ")) + 1;
      expect(edgeRow).toBeGreaterThan(1);
      const content = `${symbol}${symbol}${"x".repeat(width - 4)}Z`;
      for (const reverse of [false, true]) {
        expect(viewport.pressSelection(reverse ? width - 1 : 1, edgeRow, now += 1000)).toBe(true);
        viewport.extendSelection(reverse ? 1 : width, edgeRow, now++, false);
        viewport.releaseSelection();
        expect(viewport.selectedText()).toBe(content);
        await replay(screen, compose(), true);
        const selected = screen.buffer.active.getLine(edgeRow - 1)!.getCell(width - 2)!;
        expect(selected.getChars()).toBe("Z");
        expect(selected.isBgRGB() && selected.getBgColor() === 0x264f78).toBe(true);
        viewport.clearSelection();
        await replay(screen, compose(), true);
      }
      viewport.setConfig({ scrollbarAppearance: "hidden", scrollbarStyle: "thin" });
      await replay(screen, compose(), false);
      viewport.setConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin" });
      await replay(screen, compose(), true);
    } finally {
      screen.dispose();
    }
  });
});
