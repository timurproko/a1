import type { Editor } from "#pi-tui";

export interface EditorInteractionState {
  lines: string[];
  cursorLine: number;
  cursorCol: number;
}

export interface EditorInteractionPort {
  snapshot(): EditorInteractionState;
  setCursor(line: number, col: number): void;
  replaceLines(lines: readonly string[]): void;
  updateUndoStates(update: (state: EditorInteractionState) => void): void;
  scrollOffset(): number;
  visualLines(width: number): Array<{ logicalLine: number; startCol: number; length: number }>;
  setSegmentTransform(transform: (text: string, mode: "word" | "grapheme", segments: Iterable<Intl.SegmentData>) => Iterable<Intl.SegmentData>): void;
}

export interface EditorRecallPort {
  replace(entries: readonly string[]): void;
  position(): { readonly index: number; readonly total: number };
  observe(listener: () => void): () => void;
  reset(): void;
}

export interface EditorSurface extends Pick<Editor, Exclude<keyof Editor, "setText" | "render" | "handleInput">> {
  setText(text: string): void;
  render(width: number): string[];
  handleInput(data: string): void;
  readonly interaction?: EditorInteractionPort;
  readonly recall?: EditorRecallPort;
}

export type SelectionEditor = Pick<Editor, "getText" | "getCursor" | "setText" | "insertTextAtCursor" | "invalidate" | "onChange" | "getPaddingX" | "isShowingAutocomplete"> & {
  readonly interaction?: EditorInteractionPort;
};
