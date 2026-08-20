/**
 * Adapted from @earendil-works/pi-coding-agent 0.84.2
 * packages/coding-agent/src/modes/interactive/components/custom-editor.ts (MIT).
 * Modifications: A1-owned class name and A1-owned synchronized keybinding contract.
 */
import { Editor, type EditorOptions, type EditorTheme, type TUI } from "@earendil-works/pi-tui";
import type { AppKeybinding, KeybindingsManager } from "../adjacent/core/keybindings.js";

export class OwnedEditor extends Editor {
  readonly actionHandlers = new Map<AppKeybinding, () => void>();
  onEscape?: () => void;
  onCtrlD?: () => void;
  onPasteImage?: () => void;
  onExtensionShortcut?: (data: string) => boolean;

  constructor(tui: TUI, theme: EditorTheme, private readonly keybindings: KeybindingsManager, options?: EditorOptions) {
    super(tui, theme, options);
  }

  onAction(action: AppKeybinding, handler: () => void): void { this.actionHandlers.set(action, handler); }

  handleInput(data: string): void {
    if (this.onExtensionShortcut?.(data)) return;
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
}
