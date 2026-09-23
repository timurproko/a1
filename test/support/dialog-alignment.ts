import { stripTerminalSequences } from "@earendil-works/pi-tui";

/** Display column of the first non-whitespace dialog cell, independent of ANSI styling. */
export function firstVisibleTextColumn(line: string): number {
  return stripTerminalSequences(line).search(/\S/u);
}
