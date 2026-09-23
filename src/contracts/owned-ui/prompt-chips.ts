const PROMPT_CHIP_PATTERN = /\[(?:paste #\d+ (?:\+\d+ lines|\d+ chars)|📷 [^\]]+|📁 [^\]]+|📄 [^\]]+|🖼 {1,2}[^\]]+|🔗 [^\]]+)\]/gu;
const ZERO_WIDTH_MARKERS = ["\u2060", "\u200b", "\u200c", "\u200d", "\ufeff"] as const;

export interface PromptChipTextMatch {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export interface PromptChipWrapProtection {
  readonly text: string;
  restore(rendered: string): string;
}

/** Finds canonical prompt-chip labels without requiring their process-local backing values. */
export function canonicalPromptChipMatches(text: string): readonly PromptChipTextMatch[] {
  return [...text.matchAll(PROMPT_CHIP_PATTERN)].map(match => ({
    text: match[0], start: match.index, end: match.index + match[0].length,
  }));
}

/** Replaces only canonical prompt-chip labels while preserving every intervening source byte. */
export function replaceCanonicalPromptChips(text: string, replacement: (match: PromptChipTextMatch) => string): string {
  return text.replace(PROMPT_CHIP_PATTERN, (value, offset: number) => replacement({
    text: value, start: offset, end: offset + value.length,
  }));
}

/** Protects fitting chip labels for Markdown wrapping and restores their exact visible source text. */
export function protectPromptChipWrapping(text: string): PromptChipWrapProtection {
  const matches = canonicalPromptChipMatches(text);
  if (matches.length === 0) return { text, restore: identity };
  const spaceMarker = unusedPrivateMarker(text);
  const boundaryMarker = unusedZeroWidthMarker(text);
  let protectedText = "", cursor = 0;
  for (const match of matches) {
    protectedText += text.slice(cursor, match.start);
    // Adjacent chips need a temporary break opportunity or Markdown treats the complete run as one word.
    if (match.start === cursor && cursor > 0) protectedText += `${boundaryMarker} `;
    protectedText += match.text.replaceAll(" ", spaceMarker);
    cursor = match.end;
  }
  protectedText += text.slice(cursor);
  return {
    text: protectedText,
    restore: rendered => rendered
      .replaceAll(`${boundaryMarker} `, "")
      .replaceAll(boundaryMarker, "")
      .replaceAll(spaceMarker, " "),
  };
}

function unusedPrivateMarker(text: string): string {
  for (let codePoint = 0xe000; codePoint <= 0xf8ff; codePoint++) {
    const marker = String.fromCodePoint(codePoint);
    if (!text.includes(marker)) return marker;
  }
  throw new Error("Prompt chip text exhausts the private presentation marker range");
}

function unusedZeroWidthMarker(text: string): string {
  for (const marker of ZERO_WIDTH_MARKERS) if (!text.includes(marker)) return marker;
  for (const left of ZERO_WIDTH_MARKERS) {
    for (const right of ZERO_WIDTH_MARKERS) if (!text.includes(left + right)) return left + right;
  }
  throw new Error("Prompt chip text exhausts the zero-width presentation marker range");
}

function identity(value: string): string { return value; }
