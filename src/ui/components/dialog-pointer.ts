import type { PaneMouseEvent } from "./pane.js";
import type { UiTheme, UiThemeToken } from "./theme.js";

/** One semantic action in the currently painted dialog, in one-based inclusive cells. */
export interface DialogPointerTarget<Key> {
  readonly key: Key;
  readonly row: number;
  readonly columnStart: number;
  readonly columnEnd: number;
}

/** Pointer-only state; keyboard selection and action dispatch remain with the dialog controller. */
export class DialogPointer<Key> {
  #targets: readonly DialogPointerTarget<Key>[] = [];
  #hovered: Key | undefined;

  get hovered(): Key | undefined { return this.#hovered; }

  /** Publish only visible targets from the same layout that produced the frame. */
  replace(targets: readonly DialogPointerTarget<Key>[]): void {
    const old = this.#targets.find(target => target.key === this.#hovered);
    if (old !== undefined && !targets.some(target => target.key === old.key && target.row === old.row
      && target.columnStart === old.columnStart && target.columnEnd === old.columnEnd)) this.clearHover();
    this.#targets = targets;
  }

  /** Returns a clicked semantic key, never a keyboard-navigation instruction. */
  handle(event: PaneMouseEvent): Key | undefined {
    if (event.kind === "wheel-up" || event.kind === "wheel-down") return undefined;
    const target = this.#targets.find(candidate => candidate.row === event.row
      && event.column >= candidate.columnStart && event.column <= candidate.columnEnd);
    this.#hovered = target?.key;
    return event.kind === "press" && event.button === 0 ? target?.key : undefined;
  }

  clearHover(): void { this.#hovered = undefined; }

  /** No old target may act before the next layout after a filter, step, or content change. */
  invalidate(): void { this.#targets = []; this.clearHover(); }

  paint(theme: UiTheme, token: UiThemeToken, text: string, key: Key): string {
    return this.#hovered === key && theme.hover !== undefined ? theme.hover(token, text) : theme.fg(token, text);
  }
}
