import { describe, expect, it } from "vitest";
import type { ProgressSpinnerStyle } from "../../../src/contracts/presentation/index.js";
import { displayWidth, isProgressSpinnerStyle, progressSpinnerFrame, PROGRESS_SPINNER_INTERVAL_MS } from "../../../src/ui/components/index.js";

const choices: ReadonlyArray<readonly [ProgressSpinnerStyle, readonly string[]]> = [
  ["none", [""]],
  ["current", ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]],
  ["circle", ["◐", "◓", "◑", "◒"]],
  ["diamond", ["◇", "◈", "◆", "◈"]],
  ["square", ["◧", "◩", "◨", "◪"]],
];

describe("owned progress spinner frames", () => {
  it.each(choices)("keeps %s frames and their label position stable", (style, expected) => {
    expect(isProgressSpinnerStyle(style)).toBe(true);
    for (let phase = 0; phase < expected.length * 3; phase++) {
      const frame = progressSpinnerFrame(style, phase);
      expect(frame).toBe(expected[phase % expected.length]);
      expect(displayWidth(frame)).toBe(style === "none" ? 0 : 1);
      expect(`${frame}${frame ? " " : ""}Working…`.indexOf("Working")).toBe(style === "none" ? 0 : 2);
    }
    for (const phase of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(progressSpinnerFrame(style, phase)).toBe(expected[0]);
    }
  });

  it("preserves the loader's current glyph and cadence instead of replacing them", () => {
    expect(PROGRESS_SPINNER_INTERVAL_MS).toBe(80);
    expect(progressSpinnerFrame("current", 42, "loader-frame")).toBe("loader-frame");
    expect(progressSpinnerFrame("circle", 0, "loader-frame")).toBe("◐");
    expect(progressSpinnerFrame("none", 0, "loader-frame")).toBe("");
  });

  it.each([undefined, null, true, 1, "dots", "__proto__", "toString"])("rejects unsupported style %s", value => {
    expect(isProgressSpinnerStyle(value)).toBe(false);
  });
});
