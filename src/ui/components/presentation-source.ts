// Protocol: ignored OSC metadata distinguishes display-only selectors and compact chip identities.
export const ADDED_EMOJI_SELECTOR = "\u001b]a1;emoji-vs16\u0007";
const CHIP_PREFIX = "\u001b]a1;chip-source;";
const CHIP_END = "\u001b]a1;/chip-source\u0007";
const TERMINAL_SEQUENCE = /\u001b\[[0-9;:?]*[ -/]*[@-~]|\u001b[\]_][^\u0007\u001b]*(?:\u0007|\u001b\\)|\u001b[@-Z\\-_]/g;

/** Retains chip identity for whole-chip selection copy. */
export function retainPromptChipSource(display: string, source: string): string {
  return `${CHIP_PREFIX}${encodeURIComponent(JSON.stringify(source))}\u0007${display}${CHIP_END}`;
}

/** Restores source chips and removes marked emoji additions during selection copy. */
export function presentationSourceSlice(rendered: string, from: number, to: number): string {
  let plain = "", cursor = 0;
  let opening: { start: number; source: string } | undefined;
  const replacements: { start: number; end: number; source: string }[] = [];
  for (const match of rendered.matchAll(TERMINAL_SEQUENCE)) {
    plain += rendered.slice(cursor, match.index);
    const sequence = match[0];
    if (sequence === ADDED_EMOJI_SELECTOR && plain.endsWith("\uFE0F")) {
      replacements.push({ start: plain.length - 1, end: plain.length, source: "" });
    } else if (sequence.startsWith(CHIP_PREFIX)) {
      opening = undefined;
      try {
        const source: unknown = JSON.parse(decodeURIComponent(sequence.slice(CHIP_PREFIX.length, -1)));
        if (typeof source === "string") opening = { start: plain.length, source };
      } catch { /* Invariant: malformed private metadata cannot break selection copy. */ }
    } else if (sequence === CHIP_END && opening !== undefined) {
      replacements.push({ ...opening, end: plain.length });
      opening = undefined;
    }
    cursor = match.index + sequence.length;
  }
  plain += rendered.slice(cursor);
  let result = "", start = from;
  for (const range of replacements) {
    if (range.start < start || range.end > to) continue;
    result += plain.slice(start, range.start) + range.source;
    start = range.end;
  }
  return result + plain.slice(start, to);
}
