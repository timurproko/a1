import type { OwnedUiImageAttachment, OwnedUiSessionViewModel, OwnedUiThinkingLevel, OwnedUiTranscriptBlock } from "./model.js";
import type { SuggestionDecision } from "./suggestion-diagnostics.js";
import type { PROMPT_HISTORY_EDITOR_REPLACEMENT } from "./prompt-history.js";

// Invariant: the component vocabulary the session shell speaks. The vendor component adapter implements it;
// its own names are aliases of these.

/** Key bindings by action id, as the vendor reports them. */
export type OwnedUiShellKeybindings = Readonly<Record<string, string | readonly string[] | undefined>>;
/** The vendor's history-capable editor, carried opaquely from composition to the editor factory. */
export type OwnedUiShellHistoryEditor = abstract new (...args: never[]) => unknown;
/** The process's shared keybindings, carried opaquely from composition to the editor factory. */
export interface OwnedUiShellKeybindingsHost {
  readonly manager: unknown;
  ensureActive(): void;
  reload(): void;
}

export interface OwnedUiShellComponentPort {
  render(width: number): readonly string[];
  invalidate(): void;
  handleInput?(data: string): void;
  setFocused?(focused: boolean): void;
  dispose?(): void;
}

export type OwnedUiShellClipboardContent =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "image"; readonly data: string; readonly mimeType: string };

export interface OwnedUiShellEditorTextRange {
  readonly start: number;
  readonly end: number;
}

export interface OwnedUiShellEditorPointerEvent {
  readonly kind: "press" | "motion" | "release";
  readonly button: number;
  readonly column: number;
  /** One-based row relative to the top border of the editor body, excluding its menu. */
  readonly row: number;
}

export interface OwnedUiShellEditorBodyGeometry {
  /** Zero-based body offset in the most recently rendered component rows. */
  readonly rowOffset: number;
  /** Border-inclusive body height, excluding autocomplete. */
  readonly rowCount: number;
}

export interface OwnedUiShellEditorPort extends OwnedUiShellComponentPort {
  /** Present only for the owned above-prompt autocomplete presentation. */
  bodyGeometry?(): OwnedUiShellEditorBodyGeometry;
  readonly recall?: OwnedUiShellEditorRecall;
  readonly historyReplacement?: typeof PROMPT_HISTORY_EDITOR_REPLACEMENT;
  /** Restores the shared keybindings if anything replaced the active registry; a no-op when it is already active. */
  activateKeybindings(): void;
  keybindingConfig(): OwnedUiShellKeybindings;
  reloadKeybindings(): void;
  /** Uses the vendor's terminal decoder rather than assuming one terminal escape spelling. */
  matchesTerminalKey(data: string, key: "home" | "end" | "pageUp" | "pageDown" | "ctrl+home" | "ctrl+end" | "alt+home" | "ctrl+v"): boolean;
  getText(): string;
  setText(text: string): void;
  insertText(text: string): void;
  addToHistory(text: string): void;
  setSubmitEnabled(enabled: boolean): void;
  setSubmitHandler(handler: (text: string) => void): void;
  setInterruptHandler(handler: () => void): void;
  setAutocompleteCommands(commands: readonly OwnedUiShellAutocompleteCommand[]): void;
  setPaddingX(padding: number): void;
  setAutocompleteMaxVisible(maxVisible: number): void;
  addAutocompleteProvider(factory: unknown): void;
  setThinkingLevel(level: OwnedUiThinkingLevel): void;
  setPromptSuggestion(text: string | null): void;
  canPresentPromptSuggestion(): boolean;
  promptSuggestionBlockReason?(): SuggestionDecision;
  hasSelection(): boolean;
  /** Exact expanded semantic editor selection without mutating or collapsing it. */
  selectedText?(): string | undefined;
  ownsPointer(): boolean;
  handlePointer(event: OwnedUiShellEditorPointerEvent): boolean;
  pasteClipboard(): boolean;
  cancelPendingPastes?(): void;
}

export interface OwnedUiShellAutocompleteCommand {
  readonly name: string;
  readonly description?: string;
  readonly argumentHint?: string;
  readonly argumentOptions?: readonly OwnedUiShellSelectorOption[];
  /** Built-in entries decorate the active profile's catalog; everything else is a discovered resource. */
  readonly source?: "builtin" | "prompt" | "skill" | "extension";
}

export interface OwnedUiShellViewComponentPort extends OwnedUiShellComponentPort {
  update(view: OwnedUiSessionViewModel): void;
}

export type OwnedUiShellStatusPlacement = "live" | "dock" | "hidden";
export type OwnedUiShellProgressPresentationMode = "pinned" | "custom-viewport";

export interface OwnedUiShellProgressStatusPresentation {
  readonly text: (message: string, mode: OwnedUiShellProgressPresentationMode) => string;
  readonly frame: (
    message: string,
    phase: number,
    styles: { readonly muted: (text: string) => string; readonly highlight: (text: string) => string },
  ) => string;
}

export interface OwnedUiShellStatusPort extends OwnedUiShellViewComponentPort {
  /** `active` owns a live operation before the engine lifecycle itself becomes busy. */
  setWorkingOverride(message: string | undefined, active?: boolean): void;
  setOutputPad(padding: 0 | 1): void;
  /** Bare A1 shows engine-measured progress beside the working word; the pinned route keeps the bare word. */
  setProgressPresentation(presentation: OwnedUiShellProgressPresentationMode): void;
  /** Semantic row placement; callers must not inspect rendered text. */
  placement(): OwnedUiShellStatusPlacement;
  renderDock(width: number): readonly string[];
  renderLive(width: number): readonly string[];
}

export interface OwnedUiShellQueuedInputPort extends OwnedUiShellComponentPort {
  update(submissions: readonly string[]): void;
}

export interface OwnedUiShellHeaderPort extends OwnedUiShellComponentPort {
  readonly expanded: boolean;
  setExpanded(expanded: boolean): void;
}

export type OwnedUiShellResourceSection = "Context" | "Skills" | "Prompts" | "Extensions" | "Themes";

export interface OwnedUiShellResourceEntry {
  readonly section: OwnedUiShellResourceSection;
  readonly label: string;
  readonly sourcePath: string | null;
  readonly diagnostic?: string | null;
}

export interface OwnedUiShellLoadedResourcesPort extends OwnedUiShellComponentPort {
  setExpanded(expanded: boolean): void;
}

export interface OwnedUiShellImageAssetResolver {
  resolve(assetId: string): OwnedUiImageAttachment | null;
}

export interface OwnedUiShellExtensionRendererResolver {
  getMessageRenderer(customType: string): unknown;
  getToolRenderers(toolName: string): unknown;
  getShortcuts?(bindings: OwnedUiShellKeybindings): readonly { readonly key: string; readonly description: string }[];
}

export interface OwnedUiShellTranscriptComponentPort extends OwnedUiShellComponentPort {
  readonly id: string;
  readonly revision: number;
  readonly presentationRevision?: number;
  update(block: OwnedUiTranscriptBlock): void;
  setExpanded(expanded: boolean): void;
  setOutputPad(padding: 0 | 1): void;
  setHideThinkingBlock(hidden: boolean): void;
  setMermaidRenderingMode(mode: "off" | "final" | "streaming"): void;
  setImagePresentation(showImages: boolean, imageWidthCells: number): void;
}

export interface OwnedUiShellStartupNotice {
  readonly kind: "info" | "warning" | "error";
  readonly message: string;
}

export interface OwnedUiShellHeaderOptions {
  readonly getKeybindings?: () => OwnedUiShellKeybindings;
  readonly quiet?: boolean;
  readonly expanded?: boolean;
  readonly notices?: readonly OwnedUiShellStartupNotice[];
  readonly resources?: readonly OwnedUiShellResourceEntry[];
}

/** An owned paste reserves its edit immediately and acknowledges completion only after insertion. */
export interface OwnedUiShellPasteReservation {
  readonly marker: string;
  readonly result: Promise<string>;
  complete?(): void;
  isCurrent?(): boolean;
}

export interface OwnedUiShellEditorOptions {
  readonly persistentHistory?: boolean;
  /** Configures the shared interactive input for a caller narrower than the agent prompt. */
  readonly inputCapabilities?: {
    readonly singleLine?: boolean;
    readonly paste?: boolean;
    readonly autocomplete?: boolean;
    readonly placeholder?: string;
  };
  readonly historyEditor?: OwnedUiShellHistoryEditor;
  /** Bare A1 adds ergonomic aliases while comparison profiles retain the vendor defaults. */
  readonly keybindingProfile?: "pi" | "a1";
  /** The process's shared keybindings; its profile must match `keybindingProfile`. */
  readonly keybindings?: OwnedUiShellKeybindingsHost;
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
  readonly onPromptSuggestionAccepted?: (text: string) => void;
  readonly onCopyText?: (text: string, cut: boolean) => void;
  readonly readClipboardContent?: (signal?: AbortSignal) => Promise<OwnedUiShellClipboardContent | null>;
  readonly beginClipboardPaste?: () => OwnedUiShellPasteReservation;
  readonly beginTextPaste?: (text: string) => OwnedUiShellPasteReservation;
  readonly deferTextPaste?: (text: string) => boolean;
  readonly onPasteRejected?: (error: unknown) => void;
  readonly onPasteInput?: (bytes: number, phase: "framing" | "inserting" | "settled") => void;
  readonly editorHiddenRanges?: (line: string) => readonly OwnedUiShellEditorTextRange[];
  readonly transformPastedContent?: (content: OwnedUiShellClipboardContent) => string;
  readonly editorAtomicRanges?: (line: string) => readonly OwnedUiShellEditorTextRange[];
  readonly expandCopiedEditorText?: (text: string) => string;
  readonly paintEditorSelection?: (line: string, from: number, to: number, atomic: boolean) => string;
  /** Row indices restart at zero for each complete owned editor decoration pass. */
  readonly decorateEditorRow?: (row: string, width: number, rowIndex: number) => string;
  readonly cwd?: string;
  readonly agentDir?: string;
  readonly autocompleteCommands?: readonly OwnedUiShellAutocompleteCommand[];
  /**
   * Bare A1's skills presentation, read at every command-list installation. `collapse` replaces the
   * `skill:<name>` entries with one `skills` command and its tunnel; absent or `expand` keeps the
   * pinned per-skill entries. Comparison profiles ignore it.
   */
  readonly skillsPresentation?: () => "collapse" | "expand";
  readonly promptPresentation?: {
    readonly input: OwnedUiShellPromptInputPresentation;
    readonly styleSuggestion: (text: string) => string;
    readonly styleSuggestionCaret: (text: string) => string;
  };
}

export interface OwnedUiShellSelectorOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface OwnedUiShellSelectorOptions {
  readonly title?: string;
  readonly options: readonly OwnedUiShellSelectorOption[];
  readonly maxVisible?: number;
  readonly onSelect?: (id: string) => void;
  readonly onCancel?: () => void;
}

export interface OwnedUiShellEditorRecall {
  replace(entries: readonly string[]): void;
  position(): { readonly index: number; readonly total: number };
  observe(listener: () => void): () => void;
  reset(): void;
  /** Exit a recall browse cycle by restoring the unsent draft rather than keeping the recalled entry. */
  restoreDraft?(): void;
}

export interface OwnedUiShellPromptInputGeometry {
  readonly prefixWidth: number;
  readonly innerWidth: number;
  readonly paddingX: number;
  readonly contentWidth: number;
  readonly layoutWidth: number;
}

export interface OwnedUiShellPromptInputBody {
  readonly rows: readonly string[];
  readonly topRule?: string | undefined;
  readonly bottomRule?: string | undefined;
  readonly after?: readonly string[];
  readonly afterIndent?: number;
}

export interface OwnedUiShellPromptInputPresentation {
  geometry(width: number, padding?: number): OwnedUiShellPromptInputGeometry;
  styleRule(text: string): string;
  render(width: number, body: (innerWidth: number) => OwnedUiShellPromptInputBody, ruled?: boolean, padding?: number): string[];
}
