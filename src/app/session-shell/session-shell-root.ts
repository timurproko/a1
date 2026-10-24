import { ImageAttachmentError } from "../../contracts/owned-ui/index.js";
import type {
  OwnedUiBackgroundSettingsPort,
  OwnedUiExtensionResourceSummary,
  OwnedUiExtensionSourceSummary,
  OwnedUiPromptSuggestionGeneratorPort,
  OwnedUiSessionBackend,
  OwnedUiSessionPresenters,
  OwnedUiSessionViewModel,
  OwnedUiTranscriptRendererPort,
  OwnedUiWorkflowMessage,
  OwnedUiWorkflowResult,
  OwnedUiViewportSettings,
  OwnedUiViewportSettingsPort,
  OwnedUiQuitOutroSettingsPort,
  SuggestionDecision,
  SuggestionDiagnosticObserver,
} from "../../contracts/owned-ui/index.js";
import type { PiTuiPointerSurface } from "../../integrations/pi/tui-runtime/contracts.js";
import type { UiRouteHost, UiRouteInput } from "../../ui/apps/contracts.js";
import { promptArrow } from "../../ui/components/prompt-input.js";
import {
  composeSubmittedPromptRows,
  submittedPromptLayout,
} from "../../ui/components/submitted-prompt.js";
import {
  backgroundSgrSpan,
  nativeHyperlinkStyle,
} from "../../ui/components/spans.js";
import { progressStatusFrame, progressStatusText } from "../../ui/components/progress-status.js";
import type {
  TranscriptViewportFrame,
  TranscriptViewportFrameDescriptor,
  TranscriptViewportTheme,
} from "../../ui/components/transcript-viewport.js";
import type { PiShellLazySelectorLoader } from "../../integrations/pi/components/lazy-selectors.js";
import {
  createPiQueuedInputStatus,
  createPiShellFooter,
  createPiShellHeader,
  createPiShellLoadedResources,
  createPiShellStatus,
} from "../../integrations/pi/components/shell-footer-status.js";
import type { PiShellHotkeysPresentation } from "../../integrations/pi/components/shell-presenters-info.js";
import {
  createPiShellTranscriptComponent,
  type PiShellSubmittedPromptComposer,
} from "../../integrations/pi/components/shell-presenters-transcript.js";
import { onPiThemeChange, piTheme } from "../../integrations/pi/components/upstream/theme/theme.js";
import {
  type PiShellClipboardContent,
  type PiShellComponentPort,
  type PiKeybindingsHost,
  type PiShellEditorPort,
  type PiShellHeaderOptions,
  type PiShellHeaderPort,
  type PiShellImageAssetResolver,
  type PiShellLoadedResourcesPort,
  type PiShellQueuedInputPort,
  type PiShellResourceEntry,
  type PiShellStatusPort,
  type PiShellTranscriptComponentPort,
  type PiShellViewComponentPort,
} from "../../integrations/pi/components/shell-shared-facade.js";
import {
  type PiTuiInputCoordinationScheduler,
  type PiTuiInputSurfaceKind,
} from "../../integrations/pi/tui-runtime/input-presentation-coordinator.js";
import type {
  PiTuiComponentPort,
  PiTuiInputDiagnosticsEvent,
  PiTuiLayoutNode,
  PiTuiTerminalPort,
} from "../../integrations/pi/tui-runtime/contracts.js";
import { PromptChipStore, type PreparedPrompt } from "./prompt-chips.js";
import type { PastePreparationClientOptions } from "./paste-preparation-client.js";
import type { OwnedUiClipboardServices } from "./clipboard-services.js";
import { SessionViewportController, type SessionViewportInputResult } from "./session-viewport-controller.js";
import type { ResponseCopyExecutor } from "./response-copy-transport.js";
import type { ResponseCopyEvent } from "./response-copy-protocol.js";
import type { PasteEvent, PasteSource } from "./paste-protocol.js";
import { createShellEditor } from "./shell-editor-factory.js";
import { ExtensionSurface } from "./extension-surface.js";
import { DockChrome } from "./dock-chrome.js";
import { WorkflowOutput } from "./workflow-output.js";
import { InputSurfaceSwitch } from "./input-surface-switch.js";
import { PinnedLayout, type DockLayout, type ShellLayout, type ShellLayoutPorts } from "./shell-layout.js";
import { ViewportLayout } from "./viewport-layout.js";
import { nativeTranscriptLinkColor, TranscriptDocument } from "./transcript-document.js";
import type { StreamPresentationScheduler } from "./stream-presentation-coalescer.js";

export type OwnedUiTerminalPort = PiTuiTerminalPort;
type OwnedUiStartupOptions = PiShellHeaderOptions;

export interface OwnedUiClipboardPort {
  readText(signal?: AbortSignal): Promise<string | null>;
  readImage?(signal?: AbortSignal): Promise<{ readonly data: string; readonly mimeType: string } | null>;
  writeText?(text: string, signal?: AbortSignal): Promise<void>;
}

/** The engine session the shell presents and the composition's decisions about it. */
export interface OwnedUiShellEngineOptions {
  readonly backend: OwnedUiSessionBackend;
  readonly cwd: string;
  /**
   * Declared A1-owned routes. A route this host claims resolves to its app;
   * every other route continues to the pinned workflow table unchanged.
   */
  readonly routeHost?: UiRouteHost;
  /** One product-owned route presented after the first usable frame and any startup modal. */
  readonly startupRoute?: {
    readonly route: string;
    readonly input?: UiRouteInput;
    readonly onClosed?: () => void | Promise<void>;
  };
  /** Bare A1 selects the owned bounded viewport; comparison profiles stay pinned. */
  readonly sessionLayout?: "pinned" | "custom-viewport";
  /** Resident tab quit routes detach the outer client without stopping this engine session. */
  readonly residentTab?: {
    requestDetach(): Promise<boolean>;
    closeOwnedRoute?(route: string): void;
    reportStatus?(status: "working" | "idle"): void;
    admit?(input: {
      readonly sessionId: string;
      readonly sessionFile: string | null;
      readonly kind: "prompt" | "steer" | "follow-up";
      readonly text: string;
    }): Promise<{ readonly id: string }>;
    dispatched?(): void;
    correlated?(submissionId: string, entryId: string): Promise<void>;
    checkpoint?(text: string): void;
    gracefulStop?(sessionFile: string | null): Promise<void>;
    readonly recovered?: {
      readonly prompts: readonly { readonly id: string; readonly text: string }[];
      readonly draft: string | null;
    };
    readonly unavailableNotice?: string;
  };
}

/** Terminal, startup, viewport, and presentation-cadence seams; production leaves most at their defaults. */
export interface OwnedUiShellPresentationOptions {
  readonly terminal?: OwnedUiTerminalPort;
  readonly startup?: OwnedUiStartupOptions;
  /** Live profile-local settings, supplied only to the bare-A1 composition. */
  readonly viewportSettings?: OwnedUiViewportSettingsPort;
  /** Live fullscreen canvas choice, supplied only to the bare-A1 composition. */
  readonly backgroundSettings?: OwnedUiBackgroundSettingsPort;
  /** Deterministic scheduling seam for presentation-cadence tests. */
  readonly stream?: {
    readonly intervalMs?: number;
    readonly scheduler?: StreamPresentationScheduler;
  };
  /**
   * Minimum time the reload box stays visible so a fast reload still reads as one.
   * Production uses the default hold; tests inject `now`/`sleep` for determinism.
   */
  readonly reload?: {
    readonly minVisibleMs?: number;
    readonly now?: () => number;
    readonly sleep?: (ms: number) => Promise<void>;
  };
  /**
   * Quit outro settings and seams, supplied only to the bare-A1 composition.
   * `interactive` states whether the terminal can show the animation; production
   * passes stdout's TTY state, tests opt in explicitly.
   */
  readonly quitOutro?: OwnedUiQuitOutroSettingsPort & {
    readonly interactive: boolean;
    readonly now?: () => number;
    readonly sleep?: (ms: number) => Promise<void>;
    readonly seed?: number;
  };
  readonly input?: {
    readonly scheduler?: PiTuiInputCoordinationScheduler;
    readonly onEvent?: (event: PiTuiInputDiagnosticsEvent) => void;
    readonly now?: () => number;
    /** Evidence-only baseline seam; production leaves coordination enabled. */
    readonly coordination?: boolean;
    /** Evidence-only baseline seam; production leaves dock reuse enabled. */
    readonly viewportReuse?: boolean;
  };
}

/** Persistent prompt history: its store, its bound, the editor that recalls it, and the image sidecar. */
export interface OwnedUiShellHistoryOptions {
  readonly store: import("../../contracts/owned-ui/index.js").PromptHistoryPort;
  /** When present, session replacement selects a new store and sidecar, not the old session's recall. */
  readonly sessionId?: string;
  readonly scope?: "unique" | "shared";
  readonly forSession?: (sessionId: string) => Pick<OwnedUiShellHistoryOptions, "store" | "imageSidecar">;
  /** A live scope change selects the matching store for this session without copying records. */
  readonly forScope?: (scope: "unique" | "shared", sessionId: string | null) => Pick<OwnedUiShellHistoryOptions, "store" | "imageSidecar"> | null;
  readonly onScopeChange?: (listener: (scope: "unique" | "shared") => void) => () => void;
  readonly limit: number;
  readonly editor: import("../../integrations/pi/components/index.js").HistoryEditorConstructor;
  /** Optional per-profile filesystem sidecar for image chip payloads. When present, submit
   * writes each referenced attachment and recall reads them back to rehydrate live chips.
   * When absent, image chips silently strip on recall, matching the missing-sidecar path. */
  readonly imageSidecar?: import("../../contracts/owned-ui/index.js").PromptHistoryImageSidecarPort;
}

/** Contextual prompt suggestions: the generator, the enablement setting, and an optional evidence seam. */
export interface OwnedUiShellSuggestionOptions {
  readonly diagnostics?: SuggestionDiagnosticObserver;
  readonly generator: OwnedUiPromptSuggestionGeneratorPort;
  readonly enabled: () => boolean;
  readonly onChange: (listener: (enabled: boolean) => void) => () => void;
}

/** Clipboard seams and payload-free diagnostics; comparison profiles ignore the diagnostics. */
export interface OwnedUiShellDiagnosticOptions {
  /** Optional platform seam; production uses A1's system clipboard adapter. */
  readonly clipboard?: OwnedUiClipboardPort;
  /** Owned response-copy transport and payload-free diagnostic seams. */
  readonly responseCopy?: {
    readonly execute?: ResponseCopyExecutor;
    readonly onEvent?: (event: ResponseCopyEvent) => void;
  };
  /** Bounded, payload-free clipboard acquisition/preparation observations. */
  readonly paste?: (event: PasteEvent) => void;
  /** Test seams for isolated paste preparation: an in-process starter, or the forked helper's entry. */
  readonly pastePreparation?: Omit<PastePreparationClientOptions, "onEvent" | "spareIdleMs">;
  /** Test seam for pending and failed optional selector-module preparation. */
  readonly lazySelectors?: PiShellLazySelectorLoader;
}

/** Live prompt-image admission policy supplied only by the bare-A1 profile. */
export interface OwnedUiShellPromptImagesOptions {
  readonly limit: () => number;
  readonly onChange: (listener: () => void) => () => void;
}

/** The skills presentation choice: collapse the per-skill commands into one skills command or expand them. */
export interface OwnedUiShellSkillsOptions {
  readonly presentation: () => "collapse" | "expand";
  readonly onChange: (listener: () => void) => () => void;
}

/** Process-wide services composition creates once and every session shell borrows; absent, a shell keeps private ones. */
export interface OwnedUiShellSharedServices {
  readonly clipboard?: OwnedUiClipboardServices;
  /** Must match the shell's layout: the owned-input profile for the custom viewport, Pi's otherwise. */
  readonly keybindings?: PiKeybindingsHost;
}

/** What composes an owned session shell, grouped by the collaborator that provides each part. */
export interface OwnedUiSessionShellOptions {
  readonly engine: OwnedUiShellEngineOptions;
  /** Opens the selectors and resolves the transcript renderers whose inputs are engine objects. */
  readonly presenters: OwnedUiSessionPresenters;
  readonly presentation?: OwnedUiShellPresentationOptions;
  readonly history?: OwnedUiShellHistoryOptions;
  readonly suggestions?: OwnedUiShellSuggestionOptions;
  /** Supplied only to bare A1; absent retains the fixed eight-image comparison policy. */
  readonly promptImages?: OwnedUiShellPromptImagesOptions;
  /** Supplied only to the bare-A1 composition; absent keeps the pinned per-skill command list. */
  readonly skills?: OwnedUiShellSkillsOptions;
  readonly diagnostics?: OwnedUiShellDiagnosticOptions;
  readonly shared?: OwnedUiShellSharedServices;
}

/** Composes backend session state into the owned transcript, viewport, editor, and dock presentation. */
export class OwnedUiSessionShellRoot implements PiTuiComponentPort {
  readonly editor: PiShellEditorPort;
  readonly header: PiShellHeaderPort;
  readonly resources: PiShellLoadedResourcesPort;
  readonly #cwd: string;
  readonly #document: TranscriptDocument;
  readonly #themeUnsubscribe: () => void;
  #view: OwnedUiSessionViewModel;
  readonly #status: PiShellStatusPort;
  readonly #footer: PiShellViewComponentPort;
  readonly #queued: PiShellQueuedInputPort;
  readonly #extensionRenderers: OwnedUiTranscriptRendererPort;
  readonly #imageAssets: PiShellImageAssetResolver | undefined;
  readonly #promptChips: PromptChipStore;
  #pasteDiagnosticId = 0;
  readonly #customViewport: boolean;
  readonly #submittedPromptComposer: PiShellSubmittedPromptComposer | undefined;
  readonly #viewportController: SessionViewportController;
  readonly #onPromptSuggestionEligibilityChanged: (() => void) | undefined;
  readonly #componentRuntime: {
    readonly getColumns: () => number;
    readonly getRows: () => number;
    readonly requestRender: (force?: boolean) => void;
  };
  #toolsExpanded = false;
  #thinkingVisible = true;
  #footerLevel = true;
  #mermaidRenderingMode: "off" | "final" | "streaming" = "off";
  #showImages = true;
  #imageWidthCells = 80;
  #outputPad: 0 | 1 = 1;
  readonly #workflowOutput: WorkflowOutput;
  readonly #input: InputSurfaceSwitch;
  readonly #layout: ShellLayout;
  readonly #extensions = new ExtensionSurface();
  readonly #dockChrome: DockChrome;
  #imageSubmissionsSending = 0;

  constructor(
    view: OwnedUiSessionViewModel,
    cwd: string,
    handlers: {
      readonly getColumns: () => number;
      readonly getRows: () => number;
      readonly requestRender: (force?: boolean) => void;
      readonly onViewportFrame?: (frame: TranscriptViewportFrame) => void;
      readonly requestHyperlinkCleanup?: (rows?: readonly number[]) => void;
      readonly enableDockInputReuse?: boolean;
      readonly persistentHistory?: boolean;
      readonly hideUtilityTabCommands?: boolean;
      readonly historyEditor?: import("../../integrations/pi/components/index.js").HistoryEditorConstructor;
      readonly onSubmit: (text: string) => void;
      readonly onPasteRejected?: (error: unknown) => void;
      readonly onInterrupt: () => void;
      readonly onClear?: () => void;
      readonly onExit: () => void;
      readonly onModelSelect: () => void;
      readonly onModelCycle?: (direction: "forward" | "backward") => void;
      readonly onThinkingCycle: () => void;
      readonly onThinkingToggle?: () => void;
      readonly onMessageCopy?: () => void;
      readonly onFollowUp?: () => void;
      readonly onDequeue?: () => void;
      readonly onEditorChange?: (text: string) => void;
      readonly onPromptSuggestionAccepted?: (text: string) => void;
      readonly onInputSurfaceChanged?: () => void;
      readonly onPromptSuggestionEligibilityChanged?: () => void;
      readonly onCopyText?: (text: string, cut: boolean) => void;
      readonly readClipboardContent?: (signal?: AbortSignal) => Promise<PiShellClipboardContent | null>;
      readonly captureClipboardPaste?: () => PasteSource;
      readonly pasteDiagnostics?: (event: PasteEvent) => void;
      readonly pastePreparation?: Omit<PastePreparationClientOptions, "onEvent">;
      readonly keybindings?: PiKeybindingsHost;
      readonly promptImageLimit?: () => number;
      readonly skillsPresentation?: () => "collapse" | "expand";
      /** A resident tab chip already shows the session name, so its footer omits the duplicate. */
      readonly footerSessionName?: boolean;
    },
    startup: PiShellHeaderOptions = {},
    agentDir?: string,
    extensionRenderers: OwnedUiTranscriptRendererPort = {
      getMessageRenderer: () => undefined,
      getToolRenderers: () => undefined,
      getShortcuts: () => [],
    },
    sessionLayout: "pinned" | "custom-viewport" = "pinned",
    imageAssets?: PiShellImageAssetResolver,
  ) {
    this.#view = view;
    this.#customViewport = sessionLayout === "custom-viewport";
    this.#promptChips = new PromptChipStore({ isolated: this.#customViewport,
      ...(handlers.pasteDiagnostics === undefined ? {} : { onEvent: handlers.pasteDiagnostics }),
      ...(handlers.pastePreparation === undefined ? {} : { preparation: handlers.pastePreparation }),
      ...(handlers.promptImageLimit === undefined ? {} : { imageLimit: handlers.promptImageLimit }) });
    this.#submittedPromptComposer = this.#customViewport ? this.#createSubmittedPromptComposer() : undefined;
    this.#cwd = cwd;
    this.#document = this.#createDocument(cwd);
    this.#extensionRenderers = extensionRenderers;
    this.#imageAssets = imageAssets;
    this.#componentRuntime = handlers;
    this.#onPromptSuggestionEligibilityChanged = handlers.onPromptSuggestionEligibilityChanged;
    this.header = createPiShellHeader({
      ...startup,
      ...(this.#customViewport ? { getKeybindings: () => this.editor.keybindingConfig() } : {}),
    });
    this.resources = createPiShellLoadedResources(startup.resources ?? [], startup.expanded ?? false);
    this.#status = createPiShellStatus(view, {
      text: (message, mode) => progressStatusText(message, mode === "custom-viewport" ? "…" : "..."),
      frame: progressStatusFrame,
    }, handlers);
    this.#status.setProgressPresentation(this.#customViewport ? "custom-viewport" : "pinned");
    this.#footer = createPiShellFooter(this.#extensions.withStatuses(view), cwd, this.#customViewport ? "a1" : "pi", () => this.#footerLevel, handlers.footerSessionName ?? true);
    this.editor = createShellEditor({
      handlers,
      customViewport: this.#customViewport,
      cwd,
      ...(agentDir === undefined ? {} : { agentDir }),
      promptChips: this.#promptChips,
      editorPointerSelecting: () => this.#viewportController.editorPointerSelecting,
      nextPasteDiagnosticRequest: () => --this.#pasteDiagnosticId,
      toggleToolsExpanded: () => this.#setToolsExpanded(!this.#toolsExpanded),
    });
    this.#queued = createPiQueuedInputStatus(
      view.editor.queuedSubmissions,
      this.#customViewport ? "custom-viewport" : "pinned",
      this.#customViewport ? () => this.editor.keybindingConfig() : undefined,
    );
    this.#viewportController = new SessionViewportController({
      enabled: this.#customViewport,
      editor: this.editor,
      requestRender: force => this.#componentRuntime.requestRender(force),
      requestHyperlinkCleanup: rows => handlers.requestHyperlinkCleanup?.(rows),
      hasEditorLinks: () => this.#promptChips.hyperlinkRanges(this.editor.getText()).length > 0,
      ...(handlers.pasteDiagnostics === undefined ? {} : { pasteDiagnostics: handlers.pasteDiagnostics }),
      nextPasteDiagnosticRequest: () => --this.#pasteDiagnosticId,
    });
    this.#dockChrome = new DockChrome({
      invalidateChrome: () => this.#invalidateChrome(),
      requestRender: () => this.#componentRuntime.requestRender(),
      viewport: this.#viewportController,
    });
    this.#workflowOutput = new WorkflowOutput({
      customViewport: this.#customViewport,
      document: this.#document,
      dock: this.#dockChrome,
      transcriptLength: () => this.#view.transcript.length,
      outputPad: () => this.#outputPad,
      hotkeysPresentation: () => this.hotkeysPresentation(),
      componentRuntime: this.#componentRuntime,
      invalidate: () => this.invalidate(),
    });
    this.editor.setThinkingLevel(view.thinkingLevel);
    this.#input = new InputSurfaceSwitch(this.editor, {
      dockInputReuse: this.#customViewport && (handlers.enableDockInputReuse ?? true),
      viewport: this.#viewportController,
      ...(handlers.onInputSurfaceChanged === undefined ? {} : { onChanged: handlers.onInputSurfaceChanged }),
    });
    this.#layout = this.#createLayout(handlers.onViewportFrame);
    for (const block of view.transcript) {
      if (block.kind === "user") this.editor.addToHistory(block.text);
    }
    this.#document.sync(view.transcript);
    // Invariant: colours come from the active theme, so rendered rows outlive their revision only
    // until the theme under them changes.
    this.#themeUnsubscribe = onPiThemeChange(() => {
      this.invalidate();
      this.#componentRuntime.requestRender(true);
    });
  }

  // Invariant: the document reads the shell's chrome lazily, so it may be built before the header and viewport.
  #createDocument(cwd: string): TranscriptDocument {
    return new TranscriptDocument({
      customViewport: this.#customViewport,
      cwd,
      mount: block => this.#mountTranscript(block),
      chrome: {
        diagnostics: () => this.#view.diagnostics,
        headerRows: width => this.#extensions.header !== null ? this.#extensions.header.render(width)
          : this.#customViewport ? [] : this.header.render(width),
        resourceRows: width => this.#customViewport ? [] : this.resources.render(width),
        hasExtensionHeader: () => this.#extensions.header !== null,
        thinkingVisible: () => this.#thinkingVisible,
        timeFormat: () => this.#viewportController.config.timeFormat,
      },
    });
  }

  // Invariant: one layout per root; the render path never consults the layout mode again.
  #createLayout(onFrame: ((frame: TranscriptViewportFrame) => void) | undefined): ShellLayout {
    const ports: ShellLayoutPorts = {
      viewport: this.#viewportController,
      input: this.#input,
      editor: this.editor,
      promptChips: this.#promptChips,
      dockChrome: this.#dockChrome,
      theme: VIEWPORT_THEME,
      ...(onFrame === undefined ? {} : { onFrame }),
      rows: () => this.#componentRuntime.getRows(),
      dock: width => this.#renderDockLayout(width),
      document: width => this.#document.layout(width),
      queued: width => this.#renderQueued(width),
      liveStatus: width => this.#renderStatus(width),
      diagnostics: () => this.#view.diagnostics,
    };
    return this.#customViewport ? new ViewportLayout(ports) : new PinnedLayout(ports);
  }

  #createSubmittedPromptComposer(): PiShellSubmittedPromptComposer {
    return {
      layout: (width, source) => submittedPromptLayout(width, source, this.#viewportController.config.timeFormat ?? "8:00 PM"),
      compose: (rows, width, source, style) => composeSubmittedPromptRows(
        rows,
        width,
        source,
        { ...style, prefix: text => promptArrow(text, piTheme()) },
        this.#viewportController.config.timeFormat ?? "8:00 PM",
      ).map(row => nativeHyperlinkStyle(row, nativeTranscriptLinkColor)),
    };
  }

  setEditorPaddingX(padding: number): void {
    this.editor.setPaddingX(padding);
    this.#document.invalidate("editor-padding");
  }

  setAutocompleteMaxVisible(maxVisible: number): void {
    this.editor.setAutocompleteMaxVisible(maxVisible);
  }

  setOutputPad(padding: 0 | 1): void {
    if (this.#outputPad === padding) return;
    this.#outputPad = padding;
    this.#status.setOutputPad(padding);
    for (const component of this.#document.components()) component.setOutputPad(padding);
    this.#invalidateTranscriptPresentation();
  }

  setHideThinkingBlock(hidden: boolean): void {
    if (this.#thinkingVisible === !hidden) return;
    this.#thinkingVisible = !hidden;
    for (const component of this.#document.components()) component.setHideThinkingBlock(hidden);
    this.#invalidateTranscriptPresentation();
  }

  setMermaidRenderingMode(mode: "off" | "final" | "streaming"): void {
    if (this.#mermaidRenderingMode === mode) return;
    this.#mermaidRenderingMode = mode;
    for (const component of this.#document.components()) component.setMermaidRenderingMode(mode);
    this.#invalidateTranscriptPresentation();
  }

  setImagePresentation(showImages: boolean, imageWidthCells: number): void {
    if (this.#showImages === showImages && this.#imageWidthCells === imageWidthCells) return;
    this.#showImages = showImages;
    this.#imageWidthCells = imageWidthCells;
    for (const component of this.#document.components()) component.setImagePresentation(showImages, imageWidthCells);
    this.#invalidateTranscriptPresentation();
  }

  prepareHistoryText(text: string): string {
    return this.#promptChips.prepareHistoryText(text);
  }

  omitUnsentPromptImages(text: string): string {
    return this.#promptChips.omitUnsentImages(text);
  }

  rehydrateHistoryText(text: string, resolveImage: (id: string) => import("../../contracts/owned-ui/index.js").PromptHistoryImageSidecarAttachment | null): string {
    return this.#promptChips.rehydrateHistoryText(text, resolveImage);
  }

  imageChipAttachmentsFromEditor(text: string): { readonly id: string; readonly tag: string; readonly image: { readonly type: "image"; readonly data: string; readonly mimeType: string } }[] {
    return this.#promptChips.imageChipAttachments(text);
  }

  preparePromptSubmission(text: string): PreparedPrompt {
    return this.#promptChips.prepareSubmission(text);
  }

  reconcilePromptImageLimitNotice(text: string = this.editor.getText()): boolean {
    if (this.#dockChrome.notice?.errorCode !== "image-count" || !this.#promptChips.imageLimitState(text).corrected) return false;
    this.dismissNotice();
    return true;
  }

  hasPendingPastes(text: string): boolean { return this.#promptChips.hasPending(text); }

  waitForPromptPastes(text: string, signal: AbortSignal): Promise<PreparedPrompt> {
    return this.#promptChips.waitForPastes(text, signal, () => this.editor.getText());
  }

  resetPendingPastes(): void {
    this.editor.cancelPendingPastes?.();
    this.editor.setText(this.#promptChips.resetPastes(this.editor.getText()));
  }

  /** Forks the spare paste helper so the first paste of the session takes a live child. */
  warmPastePreparation(): void { this.#promptChips.warm(); }

  disposePendingPastes(): Promise<void> {
    this.resetPendingPastes();
    return this.#promptChips.dispose();
  }

  promptSuggestionPrepareBlockReason(): SuggestionDecision {
    if (!this.usesDefaultInputSurface()) return "replacement-input";
    if (this.#view.dialog !== null || this.#view.overlay !== null) return "modal";
    if (this.editor.getText().length > 0) return "draft";
    return null;
  }

  canPreparePromptSuggestion(): boolean { return this.promptSuggestionPrepareBlockReason() === null; }

  promptSuggestionPresentationBlockReason(): SuggestionDecision {
    const reason = this.promptSuggestionPrepareBlockReason();
    if (reason !== null) return reason;
    if (this.#view.lifecycle !== "ready") return "not-ready";
    return this.editor.promptSuggestionBlockReason?.()
      ?? (this.editor.canPresentPromptSuggestion() ? null : "presentation-unavailable");
  }

  canPresentPromptSuggestion(): boolean { return this.promptSuggestionPresentationBlockReason() === null; }

  setPromptSuggestion(text: string | null): void {
    this.editor.setPromptSuggestion(text);
  }

  update(view: OwnedUiSessionViewModel): void {
    const becameReady = this.#view.lifecycle !== "ready" && view.lifecycle === "ready";
    if (view.diagnostics.length !== this.#view.diagnostics.length
      || view.diagnostics.some((diagnostic, index) => diagnostic.sequence !== this.#view.diagnostics[index]?.sequence)) {
      this.#document.invalidate("diagnostics");
    }
    const promptAccepted = this.#view.lifecycle !== "busy" && view.lifecycle === "busy";
    this.#view = view;
    // Invariant: the idle new-session confirmation yields to the first truthful live status;
    // ordinary dock notices deliberately remain visible below Working during a run.
    if (promptAccepted && this.#dockChrome.notice?.kind === "new-session") this.#dockChrome.forgetNotice();
    if (promptAccepted && this.#imageSubmissionsSending > 0) {
      this.#imageSubmissionsSending = 0;
      this.#syncWorkingOverride();
    }
    this.#status.update(view);
    this.#footer.update(this.#extensions.withStatuses(view));
    this.#queued.update(view.editor.queuedSubmissions);
    this.#document.sync(view.transcript);
    this.editor.setSubmitEnabled(view.lifecycle !== "stopping" && view.lifecycle !== "stopped" && view.lifecycle !== "failed");
    this.editor.setThinkingLevel(view.thinkingLevel);
    // Performance: semantic updates already invalidate affected transcript blocks. Chrome is a separate authority.
    this.#invalidateChrome();
    if (becameReady) this.#onPromptSuggestionEligibilityChanged?.();
  }

  /**
   * Applies one block: its component is created or updated in place and the order grows
   * only when the block is new. A streamed chunk costs one component update rather than a
   * walk of the whole transcript.
   */
  applyTranscriptBlock(block: OwnedUiSessionViewModel["transcript"][number]): void {
    this.#document.apply(block);
  }

  #mountTranscript(block: OwnedUiSessionViewModel["transcript"][number]): PiShellTranscriptComponentPort {
    // Invariant: the notice answers the reader's last command, so only their next prompt or
    // shell command retires it; assistant, tool, and compaction blocks streaming in keep it.
    if (block.kind === "user" || block.kind === "bash") this.dismissNotice();
    const created = createPiShellTranscriptComponent(
      block, this.#cwd, this.#extensionRenderers, this.#submittedPromptComposer,
      this.#outputPad, !this.#thinkingVisible, this.#mermaidRenderingMode,
      this.#showImages, this.#imageWidthCells, this.#imageAssets,
      { ...this.#componentRuntime, changed: () => {
        if (this.#document.component(block.id) !== created) return;
        this.#document.blockChanged(block.id);
        this.#layout.invalidate();
        this.#input.clearDockInputCandidate();
        this.#componentRuntime.requestRender();
      } },
    );
    created.setExpanded(this.#toolsExpanded);
    return created;
  }

  render(width: number): readonly string[] {
    return this.#layout.render(width);
  }

  viewportFrameDescriptor(): TranscriptViewportFrameDescriptor | null {
    return this.#viewportController.frame?.descriptor ?? null;
  }

  /** Read-only, payload-free evidence; observing a pending frame must never render or repair it. */
  viewportPresentationEvidence() {
    const frame = this.#viewportController.frame;
    const snapshot = this.#layout.composed();
    return {
      candidate: this.#input.dockInputCandidate,
      candidateRevision: this.#input.dockInputCandidate ? this.#input.dockInputRevision ?? null : null,
      currentRevision: this.#viewportController.presentationRevision,
      composedRevision: snapshot?.viewportRevision ?? null,
      currentPointer: this.#viewportController.pointerPosition ?? null,
      composedPointer: snapshot?.pointerPosition ?? null,
      frameId: frame?.descriptor.frameId ?? null,
      bottom: frame?.hits.bottom ?? null,
      followingEnd: frame?.followingEnd ?? true,
      scrollTop: frame?.scrollTop ?? 0,
      maxScroll: frame?.maxScroll ?? 0,
      cause: frame?.descriptor.cause ?? null,
    };
  }

  /** Visible non-persistent Steering, alignment, and Working rows, for rendering evidence. */
  viewportTransientTailRowCount(): number {
    return this.#viewportController.frame?.hits.transientTail.length ?? 0;
  }

  hasActiveSelection(): boolean {
    return this.#viewportController.hasSelection || this.editor.hasSelection();
  }

  setViewportConfig(config: OwnedUiViewportSettings): void {
    if (this.#viewportController.setConfig(config)) {
      this.#document.invalidate("viewport-config");
      this.#layout.invalidate();
    }
  }

  setFullscreenCopyOnSelect(enabled: boolean): void {
    this.#viewportController.setCopyOnSelect(enabled);
  }

  showCopyAcknowledgement(message: string): void {
    this.#dockChrome.showCopyAcknowledgement(message);
  }

  resumeViewportFollowing(): void {
    this.#viewportController.resumeFollowing();
  }

  noteCompletedAssistantMessage(): void {
    this.#viewportController.noteCompletedAssistantMessage();
  }

  /** A new session binding owns new mounts even when it reuses semantic invocation ids. */
  resetTranscript(): void {
    this.#document.reset();
  }

  resetViewport(): void {
    this.#viewportController.reset();
  }

  clearViewportPointerState(): void {
    this.#viewportController.clearPointerState();
  }

  setViewportOverlaySurfaces(surfaces: readonly PiTuiPointerSurface[] | null): void {
    this.#viewportController.setOverlaySurfaces(surfaces);
  }

  viewportInputGeometryReady(width: number, height: number): boolean {
    const frame = this.#viewportController.frame;
    return this.#viewportController.inputGeometryReady && frame?.descriptor.width === width && frame.descriptor.height === height;
  }

  handleViewportPreInput(data: string, allowWheel = true, now = Date.now(), editorActive = this.usesDefaultInputSurface()): SessionViewportInputResult {
    return this.#viewportController.handlePreInput(data, allowWheel, now, editorActive);
  }

  #renderDockLayout(width: number): DockLayout {
    const queued = this.#customViewport ? [] : this.#renderQueued(width);
    const statusRows = this.#customViewport ? this.#status.renderDock(width) : this.#renderStatus(width);
    const noticeRows = this.#dockChrome.renderNotice(width, this.#outputPad);
    const transientRows = [...queued, ...statusRows, ...noticeRows];
    const messageStart = queued.length;
    const copyableMessageRows = Array.from(
      { length: statusRows.length + noticeRows.length },
      (_value, index) => ({ row: messageStart + index }),
    );
    const aboveWidgets = this.#extensions.renderWidgets("aboveEditor", width);
    const input = this.#input.surface.render(width);
    const body = this.usesDefaultInputSurface() ? this.editor.bodyGeometry?.() : undefined;
    const belowWidgets = this.#extensions.renderWidgets("belowEditor", width);
    const footer = this.#renderFooter(width);
    const rowsWithoutTransient = [...aboveWidgets, ...input, ...belowWidgets, ...footer];
    const inputOffset = transientRows.length + aboveWidgets.length;
    return {
      rows: [...transientRows, ...rowsWithoutTransient],
      inputOffset,
      editorOffset: inputOffset + (body?.rowOffset ?? 0),
      inputRows: body?.rowCount ?? input.length,
      footerRows: footer.length,
      copyableMessageRows,
    };
  }

  dismissNotice(): void {
    this.#dockChrome.dismissNotice();
  }

  #renderQueued(width: number): readonly string[] {
    return this.#view.editor.queuedSubmissions.length === 0 ? [] : this.#queued.render(width);
  }

  /** The pinned-profile layout regions of this session; the terminal host arranges them with `pinnedLayoutRoot`. */
  layoutParts(): PinnedLayoutParts {
    return {
      document: layoutPort(width => this.#renderDocument(width), () => this.invalidate()),
      queued: layoutPort(width => this.#view.editor.queuedSubmissions.length === 0 ? [] : this.#queued.render(width), () => this.#queued.invalidate()),
      aboveWidgets: layoutPort(width => this.#extensions.renderWidgets("aboveEditor", width), () => this.#extensions.invalidate()),
      status: layoutPort(width => this.#renderStatus(width), () => this.#status.invalidate()),
      editor: layoutPort(width => this.#input.surface.render(width), () => this.#input.surface.invalidate(), data => this.#input.surface.handleInput?.(data)),
      belowWidgets: layoutPort(width => this.#extensions.renderWidgets("belowEditor", width), () => this.#extensions.invalidate()),
      footer: layoutPort(width => this.#renderFooter(width), () => (this.#extensions.footer ?? this.#footer).invalidate()),
    };
  }

  #renderDocument(width: number): readonly string[] {
    return this.#document.layout(width).rows;
  }

  transcriptComponent(id: string): PiShellTranscriptComponentPort | undefined {
    return this.#document.component(id);
  }

  exitTranscript(width: number): string {
    return this.#document.exitTranscript(width);
  }

  appendWorkflowStatus(message: string): void {
    this.#workflowOutput.appendStatus(message);
  }

  appendWorkflowMessage(message: OwnedUiWorkflowMessage, errorCode?: ImageAttachmentError["code"]): void {
    this.#workflowOutput.appendMessage(message, errorCode);
  }

  appendWorkflowResult(result: OwnedUiWorkflowResult, errorCode?: ImageAttachmentError["code"]): void {
    this.#workflowOutput.appendResult(result, errorCode);
  }

  toggleThinkingVisibility(): void {
    this.setHideThinkingBlock(this.#thinkingVisible);
  }

  get toolsExpanded(): boolean {
    return this.#toolsExpanded;
  }

  setToolsExpanded(expanded: boolean): void {
    this.#setToolsExpanded(expanded);
  }

  setExtensionWidget(key: string, component: PiShellComponentPort | null, placement: "aboveEditor" | "belowEditor"): void {
    this.#extensions.placeWidget(key, component, placement);
    this.invalidate();
  }

  setExtensionHeader(component: PiShellComponentPort | null): void {
    this.#extensions.replaceHeader(component);
    this.#document.invalidate("extension-header");
    this.invalidate();
  }

  setExtensionFooter(component: PiShellComponentPort | null): void {
    this.#extensions.replaceFooter(component);
    this.invalidate();
  }

  setExtensionStatus(key: string, text: string | undefined): void {
    this.#extensions.setStatus(key, text);
    this.#footer.update(this.#extensions.withStatuses(this.#view));
    this.invalidate();
  }

  setExtensionWorking(message: string | undefined, visible = this.#extensions.working.visible): void {
    this.#extensions.setWorking(message, visible);
    this.#syncWorkingOverride();
    this.invalidate();
  }

  beginImageSubmissionStatus(): () => void {
    this.#imageSubmissionsSending++;
    this.#syncWorkingOverride();
    this.invalidate();
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.#imageSubmissionsSending = Math.max(0, this.#imageSubmissionsSending - 1);
      this.#syncWorkingOverride();
      this.invalidate();
    };
  }

  #syncWorkingOverride(): void {
    const sending = this.#imageSubmissionsSending > 0;
    this.#status.setWorkingOverride(sending
      ? "Sending…"
      : this.#extensions.working.visible ? this.#extensions.working.message : undefined, sending);
  }

  hotkeysPresentation(): PiShellHotkeysPresentation {
    return {
      bindings: this.editor.keybindingConfig(),
      getShortcuts: bindings => this.#extensionRenderers.getShortcuts(bindings),
      profile: this.#customViewport ? "a1" : "pi",
    };
  }

  resetWorkflowPresentation(): void {
    this.#dockChrome.forgetNotice();
    this.#dockChrome.clearCopyAcknowledgement(false);
    this.#workflowOutput.reset();
    this.invalidate();
  }

  resetExtensionUi(): void {
    this.#extensions.reset();
    this.#syncWorkingOverride();
    this.#footer.update(this.#extensions.withStatuses(this.#view));
    // Invariant: an extension renderer may have drawn transcript blocks that are now unrendered by it.
    this.#document.invalidate("extension-renderers");
    this.invalidate();
  }

  addExtensionNotification(message: string, type: "info" | "warning" | "error"): void {
    if (type === "info") {
      this.appendWorkflowStatus(message);
      return;
    }
    this.appendWorkflowMessage({ kind: type, message });
  }

  extensionFooterData(): unknown {
    return {
      getGitBranch: () => this.#view.status.footer?.branch ?? null,
      getExtensionStatuses: () => this.#extensions.statuses(),
      getAvailableProviderCount: () => this.#view.status.footer?.availableProviderCount ?? 1,
      onBranchChange: () => () => {},
    };
  }

  usesDefaultInputSurface(): boolean {
    return this.#input.usesEditor;
  }

  inputCoordinationSurface(): PiTuiInputSurfaceKind {
    return this.#input.coordination;
  }

  viewportCompositionEvidence(): { readonly full: number; readonly dockOnly: number } {
    return this.#layout.compositions();
  }

  transcriptRenderCount(): number {
    return this.#document.renderCount;
  }

  setFooterLevel(visible: boolean): void { this.#footerLevel = visible; }

  setInputSurface(
    component: PiShellComponentPort | null,
    disposePrevious = true,
    coordination: Exclude<PiTuiInputSurfaceKind, "editor"> = "owned",
  ): void {
    if (this.#input.set(component, disposePrevious, coordination)) this.invalidate();
  }

  handleInput(data: string): void {
    this.#input.handleInput(data);
  }

  invalidate(): void {
    this.#document.invalidate("repaint");
    this.#invalidateChrome();
  }

  #invalidateChrome(): void {
    this.header.invalidate();
    this.resources.invalidate();
    this.editor.invalidate();
    if (!this.#input.usesEditor) this.#input.surface.invalidate();
    this.#extensions.invalidate();
    this.#status.invalidate();
    this.#footer.invalidate();
    this.#queued.invalidate();
  }

  setFocused(focused: boolean): void {
    this.#input.surface.setFocused?.(focused);
    if (focused) this.#onPromptSuggestionEligibilityChanged?.();
  }

  dispose(): void {
    this.#dockChrome.clearCopyAcknowledgement(false);
    this.clearViewportPointerState();
    this.#themeUnsubscribe();
    this.header.dispose?.();
    this.resources.dispose?.();
    this.#document.dispose();
    this.#layout.invalidate();
    this.#input.dispose();
    this.#extensions.dispose();
    this.editor.dispose?.();
    this.#status.dispose?.();
    this.#footer.dispose?.();
    this.#queued.dispose?.();
  }

  #invalidateTranscriptPresentation(): void {
    this.#document.invalidate("block-presentation");
    this.invalidate();
  }

  #renderStatus(width: number): readonly string[] {
    return this.#customViewport ? this.#status.renderLive(width) : this.#status.render(width);
  }

  #renderFooter(width: number): readonly string[] {
    return (this.#extensions.footer ?? this.#footer).render(width);
  }

  #setToolsExpanded(expanded: boolean): void {
    this.#toolsExpanded = expanded;
    this.header.setExpanded(expanded);
    this.resources.setExpanded(expanded);
    for (const component of this.#document.components()) component.setExpanded(expanded);
    // Invariant: expansion changes what a block draws without changing its revision.
    this.#document.invalidate("tools-expanded");
    this.invalidate();
  }
}

const SCROLLBAR_CELL_RESET = "\u001b[22;23;24;25;27;28;29;39;54;55m";

const TERMINAL_BACKGROUND = /\u001b\[(?:4[0-9]|10[0-7]|48(?:[;:][0-9;:]*)?)m/g;

/** Repaint a source prompt with viewport chrome while preserving text, links, and foreground roles. */
function withoutTerminalBackground(text: string): string {
  return text.replace(TERMINAL_BACKGROUND, "");
}

export type PinnedLayoutPart = "document" | "queued" | "aboveWidgets" | "status" | "editor" | "belowWidgets" | "footer";
export type PinnedLayoutParts = Readonly<Record<PinnedLayoutPart, PiTuiComponentPort>>;

/**
 * The pinned-profile screen: a followed transcript scroll above the dock. The runtime mounts one such layout,
 * so its single `transcript` scroll view is shared by whichever session the parts currently resolve to.
 */
export function pinnedLayoutRoot(parts: PinnedLayoutParts): PiTuiLayoutNode {
  return {
    type: "stack",
    direction: "vertical",
    children: [
      {
        basis: 0,
        grow: 1,
        shrink: 1,
        minSize: 1,
        node: {
          type: "scroll",
          id: "transcript",
          follow: "end",
          primary: true,
          overscroll: "chain",
          scrollbar: "auto",
          scrollbarTrackStyle: text => piTheme().fg("scrollbarTrack", text),
          scrollbarThumbStyle: text => piTheme().fg("scrollbarThumb", text),
          child: { type: "component", component: parts.document },
        },
      },
      {
        basis: "auto",
        grow: 0,
        shrink: 1,
        minSize: 1,
        node: {
          type: "stack",
          direction: "vertical",
          children: [
            { shrink: 1, minSize: 0, node: { type: "component", component: parts.queued } },
            { shrink: 1, minSize: 0, node: { type: "component", component: parts.status } },
            { shrink: 1, minSize: 0, node: { type: "component", component: parts.aboveWidgets } },
            { shrink: 1, minSize: 3, node: { type: "component", component: parts.editor } },
            { shrink: 1, minSize: 0, node: { type: "component", component: parts.belowWidgets } },
            { shrink: 1, minSize: 1, node: { type: "component", component: parts.footer } },
          ],
        },
      },
    ],
  };
}

function layoutPort(
  render: (width: number) => readonly string[],
  invalidate: () => void,
  handleInput?: (data: string) => void,
): PiTuiComponentPort {
  return {
    render,
    invalidate,
    ...(handleInput === undefined ? {} : { handleInput }),
  };
}

export function shellResourceEntries(backend: OwnedUiSessionBackend): readonly PiShellResourceEntry[] {
  const resources: PiShellResourceEntry[] = backend.extensions.nonVisualResources().map(resource => ({
    section: resource.kind === "skill"
      ? "Skills"
      : resource.kind === "prompt-template"
        ? "Prompts"
        : resource.kind === "theme"
          ? "Themes"
          : "Context",
    label: resource.kind === "prompt-template"
      ? `/${resource.label}`
      : resource.kind === "agent-context" || resource.kind === "system-prompt"
        ? compactResourceLabel(resource.sourcePath ?? resource.label)
        : resource.label,
    sourcePath: resource.sourcePath,
    diagnostic: resource.diagnostic,
  }));
  const extensions = backend.extensions.extensionResources().filter(extension => !extension.hidden);
  const loadedExtensions = extensions.filter(extension => extension.diagnostic === null);
  const extensionLabels = compactExtensionLabels(loadedExtensions);
  for (const extension of extensions) {
    const labelIndex = loadedExtensions.indexOf(extension);
    resources.push({
      section: "Extensions",
      label: extensionLabels[labelIndex] ?? compactResourceLabel(extension.sourcePath ?? extension.resolvedPath ?? "extension"),
      sourcePath: extension.sourcePath ?? extension.resolvedPath,
      diagnostic: extension.diagnostic,
    });
  }
  return resources;
}

function compactResourceLabel(path: string): string {
  const segments = compactPathSegments(path);
  const leaf = segments.at(-1) ?? path;
  if ((leaf === "index.ts" || leaf === "index.js") && segments.length > 1) return segments.at(-2) ?? leaf;
  return leaf;
}

/**
 * Pinned from InteractiveMode's compact extension-label helpers at Pi commit
 * 914cf1472e715297caa30db4b9535d534a9eb718. The source metadata crosses an
 * A1-owned boundary first; the owned shell never inspects Pi's private root.
 */
function compactExtensionLabels(extensions: readonly OwnedUiExtensionResourceSummary[]): readonly string[] {
  const localExtensions = extensions
    .filter(extension => !isPackageExtensionSource(extension.sourceInfo))
    .map(extension => {
      const path = extension.sourcePath ?? extension.resolvedPath ?? "extension";
      const segments = compactPathSegments(path);
      if (segments.length > 1 && (segments.at(-1) === "index.ts" || segments.at(-1) === "index.js")) segments.pop();
      return { extension, segments };
    });

  return extensions.map(extension => {
    const resourcePath = extension.sourcePath ?? extension.resolvedPath ?? "extension";
    if (isPackageExtensionSource(extension.sourceInfo)) {
      return compactPackageExtensionLabel(resourcePath, extension.sourceInfo);
    }
    const localIndex = localExtensions.findIndex(item => item.extension === extension);
    const segments = localExtensions[localIndex]?.segments;
    if (!segments || segments.length === 0) return compactResourceLabel(resourcePath);
    for (let count = 1; count <= segments.length; count += 1) {
      const candidate = segments.slice(-count).join("/");
      if (localExtensions.every((item, itemIndex) => itemIndex === localIndex || item.segments.slice(-count).join("/") !== candidate)) {
        return candidate;
      }
    }
    return segments.join("/");
  });
}

function compactPackageExtensionLabel(resourcePath: string, sourceInfo: OwnedUiExtensionSourceSummary): string {
  const sourceLabel = compactPackageSourceLabel(sourceInfo.source);
  if (!sourceLabel) return compactResourceLabel(resourcePath);
  const shortPath = shortPackagePath(resourcePath, sourceInfo).replaceAll("\\", "/");
  const packagePath = shortPath.startsWith("extensions/") ? shortPath.slice("extensions/".length) : shortPath;
  const slash = packagePath.lastIndexOf("/");
  const fileName = slash < 0 ? packagePath : packagePath.slice(slash + 1);
  const directory = slash < 0 ? "" : packagePath.slice(0, slash);
  const extension = fileName.lastIndexOf(".");
  const name = extension <= 0 ? fileName : fileName.slice(0, extension);
  if (name === "index") return !directory || directory === "." ? sourceLabel : `${sourceLabel}:${directory}`;
  return `${sourceLabel}:${packagePath}`;
}

function compactPackageSourceLabel(source: string): string {
  if (source.startsWith("npm:")) return source.slice("npm:".length) || source;
  if (!source.startsWith("git:")) return source;
  const gitSource = source.slice("git:".length).trim();
  let repositoryPath: string | undefined;
  const scpLike = gitSource.match(/^git@[^:]+:(.+)$/);
  if (scpLike?.[1]) {
    repositoryPath = scpLike[1];
  } else if (/^[a-z]+:\/\//i.test(gitSource)) {
    try {
      repositoryPath = new URL(gitSource).pathname.replace(/^\/+/, "");
    } catch {
      return source;
    }
  } else {
    const slash = gitSource.indexOf("/");
    if (slash >= 0) repositoryPath = gitSource.slice(slash + 1);
  }
  if (!repositoryPath) return source;
  const ref = repositoryPath.indexOf("@");
  const withoutRef = ref < 0 ? repositoryPath : repositoryPath.slice(0, ref);
  return withoutRef.replace(/\.git$/, "") || source;
}

function shortPackagePath(resourcePath: string, sourceInfo: OwnedUiExtensionSourceSummary): string {
  const fullPath = normalizeResourcePath(resourcePath);
  const baseDir = sourceInfo.baseDir === null ? undefined : normalizeResourcePath(sourceInfo.baseDir).replace(/\/$/, "");
  if (baseDir) {
    const npmRoot = baseDir.match(/^(.*\/node_modules)\/(@?[^/]+(?:\/[^/]+)?)$/);
    if (npmRoot?.[1] && fullPath.startsWith(`${npmRoot[1]}/`)) return relativeResourcePath(baseDir, fullPath);
    if (fullPath === baseDir) return ".";
    if (fullPath.startsWith(`${baseDir}/`)) return fullPath.slice(baseDir.length + 1);
  }
  const npmMatch = fullPath.match(/node_modules\/(@?[^/]+(?:\/[^/]+)?)\/(.*)/);
  if (npmMatch?.[2] && sourceInfo.source.startsWith("npm:")) return npmMatch[2];
  const gitMatch = fullPath.match(/git\/[^/]+\/[^/]+\/(.*)/);
  if (gitMatch?.[1] && sourceInfo.source.startsWith("git:")) return gitMatch[1];
  return resourcePath;
}

function relativeResourcePath(from: string, to: string): string {
  const fromSegments = from.split("/").filter(Boolean);
  const toSegments = to.split("/").filter(Boolean);
  let common = 0;
  while (common < fromSegments.length && common < toSegments.length
    && fromSegments[common]?.toLowerCase() === toSegments[common]?.toLowerCase()) common += 1;
  return [...fromSegments.slice(common).map(() => ".."), ...toSegments.slice(common)].join("/") || ".";
}

function compactPathSegments(path: string): string[] {
  return normalizeResourcePath(path).split("/").filter(segment => segment.length > 0 && segment !== "~");
}

function normalizeResourcePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function isPackageExtensionSource(sourceInfo: OwnedUiExtensionSourceSummary | null): sourceInfo is OwnedUiExtensionSourceSummary {
  const source = sourceInfo?.source ?? "";
  return source.startsWith("npm:") || source.startsWith("git:");
}

// Performance: stable painter identities let the neutral viewport retain row-level
// selection variants while each callback still resolves the live Pi theme.
const VIEWPORT_THEME: TranscriptViewportTheme = {
  track: text => `${SCROLLBAR_CELL_RESET}${piTheme().fg("dim", text)}`,
  thumb: text => `${SCROLLBAR_CELL_RESET}${piTheme().fg("accent", text)}`,
  sticky: (text, hovered) => piTheme().bg(
    hovered ? "selectedBg" : "toolPendingBg",
    piTheme().fg("text", withoutTerminalBackground(text)),
  ),
  quietSticky: text => `\u001b[2m${text.replace(/\u001b\[(?:0|22)m/g, "$&\u001b[2m")}\u001b[22m`,
  bottomControl: (text, hovered) => piTheme().bg(
    hovered ? "selectedBg" : "toolPendingBg",
    piTheme().fg("text", text),
  ),
  selection: (line, from, to) => backgroundSgrSpan(
    line,
    from,
    to,
    "\u001b[48;2;38;79;120m",
    "\u001b[49m",
  ),
};
