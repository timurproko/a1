/**
 * Display-width text handling. Terminals lay out by column, not by code unit,
 * so measuring with `String.length` mis-sizes CJK, emoji, and combining marks,
 * and counting styling escapes as visible width breaks every layout that uses
 * colour.
 */

const ANSI_PATTERN = /\[[0-9;:?]*[ -/]*[@-~]|\][^]*(?:|\\)|[@-Z\\-_]/g;
const SEGMENTER = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Removes styling sequences so only visible characters remain. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

function codePointWidth(codePoint: number): number {
  // Zero-width: combining marks, joiners, variation selectors, and format characters.
  if (codePoint === 0x200d || codePoint === 0xfeff) return 0;
  if (codePoint >= 0x0300 && codePoint <= 0x036f) return 0;
  if (codePoint >= 0x200b && codePoint <= 0x200f) return 0;
  if (codePoint >= 0xfe00 && codePoint <= 0xfe0f) return 0;
  if (codePoint >= 0x20d0 && codePoint <= 0x20f0) return 0;
  if (codePoint >= 0x1ab0 && codePoint <= 0x1aff) return 0;
  if (codePoint >= 0x1dc0 && codePoint <= 0x1dff) return 0;
  if (codePoint >= 0xe0100 && codePoint <= 0xe01ef) return 0;
  // Wide: CJK, Hangul, fullwidth forms, and the emoji planes terminals render double-width.
  if (codePoint >= 0x1100 && codePoint <= 0x115f) return 2;
  if (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) return 2;
  if (codePoint >= 0xac00 && codePoint <= 0xd7a3) return 2;
  if (codePoint >= 0xf900 && codePoint <= 0xfaff) return 2;
  if (codePoint >= 0xfe30 && codePoint <= 0xfe6f) return 2;
  if (codePoint >= 0xff00 && codePoint <= 0xff60) return 2;
  if (codePoint >= 0xffe0 && codePoint <= 0xffe6) return 2;
  if (codePoint >= 0x1f300 && codePoint <= 0x1f64f) return 2;
  if (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) return 2;
  if (codePoint >= 0x20000 && codePoint <= 0x3fffd) return 2;
  // Control characters occupy nothing.
  if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint < 0xa0)) return 0;
  return 1;
}

/** Width of one grapheme cluster: the widest code point it contains, marks excluded. */
function graphemeWidth(grapheme: string): number {
  let width = 0;
  for (const character of grapheme) {
    width = Math.max(width, codePointWidth(character.codePointAt(0) ?? 0));
  }
  return width;
}

export interface DisplayColumnSlice {
  /** Grapheme-aligned visible bounds in the source row. */
  readonly from: number;
  readonly to: number;
  readonly text: string;
}

/** Plain graphemes intersecting a visible-column range, expanded at wide-character edges. */
export function displayColumnSlice(text: string, requestedFrom: number, requestedTo: number): DisplayColumnSlice {
  const plain = stripAnsi(text);
  const from = Math.max(0, requestedFrom);
  const to = Math.max(from, requestedTo);
  let column = 0;
  let actualFrom: number | undefined;
  let actualTo = from;
  let selected = "";
  for (const { segment } of SEGMENTER.segment(plain)) {
    const width = graphemeWidth(segment);
    const start = column;
    const end = column + width;
    if (end > from && start < to) {
      actualFrom ??= start;
      actualTo = end;
      selected += segment;
    }
    column = end;
    if (start >= to) break;
  }
  return { from: actualFrom ?? from, to: actualFrom === undefined ? from : actualTo, text: selected };
}

/** Columns this text occupies once styling is removed. */
export function displayWidth(text: string): number {
  let width = 0;
  for (const { segment } of SEGMENTER.segment(stripAnsi(text))) width += graphemeWidth(segment);
  return width;
}

/**
 * Truncates to a column budget without splitting a grapheme. Styling sequences
 * are carried through and a reset is appended when any style was opened, so a
 * truncated row cannot leak colour into the rest of the line.
 */
export function truncateToWidth(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";
  if (displayWidth(text) <= maxWidth) return text;

  let out = "";
  let width = 0;
  let styled = false;
  let index = 0;
  while (index < text.length) {
    ANSI_PATTERN.lastIndex = index;
    const match = ANSI_PATTERN.exec(text);
    if (match && match.index === index) {
      out += match[0];
      styled = true;
      index += match[0].length;
      continue;
    }
    const nextEscape = match ? match.index : text.length;
    for (const { segment } of SEGMENTER.segment(text.slice(index, nextEscape))) {
      const segmentWidth = graphemeWidth(segment);
      if (width + segmentWidth > maxWidth) return styled ? `${out}[0m` : out;
      out += segment;
      width += segmentWidth;
    }
    index = nextEscape;
  }
  return styled ? `${out}[0m` : out;
}

/** Pads to an exact column count, truncating when the text is already wider. */
export function padToWidth(text: string, width: number): string {
  if (width <= 0) return "";
  const current = displayWidth(text);
  if (current > width) return truncateToWidth(text, width);
  return text + " ".repeat(width - current);
}

/**
 * A control that is present but cannot be used: the terminal own faint
 * attribute over whatever colour it already carries, so it reads as half of what
 * it would otherwise be in any theme.
 */
export function faint(text: string): string {
  return `[2m${text}[22m`;
}
