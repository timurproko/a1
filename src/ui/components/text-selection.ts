import { displayWidth, stripAnsi } from "./text.js";

/** A reported pointer cell plus its grapheme-aligned zero-based boundaries. */
export interface TextSelectionPoint {
  readonly line: number;
  readonly column: number;
  readonly from?: number;
  readonly to?: number;
}

export interface TextSelection {
  readonly anchor: TextSelectionPoint;
  readonly head: TextSelectionPoint;
  readonly selecting: boolean;
  /** Ordinary point selection has received at least one distinct motion report. */
  readonly dragged?: boolean;
  /** Word selection uses inclusive pointer-cell endpoints supplied by its semantic range. */
  readonly cell?: boolean;
  readonly fullRow?: boolean;
  /** Paint an edge whitespace run through the viewport's overlaid rail cell. */
  readonly throughFinalColumn?: boolean;
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

/** Ordered zero-based, half-open display-column boundaries. */
export interface OrderedTextSelection {
  readonly start: TextSelectionPoint;
  readonly end: TextSelectionPoint;
  readonly fullRow?: boolean;
  readonly throughFinalColumn?: boolean;
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
  if (selection.fullRow) {
    const startLine = Math.min(anchor.line, head.line);
    const endLine = Math.max(anchor.line, head.line);
    return {
      start: { line: startLine, column: 0 },
      end: { line: endLine, column: Number.MAX_SAFE_INTEGER },
      fullRow: true,
      ...(selection.throughFinalColumn ? { throughFinalColumn: true } : {}),
    };
  }
  if (selection.cell) {
    const anchorFirst = comparePoints(anchor, head) <= 0;
    const first = anchorFirst ? anchor : head;
    const last = anchorFirst ? head : anchor;
    return {
      start: { line: first.line, column: pointBefore(first) },
      end: { line: last.line, column: pointAfter(last) },
      ...(selection.throughFinalColumn ? { throughFinalColumn: true } : {}),
    };
  }
  if (selection.dragged !== true) return undefined;

  const direction = comparePoints(anchor, head);
  if (direction === 0) return undefined;
  if (sameGrapheme(anchor, head)) {
    return {
      start: { line: anchor.line, column: pointBefore(anchor) },
      end: { line: anchor.line, column: pointAfter(anchor) },
    };
  }
  const ordered = direction < 0
    ? {
        start: { line: anchor.line, column: pointBefore(anchor) },
        end: { line: head.line, column: pointBefore(head) },
      }
    : {
        start: { line: head.line, column: pointAfter(head) },
        end: { line: anchor.line, column: pointAfter(anchor) },
      };
  if (ordered.start.line === ordered.end.line && ordered.start.column >= ordered.end.column) return undefined;
  return {
    ...ordered,
    ...(selection.throughFinalColumn ? { throughFinalColumn: true } : {}),
  };
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
  const point = textSelectionPointAt(input.line, column, input.lineText);
  return {
    selection: {
      anchor: point,
      head: point,
      selecting: true,
      dragged: false,
    },
    click,
    kind: "point",
  };
}

export function extendTextSelection(selection: TextSelection | undefined, point: TextSelectionPoint): TextSelection | undefined {
  if (selection?.selecting !== true) return selection;
  const distinctMotion = comparePoints(selection.head, point) !== 0;
  if (!distinctMotion) return selection;
  if (selection.fullRow) return { ...selection, head: point };
  return {
    ...selection,
    head: point,
    dragged: true,
  };
}

export function releaseTextSelection(selection: TextSelection | undefined): TextSelection | undefined {
  if (selection === undefined) return undefined;
  const released = selection.selecting ? { ...selection, selecting: false } : selection;
  return orderedTextSelection(released) === undefined ? undefined : released;
}

export function textSelectionLineExtendColumn(selection: TextSelection, line: number, contentWidth: number): number {
  return line < selection.anchor.line ? 1 : Math.max(1, contentWidth);
}

/** Resolves a reported one-based pointer cell to the complete grapheme it intersects. */
export function textSelectionPointAt(line: number, column: number, lineText: string): TextSelectionPoint {
  const plain = stripAnsi(lineText);
  const target = Math.max(0, column - 1);
  let width = 0;
  for (const { segment } of GRAPHEMES.segment(plain)) {
    const cellWidth = displayWidth(segment);
    const next = width + cellWidth;
    if (cellWidth > 0 && target >= width && target < next) {
      return { line, column, from: width, to: next };
    }
    width = next;
  }
  return { line, column, from: target, to: target + 1 };
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
    const baseFrom = line === selection.start.line ? selection.start.column : 0;
    const baseTo = line === selection.end.line ? selection.end.column : Number.MAX_SAFE_INTEGER;
    const contentFrom = Math.max(0, (content?.from ?? 1) - 1);
    const contentTo = Math.max(contentFrom, (content?.to ?? Number.MAX_SAFE_INTEGER) - 1);
    const from = Math.max(baseFrom, contentFrom);
    const to = Math.max(from, Math.min(baseTo, contentTo));
    parts.push(plain.slice(indexAtDisplayBoundary(plain, from, "start"), indexAtDisplayBoundary(plain, to, "end")).trimEnd());
  }
  return parts.join("\n");
}

/** Returns the plain cells covered by [from,to), expanding at grapheme edges. */
export function plainTextBetweenColumns(line: string, from: number, to: number): string {
  const plain = stripAnsi(line);
  return plain.slice(indexAtDisplayBoundary(plain, from, "start"), indexAtDisplayBoundary(plain, to, "end"));
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
  const end = segments[high]?.to ?? 1;
  return {
    anchor: { line, column: (segments[low]?.from ?? 0) + 1 },
    head: { line, column: end },
    selecting: true,
    cell: true,
    throughFinalColumn: segments[index]?.cls === 0 && end >= contentWidth,
  };
}

function characterClass(character: string): number {
  if (/\s/u.test(character)) return 0;
  if (/[\p{L}\p{N}_]/u.test(character)) return 1;
  return 2;
}

function indexAtDisplayBoundary(plain: string, column: number, edge: "start" | "end"): number {
  if (column <= 0) return 0;
  let width = 0;
  let index = 0;
  for (const { segment } of GRAPHEMES.segment(plain)) {
    const cellWidth = displayWidth(segment);
    const next = width + cellWidth;
    if (column < next) return edge === "start" ? index : index + segment.length;
    index += segment.length;
    width = next;
    if (width >= column) return index;
  }
  return index;
}

function pointBefore(point: TextSelectionPoint): number {
  return point.from ?? Math.max(0, point.column - 1);
}

function pointAfter(point: TextSelectionPoint): number {
  return point.to ?? Math.max(0, point.column);
}

function sameGrapheme(left: TextSelectionPoint, right: TextSelectionPoint): boolean {
  return left.line === right.line && pointBefore(left) === pointBefore(right) && pointAfter(left) === pointAfter(right);
}

function comparePoints(left: TextSelectionPoint, right: TextSelectionPoint): number {
  return left.line === right.line ? left.column - right.column : left.line - right.line;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(value, maximum));
}
