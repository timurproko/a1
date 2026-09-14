import { describe, expect, it, vi } from "vitest";
import { EditorHyperlinkBudget, EDITOR_HYPERLINK_METADATA_BYTES } from "../../../../src/integrations/pi/session-ui/editor-hyperlink-budget.js";

import { PromptChipStore } from "../../../../src/integrations/pi/session-ui/prompt-chips.js";

const CLOSE = "\u001b]8;;\u001b\\";
const framingBytes = Buffer.byteLength(CLOSE) * 3;

describe("owned editor hyperlink metadata budget", () => {
  it("accounts exact opening, closing, and cleanup bytes before construction", () => {
    const budget = new EditorHyperlinkBudget();
    expect(budget.takeCleanup()).toBe(true);
    expect(budget.take("x".repeat(EDITOR_HYPERLINK_METADATA_BYTES - framingBytes))).toBe(true);
    expect(budget.takeCleanup()).toBe(false);
    expect(budget.take("x")).toBe(false);
    budget.reset();
    expect(budget.takeCleanup()).toBe(true);
    expect(budget.take("x".repeat(EDITOR_HYPERLINK_METADATA_BYTES - framingBytes + 1))).toBe(false);
    expect(budget.take("https://example.com/")).toBe(true);
  });

  it("uses UTF-8 byte limits for multibyte and replacement-surrogate targets", () => {
    const budget = new EditorHyperlinkBudget();
    const available = EDITOR_HYPERLINK_METADATA_BYTES - framingBytes;
    const target = "界".repeat(Math.floor(available / 3)) + "a".repeat(available % 3);
    expect(budget.takeCleanup()).toBe(true);
    expect(budget.take(target + "\ud800")).toBe(false);
    expect(budget.take(target)).toBe(true);
    expect(budget.takeCleanup()).toBe(false);
  });

  it("never byte-counts an oversized backing URL", () => {
    const target = "https://example.com/" + "x".repeat(16 * 1024 * 1024);
    const budget = new EditorHyperlinkBudget();
    const byteLength = vi.spyOn(Buffer, "byteLength");
    try {
      expect(budget.take(target)).toBe(false);
      expect(byteLength).not.toHaveBeenCalled();
    } finally { byteLength.mockRestore(); }
  });

  it("omits only presentation metadata, preserving atomic chips and exact expansion", async () => {
    const store = new PromptChipStore();
    const url = "https://example.com/" + "x".repeat(16 * 1024 * 1024 - 64);
    try {
      const chip = store.transformPastedContent({ kind: "text", text: url });
      const range = store.hyperlinkRanges(chip)[0]!;
      const budget = new EditorHyperlinkBudget();
      expect(budget.take(range.target)).toBe(false);
      expect(chip.length).toBeLessThan(80);
      expect(store.atomicRanges(chip)).toEqual([{ start: 0, end: chip.length }]);
      expect(store.expandCopiedText(chip) === url).toBe(true);
      expect(store.prepareHistoryText(chip) === url).toBe(true);
      expect(store.prepareSubmission(chip).text === url).toBe(true);
    } finally { await store.dispose(); }
  });

  it("counts repeated occurrences, admits smaller later links, and resets only per pass", () => {
    const budget = new EditorHyperlinkBudget();
    for (let pass = 0; pass < 3; pass++) {
      budget.reset();
      const target = "x".repeat(30_000);
      for (const expected of [true, true, false]) {
        expect(budget.takeCleanup()).toBe(true);
        expect(budget.take(target)).toBe(expected);
      }
      expect(budget.take("https://small.example/")).toBe(true);
    }
  });
});
