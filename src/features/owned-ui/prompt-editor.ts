import type { OwnedUiEditorState } from "../../foundation/owned-ui-contracts/index.js";
import type { OwnedTerminalComponent, OwnedTerminalInput, OwnedTerminalViewport } from "./terminal-runtime.js";
import { sanitizeLines } from "./terminal-runtime.js";

export interface OwnedPromptEditorHandlers {
  readonly onSubmit?: (text: string) => void;
  readonly onCancel?: () => void;
  readonly onQueue?: (text: string) => void;
  readonly onRequestRender?: () => void;
}

const PROMPT = "> ";

export class OwnedPromptEditor implements OwnedTerminalComponent {
  readonly id = "editor";
  focused = true;
  #text = "";
  #cursorOffset = 0;
  #selection: { start: number; end: number } | null = null;
  #history: string[] = [];
  #queuedSubmissions: string[] = [];
  #busy = false;
  #historyRevision = 0;
  readonly #handlers: OwnedPromptEditorHandlers;

  constructor(handlers: OwnedPromptEditorHandlers = {}) {
    this.#handlers = handlers;
  }

  state(): OwnedUiEditorState {
    return {
      text: this.#text,
      queuedSubmissions: [...this.#queuedSubmissions],
      selection: this.#selection === null ? null : { ...this.#selection },
      cursorOffset: this.#cursorOffset,
      historyRevision: this.#historyRevision,
      submitEnabled: true,
    };
  }

  setBusy(busy: boolean): void {
    this.#busy = busy;
    this.#requestRender();
  }

  setQueuedSubmissions(submissions: readonly string[]): void {
    this.#queuedSubmissions = [...submissions];
    this.#requestRender();
  }

  setText(text: string): void {
    this.#replaceText(text, text.length);
  }

  getText(): string {
    return this.#text;
  }

  selectAll(): void {
    this.#selection = this.#text.length > 0 ? { start: 0, end: this.#text.length } : null;
    this.#requestRender();
  }

  clearSelection(): void {
    this.#selection = null;
    this.#requestRender();
  }

  selectedText(): string {
    return this.#selection ? this.#text.slice(this.#selection.start, this.#selection.end) : "";
  }

  copySelection(writeClipboard: (text: string) => void): boolean {
    const selected = this.selectedText();
    if (!selected) return false;
    writeClipboard(selected);
    return true;
  }

  paste(text: string): void {
    this.#insert(text.replaceAll("\r\n", "\n").replaceAll("\r", "\n"));
  }

  handleInput(input: OwnedTerminalInput): boolean {
    switch (input.type) {
      case "text":
        this.#insert(input.text);
        return true;
      case "paste":
        this.paste(input.text);
        return true;
      case "key":
        return this.#handleKey(input.key, input.ctrl);
      case "resize":
        this.#requestRender();
        return false;
    }
  }

  invalidate(): void {
    this.#requestRender();
  }

  dispose(): void {
    this.#history = [];
    this.#queuedSubmissions = [];
    this.#selection = null;
  }

  render(viewport: OwnedTerminalViewport): readonly string[] {
    const available = Math.max(1, viewport.columns - PROMPT.length);
    const renderedText = this.#text.replaceAll("\t", "  ");
    const rows: string[] = [];
    if (renderedText.length === 0) {
      rows.push(`${PROMPT}${this.#busy ? "…" : ""}`);
    } else {
      for (let offset = 0; offset < renderedText.length; offset += available) {
        rows.push(`${offset === 0 ? PROMPT : "  "}${renderedText.slice(offset, offset + available)}`);
      }
    }
    for (const queued of this.#queuedSubmissions.slice(0, 3)) {
      rows.push(`  queued: ${queued.replaceAll("\n", " ⏎ ")}`);
    }
    if (this.#queuedSubmissions.length > 3) rows.push(`  … ${this.#queuedSubmissions.length - 3} more queued`);
    return sanitizeLines(rows, viewport.columns);
  }

  #handleKey(key: string, ctrl: boolean): boolean {
    if (ctrl && key === "c") {
      if (this.#selection !== null) {
        this.clearSelection();
      } else {
        this.#handlers.onCancel?.();
      }
      return true;
    }
    switch (key) {
      case "enter":
        this.#submit();
        return true;
      case "backspace":
        this.#backspace();
        return true;
      case "left":
        this.#cursorOffset = Math.max(0, this.#cursorOffset - 1);
        this.#selection = null;
        this.#requestRender();
        return true;
      case "right":
        this.#cursorOffset = Math.min(this.#text.length, this.#cursorOffset + 1);
        this.#selection = null;
        this.#requestRender();
        return true;
      case "home":
        this.#cursorOffset = 0;
        this.#selection = null;
        this.#requestRender();
        return true;
      case "end":
        this.#cursorOffset = this.#text.length;
        this.#selection = null;
        this.#requestRender();
        return true;
      default:
        return false;
    }
  }

  #submit(): void {
    const text = this.#text;
    if (text.trim().length === 0) return;
    this.#remember();
    this.#text = "";
    this.#cursorOffset = 0;
    this.#selection = null;
    if (this.#busy) {
      this.#queuedSubmissions.push(text);
      this.#handlers.onQueue?.(text);
    } else {
      this.#handlers.onSubmit?.(text);
    }
    this.#requestRender();
  }

  #insert(text: string): void {
    if (text.length === 0) return;
    this.#remember();
    if (this.#selection) {
      this.#text = this.#text.slice(0, this.#selection.start) + text + this.#text.slice(this.#selection.end);
      this.#cursorOffset = this.#selection.start + text.length;
      this.#selection = null;
    } else {
      this.#text = this.#text.slice(0, this.#cursorOffset) + text + this.#text.slice(this.#cursorOffset);
      this.#cursorOffset += text.length;
    }
    this.#requestRender();
  }

  #backspace(): void {
    if (this.#selection) {
      this.#remember();
      this.#text = this.#text.slice(0, this.#selection.start) + this.#text.slice(this.#selection.end);
      this.#cursorOffset = this.#selection.start;
      this.#selection = null;
      this.#requestRender();
      return;
    }
    if (this.#cursorOffset === 0) return;
    this.#remember();
    this.#text = this.#text.slice(0, this.#cursorOffset - 1) + this.#text.slice(this.#cursorOffset);
    this.#cursorOffset -= 1;
    this.#requestRender();
  }

  #replaceText(text: string, cursorOffset: number): void {
    this.#remember();
    this.#text = text;
    this.#cursorOffset = cursorOffset;
    this.#selection = null;
    this.#requestRender();
  }

  #remember(): void {
    this.#history.push(this.#text);
    if (this.#history.length > 100) this.#history.shift();
    this.#historyRevision += 1;
  }

  #requestRender(): void {
    this.#handlers.onRequestRender?.();
  }
}
