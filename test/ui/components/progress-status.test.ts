import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import { progressStatusFrame, progressStatusText } from "../../../src/ui/components/index.js";

const styles = {
  muted: (text: string) => `\u001b[90m${text}\u001b[39m`,
  highlight: (text: string) => `\u001b[37m${text}\u001b[39m`,
};

describe("progress status presentation", () => {
  it.each([
    ["Working", "Working…"],
    ["Compacting…", "Compacting…"],
    ["Retrying.", "Retrying…"],
    ["Indexing......", "Indexing…"],
    ["Already...", "Already…"],
    ["Keeps… interior text", "Keeps… interior text…"],
    ["Keeps.periods.inside", "Keeps.periods.inside…"],
  ])("normalizes %j to one Unicode progress marker", (input, expected) => {
    const rendered = progressStatusText(input);
    expect(rendered).toBe(expected);
    expect(rendered.endsWith("…")).toBe(true);
    expect(rendered.endsWith("...")).toBe(false);
  });

  it("retains the pinned three-period marker when explicitly selected", () => {
    expect(progressStatusText("Working…", "...")).toBe("Working...");
  });

  it("moves a two-grapheme highlight every third update and pauses for one pass", () => {
    const highlight = vi.fn(styles.highlight);
    const frame = (phase: number) => progressStatusFrame("ABCDEFG…", phase, { ...styles, highlight });

    expect(stripTerminalSequences(frame(0))).toBe("ABCDEFG…");
    expect(highlight).toHaveBeenLastCalledWith("AB");
    frame(2);
    expect(highlight).toHaveBeenLastCalledWith("AB");
    frame(3);
    expect(highlight).toHaveBeenLastCalledWith("BC");
    frame(18);
    expect(highlight).toHaveBeenLastCalledWith("G");

    highlight.mockClear();
    for (const phase of [21, 24, 39]) {
      const paused = frame(phase);
      expect(stripTerminalSequences(paused)).toBe("ABCDEFG…");
      expect(highlight).not.toHaveBeenCalled();
    }
    frame(42);
    expect(highlight).toHaveBeenLastCalledWith("AB");
  });

  it("keeps the ellipsis muted and every frame text- and width-stable", () => {
    const expected = "Working…";
    for (let phase = 0; phase < 48; phase += 1) {
      const rendered = progressStatusFrame(expected, phase, styles);
      expect(stripTerminalSequences(rendered)).toBe(expected);
      expect(visibleWidth(rendered)).toBe(visibleWidth(expected));
      expect(rendered).toMatch(/\u001b\[90m[^\u001b]*…\u001b\[39m$/u);
    }
  });

  it.each([
    ["A界B…", "界"],
    ["Ae\u0301B…", "e\u0301"],
    ["A👩‍💻B…", "👩‍💻"],
  ])("styles complete graphemes in %j", (message, expectedGrapheme) => {
    const highlight = vi.fn((text: string) => text);
    const rendered = progressStatusFrame(message, 3, { muted: text => text, highlight });
    expect(rendered).toBe(message);
    expect(highlight.mock.calls[0]?.[0]).toContain(expectedGrapheme);
  });
});
