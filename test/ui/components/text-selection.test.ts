import { describe, expect, it } from "vitest";
import {
  extendTextSelection,
  orderedTextSelection,
  pressTextSelection,
  releaseTextSelection,
  textSelectionPointAt,
  textSelectionText,
  usefulTextLineContent,
} from "../../../src/ui/components/index.js";

describe("text selection", () => {
  it("cycles LMB through point, word, line, then point", () => {
    const first = pressTextSelection({ line: 0, column: 2, contentWidth: 20, lineText: "alpha, beta", now: 1_000 });
    expect(first.kind).toBe("point");
    expect(orderedTextSelection(releaseTextSelection(first.selection))).toBeUndefined();

    const second = pressTextSelection({
      line: 0, column: 2, contentWidth: 20, lineText: "alpha, beta", previousClick: first.click, now: 1_100,
    });
    expect(second.kind).toBe("word");
    expect(textSelectionText(orderedTextSelection(releaseTextSelection(second.selection))!, ["alpha, beta"])).toBe("alpha");

    const third = pressTextSelection({
      line: 0,
      column: 2,
      contentWidth: 20,
      lineText: "❯ alpha, beta       11:45",
      lineContent: usefulTextLineContent("❯ alpha, beta", 3),
      previousClick: second.click,
      now: 1_200,
    });
    expect(third.kind).toBe("line");
    expect(textSelectionText(orderedTextSelection(releaseTextSelection(third.selection))!, ["❯ alpha, beta       11:45"], () => ({ from: 3, to: 14 }))).toBe("alpha, beta");

    const fourth = pressTextSelection({
      line: 0, column: 2, contentWidth: 20, lineText: "alpha, beta", previousClick: third.click, now: 1_300,
    });
    expect(fourth.kind).toBe("point");
  });

  it("includes the pointer endpoint across ANSI-styled rows", () => {
    const pressed = pressTextSelection({ line: 0, column: 2, contentWidth: 20, lineText: "\u001b[31malpha\u001b[39m", now: 1_000 });
    const extended = extendTextSelection(pressed.selection, { line: 1, column: 3 });
    const released = orderedTextSelection(releaseTextSelection(extended));
    expect(released).toMatchObject({ start: { line: 0, column: 1 }, end: { line: 1, column: 3 } });
    expect(textSelectionText(released!, ["\u001b[31malpha\u001b[39m", "beta"])).toBe("lpha\nbet");
  });

  it.each([
    [3, 2, "bc"],
    [3, 4, "cd"],
    [2, 3, "bc"],
    [4, 3, "cd"],
  ] as const)("includes both adjacent cells from %i to %i", (anchor, head, expected) => {
    const pressed = pressTextSelection({ line: 0, column: anchor, contentWidth: 5, lineText: "abcde", now: 1_000 });
    const selection = extendTextSelection(pressed.selection, textSelectionPointAt(0, head, "abcde"));
    const ordered = orderedTextSelection(releaseTextSelection(selection))!;
    expect(ordered).toEqual({
      start: { line: 0, column: Math.min(anchor, head) - 1 },
      end: { line: 0, column: Math.max(anchor, head) },
    });
    expect(textSelectionText(ordered, ["abcde"])).toBe(expected);
  });

  it("keeps an unextended press empty, including repeated reports at the press cell", () => {
    const pressed = pressTextSelection({ line: 0, column: 3, contentWidth: 5, lineText: "abcde", now: 1_000 });
    let selection = pressed.selection;
    for (let report = 0; report < 3; report += 1) {
      selection = extendTextSelection(selection, textSelectionPointAt(0, 3, "abcde"));
      expect(selection).toBe(pressed.selection);
      expect(orderedTextSelection(selection)).toBeUndefined();
    }
    expect(releaseTextSelection(selection)).toBeUndefined();
  });

  it.each([
    [[2, "bc"], [3, "c"], [4, "cd"], [3, "c"]],
    [[4, "cd"], [3, "c"], [2, "bc"], [3, "c"]],
  ] as const)("retains the anchor through a reversal sequence %j", (...steps) => {
    const pressed = pressTextSelection({ line: 0, column: 3, contentWidth: 5, lineText: "abcde", now: 1_000 });
    let selection = pressed.selection;
    for (const [column, expected] of steps) {
      selection = extendTextSelection(selection, textSelectionPointAt(0, column, "abcde"));
      expect(selection?.anchor).toBe(pressed.selection?.anchor);
      expect(selection?.head.column).toBe(column);
      expect(textSelectionText(orderedTextSelection(selection)!, ["abcde"])).toBe(expected);
      expect(extendTextSelection(selection, textSelectionPointAt(0, column, "abcde"))).toBe(selection);
    }
    const released = releaseTextSelection(selection);
    expect(released).toMatchObject({ selecting: false, dragged: true });
    expect(orderedTextSelection(released)).toEqual({ start: { line: 0, column: 2 }, end: { line: 0, column: 3 } });
    expect(textSelectionText(orderedTextSelection(released)!, ["abcde"])).toBe("c");
    expect(extendTextSelection(released, textSelectionPointAt(0, 5, "abcde"))).toBe(released);
  });

  it("preserves the moving endpoint when reversing without reporting the anchor cell", () => {
    const pressed = pressTextSelection({ line: 0, column: 3, contentWidth: 5, lineText: "abcde", now: 1_000 });
    const forward = extendTextSelection(pressed.selection, textSelectionPointAt(0, 5, "abcde"));
    expect(textSelectionText(orderedTextSelection(forward)!, ["abcde"])).toBe("cde");
    const reversed = extendTextSelection(forward, textSelectionPointAt(0, 1, "abcde"));
    expect(reversed?.head.column).toBe(1);
    expect(textSelectionText(orderedTextSelection(reversed)!, ["abcde"])).toBe("abc");
  });

  it.each([
    ["界", 2],
    ["e\u0301", 1],
    ["👩‍💻", 2],
  ] as const)("keeps %s atomic at either inclusive endpoint and on return", (grapheme, width) => {
    const text = `a${grapheme}z`;
    for (const anchor of [2, width + 1]) {
      const pressed = pressTextSelection({ line: 0, column: anchor, contentWidth: width + 2, lineText: text, now: 1_000 });
      let selection = pressed.selection;
      for (const [column, from, to, expected] of [
        [1, 0, width + 1, `a${grapheme}`],
        [anchor, 1, width + 1, grapheme],
        [width + 2, 1, width + 2, `${grapheme}z`],
        [anchor, 1, width + 1, grapheme],
      ] as const) {
        selection = extendTextSelection(selection, textSelectionPointAt(0, column, text));
        const ordered = orderedTextSelection(selection)!;
        expect(ordered).toEqual({ start: { line: 0, column: from }, end: { line: 0, column: to } });
        expect(textSelectionText(ordered, [text])).toBe(expected);
      }
      expect(textSelectionText(orderedTextSelection(releaseTextSelection(selection))!, [text])).toBe(grapheme);
    }
  });

  it.each([[1, 2], [2, 1]] as const)("selects one wide grapheme with distinct intra-grapheme motion %i to %i", (anchor, head) => {
    const pressed = pressTextSelection({ line: 0, column: anchor, contentWidth: 3, lineText: "界a", now: 1_000 });
    const selection = extendTextSelection(pressed.selection, textSelectionPointAt(0, head, "界a"));
    const ordered = orderedTextSelection(releaseTextSelection(selection))!;
    expect(ordered).toEqual({ start: { line: 0, column: 0 }, end: { line: 0, column: 2 } });
    expect(textSelectionText(ordered, ["界a"])).toBe("界");
  });

  it.each([
    [2, 3, "bcd\nefg"],
    [1, 4, "abcd\nefgh"],
  ] as const)("normalizes inclusive multiline endpoints %i and %i in either direction", (first, last, expected) => {
    const rows = ["abcd", "efgh"];
    const forwardPress = pressTextSelection({ line: 0, column: first, contentWidth: 4, lineText: rows[0]!, now: 1_000 });
    const forward = orderedTextSelection(releaseTextSelection(extendTextSelection(
      forwardPress.selection,
      textSelectionPointAt(1, last, rows[1]!),
    )))!;
    const reversePress = pressTextSelection({ line: 1, column: last, contentWidth: 4, lineText: rows[1]!, now: 2_000 });
    const reverse = orderedTextSelection(releaseTextSelection(extendTextSelection(
      reversePress.selection,
      textSelectionPointAt(0, first, rows[0]!),
    )))!;
    expect(forward).toEqual({ start: { line: 0, column: first - 1 }, end: { line: 1, column: last } });
    expect(reverse).toEqual(forward);
    expect(textSelectionText(forward, rows)).toBe(expected);
    expect(textSelectionText(reverse, rows)).toBe(expected);
  });
});
