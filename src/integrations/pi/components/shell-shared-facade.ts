import {
  setKeybindings,
  type AutocompleteProvider,
  type Component,
  type Focusable,
  type TUI,
} from "#pi-tui";
import type {
  OwnedUiSessionViewModel,
  OwnedUiThinkingLevel,
  OwnedUiTranscriptBlock,
} from "../../../contracts/owned-ui/index.js";
import {
  KeybindingsManager,
} from "./upstream/adjacent/core/keybindings.js";
import {
  ensurePiTheme,
} from "./theme.js";

export interface PiShellComponentPort {
  render(width: number): readonly string[];
  handleInput?(data: string): void;
  invalidate(): void;
  setFocused?(focused: boolean): void;
  dispose?(): void;
}

export interface PiShellEditorPort extends PiShellComponentPort {
  /** Restores this editor's profile after another Pi component changed the global manager. */
  activateKeybindings(): void;
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

export interface PiShellStatusPort extends PiShellViewComponentPort {
  setWorkingOverride(message: string | undefined): void;
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
  /** Bare A1 adds ergonomic aliases while comparison profiles retain Pi defaults. */
  readonly keybindingProfile?: "pi" | "a1";
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

// Pinned from packages/coding-agent/src/core/slash-commands.ts at 914cf14.

export function createTuiFacade(options: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender"> & { readonly onSubmit?: (text: string) => void }): TUI {
  const children: Component[] = [];
  const terminal = {
    start() {}, stop() {}, async drainInput() {}, write() {},
    get columns() { return Math.max(1, options.getColumns()); },
    get rows() { return Math.max(1, options.getRows()); },
    get kittyProtocolActive() { return false; },
    moveBy() {}, hideCursor() {}, showCursor() {}, clearLine() {}, clearFromCursor() {}, clearScreen() {}, setTitle() {}, setProgress() {},
  };
  return {
    mode: "regular",
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

export function componentPort(component: Component, handleInput?: (data: string) => void): PiShellComponentPort {
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

export function componentFromPort(port: PiShellComponentPort): Component {
  return {
    render: width => [...port.render(width)],
    ...(port.handleInput === undefined ? {} : { handleInput: (data: string) => port.handleInput?.(data) }),
    invalidate: () => port.invalidate(),
  };
}


export function formatSessionTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10_000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1_000_000) return `${Math.round(count / 1000)}k`;
  if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  return `${Math.round(count / 1_000_000)}M`;
}

export function isAutocompleteProvider(value: unknown): value is AutocompleteProvider {
  return isRecord(value) && typeof value.getSuggestions === "function" && typeof value.applyCompletion === "function";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function ensureTheme(): void {
  ensurePiTheme();
  setKeybindings(KeybindingsManager.create());
}
