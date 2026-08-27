import { describe, expect, it } from "vitest";
import { displayColumnSlice, displayWidth, displayWordColumnRange, padToWidth, stripAnsi, truncateToWidth } from "../../../src/ui/components/index.js";

const RESET = "[0m";
const RED = "[31m";

describe("display width", () => {
  it("counts ordinary text by character", () => {
    expect(displayWidth("")).toBe(0);
    expect(displayWidth("hello")).toBe(5);
  });

  it("counts CJK and fullwidth forms as two columns", () => {
    expect(displayWidth("界")).toBe(2);
    expect(displayWidth("世界")).toBe(4);
    expect(displayWidth("한글")).toBe(4);
    expect(displayWidth("ＡＢ")).toBe(4);
  });

  it("counts combining marks and variation selectors as zero", () => {
    expect(displayWidth("é")).toBe(1);
    expect(displayWidth("à́̂")).toBe(1);
    expect(displayWidth("​")).toBe(0);
  });

  it("counts an emoji sequence joined by a zero-width joiner once", () => {
    expect(displayWidth("👩")).toBe(2);
    expect(displayWidth("👩‍💻")).toBe(2);
  });

  it("ignores styling escapes", () => {
    expect(displayWidth(`${RED}red${RESET}`)).toBe(3);
    expect(stripAnsi(`${RED}red${RESET}`)).toBe("red");
  });

  it("slices ANSI text on grapheme-aligned display columns", () => {
    expect(displayColumnSlice(`${RED}a界b${RESET}`, 2, 3)).toEqual({ from: 1, to: 3, text: "界" });
    expect(displayColumnSlice("👩‍💻x", 0, 1)).toEqual({ from: 0, to: 2, text: "👩‍💻" });
  });

  it("finds the visible word segment under a pointer column", () => {
    expect(displayWordColumnRange(`${RED}one two${RESET}`, 5)).toEqual({ from: 4, to: 7 });
    expect(displayWordColumnRange("one two", 20)).toBeNull();
  });
});

describe("truncating to width", () => {
  it("returns the text unchanged when it already fits", () => {
    expect(truncateToWidth("hello", 5)).toBe("hello");
    expect(truncateToWidth("hello", 9)).toBe("hello");
  });

  it("returns nothing for a non-positive budget", () => {
    expect(truncateToWidth("hello", 0)).toBe("");
    expect(truncateToWidth("hello", -3)).toBe("");
  });

  it("never splits a wide character", () => {
    expect(truncateToWidth("世界", 3)).toBe("世");
    expect(displayWidth(truncateToWidth("世界", 3))).toBeLessThanOrEqual(3);
    expect(truncateToWidth("世界", 4)).toBe("世界");
  });

  it("keeps a combining mark with its base character", () => {
    expect(truncateToWidth("éx", 1)).toBe("é");
  });

  it("closes the style it opened", () => {
    const truncated = truncateToWidth(`${RED}abcdef`, 3);
    expect(displayWidth(truncated)).toBe(3);
    expect(truncated.endsWith(RESET)).toBe(true);
    expect(truncated).toContain(RED);
  });

  it("leaves unstyled text without a reset", () => {
    expect(truncateToWidth("abcdef", 3)).toBe("abc");
  });
});

describe("padding to width", () => {
  it("pads short text to exactly the width", () => {
    expect(padToWidth("ab", 5)).toBe("ab   ");
    expect(displayWidth(padToWidth("世", 5))).toBe(5);
  });

  it("truncates text that is already wider", () => {
    expect(padToWidth("abcdef", 3)).toBe("abc");
  });

  it("returns nothing for a non-positive width", () => {
    expect(padToWidth("abc", 0)).toBe("");
  });
});
