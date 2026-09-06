/**
 * Adapted from @earendil-works/pi-coding-agent 0.84.2
 * packages/coding-agent/src/modes/interactive/components/custom-editor.ts (MIT).
 * Modifications: A1-owned class name, synchronized keybinding contract, and a semantic
 * bare-A1 prompt-prefix/contextual-suggestion presentation branch.
 */
import {
  CURSOR_MARKER,
  Editor,
  truncateToWidth,
  visibleWidth,
  wrapTextWithAnsi,
  type EditorOptions,
  type EditorTheme,
  type TUI,
} from "#pi-tui";
import type { AppKeybinding, KeybindingsManager } from "../adjacent/core/keybindings.js";

const PROMPT_GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export interface OwnedEditorOptions extends EditorOptions {
  readonly promptPrefix?: string;
  readonly styleSuggestion?: (text: string) => string;
  readonly styleSuggestionCaret?: (text: string) => string;
  readonly terminalRows?: () => number;
}

export class OwnedEditor extends Editor {
  readonly actionHandlers = new Map<AppKeybinding, () => void>();
  onEscape?: () => void;
  onCtrlD?: () => void;
  onPasteImage?: () => void;
  onExtensionShortcut?: (data: string) => boolean;
  onPromptSuggestionAccepted?: (text: string) => void;
  #promptSuggestion: string | null = null;
  readonly #promptPrefix: string;
  readonly #styleSuggestion: (text: string) => string;
  readonly #styleSuggestionCaret: (text: string) => string;
  readonly #terminalRows: () => number;

  constructor(tui: TUI, theme: EditorTheme, private readonly keybindings: KeybindingsManager, options: OwnedEditorOptions = {}) {
    super(tui, theme, options);
    this.#promptPrefix = options.promptPrefix ?? "";
    this.#styleSuggestion = options.styleSuggestion ?? (text => text);
    this.#styleSuggestionCaret = options.styleSuggestionCaret ?? (text => `\u001b[7m${text}\u001b[27m`);
    this.#terminalRows = options.terminalRows ?? (() => 24);
  }

  setPromptSuggestion(text: string | null): void {
    this.#promptSuggestion = text;
  }

  canPresentPromptSuggestion(): boolean {
    return this.#promptPrefix.length > 0
      && this.focused
      && !this.disableSubmit
      && this.getText().length === 0
      && !this.isShowingAutocomplete();
  }

  override setText(text: string): void {
    if (text.length > 0) this.#promptSuggestion = null;
    super.setText(text);
  }

  override render(width: number): string[] {
    if (this.#promptPrefix.length === 0) return super.render(width);
    if (this.#promptSuggestion !== null && this.canPresentPromptSuggestion()) {
      return this.#renderSuggestion(width);
    }
    return this.#renderPrefixedEditor(width);
  }

  onAction(action: AppKeybinding, handler: () => void): void { this.actionHandlers.set(action, handler); }

  handleInput(data: string): void {
    if (this.onExtensionShortcut?.(data)) return;
    if (this.#promptSuggestion !== null
      && !this.isShowingAutocomplete()
      && this.canPresentPromptSuggestion()
      && this.keybindings.matches(data, "tui.input.submit")) {
      return;
    }
    if (this.#promptSuggestion !== null
      && !this.isShowingAutocomplete()
      && this.canPresentPromptSuggestion()
      && this.keybindings.matches(data, "tui.input.tab")) {
      const accepted = this.#promptSuggestion;
      this.#promptSuggestion = null;
      super.setText(accepted);
      this.onPromptSuggestionAccepted?.(accepted);
      return;
    }
    if (this.keybindings.matches(data, "app.clipboard.pasteImage")) { this.onPasteImage?.(); return; }
    if (this.keybindings.matches(data, "app.interrupt")) {
      if (!this.isShowingAutocomplete()) {
        const handler = this.onEscape ?? this.actionHandlers.get("app.interrupt");
        if (handler) { handler(); return; }
      }
      super.handleInput(data);
      return;
    }
    if (this.keybindings.matches(data, "app.exit") && this.getText().length === 0) {
      const handler = this.onCtrlD ?? this.actionHandlers.get("app.exit");
      if (handler) handler();
      return;
    }
    if (this.keybindings.matches(data, "tui.editor.historyPrevious") || this.keybindings.matches(data, "tui.editor.historyNext")) {
      super.handleInput(data);
      return;
    }
    for (const [action, handler] of this.actionHandlers) {
      if (action !== "app.interrupt" && action !== "app.exit" && this.keybindings.matches(data, action)) { handler(); return; }
    }
    super.handleInput(data);
  }

  #renderSuggestion(width: number): string[] {
    const prefixWidth = visibleWidth(this.#promptPrefix);
    const innerWidth = Math.max(1, width - prefixWidth);
    const maxPadding = Math.max(0, Math.floor((innerWidth - 1) / 2));
    const paddingX = Math.min(this.getPaddingX(), maxPadding);
    const contentWidth = Math.max(1, innerWidth - paddingX * 2);
    const layoutWidth = Math.max(1, contentWidth - (paddingX ? 0 : 1));
    const chunks = wrapTextWithAnsi(this.#promptSuggestion ?? "", layoutWidth).map(text => ({ text }));
    const maxVisible = Math.max(5, Math.floor(this.#terminalRows() * 0.3));
    const visible = chunks.slice(0, maxVisible);
    const horizontal = this.borderColor("─".repeat(Math.max(0, width)));
    const leftPadding = " ".repeat(paddingX);
    const rightPadding = leftPadding;
    const rows = visible.map((chunk, index) => {
      let content: string;
      if (index === 0) {
        const first = [...PROMPT_GRAPHEMES.segment(chunk.text)][0]?.segment ?? " ";
        const remaining = chunk.text.slice(first === " " && chunk.text.length === 0 ? 0 : first.length);
        const marker = this.focused ? CURSOR_MARKER : "";
        content = `${marker}${this.#styleSuggestionCaret(first)}${this.#styleSuggestion(remaining)}`;
      } else {
        content = this.#styleSuggestion(chunk.text);
      }
      const plainWidth = visibleWidth(chunk.text);
      const padding = " ".repeat(Math.max(0, contentWidth - plainWidth));
      const prefix = index === 0 ? this.#promptPrefix : " ".repeat(prefixWidth);
      return truncateToWidth(`${prefix}${leftPadding}${content}${padding}${rightPadding}`, width);
    });
    return [horizontal, ...rows, horizontal];
  }

  #renderPrefixedEditor(width: number): string[] {
    const prefixWidth = visibleWidth(this.#promptPrefix);
    const innerWidth = Math.max(1, width - prefixWidth);
    const rows = super.render(innerWidth);
    const maxPadding = Math.max(0, Math.floor((innerWidth - 1) / 2));
    const paddingX = Math.min(this.getPaddingX(), maxPadding);
    const contentWidth = Math.max(1, innerWidth - paddingX * 2);
    const layoutWidth = Math.max(1, contentWidth - (paddingX ? 0 : 1));
    const layoutCount = this.getLines().flatMap(line => wrapTextWithAnsi(line, layoutWidth)).length || 1;
    const visibleCount = Math.min(layoutCount, Math.max(5, Math.floor(this.#terminalRows() * 0.3)));
    const bottomBorder = visibleCount + 1;
    return rows.map((row, index) => {
      if (index === 0 || index === bottomBorder) return `${row}${this.borderColor("─".repeat(prefixWidth))}`;
      return `${index === 1 ? this.#promptPrefix : " ".repeat(prefixWidth)}${row}`;
    });
  }
}
