import { describe, expect, it } from "vitest";
import { displayWidth, overlaySpan, stripAnsi } from "../../../src/ui/components/index.js";

const ESC = String.fromCharCode(27);
const RED = `${ESC}[31m`;
const RESET = `${ESC}[0m`;
const BLUE = `${ESC}[34m`;

describe("overlaying a span on a rendered row", () => {
  it("replaces the named columns and keeps the rest", () => {
    expect(overlaySpan("abcdefgh", 2, 5, "XYZ")).toBe("abXYZfgh");
  });

  it("pads when the row is shorter than the span position", () => {
    expect(overlaySpan("ab", 4, 6, "XY")).toBe("ab  XY");
  });

  it("keeps styling before the span and re-asserts it after", () => {
    const line = `${RED}abcdefgh${RESET}`;
    const result = overlaySpan(line, 2, 5, "XYZ");
    expect(stripAnsi(result)).toBe("abXYZfgh");
    expect(result.startsWith(`${RED}ab`)).toBe(true);
    // The tail keeps its colour rather than inheriting the span's reset.
    expect(result.indexOf(RED)).toBeLessThan(result.indexOf("XYZ"));
    expect(result.slice(result.indexOf("XYZ"))).toContain(RED);
  });

  it("carries a style opened inside the span through to the tail", () => {
    const line = `a${RED}bc${BLUE}defg`;
    const result = overlaySpan(line, 1, 4, "XYZ");
    expect(stripAnsi(result)).toBe("aXYZefg");
    expect(result.slice(result.indexOf("XYZ"))).toContain(BLUE);
  });

  it("does not split a wide character at either edge", () => {
    expect(stripAnsi(overlaySpan("世界ab", 1, 3, "XY"))).toBe(" XY ab");
    expect(displayWidth(overlaySpan("世界ab", 1, 3, "XY"))).toBe(displayWidth("世界ab"));
  });

  it("leaves the row untouched for an empty span range", () => {
    expect(overlaySpan("abcdef", 3, 3, "")).toBe("abcdef");
  });

  it("writes past the end of a short row", () => {
    expect(stripAnsi(overlaySpan("", 0, 3, "XYZ"))).toBe("XYZ");
  });
});
