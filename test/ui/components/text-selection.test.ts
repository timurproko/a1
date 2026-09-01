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

  it("uses the pointer-near boundary across ANSI-styled rows", () => {
    const pressed = pressTextSelection({ line: 0, column: 2, contentWidth: 20, lineText: "\u001b[31malpha\u001b[39m", now: 1_000 });
    const extended = extendTextSelection(pressed.selection, { line: 1, column: 3 });
    const released = orderedTextSelection(releaseTextSelection(extended));
    expect(released).toMatchObject({ start: { line: 0, column: 1 }, end: { line: 1, column: 2 } });
    expect(textSelectionText(released!, ["\u001b[31malpha\u001b[39m", "beta"])).toBe("lpha\nbe");
  });

  it("selects exactly one grapheme with the smallest forward or reverse drag", () => {
    const forwardPress = pressTextSelection({ line: 0, column: 2, contentWidth: 4, lineText: "abcd", now: 1_000 });
    const forward = orderedTextSelection(releaseTextSelection(extendTextSelection(
      forwardPress.selection,
      textSelectionPointAt(0, 3, "abcd"),
    )));
    expect(forward).toMatchObject({ start: { line: 0, column: 1 }, end: { line: 0, column: 2 } });
    expect(textSelectionText(forward!, ["abcd"])).toBe("b");

    const reversePress = pressTextSelection({ line: 0, column: 2, contentWidth: 4, lineText: "abcd", now: 2_000 });
    const reverse = orderedTextSelection(releaseTextSelection(extendTextSelection(
      reversePress.selection,
      textSelectionPointAt(0, 1, "abcd"),
    )));
    expect(reverse).toEqual(forward);
    expect(textSelectionText(reverse!, ["abcd"])).toBe("b");
  });

  it("keeps an unextended press empty and preserves the active end across reversal", () => {
    const pressed = pressTextSelection({ line: 0, column: 3, contentWidth: 5, lineText: "abcde", now: 1_000 });
    expect(orderedTextSelection(releaseTextSelection(pressed.selection))).toBeUndefined();

    const forward = extendTextSelection(pressed.selection, textSelectionPointAt(0, 5, "abcde"));
    expect(textSelectionText(orderedTextSelection(forward)!, ["abcde"])).toBe("cd");
    const reversed = extendTextSelection(forward, textSelectionPointAt(0, 1, "abcde"));
    expect(reversed?.head.column).toBe(1);
    expect(textSelectionText(orderedTextSelection(reversed)!, ["abcde"])).toBe("bc");
  });

  it("keeps wide and combining graphemes atomic for paint and copy bounds", () => {
    const widePress = pressTextSelection({ line: 0, column: 1, contentWidth: 3, lineText: "界a", now: 1_000 });
    const wide = orderedTextSelection(releaseTextSelection(extendTextSelection(
      widePress.selection,
      textSelectionPointAt(0, 3, "界a"),
    )));
    expect(wide).toMatchObject({ start: { line: 0, column: 0 }, end: { line: 0, column: 2 } });
    expect(textSelectionText(wide!, ["界a"])).toBe("界");

    const combinedText = "e\u0301x";
    const combinedPress = pressTextSelection({ line: 0, column: 1, contentWidth: 2, lineText: combinedText, now: 2_000 });
    const combined = orderedTextSelection(releaseTextSelection(extendTextSelection(
      combinedPress.selection,
      textSelectionPointAt(0, 2, combinedText),
    )));
    expect(combined).toMatchObject({ start: { line: 0, column: 0 }, end: { line: 0, column: 1 } });
    expect(textSelectionText(combined!, [combinedText])).toBe("e\u0301");
  });

  it("normalizes equivalent forward and reverse multiline ranges", () => {
    const rows = ["abcd", "efgh"];
    const forwardPress = pressTextSelection({ line: 0, column: 2, contentWidth: 4, lineText: rows[0]!, now: 1_000 });
    const forward = orderedTextSelection(releaseTextSelection(extendTextSelection(
      forwardPress.selection,
      textSelectionPointAt(1, 3, rows[1]!),
    )))!;
    const reversePress = pressTextSelection({ line: 1, column: 2, contentWidth: 4, lineText: rows[1]!, now: 2_000 });
    const reverse = orderedTextSelection(releaseTextSelection(extendTextSelection(
      reversePress.selection,
      textSelectionPointAt(0, 1, rows[0]!),
    )))!;
    expect(textSelectionText(forward, rows)).toBe("bcd\nef");
    expect(textSelectionText(reverse, rows)).toBe("bcd\nef");
  });
});
