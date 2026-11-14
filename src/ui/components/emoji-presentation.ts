import { ADDED_EMOJI_SELECTOR } from "./presentation-source.js";

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const TEXT_EMOJI = /^[\p{Emoji}&&\P{Emoji_Presentation}]$/v;
const RGI_EMOJI = /^\p{RGI_Emoji}$/v;

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
      const addition = `\uFE0F${retainSource ? ADDED_EMOJI_SELECTOR : ""}`;
      result += addition;
      onAddition?.(index + segment.length, addition);
    }
  }
  return result;
}
