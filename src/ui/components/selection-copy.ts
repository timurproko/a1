import { textSelectionText, usefulTextLineContent, type OrderedTextSelection, type TextSelectionLineContent } from "./text-selection.js";
import { stripAnsi } from "./text.js";

/** Bound selected-source retention independently of history length and encoded payload size. */
export const MAX_COPY_SOURCE_UNITS = 32 * 1024 * 1024;
export const MAX_COPY_ROWS = 65_536;
export const COPY_ACKNOWLEDGEMENT_DURATION_MS = 1_000;

export function copyAcknowledgementText(characters: number): string {
  return `copied ${characters} chars to clipboard`;
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

export function selectionCopyLineContent(text: string, prompt: SelectionCopyPrompt): TextSelectionLineContent {
  const plain = stripAnsi(text);
  if (prompt !== undefined) {
    if (prompt === "first") {
      const timestamp = /\s+\d{2}:\d{2}\s*$/.exec(plain);
      if (timestamp !== null) return usefulTextLineContent(plain.slice(0, timestamp.index), 3);
    }
    return usefulTextLineContent(plain, 3);
  }
  const from = plain.trim().length === 0 || (plain.startsWith(" ") && !plain.startsWith("  ")) ? 2 : 1;
  if (plain.trim().length === 0) return { from, to: from + 1 };
  return usefulTextLineContent(plain, from);
}

export function literalSelectionCopySnapshot(text: string, revision = 0): SelectionCopySnapshot | null {
  if (text.trim().length === 0) return null;
  const selection = {
    start: { line: 0, column: 0 },
    end: { line: 0, column: Number.MAX_SAFE_INTEGER },
  };
  if (text.length > MAX_COPY_SOURCE_UNITS) {
    return { literal: true, selection, revision, rows: [], sourceUnits: 0, rejected: "size" };
  }
  return { literal: true, selection, revision, rows: [{ text }], sourceUnits: text.length };
}

/** Extracts one snapshot row with the existing grapheme/newline policy; run expensive rows off-thread. */
export function selectionCopyRowText(snapshot: Pick<SelectionCopySnapshot, "selection" | "literal">, row: SelectionCopyRow, index: number): string {
  if (snapshot.literal) return row.text;
  let plain = stripAnsi(row.text);
  if (row.prompt === "first") {
    const timestamp = /\s+\d{2}:\d{2}\s*$/.exec(plain);
    if (timestamp !== null) plain = plain.slice(0, timestamp.index);
  }
  const from = row.prompt !== undefined ? 3 : plain.startsWith(" ") && !plain.startsWith("  ") ? 2 : 1;
  // Performance: trailing chrome is excluded before extraction; full-row copy need not measure every grapheme.
  plain = plain.trimEnd();
  return textSelectionText({
    start: { line: 0, column: index === snapshot.selection.start.line ? snapshot.selection.start.column : 0 },
    end: { line: 0, column: index === snapshot.selection.end.line ? snapshot.selection.end.column : Number.MAX_SAFE_INTEGER },
  }, [plain], () => ({ from }));
}
