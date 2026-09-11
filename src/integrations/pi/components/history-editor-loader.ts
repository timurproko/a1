import { createOwnedEditorClass, type ShellEditorInstance, type OwnedEditorOptions } from "./upstream/components/owned-editor.js";
import type { EditorTheme, TUI } from "#pi-tui";
import type { KeybindingsManager } from "./upstream/adjacent/core/keybindings.js";

export type HistoryEditorConstructor = new (tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager, options?: OwnedEditorOptions) => ShellEditorInstance;

export async function loadHistoryEditor(): Promise<HistoryEditorConstructor> {
  const { HistoryEditorCore } = await import("./upstream/history/editor-core.js");
  return createOwnedEditorClass(HistoryEditorCore);
}
