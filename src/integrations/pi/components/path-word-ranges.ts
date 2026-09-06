import type { PiShellEditorTextRange } from "./shell-shared-facade.js";

const WHITESPACE = /\s/u;
const DRIVE_ROOT = /^[A-Za-z]:[\\/]/u;
const UNC_ROOT = /^(?:\\\\|\/\/)[^\\/\s]+[\\/][^\\/\s]+/u;
const POSIX_ROOT = /^\//u;
const EXPLICIT_RELATIVE_ROOT = /^(?:\.{1,2}|~)[\\/]/u;

export function promptPathWordRanges(line: string): readonly PiShellEditorTextRange[] {
  const ranges: PiShellEditorTextRange[] = [];
  let index = 0;
  while (index < line.length) {
    while (index < line.length && WHITESPACE.test(line[index] ?? "")) index += 1;
    if (index >= line.length) break;
    const start = index;
    const quote = line[index] === '"' || line[index] === "'" ? line[index] : undefined;
    if (quote !== undefined) {
      const closing = line.indexOf(quote, index + 1);
      if (closing >= 0 && (closing + 1 === line.length || WHITESPACE.test(line[closing + 1] ?? ""))) {
        if (isExplicitPath(line.slice(index + 1, closing))) ranges.push({ start, end: closing + 1 });
        index = closing + 1;
        continue;
      }
    }
    while (index < line.length && !WHITESPACE.test(line[index] ?? "")) index += 1;
    if (isExplicitPath(line.slice(start, index))) ranges.push({ start, end: index });
  }
  return ranges;
}

function isExplicitPath(value: string): boolean {
  return DRIVE_ROOT.test(value)
    || UNC_ROOT.test(value)
    || POSIX_ROOT.test(value)
    || EXPLICIT_RELATIVE_ROOT.test(value);
}
