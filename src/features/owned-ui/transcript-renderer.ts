import type { OwnedUiTranscriptBlock } from "../../foundation/owned-ui-contracts/index.js";
import { displayWidth, truncateVisible } from "./terminal-runtime.js";
import type { OwnedTranscriptRenderer } from "./transcript-history.js";

export function createOwnedTranscriptRenderer(): OwnedTranscriptRenderer {
  return renderOwnedTranscriptBlock;
}

export function renderOwnedTranscriptBlock(
  block: OwnedUiTranscriptBlock,
  width: number,
): readonly string[] {
  if (!Number.isSafeInteger(width) || width <= 0) throw new RangeError("transcript renderer width must be positive");
  const label = blockLabel(block);
  const text = sanitizeDisplayText(block.text);
  const content = text.length > 0 ? text.split("\n") : [""];
  const lines: string[] = [];
  if (displayWidth(label) >= width) {
    if (label.length > 0) lines.push(truncateVisible(label, width));
    for (const row of content) lines.push(...wrapVisible(row, width));
    return lines;
  }
  for (const [index, row] of content.entries()) {
    const rowPrefix = index === 0 ? label : " ".repeat(displayWidth(label));
    let firstWrapped = true;
    for (const wrapped of wrapVisible(row, Math.max(1, width - displayWidth(rowPrefix)))) {
      const prefix = firstWrapped ? rowPrefix : " ".repeat(displayWidth(rowPrefix));
      lines.push(`${prefix}${wrapped}`);
      firstWrapped = false;
    }
  }
  return lines.length > 0 ? lines : [label];
}

export function sanitizeDisplayText(text: string): string {
  return text
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\t", "  ")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}

export function wrapVisible(text: string, width: number): readonly string[] {
  if (width <= 0) return [""];
  if (displayWidth(text) <= width) return [text];
  const rows: string[] = [];
  let current = "";
  let currentWidth = 0;
  for (const word of text.split(/(\s+)/)) {
    if (word.length === 0) continue;
    if (displayWidth(word) > width) {
      for (const character of word) {
        const size = displayWidth(character);
        if (currentWidth + size > width) {
          rows.push(current);
          current = "";
          currentWidth = 0;
        }
        current += character;
        currentWidth += size;
      }
      continue;
    }
    if (currentWidth + displayWidth(word) > width) {
      rows.push(current.trimEnd());
      current = word.trimStart();
      currentWidth = displayWidth(current);
    } else {
      current += word;
      currentWidth += displayWidth(word);
    }
  }
  if (current.length > 0) rows.push(current.trimEnd());
  return rows.length > 0 ? rows : [""];
}

function blockLabel(block: OwnedUiTranscriptBlock): string {
  switch (block.kind) {
    case "user":
      return "you › ";
    case "assistant":
      return "";
    case "thinking":
      return "thinking › ";
    case "tool-call":
      return `◆ ${sanitizeDisplayText(block.title ?? "tool")} › `;
    case "tool-result":
      return `${blockError(block) ? "✗" : "✓"} ${sanitizeDisplayText(block.title ?? "tool")} › `;
    case "retry":
      return "retry › ";
    case "compaction":
      return "compact › ";
    case "error":
      return "error › ";
    case "system":
      return "system › ";
  }
}

function blockError(block: OwnedUiTranscriptBlock): boolean {
  return typeof block.payload === "object"
    && block.payload !== null
    && "isError" in block.payload
    && block.payload.isError === true;
}
