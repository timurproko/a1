import type { OwnedUiShellComponents, OwnedUiShellHotkeysPresentation, OwnedUiShellSubmittedPromptComposer, OwnedUiShellClipboardContent, OwnedUiShellComponentPort, OwnedUiShellEditorPort, OwnedUiShellHeaderOptions, OwnedUiShellHeaderPort, OwnedUiShellHistoryEditor, OwnedUiShellImageAssetResolver, OwnedUiShellKeybindingsHost, OwnedUiShellLoadedResourcesPort, OwnedUiShellQueuedInputPort, OwnedUiShellStatusPort, OwnedUiShellTranscriptComponentPort, OwnedUiShellViewComponentPort } from "../../contracts/owned-ui/index.js";
import type { TerminalComponentPort, TerminalInputCoordinationScheduler, TerminalInputDiagnosticsEvent, TerminalInputSurfaceKind, TerminalLayoutNode, TerminalPort } from "../../contracts/presentation/index.js";
import type { ShellPresentationPorts, ThemeSource } from "../../contracts/presentation/index.js";
import type {
  OwnedUiBackgroundSettingsPort,
  OwnedUiPromptSuggestionGeneratorPort,
  OwnedUiSessionBackend,
  OwnedUiSessionPresenters,
  OwnedUiSessionViewModel,
  OwnedUiTranscriptRendererPort,
  OwnedUiViewportSettings,
  OwnedUiViewportSettingsPort,
  OwnedUiQuitOutroSettingsPort,
  SuggestionDecision,
  SuggestionDiagnosticObserver,
} from "../../contracts/owned-ui/index.js";
import type { UiRouteHost, UiRouteInput } from "../../ui/apps/contracts.js";
import { promptArrow } from "../../ui/components/prompt-input.js";
import {
  composeSubmittedPromptRows,
  submittedPromptLayout,
} from "../../ui/components/submitted-prompt.js";
import { nativeHyperlinkStyle } from "../../ui/components/spans.js";
import { paintTextSelection } from "../../ui/components/text-selection.js";
import { progressStatusFrame, progressStatusText } from "../../ui/components/progress-status.js";
import type {
  TranscriptViewportFrame,
  TranscriptViewportFrameDescriptor,
  TranscriptViewportTheme,
} from "../../ui/components/transcript-viewport.js";
import { PromptChipStore, type PreparedPrompt } from "./prompt-chips.js";
import type { PastePreparationClientOptions } from "./paste-preparation-client.js";
import type { OwnedUiClipboardServices } from "./clipboard-services.js";
import type { OwnedUiClipboardPort } from "./shell-clipboard.js";
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
import { transcriptLinkColor, TranscriptDocument } from "./transcript-document.js";
import type { StreamPresentationScheduler } from "./stream-presentation-coalescer.js";

type OwnedUiTerminalPort = TerminalPort;
type OwnedUiStartupOptions = OwnedUiShellHeaderOptions;

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
    readonly scheduler?: TerminalInputCoordinationScheduler;
    readonly onEvent?: (event: TerminalInputDiagnosticsEvent) => void;
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
  readonly editor: OwnedUiShellHistoryEditor;
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
  readonly keybindings?: OwnedUiShellKeybindingsHost;
}

/** What composes an owned session shell, grouped by the collaborator that provides each part. */
export interface OwnedUiSessionShellOptions {
  readonly engine: OwnedUiShellEngineOptions;
  /** Resolves selectors, engine-backed transcript renderers, and the vendor presentation ports. */
  readonly presenters: OwnedUiSessionPresenters & ShellPresentationPorts;
  readonly presentation?: OwnedUiShellPresentationOptions;
  readonly history?: OwnedUiShellHistoryOptions;
  readonly suggestions?: OwnedUiShellSuggestionOptions;
  /** Bare A1 only; absent keeps the eight-image comparison limit. */
  readonly promptImages?: OwnedUiShellPromptImagesOptions;
  /** Bare A1 only; absent keeps pinned per-skill commands. */
  readonly skills?: OwnedUiShellSkillsOptions;
  readonly diagnostics?: OwnedUiShellDiagnosticOptions;
  readonly shared?: OwnedUiShellSharedServices;
}

/** What the render root needs from its presenter: terminal size and render requests, the theme, and input callbacks. */
interface OwnedUiSessionShellRootHandlers {
  readonly presentation: ShellPresentationPorts;
  readonly components: OwnedUiShellComponents;
  readonly getColumns: () => number;
  readonly getRows: () => number;
  readonly requestRender: (force?: boolean) => void;
  readonly onViewportFrame?: (frame: TranscriptViewportFrame) => void;
  readonly requestHyperlinkCleanup?: (rows?: readonly number[]) => void;
  readonly enableDockInputReuse?: boolean;
  readonly persistentHistory?: boolean;
  readonly historyEditor?: OwnedUiShellHistoryEditor;
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
  readonly readClipboardContent?: (signal?: AbortSignal) => Promise<OwnedUiShellClipboardContent | null>;
  readonly captureClipboardPaste?: () => PasteSource;
  readonly pasteDiagnostics?: (event: PasteEvent) => void;
  readonly pastePreparation?: Omit<PastePreparationClientOptions, "onEvent">;
  readonly keybindings?: OwnedUiShellKeybindingsHost;
  readonly promptImageLimit?: () => number;
  readonly skillsPresentation?: () => "collapse" | "expand";
}

/** Composes session state into the owned transcript, viewport, editor, and dock. */
export class OwnedUiSessionShellRoot implements TerminalComponentPort {
  readonly editor: OwnedUiShellEditorPort;
  readonly header: OwnedUiShellHeaderPort;
  readonly resources: OwnedUiShellLoadedResourcesPort;
  readonly #cwd: string;
  /** The transcript's semantic rows, caches, and engine-backed block renderers. */
  readonly transcript: TranscriptDocument;
  readonly #themeUnsubscribe: () => void;
  #view: OwnedUiSessionViewModel;
  readonly #status: OwnedUiShellStatusPort;
  readonly footer: OwnedUiShellViewComponentPort;
  readonly #queued: OwnedUiShellQueuedInputPort;
  readonly #extensionRenderers: OwnedUiTranscriptRendererPort;
  readonly #imageAssets: OwnedUiShellImageAssetResolver | undefined;
  readonly promptChips: PromptChipStore;
  #pasteDiagnosticId = 0;
  readonly #customViewport: boolean;
  readonly #submittedPromptComposer: OwnedUiShellSubmittedPromptComposer | undefined;
  readonly viewport: SessionViewportController;
  readonly #onPromptSuggestionEligibilityChanged: (() => void) | undefined;
  readonly #componentRuntime: Pick<OwnedUiSessionShellRootHandlers, "getColumns" | "getRows" | "requestRender" | "components">;
  #toolsExpanded = false;
  #thinkingVisible = true;
  #footerLevel = true;
  #mermaidRenderingMode: "off" | "final" | "streaming" = "off";
  #showImages = true;
  #imageWidthCells = 80;
  #outputPad: 0 | 1 = 1;
  /** Workflow results, messages, and status lines appended to the transcript. */
  readonly workflow: WorkflowOutput;
  readonly #input: InputSurfaceSwitch;
  readonly #layout: ShellLayout;
  readonly #extensions = new ExtensionSurface();
  /** The dock's notices, copy acknowledgement, and release banner. */
  readonly chrome: DockChrome;
  #imageSubmissionsSending = 0;

  constructor(
    view: OwnedUiSessionViewModel,
    cwd: string,
    handlers: OwnedUiSessionShellRootHandlers,
    startup: OwnedUiShellHeaderOptions = {},
    agentDir?: string,
    extensionRenderers: OwnedUiTranscriptRendererPort = {
      getMessageRenderer: () => undefined,
      getToolRenderers: () => undefined,
      getShortcuts: () => [],
    },
    sessionLayout: "pinned" | "custom-viewport" = "pinned",
    imageAssets?: OwnedUiShellImageAssetResolver,
  ) {
    this.#view = view;
    this.#customViewport = sessionLayout === "custom-viewport";
    this.promptChips = new PromptChipStore({ isolated: this.#customViewport,
      ...(handlers.pasteDiagnostics === undefined ? {} : { onEvent: handlers.pasteDiagnostics }),
      ...(handlers.pastePreparation === undefined ? {} : { preparation: handlers.pastePreparation }),
      ...(handlers.promptImageLimit === undefined ? {} : { imageLimit: handlers.promptImageLimit }) });
    this.#submittedPromptComposer = this.#customViewport ? this.#createSubmittedPromptComposer(handlers.presentation.theme) : undefined;
    this.#cwd = cwd;
    this.transcript = this.#createDocument(cwd, handlers.presentation.theme, handlers.components);
    this.#extensionRenderers = extensionRenderers;
    this.#imageAssets = imageAssets;
    this.#componentRuntime = handlers;
    this.#onPromptSuggestionEligibilityChanged = handlers.onPromptSuggestionEligibilityChanged;
    this.header = handlers.components.chrome.header({
      ...startup,
      ...(this.#customViewport ? { getKeybindings: () => this.editor.keybindingConfig() } : {}),
    });
    this.resources = handlers.components.chrome.loadedResources(startup.resources ?? [], startup.expanded ?? false);
    this.#status = handlers.components.chrome.status(view, {
      text: (message, mode) => progressStatusText(message, mode === "custom-viewport" ? "…" : "..."),
      frame: progressStatusFrame,
    }, handlers);
    this.#status.setProgressPresentation(this.#customViewport ? "custom-viewport" : "pinned");
    const footer = handlers.components.chrome.footer(this.#extensions.withStatuses(view), cwd, this.#customViewport ? "a1" : "pi", () => this.#footerLevel);
    this.footer = { ...footer, setNameReveal: frame => {
      const active = footer.setNameReveal?.(frame) ?? false;
      this.#invalidateChrome();
      return active && this.#extensions.footer === null;
    } };
    this.editor = createShellEditor({
      handlers, theme: handlers.presentation.theme, components: handlers.components,
      customViewport: this.#customViewport,
      cwd,
      ...(agentDir === undefined ? {} : { agentDir }),
      promptChips: this.promptChips,
      editorPointerSelecting: () => this.viewport.editorPointerSelecting,
      nextPasteDiagnosticRequest: () => --this.#pasteDiagnosticId,
      toggleToolsExpanded: () => this.#setToolsExpanded(!this.#toolsExpanded),
    });
    this.#queued = handlers.components.chrome.queuedInput(
      view.editor.queuedSubmissions,
      this.#customViewport ? "custom-viewport" : "pinned",
      this.#customViewport ? () => this.editor.keybindingConfig() : undefined,
    );
    this.viewport = new SessionViewportController({
      enabled: this.#customViewport,
      editor: this.editor,
      requestRender: force => this.#componentRuntime.requestRender(force),
      requestHyperlinkCleanup: rows => handlers.requestHyperlinkCleanup?.(rows),
      hasEditorLinks: () => this.promptChips.hyperlinkRanges(this.editor.getText()).length > 0,
      ...(handlers.pasteDiagnostics === undefined ? {} : { pasteDiagnostics: handlers.pasteDiagnostics }),
      nextPasteDiagnosticRequest: () => --this.#pasteDiagnosticId,
    });
    this.chrome = new DockChrome({ theme: handlers.presentation.theme, outputPad: handlers.presentation.pinnedOutputPad, components: handlers.components,
      invalidateChrome: () => this.#invalidateChrome(),
      requestRender: () => this.#componentRuntime.requestRender(),
      viewport: this.viewport,
    });
    this.workflow = new WorkflowOutput({
      customViewport: this.#customViewport, components: handlers.components,
      document: this.transcript,
      dock: this.chrome,
      transcriptLength: () => this.#view.transcript.length,
      outputPad: () => this.#outputPad,
      hotkeysPresentation: () => this.hotkeysPresentation(),
      componentRuntime: this.#componentRuntime,
      invalidate: () => this.invalidate(),
    });
    this.editor.setThinkingLevel(view.thinkingLevel);
    this.#input = new InputSurfaceSwitch(this.editor, {
      dockInputReuse: this.#customViewport && (handlers.enableDockInputReuse ?? true), classifyInput: handlers.presentation.terminalRuntime.classifyInput,
      viewport: this.viewport,
      ...(handlers.onInputSurfaceChanged === undefined ? {} : { onChanged: handlers.onInputSurfaceChanged }),
    });
    this.#layout = this.#createLayout(handlers.onViewportFrame, createViewportTheme(handlers.presentation.theme));
    for (const block of view.transcript) {
      if (block.kind === "user") this.editor.addToHistory(block.text);
    }
    this.transcript.sync(view.transcript);
    // Invariant: rendered rows expire when
    // their active theme changes.
    this.#themeUnsubscribe = handlers.presentation.theme.onChange(() => {
      this.invalidate();
      this.#componentRuntime.requestRender(true);
    });
  }

  // Invariant: the document reads the shell's chrome lazily, so it may be built before the header and viewport.
  #createDocument(cwd: string, theme: ThemeSource, components: OwnedUiShellComponents): TranscriptDocument {
    return new TranscriptDocument({
      theme, components,
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
      },
    });
  }

  // Invariant: one layout per root; the render path never consults the layout mode again.
  #createLayout(onFrame: ((frame: TranscriptViewportFrame) => void) | undefined, theme: TranscriptViewportTheme): ShellLayout {
    const ports: ShellLayoutPorts = {
      viewport: this.viewport,
      input: this.#input,
      editor: this.editor,
      promptChips: this.promptChips,
      dockChrome: this.chrome,
      theme,
      ...(onFrame === undefined ? {} : { onFrame }),
      rows: () => this.#componentRuntime.getRows(),
      dock: width => this.#renderDockLayout(width),
      document: width => this.transcript.layout(width),
      queued: width => this.#renderQueued(width),
      liveStatus: width => this.#renderStatus(width),
      diagnostics: () => this.#view.diagnostics,
    };
    return this.#customViewport ? new ViewportLayout(ports) : new PinnedLayout(ports);
  }

  #createSubmittedPromptComposer(theme: ThemeSource): OwnedUiShellSubmittedPromptComposer {
    const linkColor = transcriptLinkColor(theme);
    return {
      layout: width => submittedPromptLayout(width),
      compose: (rows, width, style) => composeSubmittedPromptRows(
        rows,
        width,
        { ...style, prefix: text => promptArrow(text, theme.current()) },
      ).map(row => nativeHyperlinkStyle(row, linkColor)),
    };
  }

  setEditorPaddingX(padding: number): void {
    this.editor.setPaddingX(padding);
    this.transcript.invalidate("editor-padding");
  }

  setAutocompleteMaxVisible(maxVisible: number): void {
    this.editor.setAutocompleteMaxVisible(maxVisible);
  }

  setOutputPad(padding: 0 | 1): void {
    if (this.#outputPad === padding) return;
    this.#outputPad = padding;
    this.#status.setOutputPad(padding);
    for (const component of this.transcript.components()) component.setOutputPad(padding);
    this.#invalidateTranscriptPresentation();
  }

  setHideThinkingBlock(hidden: boolean): void {
    if (this.#thinkingVisible === !hidden) return;
    this.#thinkingVisible = !hidden;
    for (const component of this.transcript.components()) component.setHideThinkingBlock(hidden);
    this.#invalidateTranscriptPresentation();
  }

  setMermaidRenderingMode(mode: "off" | "final" | "streaming"): void {
    if (this.#mermaidRenderingMode === mode) return;
    this.#mermaidRenderingMode = mode;
    for (const component of this.transcript.components()) component.setMermaidRenderingMode(mode);
    this.#invalidateTranscriptPresentation();
  }

  setImagePresentation(showImages: boolean, imageWidthCells: number): void {
    if (this.#showImages === showImages && this.#imageWidthCells === imageWidthCells) return;
    this.#showImages = showImages;
    this.#imageWidthCells = imageWidthCells;
    for (const component of this.transcript.components()) component.setImagePresentation(showImages, imageWidthCells);
    this.#invalidateTranscriptPresentation();
  }

  reconcilePromptImageLimitNotice(text: string = this.editor.getText()): boolean {
    if (this.chrome.notice?.errorCode !== "image-count" || !this.promptChips.imageLimitState(text).corrected) return false;
    this.chrome.dismissNotice();
    return true;
  }

  waitForPromptPastes(text: string, signal: AbortSignal): Promise<PreparedPrompt> {
    return this.promptChips.waitForPastes(text, signal, () => this.editor.getText());
  }

  resetPendingPastes(): void {
    this.editor.cancelPendingPastes?.();
    this.editor.setText(this.promptChips.resetPastes(this.editor.getText()));
  }

  disposePendingPastes(): Promise<void> {
    this.resetPendingPastes();
    return this.promptChips.dispose();
  }

  promptSuggestionPrepareBlockReason(): SuggestionDecision {
    if (!this.usesDefaultInputSurface()) return "replacement-input";
    if (this.#view.dialog !== null || this.#view.overlay !== null) return "modal";
    if (this.editor.getText().length > 0) return "draft";
    return null;
  }

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
      this.transcript.invalidate("diagnostics");
    }
    const promptAccepted = this.#view.lifecycle !== "busy" && view.lifecycle === "busy";
    this.#view = view;
    // Invariant: the idle new-session confirmation yields to the first truthful live status;
    // ordinary dock notices deliberately remain visible below Working during a run.
    if (promptAccepted && this.chrome.notice?.kind === "new-session") this.chrome.forgetNotice();
    if (promptAccepted && this.#imageSubmissionsSending > 0) {
      this.#imageSubmissionsSending = 0;
      this.#syncWorkingOverride();
    }
    this.#status.update(view);
    this.footer.update(this.#extensions.withStatuses(view));
    this.#queued.update(view.editor.queuedSubmissions);
    this.transcript.sync(view.transcript);
    this.editor.setSubmitEnabled(view.lifecycle !== "stopping" && view.lifecycle !== "stopped" && view.lifecycle !== "failed");
    this.editor.setThinkingLevel(view.thinkingLevel);
    // Performance: semantic updates already invalidate affected transcript blocks. Chrome is a separate authority.
    this.#invalidateChrome();
    if (becameReady) this.#onPromptSuggestionEligibilityChanged?.();
  }

  #mountTranscript(block: OwnedUiSessionViewModel["transcript"][number]): OwnedUiShellTranscriptComponentPort {
    // Invariant: the notice answers the reader's last command, so only their next prompt or
    // shell command retires it; assistant, tool, and compaction blocks streaming in keep it.
    if (block.kind === "user" || block.kind === "bash") this.chrome.dismissNotice();
    const created = this.#componentRuntime.components.transcript.component(
      block, this.#cwd, this.#extensionRenderers, this.#submittedPromptComposer,
      this.#outputPad, !this.#thinkingVisible, this.#mermaidRenderingMode,
      this.#showImages, this.#imageWidthCells, this.#imageAssets,
      { ...this.#componentRuntime, changed: () => {
        if (this.transcript.component(block.id) !== created) return;
        this.transcript.blockChanged(block.id);
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
    return this.viewport.frame?.descriptor ?? null;
  }

  /** Read-only, payload-free evidence; observing a pending frame must never render or repair it. */
  viewportPresentationEvidence() {
    const frame = this.viewport.frame;
    const snapshot = this.#layout.composed();
    return {
      candidate: this.#input.dockInputCandidate,
      candidateRevision: this.#input.dockInputCandidate ? this.#input.dockInputRevision ?? null : null,
      currentRevision: this.viewport.presentationRevision,
      composedRevision: snapshot?.viewportRevision ?? null,
      currentPointer: this.viewport.pointerPosition ?? null,
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
    return this.viewport.frame?.hits.transientTail.length ?? 0;
  }

  hasActiveSelection(): boolean {
    return this.viewport.hasSelection || this.editor.hasSelection();
  }

  setViewportConfig(config: OwnedUiViewportSettings): void {
    if (this.viewport.setConfig(config)) {
      this.transcript.invalidate("viewport-config");
      this.#layout.invalidate();
    }
  }

  viewportInputGeometryReady(width: number, height: number): boolean {
    const frame = this.viewport.frame;
    return this.viewport.inputGeometryReady && frame?.descriptor.width === width && frame.descriptor.height === height;
  }

  handleViewportPreInput(data: string, allowWheel = true, now = Date.now(), editorActive = this.usesDefaultInputSurface()): SessionViewportInputResult {
    return this.viewport.handlePreInput(data, allowWheel, now, editorActive);
  }

  #renderDockLayout(width: number): DockLayout {
    const queued = this.#customViewport ? [] : this.#renderQueued(width);
    const statusRows = this.#customViewport ? this.#status.renderDock(width) : this.#renderStatus(width);
    const noticeRows = this.chrome.renderNotice(width, this.#outputPad);
    const transientRows = [...queued, ...statusRows, ...noticeRows];
    const messageStart = queued.length;
    const copyableMessageRows = Array.from(
      { length: statusRows.length + noticeRows.length },
      (_value, index) => ({ row: messageStart + index }),
    );
    const aboveWidgets = this.#extensions.renderWidgets("aboveEditor", width);
    const belowWidgets = this.#extensions.renderWidgets("belowEditor", width);
    const footer = this.#renderFooter(width);
    // Invariant: reserve transcript context above scrollable routes.
    const available = Math.max(1, this.#componentRuntime.getRows() - transientRows.length - aboveWidgets.length - belowWidgets.length - footer.length - 3);
    const surface = this.#input.surface;
    const input = this.#customViewport && surface.renderInDock !== undefined
      ? surface.renderInDock(width, available) : surface.render(width);
    const body = this.usesDefaultInputSurface() ? this.editor.bodyGeometry?.() : undefined;
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
      footer: layoutPort(width => this.#renderFooter(width), () => (this.#extensions.footer ?? this.footer).invalidate()),
    };
  }

  #renderDocument(width: number): readonly string[] {
    return this.transcript.layout(width).rows;
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

  setExtensionWidget(key: string, component: OwnedUiShellComponentPort | null, placement: "aboveEditor" | "belowEditor"): void {
    this.#extensions.placeWidget(key, component, placement);
    this.invalidate();
  }

  setExtensionHeader(component: OwnedUiShellComponentPort | null): void {
    this.#extensions.replaceHeader(component);
    this.transcript.invalidate("extension-header");
    this.invalidate();
  }

  setExtensionFooter(component: OwnedUiShellComponentPort | null): void {
    this.#extensions.replaceFooter(component);
    this.invalidate();
  }

  setExtensionStatus(key: string, text: string | undefined): void {
    this.#extensions.setStatus(key, text);
    this.footer.update(this.#extensions.withStatuses(this.#view));
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

  hotkeysPresentation(): OwnedUiShellHotkeysPresentation {
    return {
      bindings: this.editor.keybindingConfig(),
      getShortcuts: bindings => this.#extensionRenderers.getShortcuts(bindings),
      profile: this.#customViewport ? "a1" : "pi",
    };
  }

  resetWorkflowPresentation(): void {
    this.chrome.forgetNotice();
    this.chrome.clearCopyAcknowledgement(false);
    this.workflow.reset();
    this.invalidate();
  }

  resetExtensionUi(): void {
    this.#extensions.reset();
    this.#syncWorkingOverride();
    this.footer.update(this.#extensions.withStatuses(this.#view));
    // Invariant: an extension renderer may have drawn transcript blocks that are now unrendered by it.
    this.transcript.invalidate("extension-renderers");
    this.invalidate();
  }

  addExtensionNotification(message: string, type: "info" | "warning" | "error"): void {
    if (type === "info") {
      this.workflow.appendStatus(message);
      return;
    }
    this.workflow.appendMessage({ kind: type, message });
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

  inputCoordinationSurface(): TerminalInputSurfaceKind {
    return this.#input.coordination;
  }

  viewportCompositionEvidence(): { readonly full: number; readonly dockOnly: number } {
    return this.#layout.compositions();
  }

  transcriptRenderCount(): number {
    return this.transcript.renderCount;
  }

  setFooterLevel(visible: boolean): void { this.#footerLevel = visible; }

  setInputSurface(
    component: OwnedUiShellComponentPort | null,
    disposePrevious = true,
    coordination: Exclude<TerminalInputSurfaceKind, "editor"> = "owned",
  ): void {
    if (this.#input.set(component, disposePrevious, coordination)) this.invalidate();
  }

  handleInput(data: string): void {
    this.#input.handleInput(data);
  }

  invalidate(): void {
    this.transcript.invalidate("repaint");
    this.#invalidateChrome();
  }

  #invalidateChrome(): void {
    this.header.invalidate();
    this.resources.invalidate();
    this.editor.invalidate();
    if (!this.#input.usesEditor) this.#input.surface.invalidate();
    this.#extensions.invalidate();
    this.#status.invalidate();
    this.footer.invalidate();
    this.#queued.invalidate();
  }

  setFocused(focused: boolean): void {
    this.#input.surface.setFocused?.(focused);
    if (focused) this.#onPromptSuggestionEligibilityChanged?.();
  }

  dispose(): void {
    this.chrome.clearCopyAcknowledgement(false);
    this.viewport.clearPointerState();
    this.#themeUnsubscribe();
    this.header.dispose?.();
    this.resources.dispose?.();
    this.transcript.dispose();
    this.#layout.invalidate();
    this.#input.dispose();
    this.#extensions.dispose();
    this.editor.dispose?.();
    this.#status.dispose?.();
    this.footer.dispose?.();
    this.#queued.dispose?.();
  }

  #invalidateTranscriptPresentation(): void {
    this.transcript.invalidate("block-presentation");
    this.invalidate();
  }

  #renderStatus(width: number): readonly string[] {
    return this.#customViewport ? this.#status.renderLive(width) : this.#status.render(width);
  }

  #renderFooter(width: number): readonly string[] {
    const footer = this.#extensions.footer ?? this.footer;
    if (!this.#customViewport) return footer.render(width);
    width = Math.max(0, width - 2);
    return footer.render(width).map(row => ` ${this.#componentRuntime.components.text.truncateToWidth(row, width)}`);
  }

  #setToolsExpanded(expanded: boolean): void {
    this.#toolsExpanded = expanded;
    this.header.setExpanded(expanded);
    this.resources.setExpanded(expanded);
    for (const component of this.transcript.components()) component.setExpanded(expanded);
    // Invariant: expansion changes what a block draws without changing its revision.
    this.transcript.invalidate("tools-expanded");
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
export type PinnedLayoutParts = Readonly<Record<PinnedLayoutPart, TerminalComponentPort>>;

/**
 * The pinned-profile screen: a followed transcript scroll above the dock. The runtime mounts one such layout,
 * so its single `transcript` scroll view is shared by whichever session the parts currently resolve to.
 */
export function pinnedLayoutRoot(parts: PinnedLayoutParts, theme: ThemeSource): TerminalLayoutNode {
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
          scrollbarTrackStyle: text => theme.current().fg("scrollbarTrack", text),
          scrollbarThumbStyle: text => theme.current().fg("scrollbarThumb", text),
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
): TerminalComponentPort {
  return {
    render,
    invalidate,
    ...(handleInput === undefined ? {} : { handleInput }),
  };
}

function createViewportTheme(source: ThemeSource): TranscriptViewportTheme {
  return {
  track: text => `${SCROLLBAR_CELL_RESET}${source.current().fg("dim", text)}`,
  thumb: text => `${SCROLLBAR_CELL_RESET}${source.current().fg("accent", text)}`,
  sticky: (text, hovered) => source.current().background(
    hovered ? "selectedBg" : "toolPendingBg",
    source.current().fg("text", withoutTerminalBackground(text)),
  ),
  quietSticky: text => `\u001b[2m${text.replace(/\u001b\[(?:0|22)m/g, "$&\u001b[2m")}\u001b[22m`,
  bottomControl: (text, hovered) => source.current().background(
    hovered ? "selectedBg" : "toolPendingBg",
    source.current().fg("text", text),
  ),
  selection: paintTextSelection,
  };
}
