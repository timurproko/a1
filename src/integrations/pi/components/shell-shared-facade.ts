import {
  getKeybindings,
  hyperlink,
  matchesKey,
  setKeybindings,
  visibleWidth,
  truncateToWidth,
  type AutocompleteProvider,
  type Component,
  type Focusable,
  type KeybindingsConfig,
  type TUI,
} from "@earendil-works/pi-tui";
import type { HistoryEditorConstructor } from "./history-editor-loader.js";
import type {
  OwnedUiShellAutocompleteCommand,
  OwnedUiShellClipboardContent,
  OwnedUiShellComponentPort,
  OwnedUiShellEditorBodyGeometry,
  OwnedUiShellEditorOptions,
  OwnedUiShellKeybindings,
  OwnedUiShellEditorPointerEvent,
  OwnedUiShellEditorPort,
  OwnedUiShellEditorTextRange,
  OwnedUiShellExtensionRendererResolver,
  OwnedUiShellHeaderOptions,
  OwnedUiShellHeaderPort,
  OwnedUiShellImageAssetResolver,
  OwnedUiShellLoadedResourcesPort,
  OwnedUiShellPasteReservation,
  OwnedUiShellProgressPresentationMode,
  OwnedUiShellProgressStatusPresentation,
  OwnedUiShellQueuedInputPort,
  OwnedUiShellResourceEntry,
  OwnedUiShellResourceSection,
  OwnedUiShellSelectorOption,
  OwnedUiShellSelectorOptions,
  OwnedUiShellStartupNotice,
  OwnedUiShellStatusPlacement,
  OwnedUiShellStatusPort,
  OwnedUiShellTranscriptComponentPort,
  OwnedUiShellViewComponentPort,
} from "../../../contracts/owned-ui/index.js";
import {
  KeybindingsManager,
} from "./upstream/adjacent/core/keybindings.js";
import {
  ensurePiTheme,
  piTheme,
} from "./theme.js";

/** Terminal-cell width authority used by Pi-rendered component rows. */
export const piShellVisibleWidth = visibleWidth;
export const piShellTruncateToWidth = (text: string, width: number): string => truncateToWidth(text, width, "");
const INSTALLED_UPDATE_STATUS_TEXT = "Update installed, restart to update";

/** Shared green restart notice for the pinned status and bare-A1 prompt overlay. */
export function renderPiShellInstalledUpdateStatus(width: number): string {
  if (width <= 0) return "";
  ensurePiTheme();
  return piShellTruncateToWidth(piTheme().fg("success", INSTALLED_UPDATE_STATUS_TEXT), width);
}

/** A clickable URL in pinned Pi's grammar: an OSC 8 link where the terminal supports one, the plain URL otherwise. */
export const piShellHyperlink = (url: string, text: string = url): string => hyperlink(url, text);

export type PiShellComponentPort = OwnedUiShellComponentPort;
export type PiShellClipboardContent = OwnedUiShellClipboardContent;
export type PiShellEditorTextRange = OwnedUiShellEditorTextRange;
export type PiShellEditorPointerEvent = OwnedUiShellEditorPointerEvent;
export type PiShellEditorBodyGeometry = OwnedUiShellEditorBodyGeometry;
export type PiShellEditorPort = OwnedUiShellEditorPort;
export type PiShellAutocompleteCommand = OwnedUiShellAutocompleteCommand;
export type PiShellViewComponentPort = OwnedUiShellViewComponentPort;
export type PiShellStatusPlacement = OwnedUiShellStatusPlacement;
export type PiShellProgressPresentationMode = OwnedUiShellProgressPresentationMode;
export type PiShellProgressStatusPresentation = OwnedUiShellProgressStatusPresentation;
export type PiShellStatusPort = OwnedUiShellStatusPort;
export type PiShellQueuedInputPort = OwnedUiShellQueuedInputPort;
export type PiShellHeaderPort = OwnedUiShellHeaderPort;
export type PiShellResourceSection = OwnedUiShellResourceSection;
export type PiShellResourceEntry = OwnedUiShellResourceEntry;
export type PiShellLoadedResourcesPort = OwnedUiShellLoadedResourcesPort;
export type PiShellImageAssetResolver = OwnedUiShellImageAssetResolver;
export type PiShellExtensionRendererResolver = OwnedUiShellExtensionRendererResolver;
export type PiShellTranscriptComponentPort = OwnedUiShellTranscriptComponentPort;
export type PiShellStartupNotice = OwnedUiShellStartupNotice;
export type PiShellHeaderOptions = OwnedUiShellHeaderOptions;
export type PiShellPasteReservation = OwnedUiShellPasteReservation;
export type PiShellSelectorOption = OwnedUiShellSelectorOption;
export type PiShellSelectorOptions = OwnedUiShellSelectorOptions;

/**
 * Restores Pi's keybinding type to bindings the shell carried through the neutral contract. They were read from
 * Pi's keybinding manager in the first place, so the narrowing loses nothing.
 */
export function piKeybindings(bindings: OwnedUiShellKeybindings | undefined): KeybindingsConfig | undefined {
  return bindings as KeybindingsConfig | undefined;
}

/** The editor factory's options with the opaque history editor and keybindings narrowed to their Pi types. */
export interface PiShellEditorOptions extends Omit<OwnedUiShellEditorOptions, "historyEditor" | "keybindings"> {
  readonly historyEditor?: HistoryEditorConstructor;
  readonly keybindings?: PiKeybindingsHost;
}

// Provenance: pinned from packages/coding-agent/src/core/slash-commands.ts at 914cf14.

export function createTuiFacade(options: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender"> & { readonly onSubmit?: (text: string) => void }): TUI {
  const children: Component[] = [];
  const terminal = {
    start() {}, stop() {}, async drainInput() {}, write() {},
    get columns() { return Math.max(1, options.getColumns()); },
    get rows() { return Math.max(1, options.getRows()); },
    get kittyProtocolActive() { return false; },
    moveBy() {}, hideCursor() {}, showCursor() {}, clearLine() {}, clearFromCursor() {}, clearScreen() {}, setTitle() {}, setProgress() {}, setProgramStatus() {},
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
    showOverlay: () => ({ hide() {}, setHidden() {}, isHidden: () => false, focus() {}, unfocus() {}, isFocused: () => false, getBounds: () => undefined }),
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
    queryTerminalColors: async () => ({}),
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

/** Gives an extension-hosted dialog the shell's implicit close alias without rewriting its component. */
export function withPiDialogCancel(port: PiShellComponentPort, onCancel: () => void): PiShellComponentPort {
  return {
    ...port,
    handleInput: data => {
      if (matchesKey(data, "ctrl+c")) onCancel();
      else port.handleInput?.(data);
    },
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

let fallbackKeybindings: KeybindingsManager | undefined;

/**
 * Applies theme state. The keybinding registry belongs to the process's `PiKeybindingsHost`; only when no
 * A1 manager was ever applied (a presenter built outside composition) does this install Pi's defaults once.
 */
export function ensureTheme(): void {
  ensurePiTheme();
  if (!(getKeybindings() instanceof KeybindingsManager)) setKeybindings(fallbackKeybindings ??= KeybindingsManager.create());
}

/** The process's one keybinding manager and the only writer of pi-tui's global keybinding registry. */
export interface PiKeybindingsHost {
  readonly manager: KeybindingsManager;
  /** Installs the manager in the registry unless it is already the active one. */
  ensureActive(): void;
  /** Re-reads the user's keybindings file into the shared manager and keeps it active. */
  reload(): void;
}

/** Composition creates one host per process; bare A1 uses the owned-input aliases, comparison profiles keep Pi's. */
export function createPiKeybindingsHost(options: { readonly profile: "pi" | "a1"; readonly agentDir?: string }): PiKeybindingsHost {
  const manager = options.profile === "a1"
    ? KeybindingsManager.createForOwnedInput(options.agentDir)
    : KeybindingsManager.create(options.agentDir);
  const ensureActive = () => { if (getKeybindings() !== manager) setKeybindings(manager); };
  ensureActive();
  return { manager, ensureActive, reload: () => { manager.reload(); setKeybindings(manager); } };
}
