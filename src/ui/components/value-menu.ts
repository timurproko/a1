import { overlaySpan } from "./spans.js";
import { displayWidth, padToWidth } from "./text.js";
import type { UiTheme } from "./theme.js";

/**
 * The menu a value opens: anchored to the row it was opened from, marking what
 * is in effect, highlighting nothing until something is picked, and laid over
 * its anchor so the value in effect stays where it was read.
 */

export interface ValueMenuState {
  /** Values offered, as they should read. */
  readonly choices: readonly string[];
  /** Optional already-painted square previews, aligned before each choice label. */
  readonly previews?: readonly string[];
  /** The value in effect, marked rather than highlighted. */
  readonly current: string | null;
  /** The entry picked by a key or the pointer, or -1 while none is. */
  readonly index: number;
}

export interface ValueMenuAnchor {
  /** Row the menu was opened from, which it keeps even as the selection moves. */
  readonly screenRow: number;
  /** Column the values start at. */
  readonly valueColumn: number;
}

/** Where a menu sits on screen, for reading a pointer against it. */
export interface ValueMenuFrame {
  readonly top: number;
  readonly column: number;
  readonly width: number;
  readonly rows: number;
}

export interface ValueMenuLayout {
  /** First screen row available to the menu. Defaults to zero. */
  readonly bodyTop?: number;
  /** Rows available between the fixed header and footer. */
  readonly bodyHeight: number;
  /** Full surface width, so the menu stays inside it. */
  readonly surfaceWidth: number;
  /** Columns reserved at the right edge, such as a scrollbar rail. */
  readonly reservedRight: number;
}

/**
 * Where the menu is placed: over its anchor, so the value in effect sits on the very
 * row it was read from, shifted only as far as the body edges require.
 */
export function valueMenuFrame(
  state: ValueMenuState,
  anchor: ValueMenuAnchor,
  layout: ValueMenuLayout,
): ValueMenuFrame {
  const bodyTop = layout.bodyTop ?? 0;
  const bodyBottom = bodyTop + layout.bodyHeight;
  const currentIndex = Math.max(0, state.current === null ? 0 : state.choices.indexOf(state.current));
  const top = Math.max(bodyTop, Math.min(anchor.screenRow - currentIndex, bodyBottom - state.choices.length));
  const previewWidth = Math.max(0, ...(state.previews ?? []).map(displayWidth));
  const previewColumns = previewWidth === 0 ? 0 : previewWidth + 1;
  const width = Math.max(...state.choices.map(choice => displayWidth(choice) + previewColumns + 4), 6);
  // Invariant: rows reserve two cells for the effective-value mark and, when present,
  // a preview plus one gap. Choice text remains aligned with the source value column.
  const column = Math.min(Math.max(0, anchor.valueColumn - 2 - previewColumns), Math.max(0, layout.surfaceWidth - width - layout.reservedRight));
  return { top, column, width, rows: state.choices.length };
}

/** Draws the menu over the rows behind it, leaving them otherwise untouched. */
export function renderValueMenu(
  lines: readonly string[],
  state: ValueMenuState,
  frame: ValueMenuFrame,
  theme: UiTheme,
): readonly string[] {
  const output = [...lines];
  state.choices.forEach((choice, index) => {
    const target = frame.top + index;
    if (target < 0 || target >= output.length) return;
    const active = index === state.index;
    const paint = active ? theme.highlight : theme.panel;
    const current = choice === state.current;
    const previews = state.previews ?? [];
    const previewWidth = Math.max(0, ...previews.map(displayWidth));
    const preview = previewWidth === 0 ? "" : `${padToWidth(previews[index] ?? "", previewWidth)} `;
    // Invariant: the current-value check stays on ordinary text while the optional
    // square carries the palette color; the row treatment supplies only its surface.
    const tail = padToWidth(`${current ? " " : "  "}${preview}${choice} `, frame.width - (current ? 1 : 0));
    const painted = current
      ? `${paint(theme.fg("text", "✓"))}${paint(tail)}`
      : paint(tail);
    output[target] = overlaySpan(output[target] ?? "", frame.column, frame.column + frame.width, painted);
  });
  return output;
}

/** Whether a pointer report lands inside the menu rather than behind it. */
export function menuRowAt(frame: ValueMenuFrame, row: number, column: number): number | null {
  const at = row - frame.top;
  if (at < 0 || at >= frame.rows) return null;
  return column > frame.column && column <= frame.column + frame.width ? at : null;
}
