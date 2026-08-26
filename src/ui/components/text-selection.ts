import { displayWidth, stripAnsi } from "./text.js";

export interface TextSelectionPoint {
  readonly line: number;
  readonly column: number;
}

export interface TextSelection {
  readonly anchor: TextSelectionPoint;
  readonly head: TextSelectionPoint;
  readonly selecting: boolean;
  readonly cell?: boolean;
  readonly fullRow?: boolean;
}

export interface TextSelectionClick {
  readonly time: number;
  readonly line: number;
  readonly column: number;
  readonly count: number;
}

export interface TextSelectionLineContent {
  readonly from?: number;
  readonly to?: number;
  readonly selectable?: boolean;
}

export interface OrderedTextSelection {
  readonly start: TextSelectionPoint;
  readonly end: TextSelectionPoint;
  readonly fullRow?: boolean;
}

export interface TextSelectionPressInput {
  readonly line: number;
  readonly column: number;
  readonly contentWidth: number;
  readonly lineText: string;
  readonly lineContent?: TextSelectionLineContent;
  readonly previousClick?: TextSelectionClick;
  readonly now?: number;
}

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });
export const TEXT_SELECTION_MULTI_CLICK_MS = 500;

export function orderedTextSelection(selection: TextSelection | undefined): OrderedTextSelection | undefined {
  if (selection === undefined) return undefined;
  const { anchor, head } = selection;
  if (anchor.line === head.line && anchor.column === head.column && !selection.cell && !selection.fullRow) return undefined;
  const anchorFirst = anchor.line < head.line || (anchor.line === head.line && anchor.column <= head.column);
  const ordered: OrderedTextSelection = anchorFirst
    ? { start: anchor, end: head }
    : { start: head, end: anchor };
  return selection.fullRow ? { ...ordered, fullRow: true } : ordered;
}

export function pressTextSelection(input: TextSelectionPressInput): {
  readonly selection?: TextSelection;
  readonly click: TextSelectionClick;
  readonly kind: "point" | "word" | "line";
} {
  const now = input.now ?? Date.now();
  const previous = input.previousClick;
  const count = previous !== undefined
    && now - previous.time <= TEXT_SELECTION_MULTI_CLICK_MS
    && previous.line === input.line
    && Math.abs(previous.column - input.column) <= 1
    ? previous.count + 1
    : 1;
  const click = { time: now, line: input.line, column: input.column, count };
  const column = clamp(input.column, 1, Math.max(1, input.contentWidth));
  const kind = ((count - 1) % 3) + 1;
  if (kind === 2) {
    const selection = selectWord(input.line, column, input.contentWidth, input.lineText);
    return selection === undefined ? { click, kind: "word" } : { selection, click, kind: "word" };
  }
  if (kind === 3) {
    if (input.lineContent?.selectable === false) return { click, kind: "line" };
    const from = clamp(input.lineContent?.from ?? 1, 1, Math.max(1, input.contentWidth));
    const to = clamp(input.lineContent?.to ?? input.contentWidth, from, Math.max(1, input.contentWidth));
    return {
      selection: {
        anchor: { line: input.line, column: from },
        head: { line: input.line, column: to },
        selecting: true,
        cell: true,
        fullRow: true,
      },
      click,
      kind: "line",
    };
  }
  return {
    selection: {
      anchor: { line: input.line, column },
      head: { line: input.line, column },
      selecting: true,
      cell: false,
    },
    click,
    kind: "point",
  };
}

export function extendTextSelection(selection: TextSelection | undefined, point: TextSelectionPoint): TextSelection | undefined {
  if (selection?.selecting !== true) return selection;
  if (selection.fullRow) {
    if (point.line === selection.anchor.line && selection.head.line === selection.anchor.line) return selection;
    const edge = point.line < selection.anchor.line ? Number.MAX_SAFE_INTEGER : 1;
    if (selection.anchor.column !== edge) {
      return { ...selection, anchor: { line: selection.anchor.line, column: edge }, head: point };
    }
  }
  return { ...selection, head: point };
}

export function releaseTextSelection(selection: TextSelection | undefined): TextSelection | undefined {
  if (selection === undefined) return undefined;
  const released = selection.selecting ? { ...selection, selecting: false } : selection;
  return orderedTextSelection(released) === undefined ? undefined : released;
}

export function textSelectionLineExtendColumn(selection: TextSelection, line: number, contentWidth: number): number {
  return line < selection.anchor.line ? 1 : Math.max(1, contentWidth);
}

export function textSelectionText(
  selection: OrderedTextSelection,
  rows: readonly string[],
  lineContent?: (line: number) => TextSelectionLineContent | undefined,
): string {
  const parts: string[] = [];
  for (let line = selection.start.line; line <= selection.end.line && line < rows.length; line += 1) {
    const plain = stripAnsi(rows[line] ?? "");
    const content = lineContent?.(line);
    if (content?.selectable === false) {
      parts.push("");
      continue;
    }
    const baseFrom = line === selection.start.line ? selection.start.column - 1 : 0;
    const baseTo = line === selection.end.line ? selection.end.column : Number.MAX_SAFE_INTEGER;
    const from = Math.max(baseFrom, Math.max(0, (content?.from ?? 1) - 1));
    const to = Math.max(from, Math.min(baseTo, content?.to ?? Number.MAX_SAFE_INTEGER));
    parts.push(plain.slice(indexAtDisplayWidth(plain, from), indexAtDisplayWidth(plain, to)).trimEnd());
  }
  return parts.join("\n");
}

/** Returns the plain cells covered by [from,to), using terminal grapheme widths. */
export function plainTextBetweenColumns(line: string, from: number, to: number): string {
  const plain = stripAnsi(line);
  return plain.slice(indexAtDisplayWidth(plain, from), indexAtDisplayWidth(plain, to));
}

export function usefulTextLineContent(line: string, from = 1): TextSelectionLineContent {
  const start = Math.max(1, from);
  const end = displayWidth(stripAnsi(line).replace(/\s+$/, "")) + 1;
  return { from: start, to: Math.max(start, end) };
}

function selectWord(line: number, column: number, contentWidth: number, lineText: string): TextSelection | undefined {
  const plain = stripAnsi(lineText);
  const segments: Array<{ readonly cls: number; readonly from: number; readonly to: number }> = [];
  let width = 0;
  for (const { segment } of GRAPHEMES.segment(plain)) {
    const cellWidth = displayWidth(segment);
    if (cellWidth <= 0) continue;
    segments.push({ cls: characterClass(segment), from: width, to: width + cellWidth });
    width += cellWidth;
  }
  const at = clamp(column, 1, Math.max(1, contentWidth)) - 1;
  const index = segments.findIndex(segment => at >= segment.from && at < segment.to);
  if (index < 0) return undefined;
  let low = index;
  let high = index;
  while (low > 0 && segments[low - 1]?.cls === segments[index]?.cls) low -= 1;
  while (high + 1 < segments.length && segments[high + 1]?.cls === segments[index]?.cls) high += 1;
  return {
    anchor: { line, column: (segments[low]?.from ?? 0) + 1 },
    head: { line, column: segments[high]?.to ?? 1 },
    selecting: true,
    cell: true,
  };
}

function characterClass(character: string): number {
  if (/\s/u.test(character)) return 0;
  if (/[\p{L}\p{N}_]/u.test(character)) return 1;
  return 2;
}

function indexAtDisplayWidth(plain: string, column: number): number {
  if (column <= 0) return 0;
  let width = 0;
  let index = 0;
  for (const { segment } of GRAPHEMES.segment(plain)) {
    const cellWidth = displayWidth(segment);
    if (width + cellWidth > column) break;
    width += cellWidth;
    index += segment.length;
    if (width >= column) break;
  }
  return index;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(value, maximum));
}
