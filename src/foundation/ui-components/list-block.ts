/**
 * A grouped list: group headers, selectable elements, notes, and spacers. While
 * the top visible row belongs to a group, that group's header stays pinned as
 * the first rendered row, so the reader always knows which group is on screen.
 */

export type ListRow<T> =
  | { readonly kind: "group"; readonly group: string; readonly title: string }
  | { readonly kind: "element"; readonly group: string; readonly key: string; readonly selectable: boolean; readonly value: T }
  | { readonly kind: "note"; readonly group: string; readonly text: string }
  | { readonly kind: "spacer" };

export interface ListRowSpan {
  readonly from: number;
  readonly to: number;
}

export function rowKey<T>(row: ListRow<T> | undefined): string | undefined {
  return row !== undefined && row.kind === "element" && row.selectable ? row.key : undefined;
}

export function selectableIndexes<T>(rows: readonly ListRow<T>[]): readonly number[] {
  const indexes: number[] = [];
  rows.forEach((row, index) => {
    if (rowKey(row) !== undefined) indexes.push(index);
  });
  return indexes;
}

export function indexOfKey<T>(rows: readonly ListRow<T>[], key: string | undefined): number {
  if (key !== undefined) {
    const found = rows.findIndex(row => rowKey(row) === key);
    if (found >= 0) return found;
  }
  return selectableIndexes(rows)[0] ?? -1;
}

/** Clamped movement between selectable rows. No wrap-around. */
export function moveSelection<T>(rows: readonly ListRow<T>[], current: number, delta: number): number {
  const selectable = selectableIndexes(rows);
  if (selectable.length === 0) return -1;
  const position = selectable.indexOf(current);
  if (position < 0) return selectable[0] ?? -1;
  const next = Math.min(Math.max(position + delta, 0), selectable.length - 1);
  return selectable[next] ?? current;
}

function firstElementOfBlock<T>(rows: readonly ListRow<T>[], headerIndex: number): number | undefined {
  for (let index = headerIndex + 1; index < rows.length && rows[index]?.kind !== "group"; index++) {
    if (rowKey(rows[index]) !== undefined) return index;
  }
  return undefined;
}

function headerAbove<T>(rows: readonly ListRow<T>[], index: number): number {
  for (let cursor = Math.min(index, rows.length - 1); cursor >= 0; cursor--) {
    if (rows[cursor]?.kind === "group") return cursor;
  }
  return -1;
}

/**
 * Forward lands on the first element of the next group. Backward lands on the
 * first element of the current group, or the previous group's when already
 * there. Groups with no selectable element are skipped; edges stay put.
 */
export function blockJumpTarget<T>(
  rows: readonly ListRow<T>[],
  current: number,
  delta: number,
): number | undefined {
  if (current < 0 || rows.length === 0) return undefined;
  const header = headerAbove(rows, current);
  if (header < 0) return undefined;

  const blocks: number[] = [];
  for (let index = 0; index < rows.length; index++) {
    if (rows[index]?.kind === "group" && firstElementOfBlock(rows, index) !== undefined) blocks.push(index);
  }
  const position = blocks.indexOf(header);
  if (position < 0) return undefined;

  if (delta > 0) {
    if (position >= blocks.length - 1) return undefined;
    const next = blocks[position + 1];
    return next === undefined ? undefined : firstElementOfBlock(rows, next);
  }
  const own = firstElementOfBlock(rows, header);
  if (own !== undefined && own < current) return own;
  if (position <= 0) return undefined;
  const previous = blocks[position - 1];
  return previous === undefined ? undefined : firstElementOfBlock(rows, previous);
}

/** The block containing `index`: its header through the row before the next header. */
export function blockRowSpan<T>(rows: readonly ListRow<T>[], index: number): ListRowSpan {
  if (rows.length === 0) return { from: 0, to: 0 };
  const start = Math.min(Math.max(index, 0), rows.length - 1);
  const from = Math.max(headerAbove(rows, start), 0);
  let to = rows.length - 1;
  for (let cursor = start + 1; cursor < rows.length; cursor++) {
    if (rows[cursor]?.kind === "group") {
      to = cursor - 1;
      break;
    }
  }
  return { from, to };
}

/** First selectable element of the last group that has one — the End target. */
export function lastBlockTarget<T>(rows: readonly ListRow<T>[]): number | undefined {
  for (let index = rows.length - 1; index >= 0; index--) {
    if (rows[index]?.kind !== "group") continue;
    const first = firstElementOfBlock(rows, index);
    if (first !== undefined) return first;
  }
  return undefined;
}

/** The header pinned above the body when the top visible row belongs to a group. */
export function stickyHeaderFor<T>(rows: readonly ListRow<T>[], scroll: number): string | undefined {
  const row = rows[scroll];
  if (row === undefined || (row.kind !== "element" && row.kind !== "note")) return undefined;
  const header = headerAbove(rows, scroll);
  const headerRow = header < 0 ? undefined : rows[header];
  return headerRow !== undefined && headerRow.kind === "group" ? headerRow.title : undefined;
}

/** One blank row above the first group while the list is scrolled to the top. */
export function topPaddingRows(scroll: number): number {
  return scroll <= 0 ? 1 : 0;
}

/** Rows of content visible after the padding and any pinned header. */
export function visibleRowCount<T>(rows: readonly ListRow<T>[], bodyHeight: number, scroll: number): number {
  const reserved = topPaddingRows(scroll) + (stickyHeaderFor(rows, scroll) === undefined ? 0 : 1);
  return Math.max(1, bodyHeight - reserved);
}

export function maxScrollFor<T>(rows: readonly ListRow<T>[], bodyHeight: number): number {
  let scroll = Math.max(0, rows.length - 1);
  for (let pass = 0; pass < 8; pass++) {
    const next = Math.max(0, rows.length - visibleRowCount(rows, bodyHeight, scroll));
    if (next === scroll) break;
    scroll = next;
  }
  return scroll;
}

export function clampScroll<T>(
  rows: readonly ListRow<T>[],
  bodyHeight: number,
  scroll: number,
): { readonly scroll: number; readonly visible: number } {
  const bounded = Math.min(Math.max(scroll, 0), maxScrollFor(rows, bodyHeight));
  return { scroll: bounded, visible: visibleRowCount(rows, bodyHeight, bounded) };
}

/**
 * Scroll that brings the selection into view, moving the least it can. A reveal
 * span asks for a whole block; a block taller than the viewport is shown from
 * its header instead.
 */
export function scrollForSelection<T>(
  rows: readonly ListRow<T>[],
  bodyHeight: number,
  scroll: number,
  selected: number,
  reveal?: ListRowSpan,
): number {
  let next = scroll;
  for (let pass = 0; pass < 2; pass++) {
    const visible = visibleRowCount(rows, bodyHeight, next);
    if (selected >= 0) {
      if (reveal && reveal.to - reveal.from < visible) {
        if (reveal.from < next) next = reveal.from;
        if (reveal.to >= next + visible) next = reveal.to - visible + 1;
      } else if (reveal) {
        next = reveal.from;
      } else {
        if (selected < next) next = selected;
        if (selected >= next + visible) next = selected - visible + 1;
      }
    }
    next = clampScroll(rows, bodyHeight, next).scroll;
  }
  return next;
}

export interface ListLayout {
  readonly scroll: number;
  readonly visible: number;
  readonly stickyHeader: string | undefined;
  readonly topPadding: number;
  /** Row indexes rendered in the body, in order. */
  readonly rowIndexes: readonly number[];
}

/** Everything a renderer needs for one frame, derived rather than remembered. */
export function layoutList<T>(
  rows: readonly ListRow<T>[],
  bodyHeight: number,
  scroll: number,
): ListLayout {
  const clamped = clampScroll(rows, bodyHeight, scroll);
  const sticky = stickyHeaderFor(rows, clamped.scroll);
  const padding = topPaddingRows(clamped.scroll);
  const indexes: number[] = [];
  for (let offset = 0; offset < clamped.visible && clamped.scroll + offset < rows.length; offset++) {
    indexes.push(clamped.scroll + offset);
  }
  return {
    scroll: clamped.scroll,
    visible: clamped.visible,
    stickyHeader: sticky,
    topPadding: padding,
    rowIndexes: Object.freeze(indexes),
  };
}
