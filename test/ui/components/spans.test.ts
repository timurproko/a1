import { describe, expect, it } from "vitest";
import {
  backgroundSgrSpan,
  displayWidth,
  heldNativeHyperlinkStyle,
  hyperlinkSgrSpan,
  nativeHyperlinkStyle,
  overlaySpan,
  stripAnsi,
} from "../../../src/ui/components/index.js";

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

  it("uses an injected terminal-width authority for renderer-specific emoji widths", () => {
    const first = "[🖼 first.png]";
    const second = "[🖼 second.png]";
    const selected = `${ESC}[7m`;
    const piWidth = (text: string) => text === "🖼" ? 1 : displayWidth(text);
    const firstWidth = displayWidth(first) - 1;
    const secondWidth = displayWidth(second) - 1;

    const result = backgroundSgrSpan(first + second, firstWidth, firstWidth + secondWidth, selected, `${ESC}[27m`, piWidth);

    expect(stripAnsi(result)).toBe(first + second);
    expect(result).toContain(`${first}${selected}${second}`);
  });

  it("gives truncated display text an explicit full hyperlink target", () => {
    const target = "https://example.com/a/very/useful/resource";
    const result = hyperlinkSgrSpan(`${RED}prefix preview... suffix${RESET}`, 7, 17, target);

    expect(stripAnsi(result)).toBe("prefix preview... suffix");
    expect(result).toContain(`\u001b]8;;${target}\u001b\\preview...\u001b]8;;\u001b\\`);
  });

  it("leaves OSC 8 links to the terminal's native inactive and hover styling", () => {
    const target = "https://example.com/full";
    const open = `\u001b]8;;${target}\u001b\\`;
    const close = "\u001b]8;;\u001b\\";

    expect(nativeHyperlinkStyle(`${open}${ESC}[4mexample${ESC}[24m${close}`))
      .toBe(`${open}example${close}`);
    expect(nativeHyperlinkStyle(`${open}${ESC}[4mexample${ESC}[24m${close}`, text => `${BLUE}${text}${RESET}`))
      .toBe(`${open}${BLUE}example${RESET}${close}`);
  });

  it("keeps links dotted but non-interactive during a held-button paint", () => {
    const target = "https://example.com/full";
    const open = `\u001b]8;;${target}\u001b\\`;
    const close = "\u001b]8;;\u001b\\";
    const source = `${open}${BLUE}${target}${RESET}${close} tail`;

    const result = heldNativeHyperlinkStyle(source);

    expect(result).not.toContain("\u001b]8;;");
    expect(result).toContain("\u001b[4:4m");
    expect(result).toContain("\u001b[24m");
    expect(result).toContain("https:\uFE0E//example.com/full");
    expect(stripAnsi(result).replaceAll("\uFE0E", "")).toBe(stripAnsi(source));

    const fileOpen = "\u001b]8;;file:///D:/work/package.json\u001b\\";
    const fileSource = `${fileOpen}${BLUE}package.json${RESET}${close}`;
    const heldFile = heldNativeHyperlinkStyle(fileSource);
    expect(heldFile).not.toContain("\u001b]8;;");
    expect(heldFile).toContain("p\uFE0Eackage.json");
    expect(stripAnsi(heldFile).replaceAll("\uFE0E", "")).toBe("package.json");
  });

  it("gives bare URLs explicit, independently bounded native hover regions", () => {
    const first = "https://github.com/example/actions/1";
    const second = "https://example.com/docs";
    const close = "\u001b]8;;\u001b\\";
    const source = `${RED}check ${first} then ${second}). tail${RESET}`;

    const result = nativeHyperlinkStyle(source, text => `${BLUE}${text}${RESET}`);

    expect(stripAnsi(result)).toBe(stripAnsi(source));
    expect(result).toContain(`\u001b]8;;${first}\u001b\\${ESC}[24m${BLUE}${first}${RESET}${close}${RED}`);
    expect(result).toContain(`\u001b]8;;${second}\u001b\\${ESC}[24m${BLUE}${second}${RESET}${close}${RED})`);
    expect(result).not.toContain(`\u001b]8;;${second})`);
  });

  it("paints only the selection background while preserving foreground, bold, italic, and underline", () => {
    const bold = `${ESC}[1m`;
    const italic = `${ESC}[3m`;
    const underline = `${ESC}[4m`;
    const selected = `${ESC}[48;2;38;79;120m`;
    const result = backgroundSgrSpan(`${RED}${bold}a${BLUE}${italic}b${underline}c`, 0, 3, selected, `${ESC}[49m`);
    expect(stripAnsi(result)).toBe("abc");
    expect(result).toContain(`${RED}${bold}${selected}a`);
    expect(result).toContain(`${BLUE}${selected}${italic}${selected}b`);
    expect(result).toContain(`${underline}${selected}c`);
  });
});
