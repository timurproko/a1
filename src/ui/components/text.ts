/** Terminal-column geometry: preserve graphemes, Unicode cell widths and ANSI styling. */

const ANSI_PATTERN = /\u001b(?:\[[0-?]*[ -/]*[@-~]|[P\]_^][^\u0007\u001b]*(?:\u0007|\u001b\\)|[ -/]*[0-~])/g;
const ZERO_WIDTH = /^[\p{Mark}\p{Default_Ignorable_Code_Point}]$/u;
const SEGMENTER = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const WORD_SEGMENTER = new Intl.Segmenter(undefined, { granularity: "word" });

// Protocol: RGI includes wide emoji outside East Asian ranges and explicit VS16 sequences.
const RGI_EMOJI_PATTERN = /^\p{RGI_Emoji}$/v;
// Protocol: a default-wide emoji base stays wide with VS15 or an incomplete sequence.
const EMOJI_PRESENTATION_PATTERN = /^\p{Emoji_Presentation}/u;

/** Columns a terminal advances for a tab, matching the host runtime. */
const TAB_WIDTH = 3;

/** Removes styling sequences so only visible characters remain. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

function codePointWidth(codePoint: number): number {
  // Unicode properties cover non-advancing marks and format characters outside the common blocks.
  if (codePoint > 0x7f && ZERO_WIDTH.test(String.fromCodePoint(codePoint))) return 0;
  // Protocol: East Asian wide/fullwidth ranges remain independent of emoji presentation.
  if (codePoint >= 0x1100 && codePoint <= 0x115f) return 2;
  if (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) return 2;
  if (codePoint >= 0xac00 && codePoint <= 0xd7a3) return 2;
  if (codePoint >= 0xf900 && codePoint <= 0xfaff) return 2;
  if (codePoint >= 0xfe30 && codePoint <= 0xfe6f) return 2;
  if (codePoint >= 0xff00 && codePoint <= 0xff60) return 2;
  if (codePoint >= 0xffe0 && codePoint <= 0xffe6) return 2;
  if (codePoint >= 0x20000 && codePoint <= 0x3fffd) return 2;
  // Protocol: a tab advances to the host runtime's stop; other control characters occupy nothing.
  if (codePoint === 0x09) return TAB_WIDTH;
  if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint < 0xa0)) return 0;
  return 1;
}

/** Cheap pre-filter: only clusters that could be emoji pay for the RGI test. */
function couldBeEmoji(grapheme: string): boolean {
  const codePoint = grapheme.codePointAt(0) ?? 0;
  return (
    (codePoint >= 0x1f000 && codePoint <= 0x1fbff) ||
    (codePoint >= 0x2300 && codePoint <= 0x23ff) ||
    (codePoint >= 0x2600 && codePoint <= 0x27bf) ||
    (codePoint >= 0x2b00 && codePoint <= 0x2bff) ||
    grapheme.length > 1
  );
}

/** Width of one grapheme cluster: two for emoji, else the widest code point it contains. */
export function graphemeWidth(grapheme: string): number {
  // Invariant: bare text pictographs stay narrow; default emoji and RGI sequences stay wide.
  if (couldBeEmoji(grapheme)
    && (RGI_EMOJI_PATTERN.test(grapheme) || EMOJI_PRESENTATION_PATTERN.test(grapheme))) return 2;
  let width = 0;
  for (const character of grapheme) {
    width = Math.max(width, codePointWidth(character.codePointAt(0) ?? 0));
  }
  return width;
}

export interface DisplayColumnRange {
  readonly from: number;
  readonly to: number;
}

/** Visible-column segment (word, whitespace, or punctuation) under a pointer column. */
export function displayWordColumnRange(text: string, pointerColumn: number): DisplayColumnRange | null {
  const plain = stripAnsi(text);
  const pointer = Math.max(0, pointerColumn);
  let column = 0;
  for (const { segment } of WORD_SEGMENTER.segment(plain)) {
    const width = displayWidth(segment);
    const from = column;
    const to = column + width;
    if (pointer >= from && pointer < to) return { from, to };
    column = to;
  }
  return null;
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
  const plain = stripAnsi(text);
  if (!/[^\x20-\x7e]/u.test(plain)) return plain.length;
  let width = 0;
  for (const { segment } of SEGMENTER.segment(plain)) width += graphemeWidth(segment);
  return width;
}

/** A complete visible grapheme (including intervening ANSI), or a standalone terminal sequence. */
export interface StyledTextToken {
  readonly text: string;
  readonly ansi: boolean;
  readonly width: number;
}

/** Segments visible text once, so styling cannot split an emoji, combining sequence, or ZWJ cluster. */
export function* styledTextTokens(text: string): Generator<StyledTextToken> {
  const escapes = [...text.matchAll(ANSI_PATTERN)];
  if (escapes.length === 0) {
    for (const { segment } of SEGMENTER.segment(text)) yield { text: segment, ansi: false, width: graphemeWidth(segment) };
    return;
  }
  const plain = stripAnsi(text);
  let raw = 0, visible = 0, escape = 0;
  for (const { segment } of SEGMENTER.segment(plain)) {
    while (escapes[escape]?.index === raw) {
      const sequence = escapes[escape++]![0];
      raw += sequence.length;
      yield { text: sequence, ansi: true, width: 0 };
    }
    const start = raw;
    const end = visible + segment.length;
    while (visible < end) {
      if (escapes[escape]?.index === raw) raw += escapes[escape++]![0].length;
      else { raw++; visible++; }
    }
    yield { text: text.slice(start, raw), ansi: false, width: graphemeWidth(segment) };
  }
  while (raw < text.length) {
    const sequence = escapes[escape++]![0];
    raw += sequence.length;
    yield { text: sequence, ansi: true, width: 0 };
  }
}

/** Complete terminal formatting sequences carried by a styled grapheme. */
export function textSequences(text: string): readonly string[] {
  return text.includes("\u001b") ? text.match(ANSI_PATTERN) ?? [] : [];
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
  for (const token of styledTextTokens(text)) {
    if (width + token.width > maxWidth) return styled ? `${out}\u001b[0m` : out;
    out += token.text;
    width += token.width;
    styled ||= token.text.includes("\u001b");
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
