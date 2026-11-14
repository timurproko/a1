import { Marked } from "@earendil-works/pi-tui";
import { canonicalPromptChipMatches } from "../../../contracts/owned-ui/index.js";
import { emojiPresentation } from "../../../ui/components/index.js";

interface MarkdownNode {
  readonly type?: string;
  readonly raw?: string;
  readonly text?: string;
  readonly href?: string;
  readonly tokens?: readonly MarkdownNode[];
  readonly items?: readonly MarkdownNode[];
  readonly header?: readonly MarkdownNode[];
  readonly rows?: readonly (readonly MarkdownNode[])[];
}

const PARSER = new Marked();
const PATH_OR_URL = /(?:[a-z][a-z0-9+.-]*:\/\/|www\.)[^\s<>]+|[^\s<>]*[\\/][^\s<>]+/giu;

/** Adds display-only emoji intent to prose tokens, preserving Markdown syntax and protected source. */
export function presentEmojiMarkdown(markdown: string): string {
  if (!/[\p{Emoji}&&\P{Emoji_Presentation}&&\P{ASCII}]/v.test(markdown)) return markdown;
  const additions = new Map<number, string>();
  const chips = canonicalPromptChipMatches(markdown);
  const visit = (nodes: readonly MarkdownNode[], parent: string, positions: readonly number[]): void => {
    let cursor = 0;
    for (const node of nodes) {
      const raw = node.raw ?? node.text ?? "";
      const aligned = alignRaw(raw, parent, cursor);
      if (aligned === undefined) return; // Fail closed rather than modify a mismatched parser projection.
      cursor = aligned.end;
      const mapped = aligned.positions.map(index => positions[index]!);
      if (node.type === "code" || node.type === "codespan" || node.type === "html" || node.type === "def"
        || node.type === "image" || node.type === "latex") continue;
      if (node.type === "link" && (node.text === node.href || `mailto:${node.text}` === node.href)) continue;
      const children = node.tokens ?? node.items ?? (node.header === undefined ? undefined
        : [...node.header, ...(node.rows ?? []).flat()]);
      if (children !== undefined) {
        visit(children, raw, mapped);
      } else if (node.type === "text" || node.type === "escape") {
        const paths = [...raw.matchAll(PATH_OR_URL)].map(match => ({ start: match.index, end: match.index + match[0].length }));
        // Rationale: use grapheme additions from the shared policy, never a hand-maintained symbol list.
        emojiPresentation(raw, true, (offset, addition) => {
          const position = mapped[offset - 1]! + 1;
          if (!paths.some(range => offset > range.start && offset <= range.end)
            && !chips.some(range => position > range.start && position <= range.end)) additions.set(position, addition);
        });
      }
    }
  };
  visit(PARSER.lexer(markdown) as readonly MarkdownNode[], markdown, Array.from({ length: markdown.length }, (_, index) => index));
  let result = "", cursor = 0;
  for (const [position, addition] of [...additions].sort(([left], [right]) => left - right)) {
    result += markdown.slice(cursor, position) + addition;
    cursor = position;
  }
  return result + markdown.slice(cursor);
}

/** Nested quote/list tokens omit structural prefixes; map their raw bytes back without rewriting them. */
function alignRaw(raw: string, parent: string, from: number): { readonly positions: number[]; readonly end: number } | undefined {
  const exact = parent.indexOf(raw, from);
  if (exact >= 0) return { positions: Array.from({ length: raw.length }, (_, index) => exact + index), end: exact + raw.length };
  const positions: number[] = [];
  let cursor = from;
  for (const character of raw.split("")) {
    const index = parent.indexOf(character, cursor);
    if (index < 0) return undefined;
    positions.push(index);
    cursor = index + 1;
  }
  return { positions, end: cursor };
}
