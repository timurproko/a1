import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { CustomEditor, getSelectListTheme } from "@earendil-works/pi-coding-agent";
import { CombinedAutocompleteProvider } from "@earendil-works/pi-tui";

const COMMANDS = [
  ["settings", "Open settings menu"], ["model", "Select model (opens selector UI)"], ["scoped-models", "Enable/disable models for Ctrl+P cycling"],
  ["export", "Export session"], ["import", "Import and resume a session"], ["share", "Share session"], ["copy", "Copy last agent message"],
  ["name", "Set session display name"], ["session", "Show session info and stats"], ["changelog", "Show changelog entries"],
  ["hotkeys", "Show all keyboard shortcuts"], ["fork", "Create a new fork"], ["clone", "Duplicate the current session"],
  ["tree", "Navigate session tree"], ["trust", "Save project trust decision"], ["login", "Configure provider authentication"],
  ["logout", "Remove provider authentication"], ["new", "Start a new session"], ["compact", "Manually compact the session context"],
  ["resume", "Resume a different session"], ["reload", "Reload resources"], ["quit", "Quit pi"],
  ["deploy", "Prompt template"], ["skill:review", "Skill"], ["artifact", "Extension command"],
] as const;

export async function createPinnedEditorHarness(agentDir: string) {
  const path = resolve("node_modules/@earendil-works/pi-coding-agent/dist/core/keybindings.js");
  const module = await import(pathToFileURL(path).href) as {
    KeybindingsManager: { create(agentDir?: string): PinnedKeybindings };
  };
  const themePath = resolve("node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js");
  const themeModule = await import(pathToFileURL(themePath).href) as {
    initTheme(name: string, watcher: boolean): void;
    theme: { fg(color: string, value: string): string };
  };
  themeModule.initTheme("dark", false);
  const logs: string[] = [];
  const editor = new CustomEditor(tuiFacade(), {
    borderColor: value => themeModule.theme.fg("borderMuted", value),
    selectList: getSelectListTheme(),
  }, module.KeybindingsManager.create(agentDir) as never, { paddingX: 0, autocompleteMaxVisible: 5 });
  editor.setAutocompleteProvider(new CombinedAutocompleteProvider(
    COMMANDS.map(([name, description]) => ({ name, description })),
    "D:/work",
  ));
  editor.onSubmit = text => logs.push(`submit:${text}`);
  editor.onEscape = () => logs.push("interrupt");
  editor.onCtrlD = () => logs.push("exit");
  editor.onPasteImage = () => logs.push("paste-image");
  editor.onExtensionShortcut = data => data === "\u000b" ? (logs.push("extension"), true) : false;
  editor.onAction("app.clear", () => logs.push("clear"));
  editor.onAction("app.model.cycleForward", () => logs.push("model-forward"));
  editor.onAction("app.message.followUp", () => logs.push("follow-up"));
  editor.onAction("app.message.copy", () => logs.push("copy"));
  editor.onAction("app.editor.external", () => logs.push("external"));
  return { editor, logs, keybindings: module.KeybindingsManager.create(agentDir) };
}

interface PinnedKeybindings {
  getEffectiveConfig(): unknown;
  getConflicts(): unknown;
}

function tuiFacade(): never {
  return {
    terminal: { kittyProtocolActive: false, columns: 48, rows: 16 },
    requestRender() {}, invalidate() {},
    get columns() { return 80; }, get rows() { return 24; },
  } as never;
}
