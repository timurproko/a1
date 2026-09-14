import HeadlessXterm from "@xterm/headless";
import { describe, expect, it } from "vitest";
import { backgroundSgrSpan, displayWidth, hyperlinkTargetAtColumn, TranscriptViewport } from "../../../src/ui/components/index.js";
import { classifyTerminalPaint, type TimedTerminalWrite } from "../../support/rendering/terminal-paint-evidence.js";

// Compatibility: mirror the shell's background-preserving rail reset, not an SGR 0 test theme.
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
  const plain = "a".repeat(width - displayWidth(suffix)) + suffix;
  // Rationale: boundary-local styling and OSC 8 expose inherited-state leaks that preceding styles alone miss.
  const row = styled ? `\u001b[48;2;11;22;33m${plain.slice(0, -suffix.length)}\u001b[1;3;4m\u001b]8;;https://example.com\u001b\\${suffix}\u001b]8;;\u001b\\\u001b[0m` : plain;
  const input = { documentRows: Array.from({ length: 12 }, () => row), dockRows: [], promptAnchors: [], width, height: 5, theme };
  const compose = (now = 100) => viewport.compose({ ...input, now });
  compose();
  return { viewport, compose, plain };
}

describe("truthful selection at the scrollbar edge", () => {
  it.each(["auto", "always", "hidden"] as const)("reaches the endpoint source cell with %s rails", appearance => {
    const { viewport, compose, plain } = fixture(12, appearance, "thin");
    viewport.pressSelection(1, 2, 100);
    viewport.extendSelection(12, 4, 101, false);
    viewport.releaseSelection();
    compose();
    expect(viewport.selectedText()).toBe([plain, plain, plain].join("\n"));
  });

  it.each(["auto", "always", "hidden"] as const)("preserves reverse and whole-row endpoints with %s rails", appearance => {
    const { viewport, compose, plain } = fixture(12, appearance, "thick");
    viewport.pressSelection(1, 4, 100);
    viewport.extendSelection(12, 2, 101, false);
    viewport.releaseSelection();
    expect(viewport.selectedText()).toBe(`Z\n${plain}\na`);
    viewport.clearSelection();
    for (const time of [1000, 1001, 1002]) {
      viewport.pressSelection(2, 4, time);
      if (time < 1002) viewport.releaseSelection();
    }
    viewport.extendSelection(12, 2, 1003, false);
    viewport.releaseSelection();
    compose();
    expect(viewport.selectedText()).toBe([plain, plain, plain].join("\n"));
  });

  it.each([3, 12, 192])("keeps first-transition and cached terminal cells truthful at width %i", async width => {
    for (const appearance of ["auto", "always", "hidden"] as const) {
      for (const style of ["thin", "thick"] as const) {
        for (const suffix of ["Z", "e\u0301", "界"]) {
          for (const included of [false, true]) {
            for (const styled of [false, true]) {
              const { viewport, compose, plain } = fixture(width, appearance, style, suffix, styled);
              viewport.pressSelection(1, 2, 100);
              viewport.extendSelection(included ? width : width - displayWidth(suffix), 4, 101, false);
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
                        // Protocol: wide glyphs have a continuation cell; inspect their leading cell on hide.
                        const column = visible ? width - 1 : width - displayWidth(suffix);
                        const cell = terminal.buffer.active.getLine(row)!.getCell(column)!;
                        const selected = row < 3 || included;
                        expect(cell.isBgDefault()).toBe(!selected && !styled);
                        if (selected || styled) expect(cell.getBgColor()).toBe(selected ? SELECTED : SOURCE);
                        if (visible) {
                          expect(style === "thick" ? ["┃"] : ["│", "┃"]).toContain(cell.getChars());
                          expect(cell.isBold()).toBe(0);
                          expect(cell.isItalic()).toBe(0);
                          expect(cell.isUnderline()).toBe(0);
                          expect(hyperlinkTargetAtColumn(result.rows[row]!, width - 1)).toBeUndefined();
                        } else expect(cell.getChars()).toBe(suffix);
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

  it.each([false, true])("paints the replaced background when final-cell membership is %s", async included => {
    const { viewport, compose } = fixture(12, "auto", "thin");
    // Rationale: full-row selection isolates composition from the ordinary drag-clamp defect.
    viewport.pressSelection(1, 2, 100);
    if (included) {
      viewport.releaseSelection();
      viewport.pressSelection(1, 2, 101);
      viewport.releaseSelection();
      viewport.pressSelection(1, 2, 102);
    } else viewport.extendSelection(11, 2, 101, false);
    viewport.releaseSelection();
    viewport.setRailHovered(true);
    const terminal = new HeadlessXterm.Terminal({ cols: 12, rows: 5, allowProposedApi: true });
    try {
      await new Promise<void>(resolve => terminal.write(compose().rows.map((row, index) => `\u001b[${index + 1};1H\u001b[0m${row}`).join(""), resolve));
      const cell = terminal.buffer.active.getLine(1)!.getCell(11)!;
      expect(cell.getBgColor()).toBe(included ? SELECTED : SOURCE);
      expect(cell.isBold()).toBe(0);
      expect(cell.isItalic()).toBe(0);
      expect(cell.isUnderline()).toBe(0);
      expect(hyperlinkTargetAtColumn(compose().rows[1]!, 11)).toBeUndefined();
    } finally { terminal.dispose(); }
  });
});
