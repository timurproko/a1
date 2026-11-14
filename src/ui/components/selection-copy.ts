import { textSelectionText, usefulTextLineContent, type OrderedTextSelection, type TextSelectionLineContent } from "./text-selection.js";
import { stripAnsi } from "./text.js";

/** Bound selected-source retention independently of history length and encoded payload size. */
export const MAX_COPY_SOURCE_UNITS = 32 * 1024 * 1024;
export const MAX_COPY_ROWS = 65_536;
export const COPY_ACKNOWLEDGEMENT_DURATION_MS = 1_000;

export function copyAcknowledgementText(characters: number): string {
  return `Copied ${characters} chars to clipboard`;
}
export type SelectionCopyPrompt = "first" | "continuation" | undefined;
export interface SelectionCopyRow {
  readonly text: string;
  readonly prompt?: "first" | "continuation";
}
export interface SelectionCopySnapshot {
  readonly selection: OrderedTextSelection;
  readonly revision: number;
  readonly literal?: boolean;
  readonly rows: readonly SelectionCopyRow[];
  readonly sourceUnits: number;
  readonly captureMs?: number;
  readonly rejected?: "size";
}

export function selectionCopyLineContent(text: string, prompt: SelectionCopyPrompt, promptPrefixWidth = 2): TextSelectionLineContent {
  const plain = stripAnsi(text);
  if (prompt !== undefined) {
    if (prompt === "first") {
      const timestamp = /\s+\d{2}:\d{2}\s*$/.exec(plain);
      if (timestamp !== null) return usefulTextLineContent(plain.slice(0, timestamp.index), promptPrefixWidth + 1);
    }
    return usefulTextLineContent(plain, promptPrefixWidth + 1);
  }
  const from = plain.trim().length === 0 || (plain.startsWith(" ") && !plain.startsWith("  ")) ? 2 : 1;
  if (plain.trim().length === 0) return { from, to: from + 1 };
  return usefulTextLineContent(plain, from);
}

/** Extracts one snapshot row with the existing grapheme/newline policy; run expensive rows off-thread. */
export function selectionCopyRowText(snapshot: Pick<SelectionCopySnapshot, "selection" | "literal">, row: SelectionCopyRow, index: number): string {
  if (snapshot.literal) return row.text;
  return textSelectionText({
    start: { line: 0, column: index === snapshot.selection.start.line ? snapshot.selection.start.column : 0 },
    end: { line: 0, column: index === snapshot.selection.end.line ? snapshot.selection.end.column : Number.MAX_SAFE_INTEGER },
  }, [row.text], () => selectionCopyLineContent(row.text, row.prompt));
}
