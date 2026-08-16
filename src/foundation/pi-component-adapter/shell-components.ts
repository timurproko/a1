import {
  AssistantMessageComponent,
  type AutocompleteProviderFactory,
  BashExecutionComponent,
  CompactionSummaryMessageComponent,
  CustomEditor,
  CustomMessageComponent,
  DynamicBorder,
  ExtensionEditorComponent,
  ExtensionInputComponent,
  ExtensionSelectorComponent,
  type ExtensionUIContext,
  FooterComponent,
  getMarkdownTheme,
  getSelectListTheme,
  LoginDialogComponent,
  ModelSelectorComponent,
  OAuthSelectorComponent,
  parseSkillBlock,
  rawKeyHint,
  SessionSelectorComponent,
  SettingsSelectorComponent,
  ShowImagesSelectorComponent,
  SkillInvocationMessageComponent,
  type SessionInfo,
  type SessionTreeNode,
  type SettingsCallbacks,
  type SettingsConfig,
  ThemeSelectorComponent,
  ThinkingSelectorComponent,
  ToolExecutionComponent,
  TreeSelectorComponent,
  UserMessageSelectorComponent,
  UserMessageComponent,
  VERSION,
} from "@earendil-works/pi-coding-agent";
import {
  Box,
  CombinedAutocompleteProvider,
  Container,
  Markdown,
  SelectList,
  setKeybindings,
  Spacer,
  Text,
  truncateToWidth,
  type Component,
  type Focusable,
  type SelectItem,
  type TUI,
} from "@earendil-works/pi-tui";
import type {
  OwnedUiDialog,
  OwnedUiExtensionOverlayHandle,
  OwnedUiExtensionOverlayOptions,
  OwnedUiSessionViewModel,
  OwnedUiThinkingLevel,
  OwnedUiTranscriptBlock,
} from "../owned-ui-contracts/index.js";
import { KeybindingsManager } from "./upstream/adjacent/core/keybindings.js";
import { ScopedModelsSelectorComponent } from "./upstream/components/scoped-models-selector.js";
import { WorkingStatusIndicator } from "./upstream/components/status-indicator.js";
import {
  PINNED_PI_LAYOUT,
  applyPiTheme,
  applyPiThemeInstance,
  ensurePiTheme,
  getAvailablePiThemes,
  loadPiTheme,
  piTheme,
} from "./theme.js";

export interface PiShellComponentPort {
  render(width: number): readonly string[];
  handleInput?(data: string): void;
  invalidate(): void;
  setFocused?(focused: boolean): void;
  dispose?(): void;
}

export interface PiShellEditorPort extends PiShellComponentPort {
  getText(): string;
  setText(text: string): void;
  insertText(text: string): void;
  addToHistory(text: string): void;
  setSubmitEnabled(enabled: boolean): void;
  setSubmitHandler(handler: (text: string) => void): void;
  setInterruptHandler(handler: () => void): void;
  setAutocompleteCommands(commands: readonly PiShellAutocompleteCommand[]): void;
  addAutocompleteProvider(factory: unknown): void;
  setThinkingLevel(level: OwnedUiThinkingLevel): void;
}

export interface PiShellAutocompleteCommand {
  readonly name: string;
  readonly description?: string;
  readonly argumentHint?: string;
  readonly argumentOptions?: readonly PiShellSelectorOption[];
}

export interface PiShellViewComponentPort extends PiShellComponentPort {
  update(view: OwnedUiSessionViewModel): void;
}

export interface PiShellQueuedInputPort extends PiShellComponentPort {
  update(submissions: readonly string[]): void;
}

export interface PiShellHeaderPort extends PiShellComponentPort {
  readonly expanded: boolean;
  setExpanded(expanded: boolean): void;
}

export type PiShellResourceSection = "Context" | "Skills" | "Prompts" | "Extensions" | "Themes";

export interface PiShellResourceEntry {
  readonly section: PiShellResourceSection;
  readonly label: string;
  readonly sourcePath: string | null;
  readonly diagnostic?: string | null;
}

export interface PiShellLoadedResourcesPort extends PiShellComponentPort {
  setExpanded(expanded: boolean): void;
}

export interface PiShellExtensionRendererResolver {
  getMessageRenderer(customType: string): unknown;
  getToolDefinition(toolName: string): unknown;
}

export interface PiShellTranscriptComponentPort extends PiShellComponentPort {
  readonly id: string;
  readonly revision: number;
  update(block: OwnedUiTranscriptBlock): void;
  setExpanded(expanded: boolean): void;
}

export interface PiShellStartupNotice {
  readonly kind: "info" | "warning" | "error";
  readonly message: string;
}

export interface PiShellHeaderOptions {
  readonly quiet?: boolean;
  readonly expanded?: boolean;
  readonly notices?: readonly PiShellStartupNotice[];
  readonly resources?: readonly PiShellResourceEntry[];
}

export interface PiShellEditorOptions {
  readonly getColumns: () => number;
  readonly getRows: () => number;
  readonly requestRender: () => void;
  readonly onSubmit: (text: string) => void;
  readonly onChange?: (text: string) => void;
  readonly onInterrupt?: () => void;
  readonly onClear?: () => void;
  readonly onExit?: () => void;
  readonly onSuspend?: () => void;
  readonly onExternalEditor?: () => void;
  readonly onPasteImage?: () => void;
  readonly onExtensionShortcut?: (data: string) => boolean;
  readonly onModelSelect?: () => void;
  readonly onModelCycle?: ((direction: "forward" | "backward") => void) | undefined;
  readonly onThinkingCycle?: (() => void) | undefined;
  readonly onThinkingToggle?: (() => void) | undefined;
  readonly onToolsExpand?: (() => void) | undefined;
  readonly onMessageCopy?: (() => void) | undefined;
  readonly onFollowUp?: (() => void) | undefined;
  readonly onDequeue?: (() => void) | undefined;
  readonly cwd?: string;
  readonly agentDir?: string;
  readonly autocompleteCommands?: readonly PiShellAutocompleteCommand[];
}

export interface PiShellSelectorOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface PiShellSelectorOptions {
  readonly title?: string;
  readonly options: readonly PiShellSelectorOption[];
  readonly maxVisible?: number;
  readonly onSelect?: (id: string) => void;
  readonly onCancel?: () => void;
}

// Pinned from packages/coding-agent/src/core/slash-commands.ts at 53fa77c.
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
  const keybindings = KeybindingsManager.create(options.agentDir);
  const editor = new CustomEditor(tui, {
    borderColor: value => piTheme().fg("borderMuted", value),
    selectList: getSelectListTheme(),
  }, keybindings as never, {
    paddingX: PINNED_PI_LAYOUT.editorPaddingX,
    autocompleteMaxVisible: PINNED_PI_LAYOUT.autocompleteMaxVisible,
  });
  let thinkingLevel: OwnedUiThinkingLevel = "off";
  let isBashMode = false;
  const updateBorderColor = () => {
    editor.borderColor = isBashMode
      ? piTheme().getBashModeBorderColor()
      : piTheme().getThinkingBorderColor(thinkingLevel);
    tui.requestRender();
  };
  let autocompleteProvider: unknown;
  const setAutocompleteCommands = (commands: readonly PiShellAutocompleteCommand[]) => {
    const additions = new Map(commands.map(command => [command.name, command]));
    const builtInNames = new Set(PINNED_PI_BUILTIN_SLASH_COMMANDS.map(command => command.name));
    const builtIns = PINNED_PI_BUILTIN_SLASH_COMMANDS.map(command => autocompleteCommand(command, additions.get(command.name)));
    const resources = commands.filter(command => !builtInNames.has(command.name)).map(command => autocompleteCommand(command));
    autocompleteProvider = new CombinedAutocompleteProvider(
      [...builtIns, ...resources],
      options.cwd ?? process.cwd(),
    );
    editor.setAutocompleteProvider(autocompleteProvider as never);
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
  return {
    render: width => editor.render(width),
    handleInput: data => editor.handleInput(data),
    invalidate: () => editor.invalidate(),
    setFocused: focused => {
      editor.focused = focused;
    },
    getText: () => editor.getExpandedText(),
    setText: text => editor.setText(text),
    insertText: text => editor.insertTextAtCursor(text),
    addToHistory: text => editor.addToHistory(text),
    setSubmitEnabled: enabled => {
      editor.disableSubmit = !enabled;
    },
    setSubmitHandler: handler => { submitHandler = handler; },
    setInterruptHandler: handler => { interruptHandler = handler; },
    setAutocompleteCommands,
    addAutocompleteProvider(factory) {
      if (typeof factory !== "function") throw new TypeError("extension autocomplete factory must be a function");
      autocompleteProvider = (factory as AutocompleteProviderFactory)(autocompleteProvider as never);
      editor.setAutocompleteProvider(autocompleteProvider as never);
    },
    setThinkingLevel(level) {
      if (thinkingLevel === level) return;
      thinkingLevel = level;
      updateBorderColor();
    },
  };
}

export function createPiShellSelector(options: PiShellSelectorOptions): PiShellComponentPort {
  ensureTheme();
  const items = options.options.map(toSelectItem);
  const list = new SelectList(items, options.maxVisible ?? Math.min(PINNED_PI_LAYOUT.selectorMaxVisible, Math.max(1, items.length)), getSelectListTheme());
  if (options.onSelect !== undefined) list.onSelect = item => options.onSelect?.(item.value);
  if (options.onCancel !== undefined) list.onCancel = options.onCancel;
  if (!options.title) return componentPort(list);
  const container = new Container();
  container.addChild(new Text(piTheme().fg("accent", piTheme().bold(options.title)), PINNED_PI_LAYOUT.contentPaddingX, 0));
  container.addChild(list);
  return componentPort(container, data => list.handleInput(data));
}

export interface PiShellSettingsSelectorOptions {
  readonly config: SettingsConfig;
  readonly onChange: (callback: keyof SettingsCallbacks, value: unknown) => void;
  readonly onCancel: () => void;
}

export function createPiShellSettingsSelector(options: PiShellSettingsSelectorOptions): PiShellComponentPort {
  ensureTheme();
  const change = (name: keyof SettingsCallbacks) => (value?: unknown) => options.onChange(name, value);
  const callbacks: SettingsCallbacks = {
    onAutoCompactChange: change("onAutoCompactChange"),
    onShowImagesChange: change("onShowImagesChange"),
    onImageWidthCellsChange: change("onImageWidthCellsChange"),
    onAutoResizeImagesChange: change("onAutoResizeImagesChange"),
    onBlockImagesChange: change("onBlockImagesChange"),
    onEnableSkillCommandsChange: change("onEnableSkillCommandsChange"),
    onSteeringModeChange: change("onSteeringModeChange"),
    onFollowUpModeChange: change("onFollowUpModeChange"),
    onTransportChange: change("onTransportChange"),
    onHttpIdleTimeoutMsChange: change("onHttpIdleTimeoutMsChange"),
    onThinkingLevelChange: change("onThinkingLevelChange"),
    onThemeChange: change("onThemeChange"),
    onThemePreview: change("onThemePreview"),
    onHideThinkingBlockChange: change("onHideThinkingBlockChange"),
    onMermaidRenderingModeChange: change("onMermaidRenderingModeChange"),
    onShowCacheMissNoticesChange: change("onShowCacheMissNoticesChange"),
    onCollapseChangelogChange: change("onCollapseChangelogChange"),
    onEnableInstallTelemetryChange: change("onEnableInstallTelemetryChange"),
    onDoubleEscapeActionChange: change("onDoubleEscapeActionChange"),
    onTreeFilterModeChange: change("onTreeFilterModeChange"),
    onShowHardwareCursorChange: change("onShowHardwareCursorChange"),
    onEditorPaddingXChange: change("onEditorPaddingXChange"),
    onOutputPadChange: change("onOutputPadChange"),
    onAutocompleteMaxVisibleChange: change("onAutocompleteMaxVisibleChange"),
    onQuietStartupChange: change("onQuietStartupChange"),
    onDefaultProjectTrustChange: change("onDefaultProjectTrustChange"),
    onClearOnShrinkChange: change("onClearOnShrinkChange"),
    onShowTerminalProgressChange: change("onShowTerminalProgressChange"),
    onTuiModeChange: change("onTuiModeChange"),
    onFullscreenScrollbarChange: change("onFullscreenScrollbarChange"),
    onWarningsChange: change("onWarningsChange"),
    onCancel: options.onCancel,
  };
  const selector = new SettingsSelectorComponent(options.config, callbacks);
  const settingsList = selector.getSettingsList();
  return componentPort(selector, data => settingsList.handleInput(data));
}

type PiModelSelectorArguments = ConstructorParameters<typeof ModelSelectorComponent>;

export interface PiShellModelSelectorOptions {
  readonly currentModel: unknown;
  readonly settingsManager: unknown;
  readonly modelRuntime: unknown;
  readonly scopedModels: readonly unknown[];
  readonly initialSearchInput?: string;
  readonly runtime: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">;
  readonly onSelect: PiModelSelectorArguments[5];
  readonly onCancel: () => void;
}

export function createPiShellModelSelector(options: PiShellModelSelectorOptions): PiShellComponentPort {
  ensureTheme();
  const selector = new ModelSelectorComponent(
    createTuiFacade(options.runtime),
    options.currentModel as PiModelSelectorArguments[1],
    options.settingsManager as PiModelSelectorArguments[2],
    options.modelRuntime as PiModelSelectorArguments[3],
    options.scopedModels as PiModelSelectorArguments[4],
    options.onSelect,
    options.onCancel,
    options.initialSearchInput,
  );
  return componentPort(selector);
}

export interface PiShellScopedModelDescriptor {
  readonly provider: string;
  readonly id: string;
  readonly name: string;
}

export interface PiShellScopedModelsSelectorOptions {
  readonly models: readonly PiShellScopedModelDescriptor[];
  readonly enabledModelIds: readonly string[] | null;
  readonly refreshStatus?: string;
  readonly onChange: (enabledModelIds: readonly string[] | null) => void | Promise<void>;
  readonly onPersist: (enabledModelIds: readonly string[] | null) => void | Promise<void>;
  readonly onCancel: () => void;
}

export interface PiShellScopedModelsSelectorPort extends PiShellComponentPort {
  updateModels(models: readonly PiShellScopedModelDescriptor[], enabledModelIds?: readonly string[] | null): void;
  setRefreshStatus(message: string, kind: "muted" | "success" | "warning"): void;
}

export function createPiShellScopedModelsSelector(options: PiShellScopedModelsSelectorOptions): PiShellScopedModelsSelectorPort {
  ensureTheme();
  const selector = new ScopedModelsSelectorComponent({
    allModels: options.models as never,
    enabledModelIds: options.enabledModelIds === null ? null : [...options.enabledModelIds],
    ...(options.refreshStatus === undefined ? {} : { refreshStatus: options.refreshStatus }),
  }, {
    onChange: ids => options.onChange(ids),
    onPersist: ids => options.onPersist(ids),
    onCancel: options.onCancel,
  });
  return {
    ...componentPort(selector),
    updateModels(models, enabledModelIds) {
      selector.updateModels(models as never, enabledModelIds === undefined
        ? undefined
        : enabledModelIds === null ? null : [...enabledModelIds]);
    },
    setRefreshStatus: (message, kind) => selector.setRefreshStatus(message, kind),
  };
}

export function createPiShellSessionSelector(
  sessions: readonly PiShellSelectorOption[],
  onSelect: (path: string) => void,
  onCancel: () => void,
  requestRender: () => void,
): PiShellComponentPort {
  ensureTheme();
  const now = new Date(0);
  const values: SessionInfo[] = sessions.map(session => ({
    path: session.id,
    id: session.id,
    cwd: session.description ?? "",
    created: now,
    modified: now,
    messageCount: 0,
    firstMessage: session.label,
    allMessagesText: session.label,
  }));
  const load = async () => values;
  const selector = new SessionSelectorComponent(load, load, onSelect, onCancel, onCancel, requestRender);
  return componentPort(selector);
}

export function createPiShellTreeSelector(
  tree: readonly unknown[],
  currentLeafId: string | null,
  terminalHeight: number,
  onSelect: (id: string) => void,
  onCancel: () => void,
): PiShellComponentPort {
  ensureTheme();
  return componentPort(new TreeSelectorComponent([...tree] as SessionTreeNode[], currentLeafId, terminalHeight, onSelect, onCancel));
}

export function createPiShellUserMessageSelector(
  messages: readonly PiShellSelectorOption[],
  onSelect: (id: string) => void,
  onCancel: () => void,
  initialSelectedId?: string,
): PiShellComponentPort {
  ensureTheme();
  const selector = new UserMessageSelectorComponent(
    messages.map(message => ({ id: message.id, text: message.label })),
    onSelect,
    onCancel,
    initialSelectedId,
  );
  const list = selector.getMessageList();
  return componentPort(selector, data => list.handleInput(data));
}

export interface PiShellLoginDialogPort extends PiShellComponentPort {
  showPrompt(message: string, placeholder?: string): Promise<string>;
  showDetails(lines: readonly string[]): void;
  showWaiting(message: string): void;
  showProgress(message: string): void;
}

export function createPiShellLoginDialog(
  runtime: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">,
  providerId: string,
  onComplete: (success: boolean, message?: string) => void,
): PiShellLoginDialogPort {
  ensureTheme();
  const dialog = new LoginDialogComponent(createTuiFacade(runtime), providerId, onComplete);
  return {
    ...componentPort(dialog),
    showPrompt: (message, placeholder) => dialog.showPrompt(message, placeholder),
    showDetails: lines => dialog.showDetails([...lines]),
    showWaiting: message => dialog.showWaiting(message),
    showProgress: message => dialog.showProgress(message),
  };
}

export function createPiShellAuthProviderSelector(
  mode: "login" | "logout",
  providers: readonly PiShellSelectorOption[],
  onSelect: (id: string) => void,
  onCancel: () => void,
): PiShellComponentPort {
  ensureTheme();
  const selector = new OAuthSelectorComponent(mode, providers.map(provider => {
    const [authType, providerId] = provider.id.includes(":") ? provider.id.split(":", 2) : ["oauth", provider.id];
    return {
      id: providerId!,
      name: provider.label,
      authType: authType === "api_key" ? "api_key" as const : "oauth" as const,
    };
  }), (providerId, authType) => onSelect(`${authType}:${providerId}`), onCancel);
  return componentPort(selector);
}

export function createPiShellExtensionSelector(
  title: string,
  options: readonly string[],
  onSelect: (value: string) => void,
  onCancel: () => void,
): PiShellComponentPort {
  ensureTheme();
  return componentPort(new ExtensionSelectorComponent(title, [...options], onSelect, onCancel));
}

export function createPiShellThinkingSelector(
  currentLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max",
  availableLevels: readonly ("off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max")[],
  onSelect: (level: string) => void,
  onCancel: () => void,
): PiShellComponentPort {
  ensureTheme();
  const selector = new ThinkingSelectorComponent(currentLevel, [...availableLevels], onSelect, onCancel);
  const list = selector.getSelectList();
  return componentPort(selector, data => list.handleInput(data));
}

export function createPiShellThemeSelector(
  currentTheme: string,
  onSelect: (theme: string) => void,
  onCancel: () => void,
  onPreview: (theme: string) => void,
): PiShellComponentPort {
  ensureTheme();
  const selector = new ThemeSelectorComponent(currentTheme, onSelect, onCancel, onPreview);
  const list = selector.getSelectList();
  return componentPort(selector, data => list.handleInput(data));
}

export function createPiShellShowImagesSelector(
  currentValue: boolean,
  onSelect: (show: boolean) => void,
  onCancel: () => void,
): PiShellComponentPort {
  ensureTheme();
  const selector = new ShowImagesSelectorComponent(currentValue, onSelect, onCancel);
  const list = selector.getSelectList();
  return componentPort(selector, data => list.handleInput(data));
}

export function createPiShellDialog(
  dialog: OwnedUiDialog,
  handlers: { readonly onSelect?: (id: string) => void; readonly onCancel?: () => void } = {},
): PiShellComponentPort {
  ensureTheme();
  const selector = createPiShellSelector({
    title: dialog.title,
    options: dialogOptions(dialog),
    maxVisible: 8,
    ...(handlers.onSelect === undefined ? {} : { onSelect: handlers.onSelect }),
    ...(handlers.onCancel === undefined ? {} : { onCancel: handlers.onCancel }),
  });
  const box = new Box(1, 1);
  box.addChild(componentFromPort(selector));
  return componentPort(box, data => selector.handleInput?.(data));
}

export function createPiShellHotkeys(): PiShellComponentPort {
  ensureTheme();
  const keys = new KeybindingsManager();
  const display = (action: Parameters<typeof keys.getKeys>[0]) => keys.getKeys(action)
    .map(key => key.split("+").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join("+"))
    .join("/");
  const row = (actions: readonly Parameters<typeof keys.getKeys>[0][], description: string) =>
    `| ${actions.map(action => `\`${display(action)}\``).join(" / ")} | ${description} |`;
  const markdown = [
    "**Navigation**", "| Key | Action |", "|-----|--------|",
    row(["tui.editor.cursorUp", "tui.editor.cursorDown", "tui.editor.cursorLeft", "tui.editor.cursorRight"], "Move cursor / browse history"),
    row(["tui.editor.cursorWordLeft", "tui.editor.cursorWordRight"], "Move by word"),
    row(["tui.editor.cursorLineStart"], "Start of line"), row(["tui.editor.cursorLineEnd"], "End of line"),
    row(["tui.editor.jumpForward"], "Jump forward to character"), row(["tui.editor.jumpBackward"], "Jump backward to character"),
    row(["tui.editor.pageUp", "tui.editor.pageDown"], "Scroll by page"), "",
    "**Editing**", "| Key | Action |", "|-----|--------|",
    row(["tui.input.submit"], "Send message"),
    row(["tui.input.newLine"], `New line${process.platform === "win32" ? " (Ctrl+Enter on Windows Terminal)" : ""}`),
    row(["tui.editor.deleteWordBackward"], "Delete word backwards"), row(["tui.editor.deleteWordForward"], "Delete word forwards"),
    row(["tui.editor.deleteToLineStart"], "Delete to start of line"), row(["tui.editor.deleteToLineEnd"], "Delete to end of line"),
    row(["tui.editor.yank"], "Paste the most-recently-deleted text"), row(["tui.editor.yankPop"], "Cycle through the deleted text after pasting"),
    row(["tui.editor.undo"], "Undo"), "", "**Other**", "| Key | Action |", "|-----|--------|",
    row(["tui.input.tab"], "Path completion / accept autocomplete"), row(["app.interrupt"], "Cancel autocomplete / abort streaming"),
    row(["app.clear"], "Clear editor (first) / exit (second)"), row(["app.exit"], "Exit (when editor is empty)"),
    row(["app.suspend"], "Suspend to background"), row(["app.thinking.cycle"], "Cycle thinking level"),
    row(["app.model.cycleForward", "app.model.cycleBackward"], "Cycle models"), row(["app.model.select"], "Open model selector"),
    row(["app.tools.expand"], "Toggle tool output expansion"), row(["app.thinking.toggle"], "Toggle thinking block visibility"),
    row(["app.editor.external"], "Edit message in external editor"), row(["app.message.copy"], "Copy last assistant message"),
    row(["app.message.followUp"], "Queue follow-up message"), row(["app.message.dequeue"], "Restore queued messages"),
    row(["app.clipboard.pasteImage"], "Paste image or text from clipboard"),
    "| `/` | Slash commands |", "| `!` | Run bash command |", "| `!!` | Run bash command (excluded from context) |",
  ].join("\n");
  const container = new Container();
  container.addChild(new Spacer(1));
  container.addChild(new DynamicBorder());
  container.addChild(new Text(piTheme().bold(piTheme().fg("accent", "Keyboard Shortcuts")), 1, 0));
  container.addChild(new Spacer(1));
  container.addChild(new Markdown(markdown, 1, 1, getMarkdownTheme()));
  container.addChild(new DynamicBorder());
  return componentPort(container);
}

type PiEditorFactory = NonNullable<Parameters<ExtensionUIContext["setEditorComponent"]>[0]>;

export interface PiExtensionUiBridgeHost {
  readonly runtime: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">;
  readonly agentDir?: string;
  setInputSurface(component: PiShellComponentPort | null): void;
  showOverlay(component: PiShellComponentPort, options?: OwnedUiExtensionOverlayOptions): OwnedUiExtensionOverlayHandle;
  listenInput(handler: (data: string) => { readonly consume?: boolean; readonly data?: string } | undefined): () => void;
  replaceWidget(key: string, component: PiShellComponentPort | null, placement: "aboveEditor" | "belowEditor"): void;
  replaceHeader(component: PiShellComponentPort | null): void;
  replaceFooter(component: PiShellComponentPort | null): void;
  setStatus(key: string, text: string | undefined): void;
  setWorking(message: string | undefined, visible?: boolean): void;
  notify(message: string, type: "info" | "warning" | "error"): void;
  setTitle(title: string): void;
  getEditorText(): string;
  setEditorText(text: string): void;
  pasteToEditor(text: string): void;
  addAutocompleteProvider(factory: unknown): void;
  setCustomEditor(component: PiShellComponentPort | null): void;
  getFooterData(): unknown;
  getToolsExpanded(): boolean;
  setToolsExpanded(expanded: boolean): void;
}

export interface PiExtensionUiBridge {
  readonly context: ExtensionUIContext;
  dispose(): void;
}

/** Public ExtensionUIContext ported from pinned InteractiveMode without constructing it. */
export function createPiExtensionUiBridge(host: PiExtensionUiBridgeHost): PiExtensionUiBridge {
  ensureTheme();
  const tui = createTuiFacade(host.runtime);
  const keybindings = KeybindingsManager.create(host.agentDir);
  const disposers = new Set<() => void>();
  let customEditorFactory: PiEditorFactory | undefined;
  let activeSurface: PiShellComponentPort | undefined;
  const closeSurface = (surface?: PiShellComponentPort) => {
    if (surface !== undefined && activeSurface !== surface) return;
    activeSurface = undefined;
    host.setInputSurface(null);
    host.runtime.requestRender();
  };
  const mountSurface = (surface: PiShellComponentPort) => {
    if (activeSurface !== undefined && activeSurface !== surface) activeSurface.dispose?.();
    activeSurface = surface;
    host.setInputSurface(surface);
    host.runtime.requestRender();
  };
  const trackAbort = (signal: AbortSignal | undefined, cancel: () => void) => {
    if (signal === undefined) return () => {};
    if (signal.aborted) {
      cancel();
      return () => {};
    }
    signal.addEventListener("abort", cancel, { once: true });
    const dispose = () => signal.removeEventListener("abort", cancel);
    disposers.add(dispose);
    return () => {
      dispose();
      disposers.delete(dispose);
    };
  };
  const showInput = <T>(create: (resolve: (value: T) => void, cancel: () => void) => PiShellComponentPort, options?: { signal?: AbortSignal }) =>
    new Promise<T>(resolve => {
      let settled = false;
      let surface: PiShellComponentPort;
      let untrack = () => {};
      const finish = (value: T) => {
        if (settled) return;
        settled = true;
        untrack();
        closeSurface(surface);
        resolve(value);
      };
      const cancel = () => finish(undefined as T);
      surface = create(finish, cancel);
      untrack = trackAbort(options?.signal, cancel);
      if (!settled) mountSurface(surface);
    });
  const createFactoryComponent = (factory: unknown, ...arguments_: unknown[]): PiShellComponentPort => {
    if (typeof factory !== "function") throw new TypeError("extension component factory must be a function");
    const component = factory(...arguments_);
    if (isPromiseLike(component)) throw new TypeError("synchronous extension surface factory returned a promise");
    if (!isComponent(component)) throw new TypeError("extension factory returned a malformed component");
    return componentPort(component);
  };
  const context: ExtensionUIContext = {
    select: (title, options, opts) => showInput<string | undefined>((resolve, cancel) => componentPort(
      new ExtensionSelectorComponent(title, [...options], resolve, cancel, {
        tui,
        ...(opts?.timeout === undefined ? {} : { timeout: opts.timeout }),
        onToggleToolsExpanded: () => host.setToolsExpanded(!host.getToolsExpanded()),
      }),
    ), opts),
    async confirm(title, message, opts) {
      return (await context.select(`${title}\n${message}`, ["Yes", "No"], opts)) === "Yes";
    },
    input: (title, placeholder, opts) => showInput<string | undefined>((resolve, cancel) => componentPort(
      new ExtensionInputComponent(title, placeholder, resolve, cancel, {
        tui,
        ...(opts?.timeout === undefined ? {} : { timeout: opts.timeout }),
      }),
    ), opts),
    notify: (message, type = "info") => host.notify(message, type),
    onTerminalInput: handler => host.listenInput(handler),
    setStatus: (key, text) => host.setStatus(key, text),
    setWorkingMessage: message => host.setWorking(message),
    setWorkingVisible: visible => host.setWorking(undefined, visible),
    setWorkingIndicator: options => host.setWorking(options?.frames?.[0]),
    setHiddenThinkingLabel: () => host.runtime.requestRender(),
    setWidget(key, content, options) {
      if (content === undefined) {
        host.replaceWidget(key, null, options?.placement ?? "aboveEditor");
        return;
      }
      try {
        const component = Array.isArray(content)
          ? componentPort(new Text(content.join("\n"), PINNED_PI_LAYOUT.contentPaddingX, 0))
          : createFactoryComponent(content, tui, piTheme());
        host.replaceWidget(key, component, options?.placement ?? "aboveEditor");
      } catch (error) {
        host.notify(extensionError("widget", error), "error");
      }
    },
    setFooter(factory) {
      try {
        host.replaceFooter(factory === undefined ? null : createFactoryComponent(factory, tui, piTheme(), host.getFooterData()));
      } catch (error) {
        host.replaceFooter(null);
        host.notify(extensionError("footer", error), "error");
      }
    },
    setHeader(factory) {
      try {
        host.replaceHeader(factory === undefined ? null : createFactoryComponent(factory, tui, piTheme()));
      } catch (error) {
        host.replaceHeader(null);
        host.notify(extensionError("header", error), "error");
      }
    },
    setTitle: title => host.setTitle(title),
    custom: async (factory, options) => new Promise((resolve, reject) => {
      let settled = false;
      let surface: PiShellComponentPort | undefined;
      let overlay: OwnedUiExtensionOverlayHandle | undefined;
      const done = (value: unknown) => {
        if (settled) return;
        settled = true;
        overlay?.hide();
        if (surface !== undefined) closeSurface(surface);
        resolve(value as never);
      };
      let created: unknown;
      try {
        created = factory(tui, piTheme(), keybindings as never, done);
      } catch (error) {
        host.notify(extensionError("custom surface", error), "error");
        reject(error);
        return;
      }
      void Promise.resolve(created).then(component => {
        if (!isComponent(component)) throw new TypeError("extension custom factory returned a malformed component");
        if (settled) {
          if ("dispose" in component && typeof component.dispose === "function") component.dispose();
          return;
        }
        surface = componentPort(component);
        if (options?.overlay) {
          const overlayOptions = typeof options.overlayOptions === "function" ? options.overlayOptions() : options.overlayOptions;
          overlay = host.showOverlay(surface, overlayOptions);
          options.onHandle?.(overlay as never);
        } else mountSurface(surface);
      }).catch(error => {
        if (surface !== undefined) closeSurface(surface);
        host.notify(extensionError("custom surface", error), "error");
        reject(error);
      });
    }),
    pasteToEditor: text => host.pasteToEditor(text),
    setEditorText: text => host.setEditorText(text),
    getEditorText: () => host.getEditorText(),
    editor: (title, prefill) => showInput<string | undefined>((resolve, cancel) => componentPort(
      new ExtensionEditorComponent(tui, keybindings as never, title, prefill, resolve, cancel),
    )),
    addAutocompleteProvider: factory => host.addAutocompleteProvider(factory),
    setEditorComponent(factory) {
      customEditorFactory = factory;
      if (factory === undefined) {
        host.setCustomEditor(null);
        return;
      }
      try {
        const editor = factory(tui, {
          borderColor: text => piTheme().fg("borderMuted", text),
          selectList: getSelectListTheme(),
        }, keybindings as never);
        if (!isComponent(editor)) throw new TypeError("extension editor factory returned a malformed editor");
        host.setCustomEditor(componentPort(editor));
      } catch (error) {
        customEditorFactory = undefined;
        host.setCustomEditor(null);
        host.notify(extensionError("editor", error), "error");
      }
    },
    getEditorComponent: () => customEditorFactory,
    get theme() { return piTheme(); },
    getAllThemes: () => getAvailablePiThemes().map(theme => ({ name: theme.name, path: theme.path })),
    getTheme(name) {
      try { return loadPiTheme(name); } catch { return undefined; }
    },
    setTheme(theme) {
      const result = typeof theme === "string" ? applyPiTheme(theme, true) : applyPiThemeInstance(theme);
      host.runtime.requestRender();
      return result.success
        ? { success: true }
        : { success: false, ...(result.error === undefined ? {} : { error: result.error }) };
    },
    getToolsExpanded: () => host.getToolsExpanded(),
    setToolsExpanded: expanded => host.setToolsExpanded(expanded),
  };
  return {
    context,
    dispose() {
      for (const dispose of disposers) dispose();
      disposers.clear();
      activeSurface?.dispose?.();
      activeSurface = undefined;
      host.setInputSurface(null);
      host.replaceHeader(null);
      host.replaceFooter(null);
    },
  };
}

function extensionError(surface: string, error: unknown): string {
  return `Extension ${surface} failed: ${error instanceof Error ? error.message : String(error)}`;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return isRecord(value) && typeof value.then === "function";
}

function isComponent(value: unknown): value is Component {
  return isRecord(value) && typeof value.render === "function" && typeof value.invalidate === "function";
}

export function createPiShellHeader(options: PiShellHeaderOptions = {}): PiShellHeaderPort {
  ensureTheme();
  let expanded = options.expanded ?? false;
  const compact = new Text(compactHeaderText(), 1, 0);
  const full = new Text(expandedHeaderText(), 1, 0);
  const notices = (options.notices ?? []).map(notice => new Text(noticeText(notice), 1, 0));
  return {
    get expanded() { return expanded; },
    setExpanded(value) { expanded = value; },
    render(width) {
      if (options.quiet) return [];
      return [
        ...new Spacer(1).render(width),
        ...(expanded ? full : compact).render(width),
        ...notices.flatMap(notice => ["", ...notice.render(width)]),
        ...new Spacer(1).render(width),
      ];
    },
    invalidate() {
      compact.invalidate();
      full.invalidate();
      for (const notice of notices) notice.invalidate();
    },
  };
}

export function createPiShellLoadedResources(
  resources: readonly PiShellResourceEntry[],
  initialExpanded = false,
): PiShellLoadedResourcesPort {
  ensureTheme();
  let expanded = initialExpanded;
  return {
    setExpanded(value) { expanded = value; },
    render(width) {
      const rows: string[] = [];
      const sections: readonly PiShellResourceSection[] = ["Context", "Skills", "Prompts", "Extensions", "Themes"];
      for (const section of sections) {
        const entries = resources.filter(entry => entry.section === section && !entry.diagnostic);
        if (entries.length === 0) continue;
        if (rows.length === 0 && section === "Context") rows.push("");
        const labels = expanded
          ? entries.map(entry => entry.sourcePath ?? entry.label).sort((left, right) => left.localeCompare(right))
          : entries.map(entry => entry.label).sort((left, right) => left.localeCompare(right));
        const body = expanded
          ? labels.map(label => piTheme().fg("dim", `  ${label}`)).join("\n")
          : piTheme().fg("dim", `  ${labels.join(", ")}`);
        rows.push(...new Text(`${piTheme().fg("mdHeading", `[${section}]`)}\n${body}`, 0, 0).render(width), "");
      }
      const diagnostics = resources.filter(entry => entry.diagnostic);
      for (const group of ["Skills", "Prompts", "Extensions", "Themes"] as const) {
        const entries = diagnostics.filter(entry => entry.section === group);
        if (entries.length === 0) continue;
        const title = group === "Skills" ? "Skill conflicts" : group === "Prompts" ? "Prompt conflicts" : group === "Extensions" ? "Extension issues" : "Theme conflicts";
        const body = entries.map(entry => `  ${entry.sourcePath ? `${entry.sourcePath}\n    ` : ""}${entry.diagnostic}`).join("\n");
        rows.push(...new Text(`${piTheme().fg("warning", `[${title}]`)}\n${piTheme().fg("warning", body)}`, 0, 0).render(width), "");
      }
      return rows.length === 0 ? rows : [...rows, ""];
    },
    invalidate() {},
  };
}

export function createPiShellStatus(
  view: OwnedUiSessionViewModel,
  runtime?: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">,
): PiShellViewComponentPort {
  ensureTheme();
  const statusUi = createTuiFacade(runtime ?? { getColumns: () => 80, getRows: () => 24, requestRender() {} });
  let component = statusComponent(view, statusUi);
  let signature = statusSignature(view);
  return {
    render: width => component?.render(width) ?? [],
    invalidate: () => component?.invalidate(),
    update(next) {
      view = next;
      const nextSignature = statusSignature(next);
      if (nextSignature === signature) return;
      if (component !== undefined && "dispose" in component && typeof component.dispose === "function") component.dispose();
      signature = nextSignature;
      component = statusComponent(next, statusUi);
    },
    dispose() {
      if (component !== undefined && "dispose" in component && typeof component.dispose === "function") component.dispose();
      component = undefined;
    },
  };
}

export function createPiShellFooter(view: OwnedUiSessionViewModel, cwd: string): PiShellViewComponentPort {
  ensureTheme();
  const session = {
    get state() {
      const usage = view.status.usage;
      return {
        model: view.activeModel === null ? null : {
          provider: view.activeModel.providerId,
          id: view.activeModel.modelId,
          reasoning: view.thinkingLevel !== "off",
          contextWindow: usage?.contextWindow ?? 0,
        },
        thinkingLevel: view.thinkingLevel,
      };
    },
    sessionManager: {
      getEntries: () => footerUsageEntries(view),
      getCwd: () => cwd,
      getSessionName: () => view.status.footer?.sessionName ?? undefined,
    },
    getContextUsage: () => {
      const usage = view.status.usage;
      return usage === undefined || usage.contextAvailable === false ? undefined : {
        tokens: usage.contextTokens,
        contextWindow: usage.contextWindow,
        percent: usage.contextPercent,
      };
    },
    modelRuntime: {
      isUsingSubscription: () => view.status.usage?.usingSubscription ?? false,
    },
  };
  const footerData = {
    getGitBranch: () => view.status.footer?.branch ?? null,
    getAvailableProviderCount: () => view.status.footer?.availableProviderCount ?? 1,
    getExtensionStatuses: () => new Map(view.status.footer?.extensionStatuses ?? []),
  };
  const footer = new FooterComponent(session as never, footerData as never);
  return {
    render(width) {
      footer.setAutoCompactEnabled(view.status.usage?.autoCompactEnabled ?? true);
      return footer.render(width);
    },
    invalidate: () => footer.invalidate(),
    update(next) { view = next; },
    dispose: () => footer.dispose(),
  };
}

export function createPiQueuedInputStatus(submissions: readonly string[]): PiShellQueuedInputPort {
  const text = new Text(queuedInputText(submissions), 1, 0);
  return {
    render: width => submissions.length === 0 ? [] : text.render(width),
    invalidate: () => text.invalidate(),
    update(next) {
      submissions = next;
      text.setText(queuedInputText(next));
    },
  };
}

export function createPiShellTranscriptComponent(
  initial: OwnedUiTranscriptBlock,
  cwd: string,
  extensions?: PiShellExtensionRendererResolver,
): PiShellTranscriptComponentPort {
  ensureTheme();
  let block = initial;
  let expanded = false;
  let component = transcriptComponent(block, cwd, expanded, extensions);
  return {
    get id() { return block.id; },
    get revision() { return block.revision; },
    render: width => component.render(width),
    invalidate: () => component.invalidate(),
    update(next) {
      if (next.id !== block.id) throw new TypeError("Pi transcript component identity cannot change");
      const previous = block;
      block = next;
      if (!updateTranscriptComponent(component, previous, next, expanded)) {
        component = transcriptComponent(block, cwd, expanded, extensions);
      }
    },
    setExpanded(next) {
      if (expanded === next) return;
      expanded = next;
      if ("setExpanded" in component && typeof component.setExpanded === "function") {
        component.setExpanded(expanded);
      } else {
        component = transcriptComponent(block, cwd, expanded, extensions);
      }
    },
  };
}

export function renderPiShellTranscriptBlock(
  block: OwnedUiTranscriptBlock,
  width: number,
  cwd: string,
): readonly string[] {
  ensureTheme();
  return transcriptComponent(block, cwd, true).render(width);
}

function transcriptComponent(
  block: OwnedUiTranscriptBlock,
  cwd: string,
  expanded: boolean,
  extensions?: PiShellExtensionRendererResolver,
): Component {
  switch (block.kind) {
    case "user": {
      const skill = parseSkillBlock(block.text);
      if (!skill) return new UserMessageComponent(block.text);
      const invocation = new SkillInvocationMessageComponent(skill, getMarkdownTheme());
      invocation.setExpanded(expanded);
      const renderedInvocation: Component = {
        render: width => invocation.render(width).map(row => row.replace("( to expand)", "(ctrl+o to expand)")),
        invalidate: () => invocation.invalidate(),
      };
      if (!skill.userMessage) return renderedInvocation;
      const container = new Container();
      container.addChild(renderedInvocation);
      container.addChild(new Spacer(1));
      container.addChild(new UserMessageComponent(skill.userMessage));
      return container;
    }
    case "assistant":
    case "thinking":
      return assistantComponent(block);
    case "tool-call":
    case "tool-result": {
      const component = toolComponent(block, cwd, extensions);
      component.setExpanded(expanded);
      return component;
    }
    case "compaction": {
      const component = new CompactionSummaryMessageComponent({
        role: "compactionSummary",
        summary: block.text,
        tokensBefore: numericPayload(block, "tokensBefore"),
        timestamp: numericPayload(block, "timestamp") || 0,
      }, getMarkdownTheme());
      component.setExpanded(expanded);
      return component;
    }
    case "retry":
      return new Text(piTheme().fg("warning", `Retry: ${block.text}`), PINNED_PI_LAYOUT.outputPad, 0);
    case "error":
      return new Text(piTheme().fg("error", `Error: ${block.text}`), PINNED_PI_LAYOUT.outputPad, 0);
    case "system":
      return new Text(piTheme().fg("dim", block.text), PINNED_PI_LAYOUT.outputPad, 0);
    case "custom":
      return customMessageComponent(block, expanded, extensions);
    case "bash":
      return bashExecutionComponent(block, cwd, expanded);
  }
}

function updateTranscriptComponent(
  component: Component,
  previous: OwnedUiTranscriptBlock,
  next: OwnedUiTranscriptBlock,
  expanded: boolean,
): boolean {
  if (component instanceof AssistantMessageComponent && next.kind === previous.kind
    && (next.kind === "assistant" || next.kind === "thinking")) {
    component.updateContent(assistantMessage(next) as never, next.status === "live");
    return true;
  }
  if (component instanceof ToolExecutionComponent
    && (next.kind === "tool-call" || next.kind === "tool-result")
    && (previous.kind === "tool-call" || previous.kind === "tool-result")) {
    const payload = blockPayload(next);
    component.updateArgs(toolArguments(payload));
    if (next.status === "live") component.markExecutionStarted();
    if (next.status === "finalized" || payload.argsComplete === true) component.setArgsComplete();
    if (payload.partialResult === true) {
      component.updateResult({ content: [{ type: "text", text: next.text }], isError: false }, true);
    } else if (next.kind === "tool-result") {
      component.updateResult({
        content: [{ type: "text", text: next.text }],
        isError: payload.isError === true,
      }, next.status === "live");
    }
    component.setExpanded(expanded);
    return true;
  }
  if (component instanceof BashExecutionComponent && next.kind === "bash" && previous.kind === "bash") {
    if (next.text.startsWith(previous.text)) component.appendOutput(next.text.slice(previous.text.length));
    else return false;
    if (next.status === "finalized") completeBashComponent(component, next);
    component.setExpanded(expanded);
    return true;
  }
  if (component instanceof Text && next.kind === previous.kind
    && (next.kind === "retry" || next.kind === "error" || next.kind === "system")) {
    component.setText(transcriptText(next));
    return true;
  }
  return false;
}

function assistantComponent(block: OwnedUiTranscriptBlock): AssistantMessageComponent {
  const component = new AssistantMessageComponent(undefined, false, getMarkdownTheme(), undefined, PINNED_PI_LAYOUT.outputPad);
  component.updateContent(assistantMessage(block) as never, block.status === "live");
  return component;
}

function assistantMessage(block: OwnedUiTranscriptBlock): Record<string, unknown> {
  const payload = blockPayload(block);
  const content = assistantPayloadContent(payload.content)
    ?? (block.kind === "thinking"
      ? [{ type: "thinking", thinking: block.text }]
      : [{ type: "text", text: block.text }]);
  return {
    role: "assistant",
    content,
    api: stringPayload(payload, "api") ?? "openai-responses",
    provider: stringPayload(payload, "provider") ?? "openai",
    model: stringPayload(payload, "model") ?? "gpt-5",
    usage: isRecord(payload.usage) ? payload.usage : emptyUsage(),
    stopReason: stringPayload(payload, "stopReason") ?? (block.status === "live" ? "pending" : "stop"),
    ...(stringPayload(payload, "errorMessage") === undefined ? {} : { errorMessage: stringPayload(payload, "errorMessage") }),
    timestamp: numericPayload(block, "timestamp") || 0,
  };
}

function assistantPayloadContent(value: unknown): readonly Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const content: Record<string, unknown>[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (item.type === "text" && typeof item.text === "string") content.push({ type: "text", text: item.text });
    else if (item.type === "thinking" && typeof item.thinking === "string") {
      content.push({ type: "thinking", thinking: item.thinking, ...(item.redacted === true ? { redacted: true } : {}) });
    } else if (item.type === "toolCall" && typeof item.id === "string" && typeof item.name === "string") {
      content.push({ type: "toolCall", id: item.id, name: item.name, arguments: item.arguments ?? {} });
    }
  }
  return content.length === 0 && value.length > 0 ? undefined : content;
}

function toolComponent(
  block: OwnedUiTranscriptBlock,
  cwd: string,
  extensions?: PiShellExtensionRendererResolver,
): ToolExecutionComponent {
  const payload = blockPayload(block);
  const toolCallId = stringPayload(payload, "toolCallId") ?? block.id;
  const toolName = stringPayload(payload, "toolName") ?? block.title ?? "tool";
  const argumentsPayload = toolArguments(payload);
  const component = new ToolExecutionComponent(
    toolName,
    toolCallId,
    argumentsPayload,
    undefined,
    extensions?.getToolDefinition(toolName) as never,
    createTuiFacade({ getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {} }),
    cwd,
  );
  if (block.status === "live") component.markExecutionStarted();
  if (block.status === "finalized" || payload.argsComplete === true) component.setArgsComplete();
  if (payload.partialResult === true) {
    component.updateResult({ content: [{ type: "text", text: block.text }], isError: false }, true);
  } else if (block.kind === "tool-result") {
    component.updateResult({
      content: [{ type: "text", text: block.text }],
      isError: payload.isError === true,
    });
  }
  return component;
}

function customMessageComponent(
  block: OwnedUiTranscriptBlock,
  expanded: boolean,
  extensions?: PiShellExtensionRendererResolver,
): CustomMessageComponent {
  const payload = blockPayload(block);
  const message = {
    role: "custom" as const,
    customType: stringPayload(payload, "customType") ?? block.title ?? "custom",
    content: block.text,
    display: payload.display !== false,
    details: payload.details,
    timestamp: numericPayload(block, "timestamp") || 0,
  };
  const renderer = extensions?.getMessageRenderer(message.customType);
  const component = new CustomMessageComponent(message, renderer as never, getMarkdownTheme(), PINNED_PI_LAYOUT.outputPad);
  component.setExpanded(expanded);
  return component;
}

function bashExecutionComponent(block: OwnedUiTranscriptBlock, cwd: string, expanded: boolean): BashExecutionComponent {
  const payload = blockPayload(block);
  const component = new BashExecutionComponent(
    stringPayload(payload, "command") ?? block.title ?? "",
    createTuiFacade({ getColumns: () => 80, getRows: () => 24, requestRender() {} }),
    payload.excludeFromContext === true,
  );
  if (block.text) component.appendOutput(block.text);
  if (block.status === "finalized") completeBashComponent(component, block);
  component.setExpanded(expanded);
  return component;
}

function completeBashComponent(component: BashExecutionComponent, block: OwnedUiTranscriptBlock): void {
  const payload = blockPayload(block);
  component.setComplete(
    typeof payload.exitCode === "number" ? payload.exitCode : undefined,
    payload.cancelled === true,
    payload.truncated === true ? { truncated: true } as never : undefined,
    stringPayload(payload, "fullOutputPath"),
  );
}

function toolArguments(payload: Record<string, unknown>): unknown {
  return isRecord(payload.arguments) && "json" in payload.arguments ? payload.arguments.json : payload.arguments ?? {};
}

function transcriptText(block: OwnedUiTranscriptBlock): string {
  if (block.kind === "retry") return piTheme().fg("warning", `Retry: ${block.text}`);
  if (block.kind === "error") return piTheme().fg("error", `Error: ${block.text}`);
  return piTheme().fg("dim", block.text);
}

function createTuiFacade(options: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender"> & { readonly onSubmit?: (text: string) => void }): TUI {
  const children: Component[] = [];
  const terminal = {
    start() {}, stop() {}, async drainInput() {}, write() {},
    get columns() { return Math.max(1, options.getColumns()); },
    get rows() { return Math.max(1, options.getRows()); },
    get kittyProtocolActive() { return false; },
    moveBy() {}, hideCursor() {}, showCursor() {}, clearLine() {}, clearFromCursor() {}, clearScreen() {}, setTitle() {}, setProgress() {},
  };
  return {
    mode: "fullscreen",
    children,
    terminal,
    fullRedraws: 0,
    addChild: component => children.push(component),
    removeChild: component => {
      const index = children.indexOf(component);
      if (index >= 0) children.splice(index, 1);
    },
    clear: () => children.splice(0),
    render: width => children.flatMap(component => component.render(width)),
    invalidate: () => children.forEach(component => component.invalidate()),
    getShowHardwareCursor: () => false,
    setShowHardwareCursor() {},
    getClearOnShrink: () => true,
    setClearOnShrink() {},
    setFocus() {},
    showOverlay: () => ({ hide() {}, setHidden() {}, isHidden: () => false, focus() {}, unfocus() {}, isFocused: () => false }),
    hideOverlay() {},
    hasOverlay: () => false,
    start() {},
    stop() {},
    renderNow() {},
    requestRender: options.requestRender,
    addInputListener: () => () => {},
    removeInputListener() {},
    onTerminalColorSchemeChange: () => () => {},
    setTerminalColorSchemeNotifications() {},
    queryTerminalBackgroundColor: async () => undefined,
    queryTerminalColorScheme: async () => undefined,
  };
}

function componentPort(component: Component, handleInput?: (data: string) => void): PiShellComponentPort {
  const input = handleInput ?? component.handleInput;
  const focusable = component as Component & Partial<Focusable>;
  const disposable = component as Component & { dispose?: () => void };
  return {
    render: width => component.render(width),
    ...(input === undefined ? {} : { handleInput: (data: string) => input.call(component, data) }),
    invalidate: () => component.invalidate(),
    ...("focused" in focusable ? { setFocused: (focused: boolean) => { focusable.focused = focused; } } : {}),
    ...(typeof disposable.dispose === "function" ? { dispose: () => disposable.dispose?.() } : {}),
  };
}

function componentFromPort(port: PiShellComponentPort): Component {
  return {
    render: width => [...port.render(width)],
    ...(port.handleInput === undefined ? {} : { handleInput: (data: string) => port.handleInput?.(data) }),
    invalidate: () => port.invalidate(),
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

function toSelectItem(option: PiShellSelectorOption): SelectItem {
  return {
    value: option.id,
    label: option.label,
    ...(option.description === undefined ? {} : { description: option.description }),
  };
}

function dialogOptions(dialog: OwnedUiDialog): readonly PiShellSelectorOption[] {
  if (isRecord(dialog.payload) && Array.isArray(dialog.payload.options)) {
    const values = dialog.payload.options.filter(isRecord).flatMap(option => {
      if (typeof option.id !== "string" || typeof option.label !== "string") return [];
      return [{
        id: option.id,
        label: option.label,
        ...(typeof option.description === "string" ? { description: option.description } : {}),
      }];
    });
    if (values.length > 0) return values;
  }
  return [{ id: "accept", label: "Accept" }, { id: "cancel", label: "Cancel" }];
}

function statusComponent(view: OwnedUiSessionViewModel, ui: TUI): Component | undefined {
  if (view.lifecycle === "busy") return new WorkingStatusIndicator(ui, view.status.workingMessage ?? "Working...");
  if (view.lifecycle === "failed") {
    return new Text(piTheme().fg("error", view.status.diagnostics.at(-1) ?? "Session failed"), PINNED_PI_LAYOUT.outputPad, 0);
  }
  if (view.status.workingMessage !== null) {
    return new Text(piTheme().fg("muted", view.status.workingMessage), PINNED_PI_LAYOUT.outputPad, 0);
  }
  return undefined;
}

function statusSignature(view: OwnedUiSessionViewModel): string {
  return `${view.lifecycle}\u0000${view.status.workingMessage ?? ""}\u0000${view.status.diagnostics.at(-1) ?? ""}`;
}

function queuedInputText(submissions: readonly string[]): string {
  const theme = piTheme();
  return submissions.map(submission => theme.fg("muted", `Steering: ${submission.replaceAll("\n", " ⏎ ")}`)).join("\n");
}

function footerUsageEntries(view: OwnedUiSessionViewModel): readonly unknown[] {
  const usage = view.status.usage;
  if (usage === undefined || (usage.input === 0 && usage.output === 0 && usage.cacheRead === 0
    && usage.cacheWrite === 0 && usage.cost === 0)) return [];
  const entry = (input: number, output: number, cacheRead: number, cacheWrite: number, cost: number) => ({
    type: "message",
    message: { role: "assistant", usage: { input, output, cacheRead, cacheWrite, cost: { total: cost } } },
  });
  const latest = usage.latestPrompt;
  if (latest === undefined || latest === null) {
    return [entry(usage.input, usage.output, usage.cacheRead, usage.cacheWrite, usage.cost)];
  }
  const prior = entry(
    Math.max(0, usage.input - latest.input),
    usage.output,
    Math.max(0, usage.cacheRead - latest.cacheRead),
    Math.max(0, usage.cacheWrite - latest.cacheWrite),
    usage.cost,
  );
  return [prior, entry(latest.input, 0, latest.cacheRead, latest.cacheWrite, 0)];
}

function compactHeaderText(): string {
  const theme = piTheme();
  const instructions = [
    rawKeyHint("escape", "interrupt"),
    rawKeyHint("ctrl+c/ctrl+d", "clear/exit"),
    rawKeyHint("/", "commands"),
    rawKeyHint("!", "bash"),
    rawKeyHint("ctrl+o", "more"),
  ].join(theme.fg("muted", " · "));
  const logo = theme.bold(theme.fg("accent", "pi")) + theme.fg("dim", ` v${VERSION}`);
  const compactOnboarding = theme.fg("dim", "Press ctrl+o to show full startup help and loaded resources.");
  const onboarding = theme.fg("dim", "Pi can explain its own features and look up its docs. Ask it how to use or extend Pi.");
  return `${logo}\n${instructions}\n${compactOnboarding}\n\n${onboarding}`;
}

function expandedHeaderText(): string {
  const instructions = [
    rawKeyHint("escape", "to interrupt"),
    rawKeyHint("ctrl+c", "to clear"),
    rawKeyHint("ctrl+c twice", "to exit"),
    rawKeyHint("ctrl+d", "to exit (empty)"),
    rawKeyHint(process.platform === "win32" ? "" : "ctrl+z", "to suspend"),
    rawKeyHint("ctrl+k", "to delete to end"),
    rawKeyHint("shift+tab", "to cycle thinking level"),
    rawKeyHint("ctrl+p/shift+ctrl+p", "to cycle models"),
    rawKeyHint("ctrl+l", "to select model"),
    rawKeyHint("ctrl+o", "to expand tools"),
    rawKeyHint("ctrl+t", "to expand thinking"),
    rawKeyHint("ctrl+g", "for external editor"),
    rawKeyHint("/", "for commands"),
    rawKeyHint("!", "to run bash"),
    rawKeyHint("!!", "to run bash (no context)"),
    rawKeyHint("alt+enter", "to queue follow-up"),
    rawKeyHint("alt+up", "to edit all queued messages"),
    rawKeyHint(process.platform === "win32" ? "alt+v" : "ctrl+v", "to paste image (with text fallback)"),
    rawKeyHint("drop files", "to attach"),
  ].join("\n");
  const theme = piTheme();
  const logo = theme.bold(theme.fg("accent", "pi")) + theme.fg("dim", ` v${VERSION}`);
  const onboarding = theme.fg("dim", "Pi can explain its own features and look up its docs. Ask it how to use or extend Pi.");
  return `${logo}\n${instructions}\n\n${onboarding}`;
}

function noticeText(notice: PiShellStartupNotice): string {
  const theme = piTheme();
  if (notice.kind === "info") return theme.fg("dim", notice.message);
  const prefix = notice.kind === "warning" ? "Warning" : "Error";
  return theme.fg(notice.kind, `${prefix}: ${notice.message}`);
}

function blockPayload(block: OwnedUiTranscriptBlock): Record<string, unknown> {
  return isRecord(block.payload) ? block.payload : {};
}

function stringPayload(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numericPayload(block: OwnedUiTranscriptBlock, key: string): number {
  const value = blockPayload(block)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function emptyUsage() {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function ensureTheme(): void {
  ensurePiTheme();
  setKeybindings(new KeybindingsManager());
}
