import { getSelectListTheme } from "@earendil-works/pi-coding-agent";
import {
  CombinedAutocompleteProvider,
  matchesKey,
  setKeybindings,
  visibleWidth,
  type AutocompleteProvider,
} from "#pi-tui";
import { PROMPT_HISTORY_EDITOR_REPLACEMENT, type OwnedUiThinkingLevel } from "../../../contracts/owned-ui/index.js";
import { KeybindingsManager } from "./upstream/adjacent/core/keybindings.js";
import { OwnedEditor, type ShellEditorInstance } from "./upstream/components/owned-editor.js";
import {
  OwnedEditorUxInterception,
  createPromptSelectionInterceptor,
  editorVisualLineCount,
} from "./owned-editor-ux.js";
import {
  PINNED_PI_LAYOUT,
  piTheme,
} from "./theme.js";
import {
  createTuiFacade,
  ensureTheme,
  isAutocompleteProvider,
  type PiShellEditorPort,
  type PiShellAutocompleteCommand,
  type PiShellEditorOptions,
} from "./shell-shared-facade.js";

export const PINNED_PI_BUILTIN_SLASH_COMMANDS = [
  { name: "settings", description: "Open settings menu" },
  { name: "model", description: "Select model (opens selector UI)", argumentHint: "<provider/model>" },
  { name: "scoped-models", description: "Enable/disable models for Ctrl+P cycling" },
  { name: "export", description: "Export session (HTML default, or specify path: .html/.jsonl)" },
  { name: "import", description: "Import and resume a session from a JSONL file" },
  { name: "share", description: "Share session as a secret GitHub gist" },
  { name: "copy", description: "Copy last agent message to clipboard" },
  { name: "name", description: "Set session display name" },
  { name: "session", description: "Show session info and stats" },
  { name: "changelog", description: "Show changelog entries" },
  { name: "hotkeys", description: "Show all keyboard shortcuts" },
  { name: "fork", description: "Create a new fork from a previous user message" },
  { name: "clone", description: "Duplicate the current session at the current position" },
  { name: "tree", description: "Navigate session tree (switch branches)" },
  { name: "trust", description: "Save project trust decision for future sessions" },
  { name: "login", description: "Configure provider authentication", argumentHint: "<provider>" },
  { name: "logout", description: "Remove provider authentication" },
  { name: "new", description: "Start a new session" },
  { name: "compact", description: "Manually compact the session context" },
  { name: "resume", description: "Resume a different session" },
  { name: "reload", description: "Reload keybindings, extensions, skills, prompts, themes, and context files" },
  { name: "quit", description: "Quit pi" },
];

export function createPiShellEditor(options: PiShellEditorOptions): PiShellEditorPort {
  ensureTheme();
  const tui = createTuiFacade(options);
  const inputPresentation = options.keybindingProfile === "a1" ? options.promptPresentation?.input : undefined;
  const keybindings = options.keybindingProfile === "a1"
    ? KeybindingsManager.createForOwnedInput(options.agentDir)
    : KeybindingsManager.create(options.agentDir);
  setKeybindings(keybindings);
  if (options.persistentHistory === true && options.keybindingProfile === "a1" && options.historyEditor === undefined) {
    throw new Error("Persistent history requires the loaded owned editor");
  }
  const scrollInfo: { emitted: boolean; counter: string | undefined } = { emitted: false, counter: undefined };
  const selectListTheme = getSelectListTheme();
  const EditorClass = options.keybindingProfile === "a1" && options.persistentHistory === true ? options.historyEditor! : OwnedEditor;
  const editor: ShellEditorInstance = new EditorClass(tui, {
    borderColor: (value: string) => inputPresentation === undefined ? piTheme().fg("borderMuted", value) : inputPresentation.styleRule(value),
    selectList: options.keybindingProfile !== "a1" ? selectListTheme : {
      ...selectListTheme,
      scrollInfo: text => {
        // Protocol: the pinned list emits its final counter row through this callback.
        scrollInfo.emitted = true;
        scrollInfo.counter = /^  \((\d+\/\d+)\)$/u.exec(text)?.[1];
        return selectListTheme.scrollInfo(text);
      },
    },
  }, keybindings, {
    paddingX: PINNED_PI_LAYOUT.editorPaddingX,
    autocompleteMaxVisible: PINNED_PI_LAYOUT.autocompleteMaxVisible,
    persistentHistory: options.persistentHistory === true,
    styleHistoryLabel: text => piTheme().fg("dim", text),
    ...(options.keybindingProfile === "a1" ? {
      terminalRows: options.getRows,
      getVisualLineCount: (width: number) => editorVisualLineCount(editor, width),
    } : {}),
    ...(options.keybindingProfile === "a1" && options.promptPresentation !== undefined ? {
      ...(inputPresentation === undefined ? {} : { inputPresentation }),
      styleSuggestion: options.promptPresentation.styleSuggestion,
      styleSuggestionCaret: options.promptPresentation.styleSuggestionCaret,
    } : {}),
  });
  const editorUx = options.keybindingProfile === "a1"
    ? new OwnedEditorUxInterception([
        createPromptSelectionInterceptor(editor, keybindings, {
          copyText: options.onCopyText ?? (() => {}),
          readClipboardContent: options.readClipboardContent ?? (async () => null),
          ...(options.beginClipboardPaste === undefined ? {} : { beginClipboardPaste: options.beginClipboardPaste }),
          transformPastedContent: options.transformPastedContent ?? (content => content.kind === "text" ? content.text : ""),
          atomicRanges: options.editorAtomicRanges ?? (() => []),
          hiddenRanges: options.editorHiddenRanges ?? (() => []),
          expandCopiedText: options.expandCopiedEditorText ?? (text => text),
          paintSelection: options.paintEditorSelection ?? (line => line),
          decorateRow: options.decorateEditorRow ?? (row => row),
          requestRender: options.requestRender,
          getRows: options.getRows,
          ...(inputPresentation === undefined ? {} : { promptGeometry: (width: number, padding: number) => inputPresentation.geometry(width, padding) }),
        }),
      ], {
        render: width => editor.render(width),
        handleInput: data => editor.handleInput(data),
      })
    : undefined;
  let thinkingLevel: OwnedUiThinkingLevel = "off";
  let isBashMode = false;
  const updateBorderColor = () => {
    editor.borderColor = inputPresentation !== undefined
      ? text => inputPresentation.styleRule(text)
      : isBashMode ? piTheme().getBashModeBorderColor() : piTheme().getThinkingBorderColor(thinkingLevel);
    tui.requestRender();
  };
  let autocompleteProvider: AutocompleteProvider;
  const setAutocompleteCommands = (commands: readonly PiShellAutocompleteCommand[]) => {
    const additions = new Map(commands.map(command => [command.name, command]));
    const builtInNames = new Set(PINNED_PI_BUILTIN_SLASH_COMMANDS.map(command => command.name));
    const builtIns = PINNED_PI_BUILTIN_SLASH_COMMANDS.map(command => autocompleteCommand(command, additions.get(command.name)));
    const resources = commands.filter(command => !builtInNames.has(command.name)).map(command => autocompleteCommand(command));
    autocompleteProvider = new CombinedAutocompleteProvider(
      [...builtIns, ...resources],
      options.cwd ?? process.cwd(),
    );
    editor.setAutocompleteProvider(autocompleteProvider);
  };
  setAutocompleteCommands(options.autocompleteCommands ?? []);
  let submitHandler = options.onSubmit;
  let interruptHandler = options.onInterrupt ?? (() => {});
  editor.onSubmit = text => submitHandler(text);
  editor.onChange = text => {
    const nextBashMode = text.trimStart().startsWith("!");
    if (nextBashMode !== isBashMode) {
      isBashMode = nextBashMode;
      updateBorderColor();
    }
    options.onChange?.(text);
  };
  if (options.onInterrupt !== undefined) {
    editor.onEscape = () => interruptHandler();
    editor.onAction("app.interrupt", () => interruptHandler());
  }
  if (options.onClear !== undefined) editor.onAction("app.clear", options.onClear);
  if (options.onExit !== undefined) {
    editor.onCtrlD = options.onExit;
    editor.onAction("app.exit", options.onExit);
  }
  if (options.onSuspend !== undefined) editor.onAction("app.suspend", options.onSuspend);
  if (options.onExternalEditor !== undefined) editor.onAction("app.editor.external", options.onExternalEditor);
  if (options.onPasteImage !== undefined) {
    editor.onPasteImage = options.onPasteImage;
    editor.onAction("app.clipboard.pasteImage", options.onPasteImage);
  }
  if (options.onExtensionShortcut !== undefined) editor.onExtensionShortcut = options.onExtensionShortcut;
  if (options.onModelSelect !== undefined) editor.onAction("app.model.select", options.onModelSelect);
  if (options.onModelCycle !== undefined) {
    editor.onAction("app.model.cycleForward", () => options.onModelCycle?.("forward"));
    editor.onAction("app.model.cycleBackward", () => options.onModelCycle?.("backward"));
  }
  if (options.onThinkingCycle !== undefined) editor.onAction("app.thinking.cycle", options.onThinkingCycle);
  if (options.onThinkingToggle !== undefined) editor.onAction("app.thinking.toggle", options.onThinkingToggle);
  if (options.onToolsExpand !== undefined) editor.onAction("app.tools.expand", options.onToolsExpand);
  if (options.onMessageCopy !== undefined) editor.onAction("app.message.copy", options.onMessageCopy);
  if (options.onFollowUp !== undefined) editor.onAction("app.message.followUp", options.onFollowUp);
  if (options.onDequeue !== undefined) editor.onAction("app.message.dequeue", options.onDequeue);
  if (options.onPromptSuggestionAccepted !== undefined) {
    editor.onPromptSuggestionAccepted = options.onPromptSuggestionAccepted;
  }
  let bodyGeometry = { rowOffset: 0, rowCount: 0 };
  return {
    ...(editorUx === undefined ? {} : { bodyGeometry: () => bodyGeometry }),
    render: width => {
      scrollInfo.emitted = false;
      scrollInfo.counter = undefined;
      const rows = editorUx?.render(width) ?? editor.render(width);
      if (editorUx === undefined) return rows;
      const rowCount = editor.getRenderedBodyRowCount();
      const menu = rows.slice(rowCount, scrollInfo.emitted ? -1 : undefined);
      const label = scrollInfo.counter === undefined ? "" : `${scrollInfo.counter} `;
      // Compatibility: match the history border's four-cell inset and dim label style.
      const counterBorder = label.length > 0 && 4 + visibleWidth(label) <= width
        ? editor.borderColor("─── ") + piTheme().fg("dim", label)
          + editor.borderColor("─".repeat(width - 4 - visibleWidth(label)))
        : editor.borderColor("─".repeat(width));
      // Rationale: when the menu is open, drop the plain top border above the
      // menu and instead show the counter on the border directly above the input
      // prompt (the body's own top border row), mirroring the history header.
      const bodyRows = menu.length === 0
        ? rows.slice(0, rowCount)
        : [counterBorder, ...rows.slice(1, rowCount)];
      bodyGeometry = { rowOffset: menu.length, rowCount };
      // Invariant: decorate/select in body coordinates first, then move the whole menu.
      // Completion state, sizing, styles, and pagination still belong to the editor.
      return [...menu, ...bodyRows];
    },
    activateKeybindings: () => setKeybindings(keybindings),
    keybindingConfig: () => keybindings.getEffectiveConfig(),
    reloadKeybindings: () => { keybindings.reload(); setKeybindings(keybindings); },
    matchesTerminalKey: (data, key) => matchesKey(data, key),
    handleInput: data => {
      // Compatibility: an unassigned reverse Tab must not clear selection or reach autocomplete fallback.
      if (editorUx !== undefined && matchesKey(data, "shift+tab")
        && !Object.values(keybindings.getEffectiveConfig()).some(keys =>
          (Array.isArray(keys) ? keys : [keys]).some(key => key !== undefined && matchesKey(data, key)))) return;
      if (editorUx === undefined) editor.handleInput(data);
      else editorUx.handleInput(data);
    },
    invalidate: () => editor.invalidate(),
    setFocused: focused => {
      editor.focused = focused;
    },
    getText: () => editor.getExpandedText(),
    setText: text => {
      editorUx?.reset();
      editor.setText(text);
    },
    insertText: text => {
      editorUx?.reset();
      editor.insertTextAtCursor(text);
    },
    addToHistory: text => editor.addToHistory(text),
    ...(editor.recall === undefined ? {} : { recall: editor.recall, historyReplacement: PROMPT_HISTORY_EDITOR_REPLACEMENT }),
    setSubmitEnabled: enabled => {
      editor.disableSubmit = !enabled;
    },
    setSubmitHandler: handler => { submitHandler = handler; },
    setInterruptHandler: handler => { interruptHandler = handler; },
    setAutocompleteCommands,
    setPaddingX(padding) {
      editor.setPaddingX(padding);
      editor.invalidate();
      tui.requestRender();
    },
    setAutocompleteMaxVisible(maxVisible) {
      editor.setAutocompleteMaxVisible(maxVisible);
      editor.invalidate();
      tui.requestRender();
    },
    addAutocompleteProvider(factory) {
      if (typeof factory !== "function") throw new TypeError("extension autocomplete factory must be a function");
      const candidate: unknown = Reflect.apply(factory, undefined, [autocompleteProvider]);
      if (!isAutocompleteProvider(candidate)) throw new TypeError("extension autocomplete factory returned a malformed provider");
      autocompleteProvider = candidate;
      editor.setAutocompleteProvider(autocompleteProvider);
    },
    setThinkingLevel(level) {
      if (thinkingLevel === level) return;
      thinkingLevel = level;
      updateBorderColor();
    },
    setPromptSuggestion(text) {
      editor.setPromptSuggestion(text);
      editor.invalidate();
    },
    canPresentPromptSuggestion: () => editor.canPresentPromptSuggestion(),
    promptSuggestionBlockReason: () => {
      if (!editor.focused) return "not-focused";
      if (editor.disableSubmit) return "not-ready";
      if (editor.getText().length > 0) return "draft";
      if (editor.isShowingAutocomplete()) return "autocomplete";
      return editor.canPresentPromptSuggestion() ? null : "prompt-mode";
    },
    hasSelection: () => editorUx?.hasSelection() ?? false,
    ownsPointer: () => editorUx?.ownsPointer() ?? false,
    handlePointer: event => editorUx?.handlePointer(event) ?? false,
    pasteClipboard: () => editorUx?.pasteClipboard() ?? false,
    cancelPendingPastes: () => editorUx?.cancelPendingPastes(),
  };
}


function autocompleteCommand(
  command: PiShellAutocompleteCommand,
  addition?: PiShellAutocompleteCommand,
): PiShellAutocompleteCommand & { getArgumentCompletions?: (prefix: string) => Array<{ value: string; label: string; description?: string }> } {
  const argumentOptions = addition?.argumentOptions ?? command.argumentOptions;
  return {
    ...command,
    ...addition,
    ...(argumentOptions === undefined ? {} : {
      getArgumentCompletions: (prefix: string) => {
        const normalized = prefix.toLowerCase();
        return argumentOptions
          .filter(option => option.id.toLowerCase().includes(normalized) || option.label.toLowerCase().includes(normalized))
          .map(option => ({
            value: option.id,
            label: option.label,
            ...(option.description === undefined ? {} : { description: option.description }),
          }));
      },
    }),
  };
}

