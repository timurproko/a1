import {
  AssistantMessageComponent,
  CompactionSummaryMessageComponent,
  CustomEditor,
  getSelectListTheme,
  initTheme,
  rawKeyHint,
  ToolExecutionComponent,
  UserMessageComponent,
  VERSION,
} from "@earendil-works/pi-coding-agent";
import {
  Box,
  CombinedAutocompleteProvider,
  Container,
  KeybindingsManager,
  SelectList,
  Spacer,
  Text,
  truncateToWidth,
  TUI_KEYBINDINGS,
  visibleWidth,
  type Component,
  type SelectItem,
  type TUI,
} from "@earendil-works/pi-tui";
import type {
  OwnedUiDialog,
  OwnedUiSessionViewModel,
  OwnedUiTranscriptBlock,
} from "../owned-ui-contracts/index.js";

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
  setSubmitEnabled(enabled: boolean): void;
  setSubmitHandler(handler: (text: string) => void): void;
  setInterruptHandler(handler: () => void): void;
  setAutocompleteCommands(commands: readonly PiShellAutocompleteCommand[]): void;
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
}

export interface PiShellEditorOptions {
  readonly getColumns: () => number;
  readonly getRows: () => number;
  readonly requestRender: () => void;
  readonly onSubmit: (text: string) => void;
  readonly onChange?: (text: string) => void;
  readonly onInterrupt?: () => void;
  readonly onExit?: () => void;
  readonly onModelSelect?: () => void;
  readonly onModelCycle?: ((direction: "forward" | "backward") => void) | undefined;
  readonly onThinkingCycle?: (() => void) | undefined;
  readonly onThinkingToggle?: (() => void) | undefined;
  readonly onToolsExpand?: (() => void) | undefined;
  readonly onMessageCopy?: (() => void) | undefined;
  readonly onFollowUp?: (() => void) | undefined;
  readonly onDequeue?: (() => void) | undefined;
  readonly cwd?: string;
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

const PI_SHELL_APP_KEYBINDINGS = {
  "app.interrupt": { defaultKeys: "escape", description: "Cancel or abort" },
  "app.clear": { defaultKeys: "ctrl+c", description: "Clear editor" },
  "app.exit": { defaultKeys: "ctrl+d", description: "Exit when editor is empty" },
  "app.thinking.cycle": { defaultKeys: "shift+tab", description: "Cycle thinking level" },
  "app.model.cycleForward": { defaultKeys: "ctrl+p", description: "Cycle to next model" },
  "app.model.cycleBackward": { defaultKeys: "shift+ctrl+p", description: "Cycle to previous model" },
  "app.model.select": { defaultKeys: "ctrl+l", description: "Open model selector" },
  "app.tools.expand": { defaultKeys: "ctrl+o", description: "Toggle tool output" },
  "app.thinking.toggle": { defaultKeys: "ctrl+t", description: "Toggle thinking blocks" },
  "app.editor.external": { defaultKeys: "ctrl+g", description: "Open external editor" },
  "app.message.copy": { defaultKeys: "ctrl+x", description: "Copy message to clipboard" },
  "app.message.followUp": { defaultKeys: "alt+enter", description: "Queue follow-up message" },
  "app.message.dequeue": { defaultKeys: "alt+up", description: "Restore queued messages" },
  "app.clipboard.pasteImage": {
    defaultKeys: process.platform === "win32" ? "alt+v" : "ctrl+v",
    description: "Paste image from clipboard (text fallback)",
  },
};

export function createPiShellEditor(options: PiShellEditorOptions): PiShellEditorPort {
  ensureTheme();
  const tui = createTuiFacade(options);
  const keybindings = new KeybindingsManager({
    ...TUI_KEYBINDINGS,
    ...PI_SHELL_APP_KEYBINDINGS,
  } as never);
  const editor = new CustomEditor(tui, {
    borderColor: value => value,
    selectList: getSelectListTheme(),
  }, keybindings as never, { paddingX: 0 });
  const setAutocompleteCommands = (commands: readonly PiShellAutocompleteCommand[]) => {
    const additions = new Map(commands.map(command => [command.name, command]));
    const builtInNames = new Set(PINNED_PI_BUILTIN_SLASH_COMMANDS.map(command => command.name));
    const builtIns = PINNED_PI_BUILTIN_SLASH_COMMANDS.map(command => autocompleteCommand(command, additions.get(command.name)));
    const resources = commands.filter(command => !builtInNames.has(command.name)).map(command => autocompleteCommand(command));
    editor.setAutocompleteProvider(new CombinedAutocompleteProvider(
      [...builtIns, ...resources],
      options.cwd ?? process.cwd(),
    ));
  };
  setAutocompleteCommands(options.autocompleteCommands ?? []);
  let submitHandler = options.onSubmit;
  let interruptHandler = options.onInterrupt ?? (() => {});
  editor.onSubmit = text => submitHandler(text);
  if (options.onChange !== undefined) editor.onChange = options.onChange;
  if (options.onInterrupt !== undefined) {
    editor.onEscape = () => interruptHandler();
    editor.onAction("app.interrupt", () => interruptHandler());
  }
  if (options.onExit !== undefined) {
    editor.onCtrlD = options.onExit;
    editor.onAction("app.exit", options.onExit);
  }
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
    setSubmitEnabled: enabled => {
      editor.disableSubmit = !enabled;
    },
    setSubmitHandler: handler => { submitHandler = handler; },
    setInterruptHandler: handler => { interruptHandler = handler; },
    setAutocompleteCommands,
  };
}

export function createPiShellSelector(options: PiShellSelectorOptions): PiShellComponentPort {
  ensureTheme();
  const items = options.options.map(toSelectItem);
  const list = new SelectList(items, options.maxVisible ?? Math.min(10, Math.max(1, items.length)), getSelectListTheme());
  if (options.onSelect !== undefined) list.onSelect = item => options.onSelect?.(item.value);
  if (options.onCancel !== undefined) list.onCancel = options.onCancel;
  if (!options.title) return componentPort(list);
  const container = new Container();
  container.addChild(new Text(options.title, 1, 0));
  container.addChild(list);
  return componentPort(container, data => list.handleInput(data));
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

export function createPiShellStatus(view: OwnedUiSessionViewModel): PiShellViewComponentPort {
  ensureTheme();
  const text = new Text(statusText(view), 1, 0);
  return {
    render: width => statusText(view).length === 0 ? [] : text.render(width),
    invalidate: () => text.invalidate(),
    update(next) {
      view = next;
      text.setText(statusText(next));
    },
  };
}

export function createPiShellFooter(view: OwnedUiSessionViewModel, cwd: string): PiShellViewComponentPort {
  ensureTheme();
  return {
    render: width => footerRows(view, cwd, width),
    invalidate() {},
    update(next) { view = next; },
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
): PiShellTranscriptComponentPort {
  let block = initial;
  let expanded = false;
  let component = transcriptComponent(block, cwd, expanded);
  return {
    get id() { return block.id; },
    get revision() { return block.revision; },
    render: width => component.render(width),
    invalidate: () => component.invalidate(),
    update(next) {
      if (next.id !== block.id) throw new TypeError("Pi transcript component identity cannot change");
      block = next;
      component = transcriptComponent(block, cwd, expanded);
    },
    setExpanded(next) {
      if (expanded === next) return;
      expanded = next;
      component = transcriptComponent(block, cwd, expanded);
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

function transcriptComponent(block: OwnedUiTranscriptBlock, cwd: string, expanded: boolean): Component {
  switch (block.kind) {
    case "user":
      return new UserMessageComponent(block.text);
    case "assistant":
    case "thinking":
      return assistantComponent(block);
    case "tool-call":
    case "tool-result": {
      const component = toolComponent(block, cwd);
      component.setExpanded(expanded);
      return component;
    }
    case "compaction": {
      const component = new CompactionSummaryMessageComponent({
        role: "compactionSummary",
        summary: block.text,
        tokensBefore: numericPayload(block, "tokensBefore"),
        timestamp: Date.now(),
      });
      component.setExpanded(expanded);
      return component;
    }
    case "retry":
      return new Text(`Retry: ${block.text}`, 0, 0);
    case "error":
      return new Text(`Error: ${block.text}`, 0, 0);
    case "system":
      return new Text(block.text, 0, 0);
  }
}

function assistantComponent(block: OwnedUiTranscriptBlock): AssistantMessageComponent {
  const payload = blockPayload(block);
  const content = block.kind === "thinking"
    ? [{ type: "thinking", thinking: block.text }]
    : [{ type: "text", text: block.text }];
  const message = {
    role: "assistant",
    content,
    api: "openai-responses",
    provider: stringPayload(payload, "provider") ?? "openai",
    model: stringPayload(payload, "model") ?? "gpt-5",
    usage: emptyUsage(),
    stopReason: block.status === "live" ? "pending" : "stop",
    timestamp: Date.now(),
  };
  const component = new AssistantMessageComponent(undefined, false);
  component.updateContent(message as never, block.status === "live");
  return component;
}

function toolComponent(block: OwnedUiTranscriptBlock, cwd: string): ToolExecutionComponent {
  const payload = blockPayload(block);
  const toolCallId = stringPayload(payload, "toolCallId") ?? block.id;
  const toolName = stringPayload(payload, "toolName") ?? block.title ?? "tool";
  const argumentsPayload = isRecord(payload.arguments) && "json" in payload.arguments ? payload.arguments.json : {};
  const component = new ToolExecutionComponent(
    toolName,
    toolCallId,
    argumentsPayload,
    undefined,
    undefined,
    createTuiFacade({ getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {} }),
    cwd,
  );
  if (block.status === "live") component.markExecutionStarted();
  component.setArgsComplete();
  if (block.kind === "tool-result") {
    component.updateResult({
      content: [{ type: "text", text: block.text }],
      isError: payload.isError === true,
    });
  }
  return component;
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
  return {
    render: width => component.render(width),
    ...(input === undefined ? {} : { handleInput: (data: string) => input.call(component, data) }),
    invalidate: () => component.invalidate(),
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

function statusText(view: OwnedUiSessionViewModel): string {
  if (view.lifecycle === "busy") return view.status.workingMessage ?? "Working...";
  if (view.lifecycle === "failed") return view.status.diagnostics.at(-1) ?? "Session failed";
  return view.status.workingMessage ?? "";
}

function queuedInputText(submissions: readonly string[]): string {
  return submissions.map(submission => `Steering: ${submission.replaceAll("\n", " ⏎ ")}`).join("\n");
}

function footerRows(view: OwnedUiSessionViewModel, cwd: string, width: number): readonly string[] {
  const safeWidth = Math.max(1, width);
  const pwd = truncateToWidth(cwd, safeWidth, "...");
  const left = "0.0%/0 (auto)";
  const model = view.activeModel?.modelId ?? "no-model";
  const right = view.activeModel === null || view.thinkingLevel === "off"
    ? model
    : `${model} • ${view.thinkingLevel}`;
  const leftWidth = visibleWidth(left);
  const availableRight = Math.max(0, safeWidth - leftWidth - 2);
  const fittedRight = truncateToWidth(right, availableRight, "");
  const padding = " ".repeat(Math.max(2, safeWidth - leftWidth - visibleWidth(fittedRight)));
  return [pwd, truncateToWidth(`${left}${padding}${fittedRight}`, safeWidth, "")];
}

function compactHeaderText(): string {
  const instructions = [
    rawKeyHint("escape", "interrupt"),
    rawKeyHint("ctrl+c/ctrl+d", "clear/exit"),
    rawKeyHint("/", "commands"),
    rawKeyHint("!", "bash"),
    rawKeyHint("ctrl+o", "more"),
  ].join(" · ");
  return `pi v${VERSION}\n${instructions}\nPress ctrl+o to show full startup help and loaded resources.\n\nPi can explain its own features and look up its docs. Ask it how to use or extend Pi.`;
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
  return `pi v${VERSION}\n${instructions}\n\nPi can explain its own features and look up its docs. Ask it how to use or extend Pi.`;
}

function noticeText(notice: PiShellStartupNotice): string {
  if (notice.kind === "info") return notice.message;
  const prefix = notice.kind === "warning" ? "Warning" : "Error";
  return `${prefix}: ${notice.message}`;
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

let themeInitialized = false;
function ensureTheme(): void {
  if (themeInitialized) return;
  initTheme("dark", false);
  themeInitialized = true;
}
