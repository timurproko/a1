import type { OwnedUiDialog, OwnedUiEvent, OwnedUiImageAttachment, OwnedUiSessionViewModel, OwnedUiThinkingLevel, OwnedUiTranscriptBlock } from "./model.js";
import type { OwnedUiExtensionOverlayHandle, OwnedUiExtensionOverlayOptions, OwnedUiExtensionUiPort } from "./extension-ui.js";
import type { OwnedUiSessionInfoPresentation, OwnedUiSessionProductMode } from "./session-workflows.js";
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
  readonly ready?: Promise<void>;
  render(width: number): readonly string[];
  /** Bounds scrollable replacement inputs within the dock. */
  renderInDock?(width: number, maxHeight: number): readonly string[];
  invalidate(): void;
  handleInput?(data: string): void;
  /** Pointer input in one-based component-local coordinates, when supported. */
  handleLocalMouse?(event: { readonly kind: "press" | "release" | "motion" | "wheel-up" | "wheel-down"; readonly button: number; readonly column: number; readonly row: number }): void;
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
  /** Resolves application-host actions against the same active declarations as editor dispatch. */
  matchesAction?(data: string, action: "owned.apps.open"): boolean;
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
  /** Footer-only ephemeral frame; returns whether its clipped name still needs animation. */
  setNameReveal?(frame: { readonly from: string; readonly elapsed: number } | null): boolean;
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

/** The size and render request a vendor component reads from the terminal it is shown on. */
export type OwnedUiShellRuntime = Pick<OwnedUiShellEditorOptions, "getColumns" | "getRows" | "requestRender">;

export type OwnedUiShellMermaidRenderingMode = "off" | "final" | "streaming";

export interface OwnedUiShellSubmittedPromptComposer {
  readonly layout: (width: number) => { readonly contentWidth: number };
  readonly compose: (
    contentRows: readonly string[],
    width: number,
    style?: { readonly prefix?: (text: string) => string },
  ) => readonly string[];
}

export interface OwnedUiShellCommandMessage {
  readonly kind: "error" | "warning" | "accent" | "new" | "name" | "debug";
  readonly message: string;
  readonly detail?: string;
}

/** What the hotkeys presenters render: the editor bindings and the extension shortcuts declared over them. */
export interface OwnedUiShellHotkeysPresentation {
  readonly bindings?: OwnedUiShellKeybindings;
  readonly getShortcuts?: NonNullable<OwnedUiShellExtensionRendererResolver["getShortcuts"]>;
  readonly profile?: "pi" | "a1";
}

export interface OwnedUiShellReleaseUpdate {
  readonly version: string;
  readonly command: string;
  readonly changelogUrl: string | null;
}

export interface OwnedUiShellReleaseUpdateBanner {
  readonly rows: readonly string[];
  /** Clickable close area: zero-based rows within `rows`, one-based inclusive columns. */
  readonly close: { readonly rowStart: number; readonly rowEnd: number; readonly columnStart: number; readonly columnEnd: number };
}

export interface OwnedUiShellOperationLoaderPort extends OwnedUiShellComponentPort {
  readonly signal: AbortSignal;
  /** Relabels the running operation; the pinned comparison loader keeps its first label. */
  readonly setMessage?: (message: string) => void;
}

export interface OwnedUiShellAuthProviderOption extends OwnedUiShellSelectorOption {
  readonly providerId: string;
  readonly authType: "oauth" | "api_key";
  readonly status?: { readonly type: "oauth" | "api_key"; readonly source?: string };
}

export interface OwnedUiShellLoginDialogPort extends OwnedUiShellComponentPort {
  showAuth(url: string, instructions?: string): void;
  showDeviceCode(info: { readonly verificationUri: string; readonly userCode: string }): void;
  showManualInput(message: string): Promise<string>;
  showPrompt(message: string, placeholder?: string): Promise<string>;
  showDetails(lines: readonly string[]): void;
  showInfo(message: string, links?: readonly { readonly label?: string; readonly url: string }[], showCloseHint?: boolean): void;
  showWaiting(message: string): void;
  showProgress(message: string): void;
}

export interface OwnedUiShellSkillSummary {
  readonly name: string;
  readonly description: string;
}

export interface OwnedUiShellTrustUpdate { readonly path: string; readonly decision: boolean | null }
export interface OwnedUiShellTrustDecision { readonly path: string; readonly decision: boolean }
export interface OwnedUiShellTrustOption {
  readonly label: string;
  readonly trusted: boolean;
  readonly updates: readonly OwnedUiShellTrustUpdate[];
  readonly savedPath?: string;
}

export interface OwnedUiShellTrustSelectorOptions {
  readonly standardStyle?: boolean;
  readonly cwd: string;
  readonly savedDecision: OwnedUiShellTrustDecision | null;
  readonly projectTrusted: boolean;
  readonly trustOptions: readonly OwnedUiShellTrustOption[];
  readonly onSelect: (selection: { readonly trusted: boolean; readonly updates: readonly OwnedUiShellTrustUpdate[] }) => void;
  readonly onCancel: () => void;
}

/** A program-status report for terminals that show one; `clear` removes it. */
export interface OwnedUiShellProgramStatus {
  state: "idle" | "working" | "blocked" | "done" | "error" | "clear";
  app?: string;
  kind?: "permission" | "question" | "auth";
}

export interface OwnedUiShellProgramStatusBlocked {
  readonly kind: NonNullable<OwnedUiShellProgramStatus["kind"]>;
  readonly message: string;
}

/** Turns run lifecycle events and blocking prompts into terminal program-status reports. */
export interface OwnedUiShellProgramStatusReporter {
  handleEvent(event: Extract<OwnedUiEvent, { type: "agent-run-started" | "assistant-message-completed" | "agent-run-settled" }>): void;
  setBlocked(source: string, status: OwnedUiShellProgramStatusBlocked | undefined): void;
  setErrorMessage(message: string | undefined): void;
  reset(): void;
  clear(): void;
  report(): void;
}

/** What the extension UI bridge needs from the shell that hosts it. */
export interface OwnedUiShellExtensionUiBridgeHost {
  readonly runtime: OwnedUiShellRuntime;
  readonly agentDir?: string;
  setInputSurface(component: OwnedUiShellComponentPort | null): void;
  setProgramStatusBlocked(status: OwnedUiShellProgramStatusBlocked | undefined): void;
  showOverlay(component: OwnedUiShellComponentPort, options?: OwnedUiExtensionOverlayOptions): OwnedUiExtensionOverlayHandle;
  listenInput(handler: (data: string) => { readonly consume?: boolean; readonly data?: string } | undefined): () => void;
  replaceWidget(key: string, component: OwnedUiShellComponentPort | null, placement: "aboveEditor" | "belowEditor"): void;
  replaceHeader(component: OwnedUiShellComponentPort | null): void;
  replaceFooter(component: OwnedUiShellComponentPort | null): void;
  setStatus(key: string, text: string | undefined): void;
  setWorking(message: string | undefined, visible?: boolean): void;
  notify(message: string, type: "info" | "warning" | "error"): void;
  setTitle(title: string): void;
  getEditorText(): string;
  setEditorText(text: string): void;
  pasteToEditor(text: string): void;
  addAutocompleteProvider(factory: unknown): void;
  setCustomEditor(component: OwnedUiShellComponentPort | null): void;
  getFooterData(): unknown;
  getToolsExpanded(): boolean;
  setToolsExpanded(expanded: boolean): void;
}

export interface OwnedUiShellExtensionUiBridge {
  /** The extension UI context the engine binds to a session. */
  readonly context: OwnedUiExtensionUiPort;
  input(title: string, placeholder: string, options?: { readonly retainSurfaceOnSettle?: boolean }): Promise<string | undefined>;
  reset(): void;
  dispose(): void;
}

export type OwnedUiShellThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
export type OwnedUiShellTreeFilterMode = "default" | "no-tools" | "user-only" | "labeled-only" | "all";

export interface OwnedUiShellThinkingSelectorOptions {
  readonly currentLevel: OwnedUiShellThinkingLevel;
  readonly availableLevels: readonly OwnedUiShellThinkingLevel[];
  readonly onSelect: (level: OwnedUiShellThinkingLevel) => void;
  readonly onCancel: () => void;
  readonly onSelectAsDefault?: (level: OwnedUiShellThinkingLevel) => void;
  readonly defaultLevel?: OwnedUiShellThinkingLevel;
  readonly presentation?: { readonly profile: "bare"; readonly cycleBinding: string | readonly string[] };
}

export interface OwnedUiShellTreeSelectorOptions {
  readonly tree: readonly unknown[];
  readonly currentLeafId: string | null;
  readonly terminalHeight: number;
  readonly onSelect: (id: string) => void;
  readonly onCancel: () => void;
  readonly onLabelChange: (entryId: string, label: string | undefined) => void;
  readonly onCopy?: (text: string | undefined) => void;
  readonly initialSelectedId?: string;
  readonly initialFilterMode?: OwnedUiShellTreeFilterMode;
}

/** Selectors whose modules load on first use, so they stay off the startup path. */
export interface OwnedUiShellLazySelectorLoader {
  prepare(): Promise<void>;
  createThinking(options: OwnedUiShellThinkingSelectorOptions): Promise<OwnedUiShellComponentPort>;
  createTree(options: OwnedUiShellTreeSelectorOptions): Promise<OwnedUiShellComponentPort>;
}

/**
 * The vendor components and text helpers the session shell renders with, grouped by role. The vendor component
 * adapter implements every member; the shell receives the record through the session presenters.
 */
export interface OwnedUiShellComponents {
  readonly editor: {
    create(options: OwnedUiShellEditorOptions): OwnedUiShellEditorPort;
  };
  readonly chrome: {
    header(options?: OwnedUiShellHeaderOptions): OwnedUiShellHeaderPort;
    status(view: OwnedUiSessionViewModel, progress: OwnedUiShellProgressStatusPresentation, runtime?: OwnedUiShellRuntime): OwnedUiShellStatusPort;
    footer(view: OwnedUiSessionViewModel, cwd: string, profile?: "pi" | "a1", showLevel?: () => boolean): OwnedUiShellViewComponentPort;
    queuedInput(submissions: readonly string[], presentation?: "pinned" | "custom-viewport", getKeybindings?: () => OwnedUiShellKeybindings): OwnedUiShellQueuedInputPort;
    loadedResources(resources: readonly OwnedUiShellResourceEntry[], initialExpanded?: boolean): OwnedUiShellLoadedResourcesPort;
    installedUpdateStatus(width: number): string;
    releaseUpdateBanner(release: OwnedUiShellReleaseUpdate, width: number, closeHovered: boolean): OwnedUiShellReleaseUpdateBanner;
    programStatusReporter(report: (status: OwnedUiShellProgramStatus) => void, getSessionName: () => string | undefined, app?: string): OwnedUiShellProgramStatusReporter;
  };
  readonly transcript: {
    component(
      initial: OwnedUiTranscriptBlock,
      cwd: string,
      extensions?: OwnedUiShellExtensionRendererResolver,
      submittedPrompt?: OwnedUiShellSubmittedPromptComposer,
      initialOutputPad?: 0 | 1,
      initialHideThinkingBlock?: boolean,
      initialMermaidRenderingMode?: OwnedUiShellMermaidRenderingMode,
      initialShowImages?: boolean,
      initialImageWidthCells?: number,
      imageAssets?: OwnedUiShellImageAssetResolver,
      presentation?: { readonly getColumns: () => number; readonly getRows: () => number; readonly changed: () => void },
    ): OwnedUiShellTranscriptComponentPort;
    renderBlock(block: OwnedUiTranscriptBlock, width: number, cwd: string): readonly string[];
    renderStartupDiagnostic(diagnostic: { readonly severity: "info" | "warning" | "error"; readonly message: string }, width: number): readonly string[];
    isPromptStyleCompaction(block: OwnedUiTranscriptBlock): boolean;
  };
  readonly info: {
    changelog(markdown: string): OwnedUiShellComponentPort;
    collapsedChangelog(): OwnedUiShellComponentPort;
    hotkeys(bindings?: OwnedUiShellKeybindings, getShortcuts?: NonNullable<OwnedUiShellExtensionRendererResolver["getShortcuts"]>, profile?: "pi" | "a1"): OwnedUiShellComponentPort;
    sessionInfo(presentation: OwnedUiSessionInfoPresentation): OwnedUiShellComponentPort;
    commandMessage(presentation: OwnedUiShellCommandMessage, width: number, outputPad?: 0 | 1): readonly string[];
    statusText(message: string, width: number, outputPad?: 0 | 1): readonly string[];
    packageUpdateNotice(packages: readonly string[], width: number): readonly string[];
    releaseUpdateNotice(release: OwnedUiShellReleaseUpdate, width: number): readonly string[];
    armin(runtime: OwnedUiShellRuntime): OwnedUiShellComponentPort;
    earendilAnnouncement(): OwnedUiShellComponentPort;
    reloadBox(): OwnedUiShellComponentPort;
  };
  readonly dialogs: {
    dialog(dialog: OwnedUiDialog, handlers?: { readonly onSelect?: (id: string) => void; readonly onCancel?: () => void }): OwnedUiShellComponentPort;
    selector(options: OwnedUiShellSelectorOptions): OwnedUiShellComponentPort;
    extensionSelector(title: string, options: readonly string[], onSelect: (value: string) => void, onCancel: () => void, standardSelection?: boolean): OwnedUiShellComponentPort;
    authProviderSelector(mode: "login" | "logout", providers: readonly OwnedUiShellAuthProviderOption[], onSelect: (id: string) => void, onCancel: () => void, initialSearchInput?: string, standardStyle?: boolean): OwnedUiShellComponentPort;
    loginDialog(runtime: OwnedUiShellRuntime, providerId: string, onComplete: (success: boolean, message?: string) => void, providerName?: string, title?: string): OwnedUiShellLoginDialogPort;
    skillsSelector(options: { readonly skills: readonly OwnedUiShellSkillSummary[]; readonly onSelect: (name: string) => void; readonly onCancel: () => void }): OwnedUiShellComponentPort;
    trustSelector(options: OwnedUiShellTrustSelectorOptions): OwnedUiShellComponentPort;
    userMessageSelector(messages: readonly OwnedUiShellSelectorOption[], onSelect: (id: string) => void, onCancel: () => void, initialSelectedId?: string): OwnedUiShellComponentPort;
    /** The cancellable share progress surface: a bordered dialog or a plain loader; loads its module on first use. */
    shareProgress(runtime: OwnedUiShellRuntime, message: string, style: "dialog" | "loader"): Promise<OwnedUiShellOperationLoaderPort>;
    extensionUiBridge(host: OwnedUiShellExtensionUiBridgeHost): OwnedUiShellExtensionUiBridge;
    /** Absent until composition supplies a loader; the shell loads the vendor's own on first use otherwise. */
    readonly lazySelectors: () => Promise<OwnedUiShellLazySelectorLoader>;
  };
  readonly text: {
    /** Terminal-cell width of painted text. */
    visibleWidth(text: string): number;
    truncateToWidth(text: string, width: number): string;
    /** A clickable URL: an OSC 8 link where the terminal supports one, the plain URL otherwise. */
    hyperlink(url: string, text?: string): string;
  };
  readonly workflows: {
    /** The workflow command names the active product mode routes. */
    commandNames(mode: OwnedUiSessionProductMode): readonly string[];
  };
  readonly skills: {
    readonly commandName: string;
    fromCommands(commands: readonly OwnedUiShellAutocompleteCommand[]): readonly OwnedUiShellSkillSummary[];
    findByArgument(skills: readonly OwnedUiShellSkillSummary[], token: string): OwnedUiShellSkillSummary | undefined;
    rewriteTunnelSubmission(text: string): string;
    prompt(name: string, args?: string): string;
  };
}
