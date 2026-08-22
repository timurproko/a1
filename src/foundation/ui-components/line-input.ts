import { displayWidth, truncateToWidth } from "./text.js";

export type LineInputOutcome =
  | { readonly kind: "editing" }
  | { readonly kind: "accepted"; readonly value: string }
  | { readonly kind: "cancelled" };

export interface LineInputView {
  /** Visible slice of the value, already fitted to the width. */
  readonly text: string;
  /** Zero-based column of the caret within the visible slice. */
  readonly caretColumn: number;
}

const MAX_VALUE_LENGTH = 4_096;

/**
 * A single-line editable value with a caret and horizontal scrolling. Accept and
 * cancel are reported distinctly so a caller can commit or discard; cancelling
 * never changes the caller's value.
 */
export class LineInput {
  #value: string;
  #caret: number;
  #offset = 0;

  constructor(value = "") {
    this.#value = value.slice(0, MAX_VALUE_LENGTH);
    this.#caret = this.#value.length;
  }

  get value(): string {
    return this.#value;
  }

  get caret(): number {
    return this.#caret;
  }

  setValue(value: string): void {
    this.#value = value.slice(0, MAX_VALUE_LENGTH);
    this.#caret = Math.min(this.#caret, this.#value.length);
    this.#offset = 0;
  }

  insert(text: string): void {
    const printable = [...text].filter(character => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 0x20 && code !== 0x7f;
    }).join("");
    if (printable.length === 0) return;
    const next = this.#value.slice(0, this.#caret) + printable + this.#value.slice(this.#caret);
    if (next.length > MAX_VALUE_LENGTH) return;
    this.#value = next;
    this.#caret += printable.length;
  }

  backspace(): void {
    if (this.#caret === 0) return;
    this.#value = this.#value.slice(0, this.#caret - 1) + this.#value.slice(this.#caret);
    this.#caret -= 1;
  }

  deleteForward(): void {
    if (this.#caret >= this.#value.length) return;
    this.#value = this.#value.slice(0, this.#caret) + this.#value.slice(this.#caret + 1);
  }

  moveCaret(delta: number): void {
    this.#caret = Math.min(Math.max(this.#caret + delta, 0), this.#value.length);
  }

  moveCaretToStart(): void {
    this.#caret = 0;
  }

  moveCaretToEnd(): void {
    this.#caret = this.#value.length;
  }

  /** Visible slice for a width, scrolled so the caret stays on screen. */
  view(width: number): LineInputView {
    if (width <= 0) return { text: "", caretColumn: 0 };
    const before = this.#value.slice(0, this.#caret);
    const caretWidth = displayWidth(before);
    if (caretWidth < this.#offset) this.#offset = caretWidth;
    if (caretWidth >= this.#offset + width) this.#offset = caretWidth - width + 1;
    if (this.#offset < 0) this.#offset = 0;

    let start = 0;
    let consumed = 0;
    for (const character of this.#value) {
      if (consumed >= this.#offset) break;
      consumed += displayWidth(character);
      start += character.length;
    }
    return {
      text: truncateToWidth(this.#value.slice(start), width),
      caretColumn: Math.max(0, Math.min(width, caretWidth - this.#offset)),
    };
  }
}

/** Applies one key to the input and reports whether the caller should commit. */
export function handleLineInputKey(input: LineInput, data: string): LineInputOutcome {
  if (data === "\r" || data === "\n") return { kind: "accepted", value: input.value };
  if (data === "" || data === "") return { kind: "cancelled" };
  if (data === "" || data === "\b") {
    input.backspace();
    return { kind: "editing" };
  }
  if (data === "[3~") {
    input.deleteForward();
    return { kind: "editing" };
  }
  if (data === "[D") {
    input.moveCaret(-1);
    return { kind: "editing" };
  }
  if (data === "[C") {
    input.moveCaret(1);
    return { kind: "editing" };
  }
  if (data === "[H" || data === "") {
    input.moveCaretToStart();
    return { kind: "editing" };
  }
  if (data === "[F" || data === "") {
    input.moveCaretToEnd();
    return { kind: "editing" };
  }
  input.insert(data);
  return { kind: "editing" };
}

/**
 * The prompt the reference draws at the head of an input row, in the grey it
 * uses for one (#9AA0A6), painted foreground-only so anything drawn behind the
 * row survives.
 */
/** A rule drawn in the prompt's own grey, as the reference rules an input row. */
export function promptRule(width: number): string {
  return `[38;2;154;160;166m${"─".repeat(Math.max(0, width))}[39m`;
}

export const PROMPT_GLYPH = `[38;2;154;160;166m❯[39m `;

/**
 * The caret the reference draws: the cell under it is reversed rather than given
 * a colour of its own, so it reads as a block in whatever theme is in use.
 */
export function caretCell(text: string): string {
  return `[7m${text}[27m`;
}
