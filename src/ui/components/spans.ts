import { displayWidth } from "./text.js";

/**
 * Ported from the A1 UI reference implementation (`core/presentation/spans.ts`).
 * Writing over part of a rendered row is not string slicing: the row carries
 * styling and hyperlink sequences, and cutting through them either loses the
 * styling of the tail or leaks the span's own reset into it.
 */

const ANSI_SEQUENCE = "\\u001b(?:\\[[0-?]*[ -/]*[@-~]|[\\]_][^\\u0007\\u001b]*(?:\\u0007|\\u001b\\\\|$))";
const ANSI_SPLIT = new RegExp(`(${ANSI_SEQUENCE})`);
const HYPERLINK = /^\]8;;([^]*)(?:|\\)?$/;
const HYPERLINK_OFF = "]8;;\\";
const SGR = /^\[[0-9;]*m$/;
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Replaces the visible columns `[from, to)` of `line` with `span`, preserving
 * the styling before it and re-asserting whatever was still open afterwards, so
 * the tail keeps the colour it had. A wide character straddling either edge is
 * replaced by spaces rather than split.
 */
export function overlaySpan(line: string, from: number, to: number, span: string): string {
  let head = "";
  let replay = "";
  let tail = "";
  let column = 0;
  let hyperlinkOpen = false;

  for (const token of line.split(ANSI_SPLIT)) {
    if (!token) continue;
    if (token.startsWith("")) {
      if (column >= to) {
        tail += token;
        continue;
      }
      if (column < from) {
        head += token;
        const link = HYPERLINK.exec(token);
        if (link) hyperlinkOpen = (link[1] ?? "").length > 0;
      }
      // Re-assert everything still active: the span's own reset clobbers the tail.
      replay += token;
      continue;
    }
    for (const { segment } of GRAPHEMES.segment(token)) {
      const width = displayWidth(segment);
      if (column + width <= from) head += segment;
      else if (column >= to) tail += segment;
      else if (column < from) head += " ".repeat(from - column);
      else if (column + width > to) tail += " ".repeat(column + width - to);
      column += width;
    }
  }
  if (column < from) head += " ".repeat(from - column);
  return head + (hyperlinkOpen ? HYPERLINK_OFF : "") + span + replay + tail;
}

/**
 * Paints only a background over [from,to), preserving every glyph and its
 * foreground, bold, underline, and hyperlink styling. Embedded resets reapply
 * the selection background, while leaving the span restores the row's styles.
 */
export function backgroundSgrSpan(
  line: string,
  from: number,
  to: number,
  on = "\u001b[47m",
  off = "\u001b[49m",
  widthOf: (text: string) => number = displayWidth,
): string {
  let output = "";
  let seen = "";
  let column = 0;
  let inside = false;
  for (const token of line.split(ANSI_SPLIT)) {
    if (!token) continue;
    if (token.startsWith("\u001b")) {
      output += token;
      if (SGR.test(token)) seen += token;
      if (inside) output += on;
      continue;
    }
    for (const { segment } of GRAPHEMES.segment(token)) {
      const shouldBeInside = column >= from && column < to;
      if (shouldBeInside !== inside) {
        output += shouldBeInside ? on : off + seen;
        inside = shouldBeInside;
      }
      output += segment;
      column += widthOf(segment);
    }
  }
  if (inside) output += off;
  return output;
}
