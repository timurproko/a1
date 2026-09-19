import { ResponseCopyCoordinator } from "./response-copy-coordinator.js";
import { createResponseCopyExecutor, hasAsyncClipboardOutput, responseCopyDestination, type OwnedResponseCopyExecutor } from "./response-copy-transport.js";
import { MAX_COPY_CONTROL_BYTES } from "./response-copy-protocol.js";
import { PromptHistoryController } from "./prompt-history-controller.js";
import type { PromptHistoryKind } from "../../contracts/owned-ui/index.js";
import { PRODUCT_TEXT } from "../../product-identity.js";
import { boundedCleanup } from "../../foundation/terminal-cleanup/terminal-reset.js";
import { assertOwnedUiCommand } from "../../contracts/owned-ui/index.js";
import { assertPromptImages, ImageAttachmentError } from "../../contracts/owned-ui/index.js";
import type {
  OwnedUiCommand,
  OwnedUiDialog,
  OwnedUiImageAttachment,
  OwnedUiPromptSuggestionIdentity,
  OwnedUiQuitEffect,
  OwnedUiSessionViewModel,
  OwnedUiThinkingLevel,
  SuggestionDecision,
} from "../../contracts/owned-ui/index.js";
import type { UiRouteHost } from "../../ui/apps/contracts.js";
import { ContextualPromptSuggestionController } from "./prompt-suggestion-controller.js";
import { MOUSE_TRACKING_OFF, MOUSE_TRACKING_ON, parseMouseInput } from "../../ui/components/mouse.js";
import { readVisibleHyperlinks } from "../../ui/components/visible-hyperlinks.js";
import { PINNED_PI_HIDDEN_COMMAND_NAMES, workflowCommandNames } from "../../integrations/pi/engine/workflows.js";
import type {
  AdapterCommandResult,
  OwnedPiExtensionResourceSummary,
  OwnedPiExtensionSourceSummary,
  PiEngineAdapter,
} from "../../integrations/pi/engine/adapter.js";
import type {
  PiWorkflowInteractionRequest,
  PiWorkflowLoginNotification,
  PiWorkflowLoginStart,
  PiWorkflowRequest,
  PiWorkflowResult,
  PiWorkflowRoute,
} from "../../integrations/pi/engine/workflows.js";
import { createPiExtensionUiBridge, type PiExtensionUiBridge } from "../../integrations/pi/components/shell-extension-ui.js";
import { createPiShellEditor } from "../../integrations/pi/components/shell-editor-autocomplete.js";
import {
  SKILLS_COMMAND_NAME,
  findSkillByArgument,
  rewriteSkillsTunnelSubmission,
  skillPrompt,
  skillsFromCommands,
  type PiShellSkillSummary,
} from "../../integrations/pi/components/skills-command.js";
import {
  createPiQueuedInputStatus,
  createPiShellFooter,
  createPiShellHeader,
  createPiShellLoadedResources,
  createPiShellStatus,
} from "../../integrations/pi/components/shell-footer-status.js";
import {
  createPiShellArmin,
  createPiShellAuthProviderSelector,
  createPiShellDaxnuts,
  createPiShellDialog,
  createPiShellEarendilAnnouncement,
  createPiShellExtensionSelector,
  createPiShellLoginDialog,
  createPiShellModelSelector,
  createPiShellModelsDialog,
  createPiShellOperationLoader,
  createPiShellReloadBox,
  createPiShellScopedModelsSelector,
  createPiShellSelector,
  createPiShellSessionSelector,
  createPiShellSettingsSelector,
  createPiShellSkillsSelector,
  createPiShellThinkingSelector,
  type PiShellSettingsSelectorOptions,
  createPiShellTreeSelector,
  createPiShellTrustSelector,
  createPiShellUserMessageSelector,
  type PiShellLoginDialogPort,
  type PiShellModelsDialogPort,
  type PiShellScopedModelsSelectorPort,
} from "../../integrations/pi/components/shell-selectors-dialogs.js";
import {
  createPiShellChangelog,
  createPiShellHotkeys,
  createPiShellSessionInfo,
  renderPiShellStatusText,
} from "../../integrations/pi/components/shell-presenters-info.js";
import {
  createPiShellTranscriptComponent,
  renderPiShellPackageUpdateNotice,
  renderPiShellStartupDiagnostic,
  renderPiShellTranscriptBlock,
} from "../../integrations/pi/components/shell-presenters-transcript.js";
import { onPiThemeChange, piTheme } from "../../integrations/pi/components/upstream/theme/theme.js";
import type {
  PiShellComponentPort,
  PiShellClipboardContent,
  PiShellEditorPort,
  PiShellExtensionRendererResolver,
  PiShellHeaderOptions,
  PiShellHeaderPort,
  PiShellLoadedResourcesPort,
  PiShellQueuedInputPort,
  PiShellResourceEntry,
  PiShellSelectorOption,
  PiShellStatusPort,
  PiShellTranscriptComponentPort,
  PiShellViewComponentPort,
} from "../../integrations/pi/components/shell-shared-facade.js";
import { DamageAwareTerminalAdapter, type PiTuiDamageDecision } from "../../integrations/pi/tui-runtime/damage-aware-terminal.js";
import { PiTuiRuntimeAdapter } from "../../integrations/pi/tui-runtime/adapter.js";
import { classifyPiTuiInput } from "../../integrations/pi/tui-runtime/input-presentation-coordinator.js";
import type {
  PiTuiComponentPort,
  PiTuiLayoutNode,
  PiTuiOverlayHandle,
  PiTuiRuntimeAdapterOptions,
  PiTuiTerminalPort,
} from "../../integrations/pi/tui-runtime/contracts.js";


import { runImageWorker } from "./image-preparation-client.js";
import type { ClipboardImageData } from "./clipboard-image.js";
import {
  STREAM_PRESENTATION_INTERVAL_MS,
  StreamPresentationCoalescer,
} from "./stream-presentation-coalescer.js";
import {
  writeSystemClipboardText,
} from "./system-clipboard.js";
import {
  OwnedUiSessionShellRoot,
  shellResourceEntries,
  type OwnedUiBackendPort,
  type OwnedUiSessionShellOptions,
  type OwnedUiShellPresentationOptions,
  type OwnedUiShellSkillsOptions,
  type OwnedUiTerminalPort,
} from "./session-shell-root.js";
export {
  OwnedUiSessionShellRoot,
  type OwnedUiSessionShellOptions,
  type OwnedUiShellDiagnosticOptions,
  type OwnedUiShellEngineOptions,
  type OwnedUiShellHistoryOptions,
  type OwnedUiShellPresentationOptions,
  type OwnedUiShellSkillsOptions,
  type OwnedUiShellSuggestionOptions,
} from "./session-shell-root.js";

/** Coordinates backend, owned presentation, and Pi TUI lifecycles for one interactive session. */
export class OwnedUiSessionShell {
  readonly backend: OwnedUiBackendPort;
  readonly root: OwnedUiSessionShellRoot;
  readonly runtime: PiTuiRuntimeAdapter;
  readonly #cwd: string;
  readonly #listeners = new Set<(view: OwnedUiSessionViewModel) => void>();
  readonly #unsubscribe: () => void;
  readonly #unsubscribePromptSuggestions: () => void;
  readonly #promptSuggestions: ContextualPromptSuggestionController | null;
  readonly #skills: OwnedUiShellSkillsOptions | null;
  readonly #unsubscribeSkills: () => void;
  #installedCommandSignature = "";
  #promptHistory: PromptHistoryController | null = null;
  #promptHistoryImageSidecar: import("../../contracts/owned-ui/index.js").PromptHistoryImageSidecarPort | undefined;
  readonly #extensionBridge: PiExtensionUiBridge;
  readonly #stopped: Promise<void>;
  #resolveStopped: (() => void) | undefined;
  #dialogId: string | undefined;
  #dialogSource: "route" | "local" | "backend" | undefined;
  readonly #routeHost: UiRouteHost | null;
  #dialogHandle: PiTuiOverlayHandle | undefined;
  #sequence = 0;
  #editorRevision = 0;
  #started = false;
  #disposed = false;
  #shutdownPromise: Promise<AdapterCommandResult> | undefined;
  #disposePromise: Promise<void> | undefined;
  #pointerReporting = false;
  readonly #customViewport: boolean;
  readonly #responseCopy: ResponseCopyCoordinator | null;
  // Rationale: only an executor this shell created owns a spare copy helper worth warming and disposing.
  #copyExecutor: OwnedResponseCopyExecutor | undefined;
  readonly #unbindClipboardWriter: () => void;
  readonly #damageTerminal: DamageAwareTerminalAdapter | null;
  readonly #quitOutro: OwnedUiShellPresentationOptions["quitOutro"];
  readonly #reloadPresentation: OwnedUiShellPresentationOptions["reload"];
  readonly #streamPresentation: StreamPresentationCoalescer;
  readonly #removeViewportPreInput: () => void;
  readonly #unsubscribeSettings: () => void;
  readonly #unbindPiSettings: () => void;
  readonly #unbindTerminalSettings: () => void;
  readonly #unbindShutdownSettings: () => void;
  #terminalProgressEnabled = false;
  #showImages = true;
  #imageWidthCells = 80;
  #fullscreenExitOutput: "transcript" | "resume-hint" = "transcript";
  readonly #waitingImages = new Map<string, { controller: AbortController; result: Promise<AdapterCommandResult> }>();
  #lastClearTime = 0;
  #lastEscapeTime = 0;
  #activeLoginDialog: PiShellLoginDialogPort | undefined;
  #sessionGeneration: number;
  #sessionBindingGeneration: number;
  #suggestionModelKey: string;

  constructor(options: OwnedUiSessionShellOptions) {
    const { backend, cwd, routeHost, sessionLayout } = options.engine;
    const { terminal, startup, viewportSettings, quitOutro, reload: reloadPresentation, stream: streamPresentationOptions, input: inputPresentation } = options.presentation ?? {};
    const { clipboard, responseCopy, paste: pasteDiagnostics, pastePreparation } = options.diagnostics ?? {};
    const promptHistory = options.history;
    this.backend = backend;
    this.#sessionGeneration = this.backend.sessionGeneration;
    this.#sessionBindingGeneration = this.backend.sessionBindingGeneration;
    this.#suggestionModelKey = modelKey(this.backend.view());
    this.#cwd = cwd;
    this.#routeHost = routeHost ?? null;
    this.#customViewport = sessionLayout === "custom-viewport";
    this.#stopped = new Promise(resolve => {
      this.#resolveStopped = resolve;
    });
    let runtime: PiTuiRuntimeAdapter | undefined;
    let damageTerminal: DamageAwareTerminalAdapter | undefined;
    let streamPresentation: StreamPresentationCoalescer | undefined;
    let pendingClipboardWrite: Promise<void> = Promise.resolve();
    let promptSuggestionController: ContextualPromptSuggestionController | null = null;
    // Invariant: the collapsed skills presentation is a bare-A1 replacement; comparison profiles keep the pinned list.
    this.#skills = this.#customViewport ? options.skills ?? null : null;
    const terminalCopy = terminal !== undefined || hasAsyncClipboardOutput();
    this.#responseCopy = this.#customViewport ? new ResponseCopyCoordinator({
      execute: responseCopy?.execute ?? (this.#copyExecutor = createResponseCopyExecutor({
        ...(terminal === undefined && clipboard === undefined ? {} : { destination: "terminal" }),
        ...(clipboard?.writeText === undefined ? {} : { writeText: (text, signal) => clipboard!.writeText!(text, signal) }),
        ...(terminalCopy ? { terminal: { submit: async (control, signal) => {
          if (signal.aborted || this.#disposed || !runtime?.active) throw new Error("Copy canceled");
          // Performance: never grow the real terminal's pending buffer with another clipboard payload.
          if (terminal === undefined && process.stdout.writableLength + control.length > MAX_COPY_CONTROL_BYTES) {
            throw new Error("Clipboard terminal is busy");
          }
          runtime.writeControl(control);
        } } } : {}),
      })),
      ...(responseCopy?.onEvent === undefined ? {} : { onEvent: responseCopy.onEvent }),
      onFailure: result => {
        if (this.#disposed || !runtime?.active) return;
        this.root.appendWorkflowStatus(result.outcome === "timed-out" ? "Copy timed out; the clipboard did not respond."
          : result.failure === "size" ? "Selection exceeds this clipboard route's size limit."
          : "Could not copy the selection; the clipboard is unavailable.");
        runtime.requestRender();
      },
    }) : null;
    const readClipboard = async (signal: AbortSignal): Promise<PiShellClipboardContent | null> => {
      if (signal.aborted) throw new ImageAttachmentError("image-canceled");
      if (clipboard === undefined) return runImageWorker({ kind: "clipboard" }, signal);
      try {
        const image = await clipboard.readImage?.(signal);
        if (image !== null && image !== undefined) {
          const canonical = await runImageWorker<ClipboardImageData | null>({ kind: "canonicalize", source: image }, signal);
          if (canonical !== null) return { kind: "image", ...canonical };
        }
      } catch (error) {
        if (error instanceof ImageAttachmentError) throw error;
        // Compatibility: an unavailable image reader can still provide text.
      }
      const text = await clipboard.readText(signal);
      return text === null ? null : { kind: "text", text };
    };
    this.root = new OwnedUiSessionShellRoot(this.backend.view(), cwd, {
      getColumns: () => runtime?.viewport().columns ?? terminal?.columns ?? 80,
      getRows: () => runtime?.viewport().rows ?? terminal?.rows ?? 24,
      requestRender: force => runtime?.requestRender(force),
      requestHyperlinkCleanup: rows => damageTerminal?.requestHyperlinkCleanup(rows),
      onViewportFrame: frame => damageTerminal?.arm(frame.descriptor, {
        overlayActive: runtime?.hasOverlay() ?? false,
        selectionActive: this.root.hasActiveSelection(),
        replacementSurfaceActive: !this.root.usesDefaultInputSurface(),
      }),
      enableDockInputReuse: inputPresentation?.viewportReuse !== false,
      persistentHistory: this.#customViewport && promptHistory !== undefined,
      ...(promptHistory === undefined ? {} : { historyEditor: promptHistory.editor }),
      onSubmit: text => { void this.submit(text).catch(() => this.#reportSubmissionError()); },
      onPasteRejected: error => this.#reportSubmissionError(error),
      onInterrupt: () => { void this.interrupt(); },
      onClear: () => { void this.clearOrExit(); },
      onExit: () => { void this.shutdown(); },
      onModelSelect: () => this.#customViewport ? this.showModelsDialog() : this.showModelSelector(),
      onModelCycle: direction => { void this.cycleModel(direction); },
      onThinkingCycle: () => { void this.cycleThinkingLevel(); },
      onThinkingToggle: () => {
        this.root.toggleThinkingVisibility();
        this.runtime.requestRender();
      },
      onMessageCopy: () => { void this.runWorkflow({ command: "copy", argument: "" }); },
      onFollowUp: () => { void this.queueFollowUp().catch(() => this.#reportSubmissionError()); },
      onDequeue: () => this.restoreQueuedInput(),
      onEditorChange: () => { this.#editorRevision++; promptSuggestionController?.abortPending(); },
      onPromptSuggestionAccepted: () => promptSuggestionController?.accept(),
      onInputSurfaceChanged: () => {
        promptSuggestionController?.invalidate();
        this.#promptHistory?.synchronize();
      },
      onCopyText: text => {
        if (this.#responseCopy !== null) { void this.#responseCopy.submitText(text); return; }
        const write = () => {
          if (this.#disposed) return Promise.resolve();
          runtime?.writeControl(`\u001b]52;c;${Buffer.from(text, "utf8").toString("base64")}\u0007`);
          return clipboard === undefined ? writeSystemClipboardText(text)
            : clipboard.writeText?.(text) ?? Promise.resolve();
        };
        // Compatibility: comparison profiles retain their existing clipboard path.
        pendingClipboardWrite = write().catch(() => {});
      },
      readClipboardContent: async (signal = new AbortController().signal) => {
        await pendingClipboardWrite;
        return readClipboard(signal);
      },
      captureClipboardPaste: () => {
        const before = this.#responseCopy?.capturePasteBarrier() ?? (async () => true);
        if (clipboard !== undefined) return { kind: "provided", read: readClipboard, before };
        if (responseCopyDestination(process.env) === "terminal") return {
          kind: "provided", before, read: async () => { throw new ImageAttachmentError("paste-unavailable"); },
        };
        return { kind: "native", before };
      },
      ...(pasteDiagnostics === undefined ? {} : { pasteDiagnostics: pasteDiagnostics }),
      ...(pastePreparation === undefined ? {} : { pastePreparation }),
      skillsPresentation: () => this.#skills?.presentation() ?? "expand",
    }, {
      ...startup,
      resources: startup?.resources ?? shellResourceEntries(this.backend),
    }, this.backend.agentDir, {
      getMessageRenderer: customType => this.backend.pinnedMessageRenderer(customType),
      getToolDefinition: toolName => this.backend.pinnedToolDefinition(toolName),
      getShortcuts: bindings => this.backend.pinnedShortcutDescriptions(bindings),
    }, sessionLayout, {
      resolve: assetId => this.backend.resolveTranscriptImage(assetId),
    });
    // Invariant: bare A1 owns a bounded viewport and therefore always runs on the alternate
    // fullscreen surface. The pinned comparison profiles still honor Pi's mode.
    const tuiMode = this.#customViewport
      ? "fullscreen"
      : this.backend.disposed ? "regular" : this.backend.pinnedSettingsSnapshot().tuiMode;
    const runtimeOptions: PiTuiRuntimeAdapterOptions = {
      root: this.root,
      mode: tuiMode,
      ...(this.#customViewport ? {
        onOverlayGeometry: surfaces => this.root.setViewportOverlaySurfaces(surfaces),
        decorateTerminal: (terminal: PiTuiTerminalPort) => {
          damageTerminal = new DamageAwareTerminalAdapter(terminal, {
            regionalScroll: process.env.TERM !== "dumb",
            inspectHyperlinks: readVisibleHyperlinks,
            onResize: () => streamPresentation?.noteImmediatePresentation(),
            onHyperlinkCleanupRequired: () => runtime?.requestRender(true),
          });
          return damageTerminal;
        },
        ...(inputPresentation?.coordination === false ? {} : {
          inputCoordination: {
            classify: (data: string, focusedOverlay) => classifyPiTuiInput(
              data,
              focusedOverlay ?? this.root.inputCoordinationSurface(),
            ),
            onReceipt: () => streamPresentation?.noteImmediatePresentation(),
            ...(inputPresentation?.scheduler === undefined
              ? {}
              : { scheduler: inputPresentation.scheduler }),
          },
        }),
      } : { layoutRoot: this.root.layoutRoot() }),
      ...(inputPresentation?.onEvent === undefined ? {} : {
        inputDiagnostics: {
          onEvent: inputPresentation.onEvent,
          ...(inputPresentation.now === undefined ? {} : { now: inputPresentation.now }),
        },
      }),
      ...(terminal === undefined ? {} : { terminal: terminal }),
      hardwareCursor: this.backend.view().terminal.hardwareCursor,
    };
    runtime = new PiTuiRuntimeAdapter(runtimeOptions);
    this.runtime = runtime;
    this.#damageTerminal = damageTerminal ?? null;
    this.#quitOutro = quitOutro;
    this.#reloadPresentation = reloadPresentation;
    const presentationInterval = streamPresentationOptions?.intervalMs ?? STREAM_PRESENTATION_INTERVAL_MS;
    streamPresentation = streamPresentationOptions?.scheduler === undefined
      ? new StreamPresentationCoalescer(() => this.runtime.requestRender(), presentationInterval)
      : new StreamPresentationCoalescer(
          () => this.runtime.requestRender(),
          presentationInterval,
          streamPresentationOptions.scheduler,
        );
    this.#streamPresentation = streamPresentation;
    const promptSuggestionOptions = this.#customViewport ? options.suggestions : undefined;
    promptSuggestionController = promptSuggestionOptions === undefined ? null : new ContextualPromptSuggestionController({
      generator: promptSuggestionOptions.generator,
      enabled: promptSuggestionOptions.enabled(),
      ...(promptSuggestionOptions.diagnostics === undefined ? {} : { diagnostics: promptSuggestionOptions.diagnostics }),
      surface: {
        canPresent: identity => this.#promptSuggestionPresentationBlockReason(identity) === null,
        presentationBlockReason: identity => this.#promptSuggestionPresentationBlockReason(identity),
        present: text => {
          if (!this.root.canPresentPromptSuggestion()) return false;
          this.root.setPromptSuggestion(text);
          return true;
        },
        clear: () => this.root.setPromptSuggestion(null),
        requestRender: () => this.runtime.requestRender(),
      },
    });
    this.#promptSuggestions = promptSuggestionController;
    this.#unsubscribePromptSuggestions = promptSuggestionOptions === undefined
      ? () => {}
      : promptSuggestionOptions.onChange(enabled => this.#promptSuggestions?.setEnabled(enabled));
    // Rationale: the same listener refreshes the menu for the A1 presentation choice and for the engine's
    // skill-command registration, both of which the owned settings manager reports through one change.
    this.#unsubscribeSkills = this.#skills === null ? () => {} : this.#skills.onChange(() => {
      // Invariant: reinstalling drops extension provider wrappers, so an unrelated setting change leaves the list alone.
      if (this.#disposed || this.#commandListSignature() === this.#installedCommandSignature) return;
      this.#installAutocompleteCommands();
      this.runtime.requestRender();
    });
    const initialPiSettings = this.backend.pinnedSettingsSnapshot();
    this.runtime.setHardwareCursor(initialPiSettings.showHardwareCursor);
    this.runtime.setClearOnShrink(initialPiSettings.clearOnShrink);
    this.#terminalProgressEnabled = initialPiSettings.showTerminalProgress;
    this.#fullscreenExitOutput = initialPiSettings.fullscreenExitOutput;
    // Invariant: bare A1 prints only the resume hint at exit, so the pinned exit-output
    // choice is hidden there and cannot be bound; the comparison profile binds and honors it.
    this.#unbindShutdownSettings = this.backend.settingsProductMode === "bare" ? () => {} : this.backend.bindSettingsOwner("shutdown", {
      fullscreenExitOutput: { apply() {} },
    });
    this.#unbindTerminalSettings = this.backend.bindSettingsOwner("terminal", {
      showHardwareCursor: { apply: value => {
        if (typeof value !== "boolean") throw new TypeError("Hardware cursor setting is invalid");
        this.runtime.setHardwareCursor(value);
      } },
      clearOnShrink: { apply: value => {
        if (typeof value !== "boolean") throw new TypeError("Clear-on-shrink setting is invalid");
        this.runtime.setClearOnShrink(value);
      } },
      showTerminalProgress: { apply: value => {
        if (typeof value !== "boolean") throw new TypeError("Terminal progress setting is invalid");
        this.#terminalProgressEnabled = value;
        this.#syncTerminalProgress(this.view());
      } },
    });
    this.#removeViewportPreInput = this.#customViewport
      ? this.runtime.addPreInputListener(data => {
          if (inputPresentation?.coordination === false) this.#streamPresentation.noteImmediatePresentation();
          // Compatibility: Pi's fullscreen renderer also intercepts plain Home/End.
          // Deliver them to the focused owned input before that outer scroll handler;
          // overlays retain Pi's normal dispatch, and comparison profiles never enter here.
          if (!this.runtime.hasOverlay() && (this.root.editor.matchesTerminalKey(data, "home")
            || this.root.editor.matchesTerminalKey(data, "end"))) {
            if (this.root.usesDefaultInputSurface()) this.root.handleViewportPreInput(data, true);
            this.root.handleInput(data);
            this.runtime.requestRender();
            return { consume: true };
          }
          // Invariant: geometry must belong to the painted frame, including newly opened/nested
          // surfaces. Steady pointer input does not trigger a synchronous composition.
          const viewport = this.runtime.viewport();
          if (data.includes("\u001b[<") && !this.root.viewportInputGeometryReady(viewport.columns, viewport.rows)) {
            this.runtime.renderNow();
          }
          const routed = this.root.handleViewportPreInput(data, true, Date.now(),
            this.root.usesDefaultInputSurface() && !this.runtime.hasFocusedOverlay());
          if (routed.copySelection !== undefined) {
            void this.#responseCopy?.submit(routed.copySelection, pendingClipboardWrite);
          }
          if (!routed.consumed) return routed.data === data ? undefined : { data: routed.data };
          return routed.data.length === 0 ? { consume: true } : { data: routed.data };
        })
      : () => {};
    const applyViewportSettings = () => {
      const snapshot = viewportSettings?.snapshot();
      this.root.setViewportConfig(snapshot ?? {
        scrollbarAppearance: "auto",
        scrollbarStyle: "thin",
        scrollbarSpeed: "normal",
      });
    };
    applyViewportSettings();
    this.#unsubscribeSettings = this.#customViewport && viewportSettings
      ? viewportSettings.onChange(settings => this.root.setViewportConfig(settings))
      : () => {};
    this.root.setEditorPaddingX(initialPiSettings.editorPaddingX);
    this.root.setAutocompleteMaxVisible(initialPiSettings.autocompleteMaxVisible);
    this.root.setOutputPad(initialPiSettings.outputPad);
    this.root.setHideThinkingBlock(initialPiSettings.hideThinkingBlock);
    this.root.setMermaidRenderingMode(initialPiSettings.mermaidRenderingMode);
    this.#showImages = initialPiSettings.showImages;
    this.#imageWidthCells = initialPiSettings.imageWidthCells;
    this.root.setImagePresentation(this.#showImages, this.#imageWidthCells);
    this.#unbindPiSettings = this.backend.bindSettingsOwner("shell", {
      editorPaddingX: { apply: value => {
        if (typeof value !== "number") throw new TypeError("Editor padding is invalid");
        this.root.setEditorPaddingX(value);
      } },
      autocompleteMaxVisible: { apply: value => {
        if (typeof value !== "number") throw new TypeError("Autocomplete maximum is invalid");
        this.root.setAutocompleteMaxVisible(value);
      } },
      outputPad: { apply: value => {
        if (value !== 0 && value !== 1) throw new TypeError("Output padding is invalid");
        this.root.setOutputPad(value);
      } },
      hideThinkingBlock: { apply: value => {
        if (typeof value !== "boolean") throw new TypeError("Thinking-block visibility is invalid");
        this.root.setHideThinkingBlock(value);
      } },
      mermaidRenderingMode: { apply: value => {
        if (value !== "off" && value !== "final" && value !== "streaming") throw new TypeError("Mermaid mode is invalid");
        this.root.setMermaidRenderingMode(value);
      } },
      showImages: { apply: value => {
        if (typeof value !== "boolean") throw new TypeError("Image visibility is invalid");
        this.#showImages = value;
        this.root.setImagePresentation(this.#showImages, this.#imageWidthCells);
      } },
      imageWidthCells: { apply: value => {
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new TypeError("Image width is invalid");
        this.#imageWidthCells = value;
        this.root.setImagePresentation(this.#showImages, this.#imageWidthCells);
      } },
    });
    if (this.#customViewport && promptHistory !== undefined) {
      this.#promptHistoryImageSidecar = promptHistory.imageSidecar;
      const sidecar = this.#promptHistoryImageSidecar;
      this.#promptHistory = new PromptHistoryController({
        editor: this.root.editor,
        store: promptHistory.store,
        limit: promptHistory.limit,
        fallback: this.view().transcript.flatMap(block => block.kind === "user" ? [block.text] : []),
        active: () => this.root.usesDefaultInputSurface(),
        render: () => this.runtime.requestRender(),
        rehydrate: value => this.root.rehydrateHistoryText(value, id => sidecar?.readAttachment(id) ?? null),
      });
    }
    this.#extensionBridge = createPiExtensionUiBridge({
      runtime: {
        getColumns: () => this.runtime.viewport().columns,
        getRows: () => this.runtime.viewport().rows,
        requestRender: () => this.runtime.requestRender(),
      },
      agentDir: this.backend.agentDir,
      setInputSurface: component => this.root.setInputSurface(component, true, "opaque"),
      showOverlay: (component, overlayOptions) => this.runtime.showOverlay(component, overlayOptions),
      listenInput: handler => this.runtime.addInputListener(handler),
      replaceWidget: (key, component, placement) => this.root.setExtensionWidget(key, component, placement),
      replaceHeader: component => this.root.setExtensionHeader(component),
      replaceFooter: component => this.root.setExtensionFooter(component),
      setStatus: (key, text) => this.root.setExtensionStatus(key, text),
      setWorking: (message, visible) => this.root.setExtensionWorking(message, visible),
      notify: (message, type) => this.root.addExtensionNotification(message, type),
      setTitle: title => this.runtime.setTitle(title),
      getEditorText: () => this.root.editor.getText(),
      setEditorText: text => this.root.editor.setText(text),
      pasteToEditor: text => this.root.editor.insertText(text),
      addAutocompleteProvider: factory => this.root.editor.addAutocompleteProvider(factory),
      setCustomEditor: component => this.root.setInputSurface(component, true, "opaque"),
      getFooterData: () => this.root.extensionFooterData(),
      getToolsExpanded: () => this.root.toolsExpanded,
      setToolsExpanded: expanded => this.root.setToolsExpanded(expanded),
    });
    this.backend.setWorkflowInteractionHost({
      startLogin: request => this.#startWorkflowLogin(request),
      prompt: request => this.#requestWorkflowInput(request),
      notify: event => this.#notifyWorkflowLogin(event),
      publish: message => {
        this.root.appendWorkflowMessage(message);
        this.runtime.requestRender();
      },
      finishLogin: () => this.#finishWorkflowLogin(),
    });
    this.#installAutocompleteCommands();
    this.#unsubscribe = this.backend.onEvent(event => {
      // Performance: a streamed chunk names one block, and touching only that block is what keeps the
      // cost of a chunk the same in a long session as in a new one. Everything else
      // resynchronizes the view, which is cheap next to re-reading the transcript.
      if (event.type === "agent-run-started") {
        this.#promptSuggestions?.invalidate();
        this.root.resumeViewportFollowing();
      }
      if (event.type === "assistant-message-completed") {
        this.root.noteCompletedAssistantMessage();
        const identity = {
          sessionId: event.sessionId,
          sessionGeneration: event.sessionGeneration,
          runSequence: event.runSequence,
          responseSequence: event.responseSequence,
          model: event.model,
        };
        if (event.model === null) this.#promptSuggestions?.skip(identity, "no-model");
        else this.#promptSuggestions?.consider({ ...identity, model: event.model },
          !event.successful ? "failed-response"
            : event.toolContinuation || event.stopReason === "toolUse" ? "tool-continuation"
            : event.stopReason !== "stop" ? "incomplete-response"
            : event.assistantMessageCount < 2 ? "early-conversation"
            : this.root.promptSuggestionPrepareBlockReason());
      }
      const semanticOnly = event.type === "agent-run-started" || event.type === "assistant-message-completed";
      const view = event.type === "transcript-block" && this.#sessionGeneration === this.backend.sessionGeneration
        ? this.#syncBlock(event.block)
        : semanticOnly ? this.view() : this.#syncView();
      this.#syncTerminalProgress(view);
      const currentModelKey = modelKey(view);
      if (this.backend.sessionGeneration !== this.#sessionGeneration || currentModelKey !== this.#suggestionModelKey) {
        this.#promptSuggestions?.invalidate();
        this.#suggestionModelKey = currentModelKey;
      }
      if (event.type === "status" && /^(Retrying|Compacting)/.test(event.status.workingMessage ?? "")) {
        this.#promptSuggestions?.invalidate();
      }
      if (event.type === "agent-run-settled" && event.model !== null) {
        this.#promptSuggestions?.settle({
          sessionId: event.sessionId,
          sessionGeneration: event.sessionGeneration,
          runSequence: event.runSequence,
          responseSequence: event.responseSequence,
          model: event.model,
        });
      }
      if (event.type === "session-lifecycle" && event.lifecycle === "stopped") this.#settleStoppedLifecycle();
    });
    this.#unbindClipboardWriter = this.#responseCopy === null ? () => {} : this.backend.bindClipboardWriter(async text => {
      const result = await this.#responseCopy!.submitText(text);
      if (result.outcome === "delivered") return true;
      if (result.outcome === "submitted-unverified") return false;
      throw new Error(result.outcome === "timed-out" ? "Clipboard delivery timed out" : "Clipboard delivery could not be completed");
    });
    if (this.backend.view().lifecycle === "stopped") this.#resolveStopped?.();
  }

  view(): OwnedUiSessionViewModel {
    return this.backend.view();
  }

  #promptSuggestionPresentationBlockReason(identity: OwnedUiPromptSuggestionIdentity): SuggestionDecision {
    const view = this.view();
    if (this.#disposed) return "disposed";
    if (identity.sessionId !== view.sessionId || identity.sessionGeneration !== this.backend.sessionGeneration
      || modelKey(view) !== `${identity.model.providerId}/${identity.model.modelId}`) return "stale-identity";
    return this.root.promptSuggestionPresentationBlockReason();
  }

  damagePresentationDecision(): PiTuiDamageDecision | null {
    return this.#damageTerminal?.lastDecision ?? null;
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.runtime.start();
    this.#promptHistory?.start();
    this.#syncTerminalProgress(this.view());
    if (this.#customViewport) this.#setPointerReporting(true);
    void this.backend.bindExtensionUi(this.#extensionBridge.context, () => { void this.shutdown(); });
    this.#syncView();
    // Performance: the spare clipboard helpers fork after the first frame is out, so startup never waits on them.
    setImmediate(() => {
      if (this.#disposed || !this.#customViewport) return;
      this.root.warmPastePreparation();
      this.#copyExecutor?.warm();
    });
  }

  onView(listener: (view: OwnedUiSessionViewModel) => void): () => void {
    this.#listeners.add(listener);
    listener(this.view());
    return () => this.#listeners.delete(listener);
  }

  waitUntilStopped(): Promise<void> {
    return this.#stopped;
  }

  async submit(text: string): Promise<AdapterCommandResult> {
    return this.#submitWhenReady(text, () => this.#submit(text));
  }

  #submitWhenReady(draft: string, action: () => Promise<AdapterCommandResult>): Promise<AdapterCommandResult> {
    const previous = this.#waitingImages.get(draft);
    if (previous !== undefined) return previous.result;
    if (!this.root.hasPendingPastes(draft)) return this.#guardSubmission(draft, action);
    const controller = new AbortController();
    const generation = this.backend.sessionGeneration;
    const result = this.#guardSubmission(draft, async () => {
      await this.root.waitForPromptPastes(draft, controller.signal);
      if (controller.signal.aborted || this.#disposed || this.backend.sessionGeneration !== generation) return rejected("image submission canceled");
      return action();
    }).finally(() => {
      this.#waitingImages.delete(draft);
      if (!this.#disposed) this.#showWaitingImages();
    });
    this.#waitingImages.set(draft, { controller, result });
    if (this.root.editor.getText() === draft) this.root.editor.setText("");
    this.#showWaitingImages();
    return result;
  }

  #showWaitingImages(): void {
    const count = this.#waitingImages.size;
    this.root.setExtensionWidget("owned-image-preparation", count === 0 ? null : {
      render: width => [...renderPiShellStatusText(`Waiting for images (${count} submission${count === 1 ? "" : "s"}) — Esc cancels; dequeue restores`, width)],
      invalidate: () => {},
    }, "aboveEditor");
    this.runtime.requestRender();
  }

  #cancelWaitingImages(): void {
    for (const item of this.#waitingImages.values()) item.controller.abort();
  }

  #rememberInput(text: string, kind: PromptHistoryKind): void {
    this.root.editor.addToHistory(text);
    if (this.#promptHistory !== null) {
      const reusable = this.root.prepareHistoryText(text);
      if (reusable.length === 0) this.#promptHistory.rememberRecovery(text);
      else {
        this.#persistImageSidecars(text);
        this.#promptHistory.capture(reusable, kind, this.#cwd, this.backend.sessionId);
      }
    }
  }

  // Rationale: write the image chip payloads referenced by an editor draft to the sidecar
  // directory before their history row commits. Missing sidecar dependency = silent skip; the
  // recall path treats an absent sidecar the same as a corrupt one.
  #persistImageSidecars(text: string): void {const sidecar = this.#promptHistoryImageSidecar;
    if (sidecar === undefined) return;
    for (const record of this.root.imageChipAttachmentsFromEditor(text)) {
      sidecar.write(record.id, { tag: record.tag, data: record.image.data, mimeType: record.image.mimeType, savedAt: new Date().toISOString() });
    }
  }

  async #submit(text: string): Promise<AdapterCommandResult> {
    this.#promptSuggestions?.invalidate();
    const displayInput = text.trim();
    if (!displayInput) return { outcome: "completed", diagnostic: null };
    if (displayInput.startsWith("/")) return this.#slashCommand(displayInput);
    const prepared = this.root.preparePromptSubmission(displayInput);
    assertPromptImages(prepared.images);
    const input = prepared.text.trim();
    if (input.startsWith("!")) {
      const excludeFromContext = input.startsWith("!!");
      const command = input.slice(excludeFromContext ? 2 : 1).trim();
      if (command) {
        this.#rememberInput(displayInput, "bash");
        try {
          const result = await this.backend.executeBashWorkflow(command, excludeFromContext);
          const workflow: PiWorkflowResult = {
            command: "debug",
            outcome: result.cancelled ? "cancelled" : result.exitCode === 0 || result.exitCode === undefined ? "completed" : "failed",
            message: result.cancelled ? "Bash command cancelled" : `Bash exited ${result.exitCode ?? 0}: ${command}`,
            ...(result.output ? { detail: result.output } : {}),
          };
          this.root.appendWorkflowResult(workflow);
          this.runtime.requestRender();
          return workflow.outcome === "failed" ? rejected(workflow.message) : { outcome: "completed", diagnostic: null };
        } catch (error) {
          const message = `Bash command failed: ${error instanceof Error ? error.message : String(error)}`;
          this.root.appendWorkflowResult({ command: "debug", outcome: "failed", message });
          this.runtime.requestRender();
          return rejected(message);
        }
      }
    }
    // Compatibility: match interactive Pi: input during compaction is queued steering; the engine
    // shows it in the pending rows and delivers it when compaction ends.
    const type = this.view().lifecycle === "busy" ? "steer" as const : "prompt" as const;
    this.#rememberInput(displayInput, type);
    this.root.resumeViewportFollowing();
    return this.#execute({
      type,
      correlationId: this.#correlation(type),
      sessionId: this.backend.sessionId,
      text: input,
      ...(prepared.images.length === 0 ? {} : { images: prepared.images }),
    }, displayInput);
  }

  async clearOrExit(now = Date.now()): Promise<AdapterCommandResult> {
    this.#promptSuggestions?.abortPending();
    if (now - this.#lastClearTime < 500) return this.shutdown();
    this.root.editor.setText("");
    this.#lastClearTime = now;
    this.runtime.requestRender();
    return { outcome: "completed", diagnostic: null };
  }

  async interrupt(now = Date.now()): Promise<AdapterCommandResult> {
    this.#promptSuggestions?.invalidate();
    if (this.#waitingImages.size > 0) {
      this.#cancelWaitingImages();
      return { outcome: "completed", diagnostic: null };
    }
    if (this.view().lifecycle === "busy") return this.abort();
    if (this.root.editor.getText().trim().length > 0) {
      this.root.editor.setText("");
      return { outcome: "completed", diagnostic: null };
    }

    // Compatibility: match Pi: with an empty editor, two escapes inside 500 ms open the
    // configured session navigator. The first escape intentionally does not
    // interrupt or mutate the prompt.
    const action = this.backend.pinnedSettingsSnapshot().doubleEscapeAction;
    if (action === "none") return { outcome: "rejected", diagnostic: "nothing to interrupt" };
    if (now - this.#lastEscapeTime < 500) {
      this.#lastEscapeTime = 0;
      if (action === "tree") this.showTreeSelector();
      else this.showForkSelector();
      return { outcome: "completed", diagnostic: null };
    }
    this.#lastEscapeTime = now;
    return { outcome: "completed", diagnostic: null };
  }

  async abort(): Promise<AdapterCommandResult> {
    return this.#execute(this.#simple("abort"));
  }

  async retry(): Promise<AdapterCommandResult> {
    this.#promptSuggestions?.invalidate();
    return this.#execute(this.#simple("retry"));
  }

  async compact(): Promise<AdapterCommandResult> {
    this.#promptSuggestions?.invalidate();
    return this.#execute(this.#simple("compact"));
  }

  async newSession(): Promise<AdapterCommandResult> {
    this.#promptSuggestions?.invalidate();
    return this.#execute(this.#simple("new-session"));
  }

  async resumeSession(sessionPath: string): Promise<AdapterCommandResult> {
    this.#promptSuggestions?.invalidate();
    return this.#execute({
      type: "resume-session",
      correlationId: this.#correlation("resume"),
      sessionId: this.backend.sessionId,
      sessionPath,
    });
  }

  async setModel(providerId: string, modelId: string): Promise<AdapterCommandResult> {
    this.#promptSuggestions?.invalidate();
    return this.#execute({
      type: "set-model",
      correlationId: this.#correlation("model"),
      sessionId: this.backend.sessionId,
      model: { providerId, modelId, displayName: modelId },
    });
  }

  async setThinkingLevel(thinkingLevel: OwnedUiThinkingLevel): Promise<AdapterCommandResult> {
    return this.#execute({
      type: "set-thinking-level",
      correlationId: this.#correlation("thinking"),
      sessionId: this.backend.sessionId,
      thinkingLevel,
    });
  }

  async cycleThinkingLevel(): Promise<AdapterCommandResult> {
    const levels: readonly OwnedUiThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];
    const current = Math.max(0, levels.indexOf(this.view().thinkingLevel));
    return this.setThinkingLevel(levels[(current + 1) % levels.length] ?? "off");
  }

  async cycleModel(direction: "forward" | "backward"): Promise<AdapterCommandResult> {
    const result = await this.backend.cycleModelWorkflow(direction);
    this.root.appendWorkflowResult(result);
    if (result.outcome === "completed") this.#showDaxnutsForActiveModel();
    this.runtime.requestRender();
    return workflowAdapterResult(result);
  }

  async queueFollowUp(): Promise<AdapterCommandResult> {
    const draft = this.root.editor.getText();
    return this.#submitWhenReady(draft, () => this.#queueFollowUp(draft));
  }

  async #queueFollowUp(draft: string): Promise<AdapterCommandResult> {
    const displayInput = draft.trim();
    if (!displayInput) return rejected("nothing to queue");
    const prepared = this.root.preparePromptSubmission(displayInput);
    assertPromptImages(prepared.images);
    const text = prepared.text.trim();
    this.#rememberInput(displayInput, "follow-up");
    if (this.root.editor.getText() === draft) this.root.editor.setText("");
    this.root.resumeViewportFollowing();
    return this.#execute({
      type: "follow-up",
      correlationId: this.#correlation("follow-up"),
      sessionId: this.backend.sessionId,
      text,
      ...(prepared.images.length === 0 ? {} : { images: prepared.images }),
    }, displayInput);
  }

  restoreQueuedInput(): void {
    const queued = [...this.#waitingImages.keys(), ...this.backend.clearQueuedWorkflows()];
    this.#cancelWaitingImages();
    if (queued.length === 0) return;
    this.root.editor.setText(queued.join("\n"));
    this.runtime.requestRender();
  }

  showSelector(
    title: string,
    options: readonly PiShellSelectorOption[],
    onSelect: (id: string) => void,
    onCancel?: () => void,
  ): PiTuiOverlayHandle {
    this.#dialogHandle?.hide();
    this.#dialogSource = "local";
    this.#dialogId = undefined;
    const component = createPiShellSelector({
      title,
      options,
      onSelect: id => {
        onSelect(id);
        this.#dialogHandle?.hide();
        this.#dialogHandle = undefined;
        this.#dialogSource = undefined;
      },
      onCancel: () => {
        this.#dialogHandle?.hide();
        this.#dialogHandle = undefined;
        this.#dialogSource = undefined;
        onCancel?.();
      },
    });
    const handle = this.runtime.showOverlay(component, {
      width: "70%",
      maxHeight: "80%",
      anchor: "center",
      inputCoordination: "owned",
    });
    this.#dialogHandle = handle;
    return handle;
  }

  showThinkingSelector(): void {
    const snapshot = this.backend.pinnedSettingsSnapshot();
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const select = (level: string, persist: boolean) => {
      close();
      void this.runWorkflow({ command: "thinking", argument: "", selection: level, ...(persist ? { persist: true } : {}) });
    };
    const component = createPiShellThinkingSelector(
      snapshot.thinkingLevel,
      snapshot.availableThinkingLevels,
      level => select(level, false),
      close,
      level => select(level, true),
      snapshot.defaultThinkingLevel,
    );
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  /** The Skills dialog: a replacement input like the model selector, applying the chosen skill through the prompt path. */
  showSkillsSelector(skills: readonly PiShellSkillSummary[] = this.#skillSummaries()): void {
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellSkillsSelector({
      skills,
      onSelect: name => {
        close();
        void this.#submitSkillPrompt(skillPrompt(name), skillPrompt(name)).catch(() => this.#reportSubmissionError());
      },
      onCancel: close,
    });
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showModelSelector(initialSearchInput?: string): void {
    const context = this.backend.pinnedModelSelectorContext();
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellModelSelector({
      ...context,
      runtime: {
        getColumns: () => this.runtime.viewport().columns,
        getRows: () => this.runtime.viewport().rows,
        requestRender: () => this.runtime.requestRender(),
      },
      ...(initialSearchInput === undefined ? {} : { initialSearchInput }),
      onSelect: model => {
        close();
        void this.runWorkflow({ command: "model", argument: "", selection: modelReference(model) });
      },
      onSelectAsDefault: model => {
        close();
        void this.runWorkflow({ command: "model", argument: "", selection: modelReference(model), persist: true });
      },
      onCancel: close,
    });
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showForkSelector(): void {
    const options = this.backend.pinnedForkOptions();
    if (options.length === 0) {
      this.root.appendWorkflowResult({ command: "fork", outcome: "completed", message: "No messages to fork from", messageKind: "status" });
      this.runtime.requestRender();
      return;
    }
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellUserMessageSelector(options, selection => {
      close();
      void this.runWorkflow({ command: "fork", argument: "", selection });
    }, close);
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  async showLogoutSelector(): Promise<void> {
    let options;
    try {
      options = await this.backend.pinnedLogoutOptions();
    } catch (error) {
      this.root.appendWorkflowResult({
        command: "logout",
        outcome: "failed",
        message: `Could not read stored credentials: ${error instanceof Error ? error.message : String(error)}`,
      });
      this.runtime.requestRender();
      return;
    }
    if (options.length === 0) {
      this.root.appendWorkflowStatus("No stored credentials to remove. /logout only removes credentials saved by /login; environment variables and models.json config are unchanged.");
      this.runtime.requestRender();
      return;
    }
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellAuthProviderSelector("logout", options, selection => {
      close();
      void this.runWorkflow({ command: "logout", argument: "", selection });
    }, close);
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showLoginMethodSelector(providerReference: string): void {
    const method = this.backend.pinnedLoginMethodOptions(providerReference);
    if (method.options.length === 0) {
      this.showLoginProviderSelector(undefined, providerReference);
      return;
    }
    if (method.options.length === 1) {
      const selection = method.options[0]?.id;
      if (selection) void this.runWorkflow({ command: "login", argument: "", selection });
      return;
    }
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const labels = method.options.map(option => option.label);
    const component = createPiShellExtensionSelector(method.title, labels, label => {
      const selection = method.options.find(option => option.label === label)?.id;
      if (!selection) return;
      close();
      void this.runWorkflow({ command: "login", argument: "", selection });
    }, close);
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showTreeSelector(initialSelectedId?: string): void {
    const context = this.backend.pinnedTreeSelectorContext();
    if (context.tree.length === 0) {
      this.root.appendWorkflowStatus("No entries in session");
      this.runtime.requestRender();
      return;
    }
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellTreeSelector({
      tree: context.tree,
      currentLeafId: context.currentLeafId,
      terminalHeight: this.runtime.viewport().rows,
      initialFilterMode: context.filterMode,
      ...(initialSelectedId === undefined ? {} : { initialSelectedId }),
      onLabelChange: context.appendLabelChange,
      onCopy: text => {
        if (!text) {
          this.root.appendWorkflowResult({ command: "tree", outcome: "failed", message: "Selected entry has no text to copy" });
          this.runtime.requestRender();
          return;
        }
        const generation = this.backend.sessionBindingGeneration;
        void this.backend.copyWorkflowText(text).then(acknowledged => {
          if (this.#disposed || generation !== this.backend.sessionBindingGeneration) return;
          this.root.appendWorkflowStatus(acknowledged ? "Copied selected message to clipboard" : "Submitted selected message to clipboard");
          this.runtime.requestRender();
        }).catch(error => {
          if (this.#disposed || generation !== this.backend.sessionBindingGeneration) return;
          this.root.appendWorkflowResult({ command: "tree", outcome: "failed", message: error instanceof Error ? error.message : String(error) });
          this.runtime.requestRender();
        });
      },
      onCancel: close,
      onSelect: entryId => {
        close();
        if (entryId === context.currentLeafId) {
          this.root.appendWorkflowStatus("Already at this point");
          this.runtime.requestRender();
          return;
        }
        void this.#completeTreeSelection(entryId, context.skipSummaryPrompt);
      },
    });
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showLoginAuthTypeSelector(): void {
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const labels = ["Sign in with an account", "Sign in with an API key"];
    const component = createPiShellExtensionSelector(
      "Select authentication method:",
      labels,
      label => {
        close();
        this.showLoginProviderSelector(label === labels[0] ? "oauth" : "api_key");
      },
      close,
    );
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showLoginProviderSelector(authType?: "oauth" | "api_key", initialSearchInput?: string): void {
    const options = this.backend.pinnedLoginOptions(authType);
    if (options.length === 0) {
      this.root.appendWorkflowStatus(authType === "oauth" ? "No subscription providers available." : authType === "api_key" ? "No API key providers available." : "No login providers available.");
      this.runtime.requestRender();
      return;
    }
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellAuthProviderSelector("login", options, id => {
      close();
      void this.runWorkflow({ command: "login", argument: "", selection: id });
    }, () => {
      close();
      if (authType !== undefined) this.showLoginAuthTypeSelector();
    }, initialSearchInput);
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showSessionSelector(): void {
    const context = this.backend.pinnedSessionSelectorContext();
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellSessionSelector({
      currentSessionsLoader: context.loadCurrentSessions,
      allSessionsLoader: context.loadAllSessions,
      currentSessionFilePath: context.currentSessionFilePath,
      renameSession: context.renameSession,
      requestRender: () => this.runtime.requestRender(),
      onSelect: sessionPath => {
        close();
        void this.runWorkflow({ command: "resume", argument: sessionPath });
      },
      onCancel: close,
      onExit: () => {
        close();
        void this.shutdown();
      },
    });
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showSettingsSelector(): void {
    const snapshot = this.backend.pinnedSettingsSnapshot();
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const { currentModel, ...settingsSnapshot } = snapshot;
    const component = createPiShellSettingsSelector({
      config: {
        ...settingsSnapshot,
        availableThinkingLevels: [...snapshot.availableThinkingLevels],
        availableThemes: [...snapshot.availableThemes],
        warnings: { ...snapshot.warnings },
        modelThinkingLevels: { ...snapshot.modelThinkingLevels } as PiShellSettingsSelectorOptions["config"]["modelThinkingLevels"],
        ...(currentModel === undefined ? {} : { currentModel: currentModel as NonNullable<PiShellSettingsSelectorOptions["config"]["currentModel"]> }),
        availableDefaultModels: snapshot.availableDefaultModels as PiShellSettingsSelectorOptions["config"]["availableDefaultModels"],
      },
      onChange: (callback, value) => {
        if (callback === "onCancel") {
          close();
          return;
        }
        if (callback === "onTuiModeChange") {
          // Invariant: the custom bare-A1 surface is permanently fullscreen; this callback
          // remains available only to pinned comparison profiles.
          if (this.#customViewport) return;
          if (value !== "regular" && value !== "fullscreen") return;
          if (!this.runtime.switchMode(value)) {
            this.root.appendWorkflowStatus("Close active overlays before changing TUI mode");
            this.runtime.requestRender();
            return;
          }
          if (this.#customViewport) {
            this.#pointerReporting = false;
            this.#setPointerReporting(true);
          }
        }
        void this.backend.applyPinnedSettingValue(callback, value).then(result => {
          if (result.outcome === "failed") this.root.appendWorkflowResult(result);
          else if (callback === "onTuiModeChange") this.root.appendWorkflowStatus(`TUI mode: ${value}`);
          this.runtime.requestRender();
        });
      },
      onCancel: close,
    });
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  shutdown(): Promise<AdapterCommandResult> {
    this.#shutdownPromise ??= this.#shutdown();
    return this.#shutdownPromise;
  }

  async #shutdown(): Promise<AdapterCommandResult> {
    try {
      const result = await this.backend.executeWorkflow({ command: "quit", argument: "" });
      await this.dispose();
      return workflowAdapterResult(result);
    } finally {
      this.#resolveStoppedLifecycle();
    }
  }

  async runWorkflow(request: PiWorkflowRequest): Promise<AdapterCommandResult> {
    if (request.command === "quit") return this.shutdown();
    const copyGeneration = request.command === "copy" ? this.backend.sessionBindingGeneration : undefined;
    if (request.command === "login" && request.selection !== undefined) {
      const setup = this.backend.pinnedAmbientAuthentication(request.selection);
      if (setup) {
        const close = () => {
          this.root.setInputSurface(null);
          this.runtime.requestRender();
        };
        const dialog = createPiShellLoginDialog({
          getColumns: () => this.runtime.viewport().columns,
          getRows: () => this.runtime.viewport().rows,
          requestRender: () => this.runtime.requestRender(),
        }, setup.providerId, close, setup.providerName, setup.title);
        dialog.showInfo(setup.message, [], true);
        this.root.setInputSurface(dialog);
        this.runtime.requestRender();
        return { outcome: "completed", diagnostic: null };
      }
    }
    if (request.command === "scoped-models" && request.selection === undefined && request.confirmed === undefined) {
      this.showScopedModelsSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "models" && request.selection === undefined) {
      this.showModelsDialog(request.argument.trim() || undefined);
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "model" && request.selection === undefined && request.confirmed === undefined && request.argument.trim().length === 0) {
      this.showModelSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "fork" && request.selection === undefined && request.confirmed === undefined) {
      this.showForkSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "thinking" && request.selection === undefined && request.argument.trim().length === 0) {
      this.showThinkingSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "trust" && request.selection === undefined && request.confirmed === undefined) {
      this.showTrustSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "settings" && request.selection === undefined && request.confirmed === undefined) {
      this.showSettingsSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "resume" && request.selection === undefined && request.confirmed === undefined && request.argument.trim().length === 0) {
      this.showSessionSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "login" && request.selection === undefined && request.confirmed === undefined) {
      if (request.argument.trim().length === 0) this.showLoginAuthTypeSelector();
      else this.showLoginMethodSelector(request.argument);
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "logout" && request.selection === undefined && request.confirmed === undefined) {
      await this.showLogoutSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "tree" && request.selection === undefined && request.confirmed === undefined && request.argument.trim().length === 0) {
      this.showTreeSelector();
      return { outcome: "completed", diagnostic: null };
    }
    if (request.command === "reload") {
      const blocked = this.backend.reloadBlockedResult();
      if (blocked) {
        this.root.appendWorkflowResult(blocked);
        this.runtime.requestRender();
        return workflowAdapterResult(blocked);
      }
      this.root.resetExtensionUi();
    }
    const shareSurface = request.command === "share"
      ? createPiShellOperationLoader({
          getColumns: () => this.runtime.viewport().columns,
          getRows: () => this.runtime.viewport().rows,
          requestRender: () => this.runtime.requestRender(),
        }, "Creating gist...")
      : undefined;
    const operationSurface = shareSurface ?? (request.command === "reload" ? createPiShellReloadBox() : undefined);
    const now = this.#reloadPresentation?.now ?? Date.now;
    const shownAt = now();
    if (operationSurface) {
      this.root.setInputSurface(operationSurface);
      this.runtime.requestRender();
    }
    let result: PiWorkflowResult;
    try {
      result = await this.backend.executeWorkflow(shareSurface === undefined ? request : { ...request, signal: shareSurface.signal });
    } finally {
      if (operationSurface) {
        // Rationale: a near-instant reload would flash the box for a frame or skip it entirely; holding it
        // briefly keeps the reload legible regardless of how fast the resources actually load.
        if (request.command === "reload") await this.#holdReloadSurface(now() - shownAt);
        this.root.setInputSurface(null);
        this.runtime.requestRender();
      }
    }
    if (copyGeneration !== undefined && (this.#disposed || copyGeneration !== this.backend.sessionBindingGeneration)) {
      return workflowAdapterResult({ command: "copy", outcome: "cancelled", message: "" });
    }
    if (result.outcome === "requires-selection" && request.command === "model") {
      if (result.messages !== undefined) {
        for (const message of result.messages) this.root.appendWorkflowMessage(message);
      }
      this.showModelSelector((result.detail ?? request.argument.trim()) || undefined);
      return { outcome: "completed", diagnostic: null };
    }
    if (result.outcome === "requires-confirmation" && request.command === "resume") {
      const confirmed = await this.#extensionBridge.context.confirm("Session cwd not found", result.message);
      return this.runWorkflow({ ...request, confirmed: confirmed === true });
    }
    if (result.outcome === "requires-confirmation" && request.command === "import") {
      const recoveringCwd = result.detail !== undefined;
      const confirmed = await this.#extensionBridge.context.confirm(recoveringCwd ? "Session cwd not found" : "Import session", result.message);
      return this.runWorkflow({
        ...request,
        confirmed: confirmed === true,
        ...(confirmed === true && result.detail ? { cwdOverride: result.detail } : {}),
      });
    }
    if (result.outcome === "requires-selection" || result.outcome === "requires-confirmation") {
      this.root.appendWorkflowResult({ command: request.command, outcome: "failed", message: `Owned controller missing for ${request.command}` });
      this.runtime.requestRender();
      return { outcome: "failed", diagnostic: `Owned controller missing for ${request.command}` };
    }
    if (request.command === "reload" && result.outcome === "completed") {
      this.root.resetWorkflowPresentation();
      this.root.editor.reloadKeybindings();
      this.#installAutocompleteCommands();
    }
    this.root.appendWorkflowResult(result);
    if ((request.command === "model" || request.command === "models") && result.outcome === "completed") this.#showDaxnutsForActiveModel();
    this.runtime.requestRender();
    return workflowAdapterResult(result);
  }

  async #holdReloadSurface(visibleMs: number): Promise<void> {
    const minVisibleMs = this.#reloadPresentation?.minVisibleMs ?? RELOAD_SURFACE_MIN_VISIBLE_MS;
    const remaining = minVisibleMs - visibleMs;
    if (remaining <= 0 || this.#disposed) return;
    const sleep = this.#reloadPresentation?.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
    await sleep(remaining);
  }

  showTrustSelector(): void {
    const context = this.backend.pinnedProjectTrustContext();
    const close = () => {
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const component = createPiShellTrustSelector({
      ...context,
      onSelect: selection => {
        try {
          this.backend.persistProjectTrust(selection.updates);
          close();
          this.root.appendWorkflowStatus(`Saved trust decision: ${selection.trusted ? "trusted" : "untrusted"}. Restart pi for this to take effect.`);
        } catch (error) {
          close();
          this.root.appendWorkflowResult({ command: "trust", outcome: "failed", message: error instanceof Error ? error.message : String(error) });
        }
        this.runtime.requestRender();
      },
      onCancel: close,
    });
    this.root.setInputSurface(component);
    this.runtime.requestRender();
  }

  showScopedModelsSelector(): void {
    const initial = this.backend.pinnedScopedModelsContext();
    let currentEnabledIds = initial.enabledModelIds === null ? null : [...initial.enabledModelIds];
    let selectionChanged = false;
    let disposed = false;
    let timedOut = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);
    const close = () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const selector = createPiShellScopedModelsSelector({
      models: initial.models,
      enabledModelIds: currentEnabledIds,
      refreshStatus: "Refreshing model catalogs…",
      onChange: enabledIds => {
        selectionChanged = true;
        currentEnabledIds = enabledIds === null ? null : [...enabledIds];
        this.backend.updateScopedModels(currentEnabledIds);
        this.runtime.requestRender();
      },
      onPersist: enabledIds => {
        currentEnabledIds = enabledIds === null ? null : [...enabledIds];
        this.backend.persistScopedModels(currentEnabledIds);
        this.root.appendWorkflowStatus("Model selection saved to settings");
        this.runtime.requestRender();
      },
      onCancel: close,
    });
    const component: PiShellScopedModelsSelectorPort = {
      ...selector,
      dispose: () => {
        disposed = true;
        clearTimeout(timeout);
        controller.abort();
        selector.dispose?.();
      },
    };
    this.root.setInputSurface(component);
    this.runtime.requestRender();
    void this.backend.refreshScopedModels(controller.signal).then(refreshed => {
      if (disposed) return;
      if (!selectionChanged) {
        currentEnabledIds = refreshed.enabledModelIds === null ? null : [...refreshed.enabledModelIds];
        component.updateModels(refreshed.models, currentEnabledIds);
      } else {
        component.updateModels(refreshed.models);
        this.backend.updateScopedModels(currentEnabledIds);
      }
      component.setRefreshStatus(
        timedOut ? "Model refresh timed out; showing cached models." : refreshed.status,
        timedOut ? "warning" : refreshed.statusKind,
      );
      this.runtime.requestRender();
    }).catch(error => {
      if (disposed) return;
      component.setRefreshStatus(
        timedOut
          ? "Model refresh timed out; showing cached models."
          : `Could not refresh model catalogs: ${error instanceof Error ? error.message : String(error)}`,
        "warning",
      );
      this.runtime.requestRender();
    }).finally(() => clearTimeout(timeout));
  }

  // Invariant: bare A1 routes `models`; the comparison profile keeps the pinned `model`/`scoped-models` pair. Hidden routes are shared.
  #isWorkflowRoute(value: string): value is PiWorkflowRoute {
    return (workflowCommandNames(this.#customViewport ? "bare" : "comparison") as readonly string[]).includes(value)
      || (PINNED_PI_HIDDEN_COMMAND_NAMES as readonly string[]).includes(value);
  }

  /** The bare-A1 unified Models dialog: switch on Enter, scope on Space, persist on Ctrl+S, all through the engine. */
  showModelsDialog(initialQuery?: string): void {
    const context = this.backend.modelsContext();
    const available = new Set(context.models.map(model => `${model.provider}/${model.id}`));
    const savedScopeIds = context.persistedScopeIds.filter(id => available.has(id));
    // Invariant: an explicit session scope wins; otherwise the dialog starts from what is persisted, never from "all rows scoped".
    const scopeIds = context.sessionScopeIds.length > 0 ? context.sessionScopeIds : savedScopeIds;
    let disposed = false;
    let timedOut = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);
    const close = () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
      this.root.setInputSurface(null);
      this.runtime.requestRender();
    };
    const dialog = createPiShellModelsDialog({
      models: context.models,
      activeModelId: context.activeModelId,
      scopeIds,
      savedScopeIds,
      ...(initialQuery === undefined ? {} : { initialQuery }),
      refreshStatus: "Refreshing model catalogs…",
      requestRender: () => this.runtime.requestRender(),
      onSelect: modelId => {
        void this.runWorkflow({ command: "models", argument: "", selection: modelId }).then(result => {
          if (!disposed && result.outcome === "completed") close();
        });
      },
      onScopeChange: ids => {
        this.backend.setSessionModelScope(ids);
        this.runtime.requestRender();
      },
      onSave: ids => {
        try {
          this.backend.persistModelScope(ids);
        } catch (error) {
          this.root.appendWorkflowResult({ command: "models", outcome: "failed", message: error instanceof Error ? error.message : String(error) });
          this.runtime.requestRender();
          throw error;
        }
        this.root.appendWorkflowStatus("Model selection saved to settings");
        this.runtime.requestRender();
      },
      onCancel: close,
    });
    const component: PiShellModelsDialogPort = {
      ...dialog,
      dispose: () => {
        disposed = true;
        clearTimeout(timeout);
        controller.abort();
        dialog.dispose?.();
      },
    };
    this.root.setInputSurface(component);
    this.runtime.requestRender();
    void this.backend.refreshModels(controller.signal).then(refreshed => {
      if (disposed) return;
      component.updateModels(refreshed.models);
      component.setRefreshStatus(
        timedOut ? "Model refresh timed out; showing cached models." : refreshed.status,
        timedOut ? "warning" : refreshed.statusKind,
      );
      this.runtime.requestRender();
    }).catch(error => {
      if (disposed) return;
      component.setRefreshStatus(
        timedOut
          ? "Model refresh timed out; showing cached models."
          : `Could not refresh model catalogs: ${error instanceof Error ? error.message : String(error)}`,
        "warning",
      );
      this.runtime.requestRender();
    }).finally(() => clearTimeout(timeout));
  }

  #showDaxnutsForActiveModel(): void {
    const model = this.view().activeModel;
    if (model?.providerId === "opencode" && model.modelId.toLowerCase().includes("kimi-k2.5")) {
      this.root.appendDaxnuts();
    }
  }

  // Invariant: pointer reporting is disabled on every path that ends the owning screen.
  #setPointerReporting(enabled: boolean, forceOff = false): void {
    const effective = forceOff ? false : this.#customViewport || enabled;
    if (this.#pointerReporting === effective) return;
    this.#pointerReporting = effective;
    if (!this.runtime.active) return;
    this.runtime.writeControl(effective ? MOUSE_TRACKING_ON : MOUSE_TRACKING_OFF);
  }

  dispose(): Promise<void> {
    if (this.#disposePromise !== undefined) return this.#disposePromise;
    if (this.#disposed) return Promise.resolve();
    const pending = Promise.resolve().then(() => this.#dispose());
    this.#disposePromise = pending;
    const clear = () => { if (this.#disposePromise === pending) this.#disposePromise = undefined; };
    void pending.then(clear, clear);
    return pending;
  }

  async #dispose(): Promise<void> {
    this.#disposed = true;
    // Invariant: the outro frame is what the terminal shows now, before any cleanup writes.
    const outroFrame = this.#captureQuitOutroFrame();
    this.#responseCopy?.dispose();
    this.#copyExecutor?.dispose();
    this.#cancelWaitingImages();
    const failures: unknown[] = [];
    const attempt = (action: () => void) => { try { action(); } catch (error) { failures.push(error); } };
    let pasteCleanup = Promise.resolve();
    let historyCleanup = Promise.resolve(true);
    attempt(() => { historyCleanup = this.#promptHistory?.close() ?? Promise.resolve(true); });
    attempt(() => { pasteCleanup = this.root.disposePendingPastes(); });
    attempt(() => this.root.clearViewportPointerState());
    attempt(() => this.#setPointerReporting(false, true));
    attempt(() => this.#removeViewportPreInput());
    attempt(() => this.#streamPresentation.dispose());
    attempt(() => this.#promptSuggestions?.dispose());
    attempt(() => this.#unsubscribePromptSuggestions());
    attempt(() => this.#unsubscribeSkills());
    attempt(() => this.#unsubscribeSettings());
    let fullscreenExitText = "";
    attempt(() => {
      const exitMode = this.backend.disposed ? this.#fullscreenExitOutput : this.backend.pinnedSettingsSnapshot().fullscreenExitOutput;
      const resume = this.backend.currentSessionResumeMetadata();
      const resumeHint = resume === null ? "" : `${dim("To resume this session:")} ${formatSessionResumeCommand(resume)}`;
      // Invariant: bare A1 leaves only the hint behind; the pinned comparison profile still
      // honors fullscreenExitOutput, including the styled transcript.
      fullscreenExitText = this.runtime.mode !== "fullscreen" ? ""
        : this.#customViewport || exitMode === "resume-hint" ? resumeHint
        : [this.root.exitTranscript(this.runtime.viewport().columns), resumeHint].filter(Boolean).join("\n\n");
    });
    attempt(() => this.#unbindClipboardWriter());
    attempt(() => this.#unbindPiSettings());
    attempt(() => this.#unbindTerminalSettings());
    attempt(() => this.#unbindShutdownSettings());
    attempt(() => this.#unsubscribe());
    attempt(() => this.#dialogHandle?.hide());
    attempt(() => this.#extensionBridge.dispose());
    // Invariant: from here to the leave nothing but the outro paints. A throttled frame the
    // renderer still has queued would otherwise land during the stop-time input drain and
    // flash the prompt and footer, whether or not an effect plays.
    attempt(() => this.#freezeQuitPresentation());
    await this.#playQuitOutro(outroFrame);
    // Invariant: terminal restoration precedes any potentially stalled backend teardown. The
    // fullscreen leave preserves the screen: the pinned runtime never dumps its final document
    // into the parent terminal, so only the configured exit text follows the leave.
    await this.runtime.dispose({ preserveScreen: this.runtime.mode === "fullscreen" }).catch(error => failures.push(error));
    await historyCleanup.catch(() => false); // Security: background durability outcomes never enter terminal output.
    await boundedCleanup(() => pasteCleanup).catch(error => failures.push(error));
    await boundedCleanup(() => this.backend.unbindExtensionUi()).catch(error => failures.push(error));
    if (failures.length > 0) throw new AggregateError(failures, "Owned UI disposal failed");
    if (fullscreenExitText.length > 0) this.runtime.writeAfterStop(`${fullscreenExitText}\n`);
  }

  // Invariant: the snapshot is synchronous; the outro module itself loads only at quit.
  #captureQuitOutroFrame(): QuitOutroCapture | null {
    const outro = this.#quitOutro;
    if (outro === undefined || !outro.interactive || !this.#customViewport || this.#damageTerminal === null) return null;
    if (!this.runtime.active || this.runtime.mode !== "fullscreen") return null;
    try {
      const { enabled, effect, durationMs } = outro.snapshot();
      if (!enabled) return null;
      const viewport = this.runtime.viewport();
      return { rows: this.#damageTerminal.presentedRows(), columns: viewport.columns, height: viewport.rows, settings: { effect, durationMs } };
    } catch {
      return null;
    }
  }

  #freezeQuitPresentation(): void {
    if (!this.#customViewport || !this.runtime.active || this.runtime.mode !== "fullscreen") return;
    this.runtime.freezePresentation();
  }

  // Rationale: any failure here only skips the effect; restoration always follows.
  async #playQuitOutro(capture: QuitOutroCapture | null): Promise<void> {
    const outro = this.#quitOutro;
    if (capture === null || outro === undefined || !this.runtime.active) return;
    try {
      // Rationale: the effects stay off the startup graph; quit is the only time they load.
      const { captureQuitOutroFrame, playQuitOutro } = await import("./quit-outro.js");
      const frame = captureQuitOutroFrame(capture.rows, capture.columns, capture.height);
      if (frame === null || !this.runtime.active) return;
      await playQuitOutro(frame, capture.settings.effect, capture.settings.durationMs, {
        write: data => this.runtime.writeControl(data),
        ...(outro.now === undefined ? {} : { now: outro.now }),
        ...(outro.sleep === undefined ? {} : { sleep: outro.sleep }),
        ...(outro.seed === undefined ? {} : { seed: outro.seed }),
      });
    } catch {
      // Rationale: a failed or interrupted effect must never hold the terminal; restoration follows.
    }
  }

  #settleStoppedLifecycle(): void {
    void this.dispose().then(
      () => this.#resolveStoppedLifecycle(),
      () => this.#resolveStoppedLifecycle(),
    );
  }

  #resolveStoppedLifecycle(): void {
    const resolve = this.#resolveStopped;
    this.#resolveStopped = undefined;
    resolve?.();
  }

  // Invariant: incremental block updates notify listeners with the same complete view contract.
  #syncBlock(block: OwnedUiSessionViewModel["transcript"][number]): OwnedUiSessionViewModel {
    this.root.applyTranscriptBlock(block);
    if (this.#customViewport && block.status === "live" && isCoalescedStreamBlock(block.kind)) {
      this.#streamPresentation.request();
    } else if (this.#streamPresentation.pending) {
      this.#streamPresentation.flush();
    } else {
      this.#streamPresentation.presentImmediate();
    }
    const view = this.view();
    for (const listener of this.#listeners) listener(view);
    return view;
  }

  #syncTerminalProgress(view: OwnedUiSessionViewModel): void {
    if (!this.runtime.active) return;
    this.runtime.setTerminalProgress(this.#terminalProgressEnabled && view.lifecycle === "busy");
  }

  #syncView(): OwnedUiSessionViewModel {
    this.#streamPresentation.noteImmediatePresentation();
    const view = this.view();
    if (this.backend.sessionGeneration !== this.#sessionGeneration) {
      this.#responseCopy?.reset();
      this.#cancelWaitingImages();
      this.root.resetPendingPastes();
      this.#promptSuggestions?.invalidate();
      this.#sessionGeneration = this.backend.sessionGeneration;
      // Invariant: delivery recovery invalidates callbacks, not same-session local recall or its draft.
      if (this.#sessionBindingGeneration !== this.backend.sessionBindingGeneration) {
        this.#sessionBindingGeneration = this.backend.sessionBindingGeneration;
        this.root.resetTranscript();
        this.#promptHistory?.reset(view.transcript.flatMap(block => block.kind === "user" ? [block.text] : []));
      }
      this.#activeLoginDialog = undefined;
      this.#extensionBridge.reset();
      // Invariant: a replaced session takes its transient viewport and owned-route state with it.
      this.root.resetViewport();
      this.#dialogHandle?.hide();
      this.#dialogHandle = undefined;
      this.#dialogId = undefined;
      this.#dialogSource = undefined;
      this.#setPointerReporting(false);
      this.root.setInputSurface(null);
      this.root.resetExtensionUi();
      this.root.resetWorkflowPresentation();
    }
    this.root.update(view);
    this.#syncDialog(view.dialog);
    this.runtime.requestRender();
    for (const listener of this.#listeners) listener(view);
    return view;
  }

  #openOwnedRoute(route: string): AdapterCommandResult {
    const surface = this.#routeHost?.open(route) ?? null;
    if (surface === null) return { outcome: "failed", diagnostic: `route is unavailable: ${route}` };
    if (!this.runtime.active) return { outcome: "failed", diagnostic: "runtime is not active" };

    this.#dialogHandle?.hide();
    this.#dialogSource = "route";
    // Protocol: any-event reporting: hover and drag are what the screen is driven by, and
    // it also stops the terminal treating a drag as a text selection.
    this.#setPointerReporting(true);
    // Protocol: the interrupt chord is global, so it is watched on raw input rather than
    // through the overlay: the pinned shell handles that key before an overlay
    // ever sees it, which is why an owned screen must not rely on being asked.
    let armedAt = 0;
    const removeInterruptWatch = this.runtime.addInputListener(data => {
      if (!data.includes(INTERRUPT)) return undefined;
      const now = Date.now();
      if (armedAt !== 0 && now - armedAt <= INTERRUPT_CHORD_MS) {
        armedAt = 0;
        closeSurface();
        void this.shutdown();
        return { consume: true };
      }
      armedAt = now;
      this.runtime.requestRender();
      // Invariant: the presented screen owns the chord, so the pinned shell never sees a
      // stray interrupt while it is up.
      return { consume: true };
    });
    let removeSurfacePreInput = () => {};
    const closeSurface = () => {
      removeSurfacePreInput();
      removeInterruptWatch();
      this.#setPointerReporting(false);
      this.#dialogHandle?.hide();
      this.#dialogHandle = undefined;
      this.#dialogId = undefined;
      this.#dialogSource = undefined;
    };
    // Compatibility: fullscreen Pi owns a fallback text-selection layer before focused overlay
    // components see pointer input. Route every mouse report to the owned screen
    // at the pre-input boundary so dropdowns, value hover, and numeric +/- work,
    // and consume even unhandled reports so settings content is never selected.
    removeSurfacePreInput = this.runtime.addPreInputListener(data => {
      const { events, rest } = parseMouseInput(data);
      if (events.length === 0) return undefined;
      for (const event of events) surface.handleMouse(event);
      if (surface.isClosed()) closeSurface();
      else this.runtime.requestRender();
      return rest.length === 0 ? { consume: true } : { data: rest };
    });
    const rows = () => Math.max(1, this.runtime.viewport().rows);
    const component: PiShellComponentPort = {
      render: (width: number) => [...surface.render(Math.max(1, width), rows())],
      handleInput: (data: string) => {
        const { events, rest } = parseMouseInput(data);
        for (const event of events) surface.handleMouse(event);
        if (rest.length > 0) surface.handleInput(rest);
        if (surface.isClosed()) {
          closeSurface();
          return;
        }
        this.runtime.requestRender();
      },
      invalidate: () => this.runtime.requestRender(),
    };
    surface.onRenderRequested(() => this.runtime.requestRender());
    surface.onExitRequested(() => {
      closeSurface();
      void this.shutdown();
    });
    this.#dialogHandle = this.runtime.showOverlay(component, {
      width: "100%",
      maxHeight: "100%",
      anchor: "top-left",
      inputCoordination: "owned",
    });
    this.#dialogId = surface.id;
    return { outcome: "completed", diagnostic: null };
  }

  #syncDialog(dialog: OwnedUiDialog | null): void {
    if (!this.runtime.active) return;
    if (dialog === null) {
      // Invariant: locally owned routes (notably /settings) are independent of backend
      // lifecycle/status events and remain open while an agent is working.
      if (this.#dialogSource !== "backend") return;
      this.#dialogHandle?.hide();
      this.#dialogHandle = undefined;
      this.#dialogId = undefined;
      this.#dialogSource = undefined;
      return;
    }
    if (this.#dialogSource === "backend" && this.#dialogId === dialog.id) return;
    this.#dialogHandle?.hide();
    this.#dialogSource = "backend";
    const component = createPiShellDialog(dialog, {
      onSelect: () => {
        this.#dialogHandle?.hide();
        this.#dialogHandle = undefined;
        this.#dialogId = undefined;
        this.#dialogSource = undefined;
      },
      onCancel: () => {
        this.#dialogHandle?.hide();
        this.#dialogHandle = undefined;
        this.#dialogId = undefined;
        this.#dialogSource = undefined;
      },
    });
    this.#dialogHandle = this.runtime.showOverlay(component, {
      width: "70%",
      maxHeight: "80%",
      anchor: "center",
      inputCoordination: "owned",
    });
    this.#dialogId = dialog.id;
  }

  async #slashCommand(text: string): Promise<AdapterCommandResult> {
    const body = text.slice(1).trim();
    const separator = body.search(/\s/);
    const name = separator < 0 ? body : body.slice(0, separator);
    const argument = separator < 0 ? "" : body.slice(separator + 1).trimStart();
    if (this.#routeHost?.claims(name)) return this.#openOwnedRoute(name);
    if (this.#isWorkflowRoute(name)) return this.runWorkflow({ command: name, argument });
    if (this.#skillsCollapsed()) {
      if (name === SKILLS_COMMAND_NAME) return this.#runSkillsCommand(text, argument);
      const rewritten = rewriteSkillsTunnelSubmission(text);
      if (rewritten !== text) return this.#submitSkillPrompt(rewritten, text);
    }
    // Compatibility: unknown slash input, prompt templates, skills, and extension commands remain Pi prompt input.
    this.#rememberInput(text, "slash");
    this.root.resumeViewportFollowing();
    return this.#execute({
      type: this.view().lifecycle === "busy" ? "steer" : "prompt",
      correlationId: this.#correlation("prompt-command"),
      sessionId: this.backend.sessionId,
      text,
    });
  }

  #installAutocompleteCommands(): void {
    this.root.editor.setAutocompleteCommands(this.backend.workflowAutocompleteCommands());
    this.#installedCommandSignature = this.#commandListSignature();
  }

  #commandListSignature(): string {
    return JSON.stringify([this.#skills?.presentation() ?? "expand", this.backend.disposed ? [] : this.backend.workflowAutocompleteCommands().map(command => command.name)]);
  }

  // Invariant: collapse applies only while the engine registers skill commands; otherwise there is nothing to collapse.
  #skillsCollapsed(): boolean {
    return this.#skills !== null && this.#skills.presentation() === "collapse"
      && !this.backend.disposed && this.backend.pinnedSettingsSnapshot().enableSkillCommands;
  }

  #skillSummaries(): readonly PiShellSkillSummary[] {
    return skillsFromCommands(this.backend.workflowAutocompleteCommands());
  }

  // Protocol: bare "/skills" opens the dialog, "/skills <name> [args]" applies directly, and an unknown name is a command outcome.
  async #runSkillsCommand(text: string, argument: string): Promise<AdapterCommandResult> {
    const skills = this.#skillSummaries();
    const trimmed = argument.trim();
    if (trimmed.length === 0) {
      this.showSkillsSelector(skills);
      return { outcome: "completed", diagnostic: null };
    }
    const separator = trimmed.search(/\s/u);
    const token = separator < 0 ? trimmed : trimmed.slice(0, separator);
    const skill = findSkillByArgument(skills, token);
    if (skill === undefined) {
      const message = "Unknown skill: " + token;
      this.root.appendWorkflowMessage({ kind: "error", message });
      this.runtime.requestRender();
      return { outcome: "failed", diagnostic: message };
    }
    return this.#submitSkillPrompt(skillPrompt(skill.name, separator < 0 ? "" : trimmed.slice(separator + 1)), text);
  }

  // Rationale: the engine expands "/skill:<name> args" itself; history keeps the form the user typed so recall restores the invocation.
  #submitSkillPrompt(prompt: string, typed: string): Promise<AdapterCommandResult> {
    this.#rememberInput(typed, "slash");
    this.root.resumeViewportFollowing();
    return this.#execute({
      type: this.view().lifecycle === "busy" ? "steer" : "prompt",
      correlationId: this.#correlation("prompt-command"),
      sessionId: this.backend.sessionId,
      text: prompt,
    });
  }

  async #completeTreeSelection(entryId: string, skipSummaryPrompt: boolean): Promise<void> {
    let summarize = false;
    let customInstructions: string | undefined;
    if (!skipSummaryPrompt) {
      while (true) {
        const choice = await this.#extensionBridge.context.select("Summarize branch?", [
          "No summary",
          "Summarize",
          "Summarize with custom prompt",
        ]);
        if (choice === undefined) {
          this.showTreeSelector(entryId);
          return;
        }
        summarize = choice !== "No summary";
        if (choice === "Summarize with custom prompt") {
          customInstructions = await this.#extensionBridge.context.editor("Custom summarization instructions", "");
          if (customInstructions === undefined) continue;
        }
        break;
      }
    }
    const result = await this.runWorkflow({
      command: "tree",
      argument: "",
      selection: entryId,
      treeSummary: {
        summarize,
        ...(customInstructions === undefined ? {} : { customInstructions }),
      },
    });
    if (result.diagnostic === "Branch summarization cancelled") this.showTreeSelector(entryId);
  }

  #startWorkflowLogin(request: PiWorkflowLoginStart): void {
    this.#finishWorkflowLogin();
    const dialog = createPiShellLoginDialog({
      getColumns: () => this.runtime.viewport().columns,
      getRows: () => this.runtime.viewport().rows,
      requestRender: () => this.runtime.requestRender(),
    }, request.providerId, success => {
      if (!success) this.#finishWorkflowLogin();
    }, request.providerName);
    this.#activeLoginDialog = dialog;
    this.root.setInputSurface(dialog);
    this.runtime.requestRender();
  }

  #requestWorkflowInput(request: PiWorkflowInteractionRequest): Promise<string | null> {
    const dialog = this.#activeLoginDialog;
    if (!dialog) return Promise.resolve(null);
    if (request.type === "select") {
      return new Promise(resolve => {
        const options = request.options ?? [];
        const labels = options.map(option => option.label);
        const restoreDialog = () => {
          if (this.#activeLoginDialog === dialog) this.root.setInputSurface(dialog);
          this.runtime.requestRender();
        };
        const selector = createPiShellExtensionSelector(request.message, labels, label => {
          const id = options.find(option => option.label === label)?.id;
          restoreDialog();
          resolve(id ?? null);
        }, () => {
          restoreDialog();
          resolve(null);
        });
        this.root.setInputSurface(selector, false);
        this.runtime.requestRender();
      });
    }
    const response = request.type === "manual-code"
      ? dialog.showManualInput(request.message)
      : dialog.showPrompt(request.message, request.placeholder);
    this.runtime.requestRender();
    return response.then(value => value, () => null);
  }

  #notifyWorkflowLogin(event: PiWorkflowLoginNotification): void {
    const dialog = this.#activeLoginDialog;
    if (!dialog) return;
    if (event.type === "auth_url") dialog.showAuth(event.url, event.instructions);
    else if (event.type === "device_code") {
      dialog.showDeviceCode(event);
      dialog.showWaiting("Waiting for authentication...");
    } else if (event.type === "info") dialog.showInfo(event.message, event.links);
    else if (event.type === "waiting") dialog.showWaiting(event.message);
    else dialog.showProgress(event.message);
    this.runtime.requestRender();
  }

  #finishWorkflowLogin(): void {
    if (!this.#activeLoginDialog) return;
    this.#activeLoginDialog = undefined;
    this.root.setInputSurface(null);
    this.runtime.requestRender();
  }

  async #execute(command: OwnedUiCommand, draft?: string): Promise<AdapterCommandResult> {
    if (draft === undefined) return this.backend.execute(command);
    const revision = this.#editorRevision;
    try {
      assertOwnedUiCommand(command);
    } catch (error) {
      return this.#recoverSubmission(draft, revision, error);
    }
    try {
      const result = await this.backend.execute(command);
      if (result.outcome === "rejected") return this.#recoverSubmission(draft, revision);
      return result;
    } catch {
      // Security: dispatch might already have reached the provider. Never retry automatically.
      this.root.editor.addToHistory(draft);
      this.#promptHistory?.rememberRecovery(draft);
      this.#reportSubmissionError(undefined, "Submission failed; delivery is uncertain. Check the conversation before retrying. Press Up to recover the draft.");
      return { outcome: "failed", diagnostic: "submission delivery is uncertain" };
    }
  }

  async #guardSubmission(draft: string, action: () => Promise<AdapterCommandResult>): Promise<AdapterCommandResult> {
    const revision = this.#editorRevision;
    try { return await action(); }
    catch (error) {
      if (error instanceof ImageAttachmentError && error.code === "image-canceled") return rejected("image submission canceled");
      return this.#recoverSubmission(draft, revision, error);
    }
  }

  #recoverSubmission(draft: string, revision: number, error?: unknown): AdapterCommandResult {
    this.root.editor.addToHistory(draft);
    this.#promptHistory?.rememberRecovery(draft);
    // Concurrency: never overwrite input typed (even typed and cleared) after this submission.
    if (revision === this.#editorRevision && this.root.editor.getText().length === 0) this.root.editor.setText(draft);
    const message = error instanceof ImageAttachmentError ? error.message : "Submission rejected. Check the prompt and attachments.";
    this.#reportSubmissionError(error, `${message} Press Up to recover the draft.`);
    return rejected(message);
  }

  #reportSubmissionError(error?: unknown, message?: string): void {
    // Security: arbitrary provider/extension error messages can contain the entire request.
    try {
      this.root.appendWorkflowResult({ command: "debug", outcome: "failed", message: message
        ?? (error instanceof ImageAttachmentError ? error.message : "Submission failed. Check the prompt and try again.") });
      this.runtime.requestRender();
    } catch { /* Security: error presentation cannot create another rejected submission callback. */ }
  }

  #simple(type: "abort" | "retry" | "compact" | "shutdown" | "new-session"): OwnedUiCommand {
    return { type, correlationId: this.#correlation(type), sessionId: this.backend.sessionId };
  }

  #correlation(prefix: string): string {
    this.#sequence += 1;
    return `pi-shell-${prefix}-${this.#sequence}`;
  }
}

function isCoalescedStreamBlock(kind: OwnedUiSessionViewModel["transcript"][number]["kind"]): boolean {
  return kind === "assistant" || kind === "thinking" || kind === "tool-call" || kind === "tool-result";
}

export interface SessionResumeCommandMetadata {
  readonly sessionId: string;
  readonly sessionDir: string;
  readonly usesDefaultSessionDir: boolean;
}

export function formatSessionResumeCommand(metadata: SessionResumeCommandMetadata): string {
  const args = [PRODUCT_TEXT.commandName];
  if (!metadata.usesDefaultSessionDir) args.push("--session-dir", quoteCommandArgument(metadata.sessionDir));
  args.push("--session", metadata.sessionId);
  return args.join(" ");
}

export function quoteCommandArgument(value: string): string {
  if (value.length > 0 && !/[^a-zA-Z0-9_\-./~:@]/.test(value)) return value;
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function dim(value: string): string {
  return `\u001b[2m${value}\u001b[22m`;
}

function modelReference(model: unknown): string {
  if (typeof model !== "object" || model === null) return "";
  const value = model as { provider?: unknown; id?: unknown; modelId?: unknown };
  const provider = typeof value.provider === "string" ? value.provider : "";
  const id = typeof value.id === "string" ? value.id : typeof value.modelId === "string" ? value.modelId : "";
  return provider && id ? `${provider}/${id}` : "";
}

function rejected(diagnostic: string): AdapterCommandResult {
  return { outcome: "rejected", diagnostic };
}

function modelKey(view: OwnedUiSessionViewModel): string {
  return view.activeModel === null ? "" : `${view.activeModel.providerId}/${view.activeModel.modelId}`;
}

function workflowAdapterResult(result: PiWorkflowResult): AdapterCommandResult {
  if (result.outcome === "completed") return { outcome: "completed", diagnostic: null };
  if (result.outcome === "failed") return { outcome: "failed", diagnostic: result.message };
  return { outcome: "rejected", diagnostic: result.message };
}

const INTERRUPT = "\u0003";
const INTERRUPT_CHORD_MS = 1_500;
const RELOAD_SURFACE_MIN_VISIBLE_MS = 400;

interface QuitOutroCapture {
  readonly rows: readonly string[];
  readonly columns: number;
  readonly height: number;
  readonly settings: { readonly effect: OwnedUiQuitEffect; readonly durationMs: number };
}


