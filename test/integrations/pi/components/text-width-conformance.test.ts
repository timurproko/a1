import { visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { displayWidth, padToWidth, truncateToWidth } from "../../../../src/ui/components/index.js";

// Invariant: literal widths keep the independent producer from hiding a shared fixture error.
const WIDTHS = [
  ["🖼", 1], ["🖥", 1], ["🖨", 1], ["🖊", 1], ["🗂", 1], ["🏳", 1],
  ["🖼🖼🖼", 3], ["[🖼 filename.png #id]", 20],
  ["🖼️", 2], ["🖥️", 2], ["🖨️", 2], ["🖼︎", 1], ["🖨︎", 1],
  ["🖨🖨🖨", 3], ["a🖼︎🖨︎z", 4], ["a🖼️🖨️z", 6],
  ["📷", 2], ["📄", 2], ["🧪", 2], ["⚡", 2], ["🚀", 2],
  ["📷\uFE0E", 2], ["🧪\uFE0E", 2], ["⚡\uFE0E", 2], ["🚀\uFE0E", 2],
  ["👩‍💻", 2], ["🇺🇸", 2], ["界", 2], ["e\u0301", 1],
] as const;

describe("shared text geometry against pinned Pi", () => {
  it.each(WIDTHS)("keeps %s at %i columns through styled composition", (symbol, width) => {
    for (const text of [symbol, `\u001b[31m${symbol}\u001b[0m`]) {
      expect(visibleWidth(text)).toBe(width);
      expect(displayWidth(text)).toBe(width);
      const padded = padToWidth(text, width + 3);
      expect(padded).toBe(`${text}   `);
      expect(visibleWidth(padded)).toBe(width + 3);
      const clipped = truncateToWidth(`${text}suffix`, width + 1);
      expect(visibleWidth(clipped)).toBe(width + 1);
      expect(displayWidth(clipped)).toBe(width + 1);
    }
  });
});
