import {
  AssistantMessageComponent,
  CompactionSummaryMessageComponent,
  CustomEditor,
  getSelectListTheme,
  initTheme,
  ToolExecutionComponent,
  UserMessageComponent,
} from "@earendil-works/pi-coding-agent";
import {
  Box,
  Container,
  KeybindingsManager,
  SelectList,
  Text,
  TUI_KEYBINDINGS,
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
  readonly onThinkingCycle?: () => void;
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

export function createPiShellEditor(options: PiShellEditorOptions): PiShellEditorPort {
  ensureTheme();
  const tui = createTuiFacade(options);
  const keybindings = new KeybindingsManager({
    ...TUI_KEYBINDINGS,
    "app.interrupt": { defaultKeys: "escape", description: "Abort current operation" },
    "app.clear": { defaultKeys: "ctrl+c", description: "Clear editor" },
    "app.exit": { defaultKeys: "ctrl+d", description: "Exit" },
    "app.model.select": { defaultKeys: "ctrl+l", description: "Select model" },
    "app.thinking.cycle": { defaultKeys: "shift+tab", description: "Cycle thinking" },
  });
  const editor = new CustomEditor(tui, {
    borderColor: value => value,
    selectList: getSelectListTheme(),
  }, keybindings as never, { paddingX: 0 });
  editor.onSubmit = options.onSubmit;
  if (options.onChange !== undefined) editor.onChange = options.onChange;
  if (options.onInterrupt !== undefined) {
    editor.onEscape = options.onInterrupt;
    editor.onAction("app.interrupt", options.onInterrupt);
  }
  if (options.onExit !== undefined) {
    editor.onCtrlD = options.onExit;
    editor.onAction("app.exit", options.onExit);
  }
  if (options.onModelSelect !== undefined) editor.onAction("app.model.select", options.onModelSelect);
  if (options.onThinkingCycle !== undefined) editor.onAction("app.thinking.cycle", options.onThinkingCycle);
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

export function createPiShellStatus(view: OwnedUiSessionViewModel): PiShellComponentPort {
  ensureTheme();
  return componentPort(new Text(statusText(view), 0, 0));
}

export function createPiQueuedInputStatus(submissions: readonly string[]): PiShellComponentPort {
  const text = submissions.length === 0
    ? ""
    : submissions.map((submission, index) => `queued ${index + 1}: ${submission.replaceAll("\n", " ⏎ ")}`).join("\n");
  return componentPort(new Text(text, 0, 0));
}

export function renderPiShellTranscriptBlock(
  block: OwnedUiTranscriptBlock,
  width: number,
  cwd: string,
): readonly string[] {
  ensureTheme();
  switch (block.kind) {
    case "user":
      return new UserMessageComponent(block.text).render(width);
    case "assistant":
    case "thinking":
      return assistantComponent(block).render(width);
    case "tool-call":
    case "tool-result":
      return toolComponent(block, cwd).render(width);
    case "compaction": {
      const component = new CompactionSummaryMessageComponent({
        role: "compactionSummary",
        summary: block.text,
        tokensBefore: numericPayload(block, "tokensBefore"),
        timestamp: Date.now(),
      });
      component.setExpanded(true);
      return component.render(width);
    }
    case "retry":
      return new Text(`Retry: ${block.text}`, 0, 0).render(width);
    case "error":
      return new Text(`Error: ${block.text}`, 0, 0).render(width);
    case "system":
      return new Text(block.text, 0, 0).render(width);
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
  return [
    view.status.title,
    ...view.status.badges,
    view.activeModel === null ? "" : `${view.activeModel.providerId}/${view.activeModel.modelId}`,
    `thinking:${view.thinkingLevel}`,
    view.status.workingMessage ?? "",
    view.status.diagnostics.at(-1) ?? "",
  ].filter(Boolean).join("  ·  ");
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
