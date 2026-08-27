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
const BARE_URL = /https?:\/\/[^\s\u0000-\u001f\u007f<>"']+/giu;
const TRAILING_URL_PUNCTUATION = /[.,;:!?]/u;
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
/** Wraps visible columns `[from,to)` in an explicit OSC 8 hyperlink. */
export function hyperlinkSgrSpan(
  line: string,
  from: number,
  to: number,
  target: string,
  widthOf: (text: string) => number = displayWidth,
): string {
  const on = `\u001b]8;;${target}\u001b\\`;
  const off = "\u001b]8;;\u001b\\";
  let output = "";
  let column = 0;
  let inside = false;
  for (const token of line.split(ANSI_SPLIT)) {
    if (!token) continue;
    if (token.startsWith("\u001b")) {
      output += token;
      continue;
    }
    for (const { segment } of GRAPHEMES.segment(token)) {
      const shouldBeInside = column >= from && column < to;
      if (shouldBeInside !== inside) {
        output += shouldBeInside ? on : off;
        inside = shouldBeInside;
      }
      output += segment;
      column += widthOf(segment);
    }
  }
  if (inside) output += off;
  return output;
}

/**
 * Gives existing and bare web links explicit, tightly bounded OSC 8 regions so
 * the terminal owns dotted-idle/solid-hover decoration without leaking hover
 * state into cells repainted during scrolling.
 */
export function nativeHyperlinkStyle(
  line: string,
  color: (text: string, target: string) => string = text => text,
): string {
  let hyperlinkTarget: string | undefined;
  let sgrReplay = "";
  let output = "";
  for (const token of line.split(ANSI_SPLIT)) {
    if (!token) continue;
    const link = HYPERLINK.exec(token);
    if (link) {
      hyperlinkTarget = (link[1] ?? "") || undefined;
      output += token;
      continue;
    }
    if (!token.startsWith("\u001b")) {
      output += hyperlinkTarget === undefined
        ? decorateBareUrls(token, color, sgrReplay)
        : color(token, hyperlinkTarget);
      continue;
    }
    if (SGR.test(token)) {
      if (token === "\u001b[0m") sgrReplay = token;
      else sgrReplay += token;
    }
    if (hyperlinkTarget === undefined || (token !== "\u001b[4m" && token !== "\u001b[24m")) output += token;
  }
  return hyperlinkTarget === undefined ? output : output + HYPERLINK_OFF;
}

function decorateBareUrls(
  text: string,
  color: (text: string, target: string) => string,
  sgrReplay: string,
): string {
  return text.replace(BARE_URL, candidate => {
    const { target, trailing } = splitUrlTrailingPunctuation(candidate);
    if (target.length === 0) return candidate;
    return `\u001b]8;;${target}\u001b\\\u001b[24m${color(target, target)}${HYPERLINK_OFF}${sgrReplay}${trailing}`;
  });
}

function splitUrlTrailingPunctuation(candidate: string): { readonly target: string; readonly trailing: string } {
  let end = candidate.length;
  while (end > 0 && TRAILING_URL_PUNCTUATION.test(candidate[end - 1] ?? "")) end -= 1;
  for (const [opening, closing] of [["(", ")"], ["[", "]"], ["{", "}"]] as const) {
    while (candidate.slice(0, end).endsWith(closing)
      && occurrences(candidate.slice(0, end), closing) > occurrences(candidate.slice(0, end), opening)) {
      end -= 1;
    }
  }
  return { target: candidate.slice(0, end), trailing: candidate.slice(end) };
}

function occurrences(text: string, value: string): number {
  return text.split(value).length - 1;
}

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
