import HeadlessXterm from "@xterm/headless";
import { describe, expect, it } from "vitest";
import { visibleWidth } from "@earendil-works/pi-tui";
import { displayWidth, stripAnsi, truncateToWidth } from "../../../src/ui/components/text.js";
import { backgroundSgrSpan, hyperlinkSgrSpan, hyperlinkTargetAtColumn, overlaySpan } from "../../../src/ui/components/spans.js";
import { normalizeTranscriptRow } from "../../../src/ui/components/transcript-row.js";
import { presentationSourceSlice } from "../../../src/ui/components/presentation-source.js";
import { TranscriptViewport } from "../../../src/ui/components/transcript-viewport.js";

const ESC = "\u001b";
const RED = `${ESC}[31m`;
const RESET = `${ESC}[0m`;

describe("consistent and inert transcript row geometry", () => {
  it.each(["\u2060", "\u200b", "\u034f", "\u061c", "\u2066", "\u2069", "\u00ad", "\udb40\udc61"])("measures default-ignorable %j without advancing the gutter", format => {
    expect(displayWidth(`a${format}b`)).toBe(2);
    expect(displayWidth(`a${format}b`)).toBe(visibleWidth(`a${format}b`));
  });

  it.each([`❤${RED}\ufe0f`, `👩${RED}\u200d💻`, `e${RED}\u0301`, `🇺${RED}🇸`])("keeps style-interrupted cluster %j atomic", cluster => {
    const width = displayWidth(cluster);
    const line = `a${cluster}z${RESET}`;
    expect(stripAnsi(truncateToWidth(line, width))).toBe("a");
    expect(stripAnsi(truncateToWidth(line, width + 1))).toBe(`a${stripAnsi(cluster)}`);
    const replaced = overlaySpan(line, 1, width + 1, "X".repeat(width));
    expect(stripAnsi(replaced)).toBe(`a${"X".repeat(width)}z`);
    expect(replaced.slice(replaced.indexOf("X"))).toContain(RED);
    expect(displayWidth(overlaySpan(line, width + 1, width + 2, "┃"))).toBe(width + 2);
    const linked = hyperlinkSgrSpan(line, width + 1, width + 2, "https://example.com");
    expect(hyperlinkTargetAtColumn(linked, width + 1)).toBe("https://example.com");
    expect(hyperlinkTargetAtColumn(linked, 1)).toBeUndefined();
    expect(backgroundSgrSpan(line, width + 1, width + 2, `${ESC}[7m`, `${ESC}[27m`).replaceAll(RESET, ""))
      .toContain(`${ESC}[7mz`);
  });

  it.each(["\t", "\r", "\n", "\b", "\u0085", `${ESC}[2J`, `${ESC}[5C`, `${ESC}c`, `${ESC}[?7l`, `${ESC}]0;title\u0007`, `${ESC}Pqpayload${ESC}\\`, `${ESC}[`])("neutralizes control %j while retaining source copy", control => {
    const source = `a${control}b`;
    const safe = normalizeTranscriptRow(source);
    expect(normalizeTranscriptRow(safe)).toBe(safe);
    expect(stripAnsi(safe)).not.toMatch(/[\u0000-\u001f\u007f-\u009f]/u);
    expect(presentationSourceSlice(safe, 0, stripAnsi(safe).length)).toBe(source);
    if (control === "\t") expect(stripAnsi(safe)).toBe("a   b");
  });

  it("preserves supported styles, metadata, links, and image payloads without duplicating them", () => {
    const image = `${ESC}_Ga=T,f=100;AQID${ESC}\\`;
    const iterm = `${ESC}]1337;File=inline=1:AQID\u0007`;
    const linked = `${ESC}]8;;https://example.com${ESC}\\label${ESC}]8;;${ESC}\\`;
    const source = `${image}${RED}${linked}${RESET}${iterm}`;
    expect(normalizeTranscriptRow(source)).toBe(source);
    expect(normalizeTranscriptRow(`${ESC}]133;A\u0007${source}`)).toBe(source);
    expect(overlaySpan(`${image}abcdefgh`, 7, 8, "┃").split(image)).toHaveLength(2);
  });

  it.each(["Steering: a\u2060b", "Steering:\tx", "Steering: a\rb", "Steering: a\bb", `tool ${ESC}[4;1Hbad`, "Steering: a ⏎ next"])("paints %j in its own row and copies the original source", async source => {
    const viewport = new TranscriptViewport();
    viewport.setConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin" });
    const documentRows = ["first", source, "third", "fourth", "fifth", "sixth"];
    const compose = () => viewport.compose({ width: 64, height: 5, documentRows, dockRows: ["editor"], promptAnchors: [] });
    compose();
    viewport.scrollTo(0);
    const frame = compose();
    const screen = new HeadlessXterm.Terminal({ cols: 64, rows: 5, allowProposedApi: true });
    try {
      await new Promise<void>(resolve => screen.write(frame.rows.map((row, index) => `${ESC}[${index + 1};1H${row}`).join(""), resolve));
      for (const row of [1, 2, 3]) {
        expect(screen.buffer.active.getLine(row)!.getCell(63)!.getChars()).toBe("┃");
        expect(screen.buffer.active.getLine(row)!.translateToString(true).slice(0, -1)).not.toContain("┃");
      }
      expect(screen.buffer.active.getLine(4)!.translateToString(true)).toBe("editor");
      viewport.pressSelection(1, 2, 1000);
      viewport.extendSelection(63, 2, 1001, false);
      viewport.releaseSelection();
      expect(viewport.selectedText()).toBe(source);
      expect(compose().rows.every(row => displayWidth(row) <= 64)).toBe(true);
    } finally { screen.dispose(); }
  });
});
