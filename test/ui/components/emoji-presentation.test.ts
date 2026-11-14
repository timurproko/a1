import { describe, expect, it } from "vitest";
import { displayWidth, emojiPresentation, stripAnsi, textSelectionText, TranscriptViewport } from "../../../src/ui/components/index.js";
import { selectionCopyRowText } from "../../../src/ui/components/selection-copy.js";

const all = { start: { line: 0, column: 0 }, end: { line: 0, column: Number.MAX_SAFE_INTEGER } };

describe("Unicode emoji presentation", () => {
  it("covers every supported text-default emoji base, not a replacement list", () => {
    let eligible = 0;
    for (let code = 0; code <= 0x10ffff; code++) {
      const text = String.fromCodePoint(code);
      if (!/^[\p{Emoji}&&\P{Emoji_Presentation}]$/v.test(text) || !/^\p{RGI_Emoji}$/v.test(`${text}\uFE0F`)) continue;
      eligible++;
      expect(emojiPresentation(text), `U+${code.toString(16)}`).toBe(`${text}\uFE0F`);
      expect(displayWidth(emojiPresentation(text))).toBe(2);
    }
    expect(eligible).toBeGreaterThan(200);
  });

  it.each(["📁 📄 📷 🔗 🟧", "➡\uFE0E ℹ\uFE0E 🖼\uFE0E", "➡️ ℹ️ 🖼️", "👩‍💻 👨‍👩‍👧‍👦 👍🏽 🇬🇧 1️⃣ #️⃣ *️⃣", "123 # * → ∑", "➡\u0301", "\u0600ℹ", "ℹ\u200D👩"])("preserves existing graphemes and intentional text: %s", text => {
    expect(emojiPresentation(text)).toBe(text);
  });

  it("copies added selectors back to source without deleting authored selectors", () => {
    const original = "➡ then ℹ️ then 🖼 then ➡\uFE0E";
    const rendered = emojiPresentation(original, true);
    expect(stripAnsi(rendered)).toBe("➡️ then ℹ️ then 🖼️ then ➡\uFE0E");
    expect(textSelectionText(all, [rendered])).toBe(original);
    expect(textSelectionText({ start: { line: 0, column: 1 }, end: { line: 0, column: 2 } }, [rendered])).toBe("➡");
    expect(selectionCopyRowText({ selection: all }, { text: rendered }, 0)).toBe(original);
  });

  it("keeps restored source aligned through viewport painting and snapshot copy", () => {
    const source = "➡ ℹ️ 🖼";
    const viewport = new TranscriptViewport();
    viewport.compose({ documentRows: [emojiPresentation(source, true)], dockRows: [], promptAnchors: [], width: 16, height: 1 });
    viewport.pressSelection(1, 1, 0);
    viewport.extendSelection(8, 1, 1, false);
    viewport.releaseSelection();
    expect(viewport.selectedText()).toBe(source);
    expect(viewport.captureSelectedText()?.rows).toEqual([{ text: source }]);
  });
});
