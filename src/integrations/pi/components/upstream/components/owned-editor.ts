/**
 * Provenance: @earendil-works/pi-coding-agent 0.86.1 (MIT), commit 13cbf77df2396303013a41646bcfa77b4271ae56,
 * packages/coding-agent/src/modes/interactive/components/custom-editor.ts.
 * Modifications: A1-owned class name and synchronized A1 keybinding contract replace the nominal
 * private upstream keybinding constructor dependency; bare A1 injects the shared Settings/agent input
 * frame, transient contextual-suggestion branch, and explicit body geometry for selection and
 * above-prompt autocomplete. Bare A1 also clears a sole top-level slash-command search on Escape. Bare
 * A1 also completes a selected tunnel command with `:` and reopens the menu on its tunnel rows.
 * Deviations: owned-shared-input-frame, above-prompt-autocomplete-placement,
 * clear-command-search-on-escape, command-tunnel-colon-completion.
 */
import {
  CURSOR_MARKER,
  Editor,
  visibleWidth,
  wrapTextWithAnsi,
  type EditorOptions,
  type EditorTheme,
  type TUI,
} from "@earendil-works/pi-tui";
import type { AppKeybinding, KeybindingsManager } from "../adjacent/core/keybindings.js";
import type { EditorSurface } from "../../editor-interaction.js";
import type { PiShellPromptInputPresentation } from "../../prompt-input-port.js";

const PROMPT_GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export interface OwnedEditorOptions extends EditorOptions {
  readonly persistentHistory?: boolean;
  readonly styleHistoryLabel?: (text: string) => string;
  readonly inputPresentation?: PiShellPromptInputPresentation;
  readonly styleSuggestion?: (text: string) => string;
  readonly styleSuggestionCaret?: (text: string) => string;
  readonly terminalRows?: () => number;
  /** Reuses the editor's established atomic-aware visual layout when available. */
  readonly getVisualLineCount?: (width: number) => number | undefined;
  /** Bare-A1 exception: Escape on a sole top-level slash-command search also clears the prompt. */
  readonly clearCommandSearchOnEscape?: boolean;
  /**
   * Bare-A1 exception: the slash commands that own a `:` tunnel. Typing `:` while one of them is
   * the selected row of a sole top-level search completes to `/<command>:` and reopens the menu.
   */
  readonly commandTunnels?: () => readonly string[];
}

export interface ShellEditorInstance extends EditorSurface {
  readonly actionHandlers: Map<AppKeybinding, () => void>;
  onEscape?: () => void;
  onCtrlD?: () => void;
  onPasteImage?: () => void;
  onExtensionShortcut?: (data: string) => boolean;
  onPromptSuggestionAccepted?: (text: string) => void;
  /** Border-inclusive body height from the most recent render, excluding autocomplete. */
  getRenderedBodyRowCount(): number;
  setPromptSuggestion(text: string | null): void;
  canPresentPromptSuggestion(): boolean;
  onAction(action: AppKeybinding, handler: () => void): void;
}

type EditorConstructor = new (tui: TUI, theme: EditorTheme, options?: EditorOptions) => EditorSurface;
type ShellEditorConstructor = new (tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager, options?: OwnedEditorOptions) => ShellEditorInstance;

export function createOwnedEditorClass(Base: EditorConstructor): ShellEditorConstructor {
return class extends Base {
  readonly actionHandlers = new Map<AppKeybinding, () => void>();
  onEscape?: () => void;
  onCtrlD?: () => void;
  onPasteImage?: () => void;
  onExtensionShortcut?: (data: string) => boolean;
  onPromptSuggestionAccepted?: (text: string) => void;
  #promptSuggestion: string | null = null;
  readonly #inputPresentation: PiShellPromptInputPresentation | undefined;
  readonly #styleSuggestion: (text: string) => string;
  readonly #styleSuggestionCaret: (text: string) => string;
  readonly #terminalRows: () => number;
  readonly #getVisualLineCount: ((width: number) => number | undefined) | undefined;
  readonly #clearCommandSearchOnEscape: boolean;
  readonly #commandTunnels: () => readonly string[];
  #renderedBodyRowCount = 0;

  private readonly keybindings: KeybindingsManager;
  constructor(tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager, options: OwnedEditorOptions = {}) {
    super(tui, theme, options);
    this.keybindings = keybindings;
    this.#inputPresentation = options.inputPresentation;
    this.#styleSuggestion = options.styleSuggestion ?? (text => text);
    this.#styleSuggestionCaret = options.styleSuggestionCaret ?? (text => `\u001b[7m${text}\u001b[27m`);
    this.#terminalRows = options.terminalRows ?? (() => 24);
    this.#getVisualLineCount = options.getVisualLineCount;
    this.#clearCommandSearchOnEscape = options.clearCommandSearchOnEscape === true;
    this.#commandTunnels = options.commandTunnels ?? (() => []);
  }

  getRenderedBodyRowCount(): number { return this.#renderedBodyRowCount; }

  setPromptSuggestion(text: string | null): void {
    this.#promptSuggestion = text;
  }

  canPresentPromptSuggestion(): boolean {
    return this.#inputPresentation !== undefined
      && this.focused
      && !this.disableSubmit
      && this.getText().length === 0
      && !this.isShowingAutocomplete();
  }

  /** True when autocomplete is searching one space-free slash command that is the editor's only content. */
  isTopLevelCommandSearch(): boolean {
    if (!this.isShowingAutocomplete()) return false;
    const text = this.getText();
    if (!/^\/\S*$/.test(text)) return false;
    const cursor = this.getCursor();
    return cursor.line === 0 && cursor.col === text.length;
  }

  override render(width: number): string[] {
    if (this.#inputPresentation === undefined) {
      const rows = super.render(width);
      this.#renderedBodyRowCount = this.#getVisualLineCount === undefined ? rows.length : this.#measureBodyRows(width);
      return rows;
    }
    if (this.#promptSuggestion !== null && this.canPresentPromptSuggestion()) {
      const rows = this.#renderSuggestion(width);
      this.#renderedBodyRowCount = rows.length;
      return rows;
    }
    return this.#renderPrefixedEditor(width);
  }

  onAction(action: AppKeybinding, handler: () => void): void { this.actionHandlers.set(action, handler); }

  handleInput(data: string): void {
    if (this.onExtensionShortcut?.(data)) return;
    if (data === ":" && this.#completeSelectedCommandTunnel()) return;
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
      } else if (this.#clearCommandSearchOnEscape && this.isTopLevelCommandSearch()) {
        // Escape on a bare slash-command search restores the empty prompt instead of only closing the menu.
        this.setText("");
        return;
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

  /**
   * Replace a sole top-level slash search whose selected row is a tunnel command with `/<command>:`
   * and reopen the menu on the tunnel rows. The replacement goes through the public setText, which
   * records the undo snapshot; every other colon stays ordinary text.
   */
  #completeSelectedCommandTunnel(): boolean {
    if (!this.isTopLevelCommandSearch()) return false;
    const selected = selectedAutocompleteValue(this);
    if (selected === undefined || !this.#commandTunnels().includes(selected)) return false;
    this.setText(`/${selected}:`);
    triggerAutocomplete(this);
    return true;
  }

  #renderSuggestion(width: number): string[] {
    const presentation = this.#inputPresentation!;
    const { paddingX, contentWidth, layoutWidth } = presentation.geometry(width, this.getPaddingX());
    const chunks = wrapTextWithAnsi(this.#promptSuggestion ?? "", layoutWidth).map(text => ({ text }));
    const maxVisible = Math.max(5, Math.floor(this.#terminalRows() * 0.3));
    const visible = chunks.slice(0, maxVisible);
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
      return `${leftPadding}${content}${padding}${rightPadding}`;
    });
    return presentation.render(width, () => ({ rows }));
  }

  #renderPrefixedEditor(width: number): string[] {
    return this.#inputPresentation!.render(width, innerWidth => {
      const rows = super.render(innerWidth);
      this.#renderedBodyRowCount = this.#measureBodyRows(innerWidth);
      const bottomBorder = this.#renderedBodyRowCount - 1;
      return {
        rows: rows.slice(1, bottomBorder),
        topRule: rows[0],
        bottomRule: rows[bottomBorder],
        after: rows.slice(bottomBorder + 1),
      };
    }, true, this.getPaddingX());
  }

  #measureBodyRows(width: number): number {
    const padding = Math.min(this.getPaddingX(), Math.max(0, Math.floor((width - 1) / 2)));
    const contentWidth = Math.max(1, width - padding * 2);
    const layoutWidth = Math.max(1, contentWidth - (padding ? 0 : 1));
    // Invariant: split by editor layout, never by styled border or completion text.
    const lineCount = this.#getVisualLineCount?.(layoutWidth)
      ?? this.getLines().reduce((count, line) => count + wrapTextWithAnsi(line, layoutWidth).length, 0);
    return Math.min(Math.max(1, lineCount), Math.max(5, Math.floor(this.#terminalRows() * 0.3))) + 2;
  }
};
}

export class OwnedEditor extends createOwnedEditorClass(Editor) {}

/** The value of the row the open autocomplete list highlights, read from either editor's list. */
function selectedAutocompleteValue(editor: EditorSurface): string | undefined {
  const list: unknown = Reflect.get(editor, "autocompleteList");
  if (typeof list !== "object" || list === null) return undefined;
  const getSelectedItem: unknown = Reflect.get(list, "getSelectedItem");
  if (typeof getSelectedItem !== "function") return undefined;
  const item: unknown = getSelectedItem.call(list);
  if (typeof item !== "object" || item === null) return undefined;
  const value: unknown = Reflect.get(item, "value");
  return typeof value === "string" ? value : undefined;
}

/** Request the slash-command menu for the current text, as typing a command character would. */
function triggerAutocomplete(editor: EditorSurface): void {
  const trigger: unknown = Reflect.get(editor, "tryTriggerAutocomplete");
  if (typeof trigger === "function") trigger.call(editor);
}
