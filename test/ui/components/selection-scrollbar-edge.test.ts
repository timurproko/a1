import HeadlessXterm from "@xterm/headless";
import { describe, expect, it } from "vitest";
import { backgroundSgrSpan, displayWidth, hyperlinkTargetAtColumn, TranscriptViewport } from "../../../src/ui/components/index.js";
import { classifyTerminalPaint, type TimedTerminalWrite } from "../../support/rendering/terminal-paint-evidence.js";

// Compatibility: mirror the production rail theme; the viewport supplies the row background beneath it.
const RAIL_RESET = "\u001b[22;23;24;25;27;28;29;39;54;55m";
const SELECTED = (38 << 16) | (79 << 8) | 120;
const SOURCE = (11 << 16) | (22 << 8) | 33;
const theme = {
  track: (text: string) => `${RAIL_RESET}\u001b[38;2;90;90;90m${text}\u001b[39m`,
  thumb: (text: string, hovered: boolean) => `${RAIL_RESET}\u001b[38;2;${hovered ? "100;200;255" : "80;180;230"}m${text}\u001b[39m`,
  sticky: (text: string) => text,
  quietSticky: (text: string) => text,
  bottomControl: (text: string) => text,
  selection: (line: string, from: number, to: number) => backgroundSgrSpan(line, from, to, "\u001b[48;2;38;79;120m"),
};

function fixture(width: number, appearance: "auto" | "always" | "hidden", style: "thin" | "thick", suffix = "Z", styled = true) {
  const viewport = new TranscriptViewport();
  viewport.setConfig({ scrollbarAppearance: appearance, scrollbarStyle: style });
  const contentWidth = appearance === "hidden" ? width : Math.max(1, width - 1);
  const plain = "a".repeat(Math.max(0, contentWidth - displayWidth(suffix))) + suffix;
  // Rationale: boundary-local styling and OSC 8 expose state leaks into the neighboring gutter.
  const row = styled ? `\u001b[48;2;11;22;33m${plain.slice(0, -suffix.length)}\u001b[1;3;4m\u001b]8;;https://example.com\u001b\\${suffix}\u001b]8;;\u001b\\\u001b[0m` : plain;
  const input = { documentRows: Array.from({ length: 12 }, () => row), dockRows: [], promptAnchors: [], width, height: 5, theme };
  const compose = (now = 100) => viewport.compose({ ...input, now });
  compose();
  return { viewport, compose, plain, contentWidth };
}

describe("truthful selection beside the scrollbar gutter", () => {
  it.each(["auto", "always", "hidden"] as const)("reaches the final content cell with %s rails", appearance => {
    const { viewport, compose, plain, contentWidth } = fixture(12, appearance, "thin");
    viewport.pressSelection(1, 2, 100);
    viewport.extendSelection(contentWidth, 4, 101, false);
    viewport.releaseSelection();
    compose();
    expect(viewport.selectedText()).toBe([plain, plain, plain].join("\n"));
  });

  it.each(["auto", "always", "hidden"] as const)("preserves reverse and whole-row endpoints with %s rails", appearance => {
    const { viewport, compose, plain, contentWidth } = fixture(12, appearance, "thick");
    viewport.pressSelection(1, 4, 100);
    viewport.extendSelection(contentWidth, 2, 101, false);
    viewport.releaseSelection();
    expect(viewport.selectedText()).toBe(`Z\n${plain}\na`);
    viewport.clearSelection();
    for (const time of [1000, 1001, 1002]) {
      viewport.pressSelection(2, 4, time);
      if (time < 1002) viewport.releaseSelection();
    }
    viewport.extendSelection(contentWidth, 2, 1003, false);
    viewport.releaseSelection();
    compose();
    expect(viewport.selectedText()).toBe([plain, plain, plain].join("\n"));
  });

  it.each([4, 12, 192])("keeps content and gutter cells truthful at width %i", async width => {
    for (const appearance of ["auto", "always", "hidden"] as const) {
      for (const style of ["thin", "thick"] as const) {
        for (const suffix of ["Z", "e\u0301", "界"]) {
          for (const included of [false, true]) {
            for (const styled of [false, true]) {
              const { viewport, compose, plain, contentWidth } = fixture(width, appearance, style, suffix, styled);
              const suffixWidth = displayWidth(suffix);
              viewport.pressSelection(1, 2, 100);
              viewport.extendSelection(included ? contentWidth : contentWidth - suffixWidth, 4, 101, false);
              viewport.releaseSelection();
              const copy = [plain, plain, included ? plain : plain.slice(0, -suffix.length)].join("\n");
              expect(viewport.selectedText()).toBe(copy);
              const revision = viewport.selectionRevision;
              const terminal = new HeadlessXterm.Terminal({ cols: width, rows: 5, allowProposedApi: true, scrollback: 0 });
              const writes: TimedTerminalWrite[] = [];
              let previous: readonly string[] = [];
              let now = 100;
              try {
                for (let cycle = 0; cycle < 2; cycle++) {
                  for (const state of ["hidden", "active", "hover", "normal", "hidden"] as const) {
                    now += state === "hidden" ? 1000 : 1;
                    if (state === "active") viewport.noteScrollActivity(now);
                    viewport.setRailHovered(state === "hover");
                    for (let repeat = 0; repeat < 2; repeat++) {
                      const result = compose(now);
                      if (repeat === 1) expect(result.selectionDamage.recomputedRows).toEqual([]);
                      if (previous.length > 0) expect(result.selectionDamage.reusedRows).toContain(1);
                      expect(result.descriptor.selectionRevision).toBe(revision);
                      expect(viewport.selectedText()).toBe(copy);
                      const data = result.rows.map((row, index) => previous[index] === row ? "" : `\u001b[${index + 1};1H\u001b[0m\u001b[2K${row}`).join("");
                      if (data) {
                        writes.push({ data, atMs: writes.length });
                        await new Promise<void>(resolve => terminal.write(data, resolve));
                      }
                      previous = result.rows;
                      const visible = appearance === "always" || (appearance === "auto" && state !== "hidden");
                      for (const row of [1, 2, 3]) {
                        const sourceColumn = contentWidth - suffixWidth;
                        const sourceCell = terminal.buffer.active.getLine(row)!.getCell(sourceColumn)!;
                        const selected = row < 3 || included;
                        expect(sourceCell.isBgDefault()).toBe(!selected && !styled);
                        if (selected || styled) expect(sourceCell.getBgColor()).toBe(selected ? SELECTED : SOURCE);
                        if (appearance !== "hidden") {
                          const gutter = terminal.buffer.active.getLine(row)!.getCell(width - 1)!;
                          expect(gutter.isBgDefault()).toBe(!selected && !styled);
                          if (selected || styled) expect(gutter.getBgColor()).toBe(selected ? SELECTED : SOURCE);
                          expect(visible ? (style === "thick" ? ["┃"] : ["│", "┃"]) : [" "]).toContain(gutter.getChars() || " ");
                          expect(gutter.isBold()).toBe(0);
                          expect(gutter.isItalic()).toBe(0);
                          expect(gutter.isUnderline()).toBe(0);
                          expect(hyperlinkTargetAtColumn(result.rows[row]!, width - 1)).toBeUndefined();
                        }
                      }
                    }
                  }
                }
                const paint = classifyTerminalPaint(writes);
                expect(paint.fullScreenClears).toBe(0);
                expect(paint.addressedRowWrites.filter(row => row === 1)).toHaveLength(1);
              } finally { terminal.dispose(); }
            }
          }
        }
      }
    }
  }, 30_000);

  it.each([false, true])("extends only boundary-reaching selection beneath the rail (included=%s)", async included => {
    const { viewport, compose, contentWidth } = fixture(12, "always", "thin");
    viewport.pressSelection(1, 2, 100);
    viewport.extendSelection(included ? contentWidth : contentWidth - 1, 2, 101, false);
    viewport.releaseSelection();
    const terminal = new HeadlessXterm.Terminal({ cols: 12, rows: 5, allowProposedApi: true });
    try {
      await new Promise<void>(resolve => terminal.write(compose().rows.map((row, index) => `\u001b[${index + 1};1H\u001b[0m${row}`).join(""), resolve));
      const content = terminal.buffer.active.getLine(1)!.getCell(contentWidth - 1)!;
      const gutter = terminal.buffer.active.getLine(1)!.getCell(11)!;
      expect(content.getBgColor()).toBe(included ? SELECTED : SOURCE);
      expect(gutter.getBgColor()).toBe(included ? SELECTED : SOURCE);
      expect(gutter.getChars()).toBe("│");
      expect(viewport.selectedText()).toBe(included ? "aaaaaaaaaaZ" : "aaaaaaaaaa");
      expect(hyperlinkTargetAtColumn(compose().rows[1]!, 11)).toBeUndefined();
    } finally { terminal.dispose(); }
  });
});
