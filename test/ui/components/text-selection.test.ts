import { describe, expect, it } from "vitest";
import {
  extendTextSelection,
  orderedTextSelection,
  pressTextSelection,
  releaseTextSelection,
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

  it("extends an LMB drag across ANSI-styled rows", () => {
    const pressed = pressTextSelection({ line: 0, column: 2, contentWidth: 20, lineText: "\u001b[31malpha\u001b[39m", now: 1_000 });
    const extended = extendTextSelection(pressed.selection, { line: 1, column: 3 });
    const released = orderedTextSelection(releaseTextSelection(extended));
    expect(textSelectionText(released!, ["\u001b[31malpha\u001b[39m", "beta"])).toBe("lpha\nbet");
  });
});
