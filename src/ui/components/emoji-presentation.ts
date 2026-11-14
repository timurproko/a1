const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const TEXT_EMOJI = /^[\p{Emoji}&&\P{Emoji_Presentation}]$/v;
const RGI_EMOJI = /^\p{RGI_Emoji}$/v;
// Protocol: private, ignored OSC metadata distinguishes added selectors from authored selectors for copy.
const ADDED_SELECTOR = "\u001b]a1;emoji-vs16\u0007";
const TERMINAL_SEQUENCE = /\u001b\[[0-9;:?]*[ -/]*[@-~]|\u001b[\]_][^\u0007\u001b]*(?:\u0007|\u001b\\)|\u001b[@-Z\\-_]/g;

/** Requests emoji only for standalone text-default bases with a valid Unicode emoji variant. */
export function emojiPresentation(
  text: string,
  retainSource = false,
  onAddition?: (offset: number, addition: string) => void,
): string {
  if (!/[\p{Emoji}&&\P{Emoji_Presentation}]/v.test(text)) return text;
  let result = "";
  for (const { segment, index } of GRAPHEMES.segment(text)) {
    result += segment;
    if (TEXT_EMOJI.test(segment) && RGI_EMOJI.test(`${segment}\uFE0F`)) {
      const addition = `\uFE0F${retainSource ? ADDED_SELECTOR : ""}`;
      result += addition;
      onAddition?.(index + segment.length, addition);
    }
  }
  return result;
}

/** Copies a plain-indexed display slice, restoring only selectors marked as presentation additions. */
export function emojiSourceSlice(rendered: string, from: number, to: number): string {
  let plain = "", cursor = 0;
  const added: number[] = [];
  for (const match of rendered.matchAll(TERMINAL_SEQUENCE)) {
    plain += rendered.slice(cursor, match.index);
    if (match[0] === ADDED_SELECTOR && plain.endsWith("\uFE0F")) added.push(plain.length - 1);
    cursor = match.index + match[0].length;
  }
  plain += rendered.slice(cursor);
  let result = "", start = from;
  for (const index of added) {
    if (index < from || index >= to) continue;
    result += plain.slice(start, index);
    start = index + 1;
  }
  return result + plain.slice(start, to);
}
