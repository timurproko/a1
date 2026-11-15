const PROMPT_CHIP_PATTERN = /\[(?:paste #\d+ (?:\+\d+ lines|\d+ chars)|📷 ?[^\]]+|(?:📁|📄|🖼\uFE0F?) {0,2}[^\]]+|🔗 [^\]]+)\]/gu;
const IMAGE_CHIP_IDENTIFIER_PATTERN = /^(?:\[📷 screenshot-([a-f0-9]+)(?:-resized)?\]|\[🖼\uFE0F? {1,2}[^\]\r\n]+ #([a-f0-9]+)(?:-resized)?\])$/u;
const ZERO_WIDTH_MARKERS = ["\u2060", "\u200b", "\u200c", "\u200d", "\ufeff"] as const;

/** Returns the durable payload key for clipboard and filename-bearing image attachments. */
export function imagePromptChipIdentifier(tag: string): string | null {
  const match = IMAGE_CHIP_IDENTIFIER_PATTERN.exec(tag);
  return match?.[1] ?? match?.[2] ?? null;
}

/** Builds an atomic file-image label with an independent durable attachment identity. */
export function imageFilePromptChipTag(fileName: string, id: string, transformed = false): string {
  const label = fileName.replace(/[\u0000-\u001f\u007f-\u009f\[\]]/gu, "�").trim().slice(0, 256) || "image";
  return `[🖼️ ${label} #${id}${transformed ? "-resized" : ""}]`;
}

interface PromptChipTextRange {
  readonly start: number;
  readonly end: number;
}

export interface PromptChipTextMatch extends PromptChipTextRange {
  readonly text: string;
}

/** Display-only attachment ranges; backing identity is unchanged. */
export function attachmentPromptChipHiddenRanges(text: string): readonly PromptChipTextRange[] {
  const ranges: PromptChipTextRange[] = [];
  for (const match of canonicalPromptChipMatches(text)) {
    if (match.text.startsWith("[📷 ")) {
      const start = match.start + "[📷".length;
      ranges.push({ start, end: start + 1 });
      continue;
    }
    const parts = /^(\[(?:📁|📄|🖼\uFE0F?))( {1,2})([^\]]+)\]$/u.exec(match.text);
    if (parts === null) continue;
    const labelStart = parts[1]!.length + parts[2]!.length;
    const label = parts[3]!;
    const metadata = / #(?:[A-Za-z]:[\\/]|\/)[^\r\n]+$/u.exec(label)
      ?? (parts[1]!.includes("🖼") ? / #[a-f0-9]+(?:-resized)?(?:-failed)?$/u.exec(label) : null);
    const labelEnd = metadata?.index ?? label.length;
    const pathLabel = label.slice(0, labelEnd);
    const separator = /^(?:[A-Za-z]:\\|\\\\)/u.test(pathLabel)
      ? Math.max(pathLabel.lastIndexOf("/"), pathLabel.lastIndexOf("\\")) : pathLabel.lastIndexOf("/");
    // Invariant: retain root-only labels.
    const basenameStart = separator < pathLabel.length - 1 ? separator + 1 : 0;
    ranges.push({ start: match.start + parts[1]!.length, end: match.start + labelStart + basenameStart });
    if (metadata !== null) ranges.push({ start: match.start + labelStart + labelEnd, end: match.end - 1 });
  }
  return ranges;
}

/** Presents icon-adjacent attachment labels without rewriting chip source. */
export function compactAttachmentPromptChips(text: string): string {
  for (const range of [...attachmentPromptChipHiddenRanges(text)].reverse()) {
    text = text.slice(0, range.start) + text.slice(range.end);
  }
  return text;
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

/** Protects chip labels for wrapping, optionally presents a derived label, and removes all sentinels. */
export function protectPromptChipWrapping(
  text: string,
  present: (chip: string) => string = identity,
): PromptChipWrapProtection {
  const matches = canonicalPromptChipMatches(text);
  if (matches.length === 0) return { text, restore: identity };
  const spaceMarker = unusedPrivateMarker(text);
  const boundaryMarker = unusedZeroWidthMarker(text);
  const boundary = `${boundaryMarker} `;
  let protectedText = "", cursor = 0;
  for (const match of matches) {
    protectedText += text.slice(cursor, match.start);
    // Rationale: temporary break opportunities keep each chip independent from adjacent chips or prose.
    if (match.start > 0 && match.start !== cursor && !/\s/u.test(text[match.start - 1]!)) protectedText += boundary;
    protectedText += present(match.text).replaceAll(" ", spaceMarker);
    if (match.end < text.length && !/\s/u.test(text[match.end]!)) protectedText += boundary;
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
