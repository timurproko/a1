import { overlaySpan } from "./spans.js";
import { displayWidth, padToWidth } from "./text.js";
import type { UiTheme } from "./theme.js";

/**
 * The menu a value opens: anchored to the row it was opened from, marking what
 * is in effect, highlighting nothing until something is picked, and flipping
 * above its anchor only when it would otherwise run off the bottom.
 */

export interface ValueMenuState {
  /** Values offered, as they should read. */
  readonly choices: readonly string[];
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
  /** Rows available above the footer. */
  readonly bodyHeight: number;
  /** Full surface width, so the menu stays inside it. */
  readonly surfaceWidth: number;
  /** Columns reserved at the right edge, such as a scrollbar rail. */
  readonly reservedRight: number;
}

/** Where the menu is placed: below its anchor where there is room, else above. */
export function valueMenuFrame(
  state: ValueMenuState,
  anchor: ValueMenuAnchor,
  layout: ValueMenuLayout,
): ValueMenuFrame {
  const below = anchor.screenRow + 1;
  const top = below + state.choices.length <= layout.bodyHeight
    ? below
    : Math.max(0, anchor.screenRow - state.choices.length);
  const width = Math.max(...state.choices.map(choice => displayWidth(choice) + 4), 6);
  const column = Math.min(anchor.valueColumn, Math.max(0, layout.surfaceWidth - width - layout.reservedRight));
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
    const prefix = index === state.index ? "→ " : "  ";
    const text = padToWidth(`${prefix}${choice} `, frame.width);
    const painted = index === state.index ? theme.highlight(text) : theme.panel(text);
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
