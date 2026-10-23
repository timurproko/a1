import { ResponseCopyCoordinator } from "./response-copy-coordinator.js";
import { createResponseCopyExecutor, responseCopyDestination, type OwnedResponseCopyExecutor } from "./response-copy-transport.js";
import { MAX_COPY_CONTROL_BYTES, type CopyResult } from "./response-copy-protocol.js";
import { PromptHistoryController } from "./prompt-history-controller.js";
import { SessionDialogCoordinator } from "./dialog-coordinator.js";
import { LoginInteraction } from "./login-interaction.js";
import { PromptSubmission } from "./prompt-submission.js";
import { ResidentTabCoordinator } from "./resident-tab-coordinator.js";
import { SessionConcerns } from "./session-concern.js";
import { composeExitText, SessionStopLatch } from "./session-lifecycle.js";
import { openWorkflowSelector } from "./workflow-router.js";
import { bindSessionSettings } from "./settings-bindings.js";
import {
  promptSuggestionSurface,
  routeResponseToSuggestions,
  suggestionModelKey,
  suggestionPresentationBlockReason,
} from "./suggestion-surface.js";
import { CLEAR_EXIT_INTERVAL_MS, boundedCleanup } from "../../foundation/terminal-cleanup/terminal-reset.js";
import { OWNED_UI_HIDDEN_COMMAND_NAMES } from "../../contracts/owned-ui/index.js";
import { ImageAttachmentError } from "../../contracts/owned-ui/index.js";
import type {
  OwnedUiCommand,
  OwnedUiCommandResult,
  OwnedUiDialogHost,
  OwnedUiPromptSuggestionIdentity,
  OwnedUiSessionBackend,
  OwnedUiSessionPresenters,
  OwnedUiSessionViewModel,
  OwnedUiThinkingLevel,
  OwnedUiWorkflowInteractionHost,
  OwnedUiWorkflowRequest,
  OwnedUiWorkflowResult,
  OwnedUiWorkflowRoute,
  SuggestionDecision,
} from "../../contracts/owned-ui/index.js";
import type { SelectionCopySnapshot } from "../../ui/components/selection-copy.js";
import { ContextualPromptSuggestionController } from "./prompt-suggestion-controller.js";
import { workflowCommandNames } from "../../integrations/pi/engine/workflows.js";
import { createPiExtensionUiBridge, type PiExtensionUiBridge } from "../../integrations/pi/components/shell-extension-ui.js";
import type { PiShellLazySelectorLoader } from "../../integrations/pi/components/lazy-selectors.js";
import { ProgramStatusReporter } from "../../integrations/pi/components/upstream/program-status-reporter.js";
import {
  SKILLS_COMMAND_NAME,
  findSkillByArgument,
  rewriteSkillsTunnelSubmission,
  skillPrompt,
  skillsFromCommands,
  type PiShellSkillSummary,
} from "../../integrations/pi/components/skills-command.js";
import {
  createPiShellAuthProviderSelector,
  createPiShellExtensionSelector,
  createPiShellLoginDialog,
  createPiShellReloadBox,
  createPiShellSkillsSelector,
  createPiShellTrustSelector,
  createPiShellUserMessageSelector,
} from "../../integrations/pi/components/shell-selectors-dialogs.js";
import type { PiShellHotkeysPresentation } from "../../integrations/pi/components/shell-presenters-info.js";
import type {
  PiShellClipboardContent,
  PiShellSelectorOption,
} from "../../integrations/pi/components/shell-shared-facade.js";
import type { PiTuiDamageDecision } from "../../integrations/pi/tui-runtime/damage-aware-terminal.js";
import type { PiTuiRuntimeAdapter } from "../../integrations/pi/tui-runtime/adapter.js";
import type { PiTuiInputSurfaceKind } from "../../integrations/pi/tui-runtime/input-presentation-coordinator.js";
import type {
  PiTuiComponentPort,
  PiTuiInputListenerResult,
  PiTuiOverlayHandle,
  PiTuiPointerSurface,
} from "../../integrations/pi/tui-runtime/contracts.js";
import {
  OwnedUiTerminalHost,
  componentRuntime,
  sessionTerminalHostOptions,
  type OwnedUiHostedPresenter,
  type OwnedUiPresenterRelease,
  type OwnedUiPresenterTerminal,
} from "./shell-host.js";


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
  type OwnedUiSessionShellOptions,
  type OwnedUiShellPresentationOptions,
  type OwnedUiShellPromptImagesOptions,
  type OwnedUiShellSkillsOptions,
  type PinnedLayoutPart,
  type PinnedLayoutParts,
} from "./session-shell-root.js";

// Invariant: a disposed shell leaves the engine a host that holds no reference back to it.
const DETACHED_WORKFLOW_INTERACTION: OwnedUiWorkflowInteractionHost = { prompt: async () => null, notify() {} };

export {
  OwnedUiSessionShellRoot,
  type OwnedUiSessionShellOptions,
  type OwnedUiShellDiagnosticOptions,
  type OwnedUiShellEngineOptions,
  type OwnedUiShellHistoryOptions,
  type OwnedUiShellPresentationOptions,
  type OwnedUiShellPromptImagesOptions,
  type OwnedUiShellSharedServices,
  type OwnedUiShellSkillsOptions,
  type OwnedUiShellSuggestionOptions,
} from "./session-shell-root.js";
export { OwnedUiTerminalHost, sessionTerminalHostOptions, type OwnedUiTerminalHostOptions } from "./shell-host.js";
export { formatSessionResumeCommand, quoteCommandArgument, type SessionResumeCommandMetadata } from "./session-lifecycle.js";

/**
 * Presents one engine session: its transcript root, editor, controllers, submission, workflows, and dialogs.
 * It reaches the terminal only through its terminal host's handle, and paints only while it is attached.
 */
export class OwnedUiSessionPresenter implements OwnedUiHostedPresenter {
  readonly backend: OwnedUiSessionBackend;
  readonly #presenters: OwnedUiSessionPresenters;
  readonly #dialogHost: OwnedUiDialogHost;
  readonly root: OwnedUiSessionShellRoot;
  readonly #host: OwnedUiTerminalHost;
  readonly #terminal: OwnedUiPresenterTerminal;
  readonly #resident: ResidentTabCoordinator;
  readonly #submission: PromptSubmission;
  readonly #login: LoginInteraction;
  readonly #concerns: SessionConcerns;
  readonly #listeners = new Set<(view: OwnedUiSessionViewModel) => void>();
  readonly #unsubscribe: () => void;
  readonly #unsubscribePromptSuggestions: () => void;
  readonly #promptSuggestions: ContextualPromptSuggestionController | null;
  readonly #promptImages: OwnedUiShellPromptImagesOptions | null;
  readonly #skills: OwnedUiShellSkillsOptions | null;
  readonly #unsubscribePromptImages: () => void;
  readonly #unsubscribeSkills: () => void;
  #installedCommandSignature = "";
  #promptHistory: PromptHistoryController | null = null;
  #promptHistoryImageSidecar: import("../../contracts/owned-ui/index.js").PromptHistoryImageSidecarPort | undefined;
  readonly #extensionBridge: PiExtensionUiBridge;
  readonly #stop = new SessionStopLatch();
  readonly #dialogs: SessionDialogCoordinator;
  #sequence = 0;
  #started = false;
  #disposed = false;
  #released: OwnedUiPresenterRelease | undefined;
  #shutdownPromise: Promise<OwnedUiCommandResult> | undefined;
  #disposePromise: Promise<void> | undefined;
  #layoutParts: PinnedLayoutParts | undefined;
  #pendingClipboardWrite: Promise<void> = Promise.resolve();
  // Invariant: translated startup diagnostics create at most one dock notice per kind per shell.
  #startupTrustHandled = false;
  readonly #customViewport: boolean;
  #lazySelectors: PiShellLazySelectorLoader | undefined;
  #lazySelectorsPromise: Promise<PiShellLazySelectorLoader> | undefined;
  readonly #responseCopy: ResponseCopyCoordinator | null;
  // Rationale: only an executor this shell created owns a spare copy helper worth warming and disposing.
  #copyExecutor: OwnedResponseCopyExecutor | undefined;
  #copyIntentSequence = 0;
  readonly #unbindClipboardWriter: () => void;
  readonly #reloadPresentation: OwnedUiShellPresentationOptions["reload"];
  readonly #streamPresentation: StreamPresentationCoalescer;
  readonly #inputCoordination: boolean;
  readonly #unsubscribeSettings: () => void;
  readonly #unbindSessionSettings: () => void;
  #terminalProgressEnabled = false;
  readonly #programStatus: ProgramStatusReporter;
  #fullscreenExitOutput: "transcript" | "resume-hint" = "transcript";
  #lastClearTime = 0;
  #lastEscapeTime = 0;
  #sessionGeneration: number;
  #sessionBindingGeneration: number;
  #suggestionModelKey: string;

  constructor(host: OwnedUiTerminalHost, options: OwnedUiSessionShellOptions) {
    const { backend, cwd, routeHost, sessionLayout } = options.engine;
    const {
      terminal, startup, viewportSettings,
      reload: reloadPresentation, stream: streamPresentationOptions, input: inputPresentation,
    } = options.presentation ?? {};
    const { clipboard, responseCopy, paste: pasteDiagnostics, pastePreparation } = options.diagnostics ?? {};
    const promptHistory = options.history;
    const { clipboard: sharedClipboard, keybindings: sharedKeybindings } = options.shared ?? {};
    this.backend = backend;
    this.#presenters = options.presenters;
    this.#sessionGeneration = this.backend.identity.sessionGeneration;
    this.#sessionBindingGeneration = this.backend.identity.sessionBindingGeneration;
    this.#suggestionModelKey = suggestionModelKey(this.backend.session.view());
    this.#customViewport = sessionLayout === "custom-viewport";
    this.#inputCoordination = inputPresentation?.coordination !== false;
    this.#host = host;
    this.#terminal = host.connect(this);
    // Invariant: the host's optional members follow the layout, so it is built only once the layout is known.
    this.#dialogHost = this.#createDialogHost();
    this.#lazySelectors = options.diagnostics?.lazySelectors;
    let promptSuggestionController: ContextualPromptSuggestionController | null = null;
    // Invariant: owned prompt limits and collapsed skills are bare-A1 replacements; comparison profiles keep pinned behavior.
    this.#promptImages = this.#customViewport ? options.promptImages ?? null : null;
    this.#skills = this.#customViewport ? options.skills ?? null : null;
    // Invariant: construction is transactional. Each binding registers its release as it is made, and a
    // throw releases them in reverse, so a shell that never finished constructing holds nothing.
    const constructed: (() => void)[] = [() => host.disconnect(this)];
    try {
      this.#responseCopy = this.#customViewport ? new ResponseCopyCoordinator({
        execute: responseCopy?.execute ?? (this.#copyExecutor = createResponseCopyExecutor({
          ...(sharedClipboard === undefined ? {} : { pool: sharedClipboard.copy }),
          ...(terminal === undefined && clipboard === undefined ? {} : { destination: "terminal" }),
          ...(clipboard?.writeText === undefined ? {} : { writeText: (text, signal) => clipboard!.writeText!(text, signal) }),
          // Invariant: the owned host is the route contract. Resident and pseudoterminal children must not infer
          // clipboard reachability from Node's view of stdout, and inactive presenters are fenced here.
          terminal: { submit: async (control, signal) => {
            if (signal.aborted || this.#disposed || !this.#terminal.running || !this.#terminal.attached) throw new Error("Copy canceled");
            // Performance: never grow the real terminal's pending buffer with another clipboard payload.
            if (terminal === undefined && process.stdout.writableLength + control.length > MAX_COPY_CONTROL_BYTES) {
              throw new Error("Clipboard terminal is busy");
            }
            this.#terminal.writeControl(control);
          } },
        })),
        ...(responseCopy?.onEvent === undefined ? {} : { onEvent: responseCopy.onEvent }),
      }) : null;
      constructed.push(() => { this.#responseCopy?.dispose(); this.#copyExecutor?.dispose(); });
      const readClipboard =async (signal: AbortSignal): Promise<PiShellClipboardContent | null> => {
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
      this.root = new OwnedUiSessionShellRoot(this.backend.session.view(), cwd, {
        getColumns: () => this.#terminal.viewport().columns,
        getRows: () => this.#terminal.viewport().rows,
        requestRender: force => this.#terminal.requestRender(force),
        requestHyperlinkCleanup: rows => this.#terminal.requestHyperlinkCleanup(rows),
        onViewportFrame: frame => this.#terminal.armFrame(frame.descriptor, {
          overlayActive: this.#terminal.hasOverlay(),
          selectionActive: this.root.hasActiveSelection(),
          replacementSurfaceActive: !this.root.usesDefaultInputSurface(),
        }),
        enableDockInputReuse: inputPresentation?.viewportReuse !== false,
        footerSessionName: options.engine.residentTab === undefined,
        hideSettingsCommand: options.engine.residentTab !== undefined,
        persistentHistory: this.#customViewport && promptHistory !== undefined,
        ...(promptHistory === undefined ? {} : { historyEditor: promptHistory.editor }),
        onSubmit: text => { void this.submit(text).catch(() => this.#submission.reportError()); },
        onPasteRejected: error => this.#submission.reportError(error),
        onInterrupt: () => { void this.interrupt(); },
        onClear: () => { void this.clearOrExit(); },
        onExit: () => { void this.shutdown(); },
        onModelSelect: () => this.#customViewport ? this.showModelsDialog() : this.showModelSelector(),
        onModelCycle: direction => { void this.cycleModel(direction); },
        onThinkingCycle: () => { void this.cycleThinkingLevel(); },
        onThinkingToggle: () => {
          this.root.toggleThinkingVisibility();
          this.#terminal.requestRender();
        },
        onMessageCopy: () => { void this.runWorkflow({ command: "copy", argument: "" }); },
        onFollowUp: () => { void this.queueFollowUp().catch(() => this.#submission.reportError()); },
        onDequeue: () => this.restoreQueuedInput(),
        onEditorChange: text => {
          this.#submission.noteEditorChange();
          this.#resident.checkpoint(text);
          promptSuggestionController?.abortPending();
          if (text.length === 0) {
            // Concurrency: the editor synchronizes deletion-owned autocomplete after onChange.
            // Reassert retained ghost text in the microtask before Pi emits its scheduled frame.
            queueMicrotask(() => promptSuggestionController?.restoreAvailable());
          }
          this.root.reconcilePromptImageLimitNotice(text);
        },
        onPromptSuggestionAccepted: () => promptSuggestionController?.accept(),
        onPromptSuggestionEligibilityChanged: () => {
          queueMicrotask(() => promptSuggestionController?.restoreAvailable());
        },
        onInputSurfaceChanged: () => {
          promptSuggestionController?.invalidate();
          this.#promptHistory?.synchronize();
        },
        onCopyText: (text, cut) => {
          if (this.#responseCopy !== null) {
            this.#trackCopy(this.#responseCopy.submitText(text), cut ? undefined : text.length);
            return;
          }
          const write = () => {
            if (this.#disposed) return Promise.resolve();
            this.#terminal.writeControl(`\u001b]52;c;${Buffer.from(text, "utf8").toString("base64")}\u0007`);
            return clipboard === undefined ? writeSystemClipboardText(text)
              : clipboard.writeText?.(text) ?? Promise.resolve();
          };
          // Compatibility: comparison profiles retain their existing clipboard path.
          this.#pendingClipboardWrite = write().catch(() => {});
        },
        readClipboardContent: async (signal = new AbortController().signal) => {
          await this.#pendingClipboardWrite;
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
        ...(pastePreparation === undefined && sharedClipboard === undefined ? {} : {
          pastePreparation: { ...pastePreparation, ...(sharedClipboard === undefined ? {} : { pool: sharedClipboard.paste }) },
        }),
        ...(sharedKeybindings === undefined ? {} : { keybindings: sharedKeybindings }),
        ...(this.#promptImages === null ? {} : { promptImageLimit: this.#promptImages.limit }),
        skillsPresentation: () => this.#skills?.presentation() ?? "expand",
      }, {
        ...startup,
        resources: startup?.resources ?? shellResourceEntries(this.backend),
      }, this.backend.identity.agentDir, this.#presenters.transcriptRenderers(), sessionLayout, {
        resolve: assetId => this.backend.extensions.resolveTranscriptImage(assetId),
      });
      // Invariant: the presenter owns its root (theme subscription and helper clients) and disposes it once the
      // terminal no longer renders it.
      constructed.push(() => this.root.dispose());
      this.#resident = new ResidentTabCoordinator(options.engine.residentTab, { root: this.root });
      constructed.push(() => this.#resident.dispose());
      const startupRoute = options.engine.startupRoute;
      this.#dialogs = new SessionDialogCoordinator({
        terminal: this.#terminal,
        root: this.root,
        routeHost: routeHost ?? null,
        disposed: () => this.#disposed,
        exit: () => { void this.shutdown(); },
        routeClosed: route => this.#resident.closeOwnedRoute(route),
        ...(startupRoute === undefined ? {} : { startupRoute }),
      });
      constructed.push(() => this.#dialogs.dispose());
      const initialPiSettings = this.backend.settings.snapshot();
      this.#programStatus = new ProgramStatusReporter(
        status => this.#terminal.setProgramStatus(status),
        () => this.view().status.footer?.sessionName ?? undefined,
      );
      this.#login = new LoginInteraction({
        terminal: this.#terminal, root: this.root, programStatus: this.#programStatus,
        syncProgress: () => this.#syncTerminalProgress(this.view()),
      });
      this.#submission = this.#createSubmission(cwd);
      this.#resident.restoreInput(options.history?.imageSidecar);
      this.#reloadPresentation = reloadPresentation;
      const presentationInterval = streamPresentationOptions?.intervalMs ?? STREAM_PRESENTATION_INTERVAL_MS;
      this.#streamPresentation = streamPresentationOptions?.scheduler === undefined
        ? new StreamPresentationCoalescer(() => this.#terminal.requestRender(), presentationInterval)
        : new StreamPresentationCoalescer(
            () => this.#terminal.requestRender(),
            presentationInterval,
            streamPresentationOptions.scheduler,
          );
      constructed.push(() => this.#streamPresentation.dispose());
      const promptSuggestionOptions = this.#customViewport ? options.suggestions : undefined;
      promptSuggestionController = promptSuggestionOptions === undefined ? null : new ContextualPromptSuggestionController({
        generator: promptSuggestionOptions.generator,
        enabled: promptSuggestionOptions.enabled(),
        ...(promptSuggestionOptions.diagnostics === undefined ? {} : { diagnostics: promptSuggestionOptions.diagnostics }),
        surface: promptSuggestionSurface(
          this.root,
          identity => this.#promptSuggestionPresentationBlockReason(identity),
          () => this.#terminal.requestRender(),
        ),
      });
      this.#promptSuggestions = promptSuggestionController;
      constructed.push(() => this.#promptSuggestions?.dispose());
      this.#unsubscribePromptSuggestions = promptSuggestionOptions === undefined
        ? () => {}
        : promptSuggestionOptions.onChange(enabled => this.#promptSuggestions?.setEnabled(enabled));
      constructed.push(this.#unsubscribePromptSuggestions);
      this.#unsubscribePromptImages = this.#promptImages === null ? () => {} : this.#promptImages.onChange(() => {
        if (!this.#disposed && this.root.reconcilePromptImageLimitNotice()) this.#terminal.requestRender();
      });
      constructed.push(this.#unsubscribePromptImages);
      // Rationale: the same listener refreshes the menu for the A1 presentation choice and for the engine's
      // skill-command registration, both of which the owned settings manager reports through one change.
      this.#unsubscribeSkills = this.#skills === null ? () => {} : this.#skills.onChange(() => {
        // Invariant: reinstalling drops extension provider wrappers, so an unrelated setting change leaves the list alone.
        if (this.#disposed || this.#commandListSignature() === this.#installedCommandSignature) return;
        this.#installAutocompleteCommands();
        this.#terminal.requestRender();
      });
      constructed.push(this.#unsubscribeSkills);
      this.#fullscreenExitOutput = initialPiSettings.fullscreenExitOutput;
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
      constructed.push(this.#unsubscribeSettings);
      this.#unbindSessionSettings = bindSessionSettings(this.backend.settings, initialPiSettings, {
        terminal: this.#terminal,
        root: this.root,
        setTerminalProgress: enabled => {
          this.#terminalProgressEnabled = enabled;
          if (this.#terminal.running) this.#syncTerminalProgress(this.view());
        },
      }, { customViewport: this.#customViewport });
      constructed.push(this.#unbindSessionSettings);
      if (this.#customViewport && promptHistory !== undefined) {
        this.#promptHistoryImageSidecar = promptHistory.imageSidecar;
        const sidecar = this.#promptHistoryImageSidecar;
        this.#promptHistory = new PromptHistoryController({
          editor: this.root.editor,
          store: promptHistory.store,
          limit: promptHistory.limit,
          fallback: this.view().transcript.flatMap(block => block.kind === "user" ? [block.text] : []),
          active: () => this.root.usesDefaultInputSurface(),
          render: () => this.#terminal.requestRender(),
          rehydrate: value => this.root.rehydrateHistoryText(value, id => sidecar?.readAttachment(id) ?? null),
        });
        constructed.push(() => { void this.#promptHistory?.close().catch(() => false); });
      }
      this.#extensionBridge = this.#createExtensionBridge();
      constructed.push(() => this.#extensionBridge.dispose());
      this.#concerns = this.#createConcerns();
      constructed.push(() => this.backend.workflows.setWorkflowInteractionHost(DETACHED_WORKFLOW_INTERACTION));
      this.backend.workflows.setWorkflowInteractionHost({
        startLogin: request => this.#login.start(request),
        prompt: request => this.#login.requestInput(request),
        notify: event => this.#login.notify(event),
        publish: message => {
          this.root.appendWorkflowMessage(message);
          this.#terminal.requestRender();
        },
        finishLogin: () => this.#login.finish(),
      });
      this.#installAutocompleteCommands();
      this.#unsubscribe = this.backend.session.onEvent(event => {
        // Invariant: once disposal begins no event touches the view; only the stop still settles the shell.
        if (this.#disposed) {
          if (event.type === "session-lifecycle" && event.lifecycle === "stopped") this.#stop.settleAfter(() => this.dispose());
          return;
        }
        this.#resident.observeLifecycle(event);
        // Performance: a streamed chunk names one block, and touching only that block is what keeps the
        // cost of a chunk the same in a long session as in a new one. Everything else
        // resynchronizes the view, which is cheap next to re-reading the transcript.
        if (event.type === "agent-run-started") {
          this.#promptSuggestions?.invalidate();
          this.root.resumeViewportFollowing();
        }
        if (event.type === "assistant-message-completed" && !event.successful) {
          this.#programStatus.setErrorMessage(this.view().status.diagnostics.at(-1));
        }
        if (event.type === "agent-run-started" || event.type === "assistant-message-completed" || event.type === "agent-run-settled") {
          this.#programStatus.handleEvent(event);
        }
        if (event.type === "assistant-message-completed") {
          this.root.noteCompletedAssistantMessage();
          routeResponseToSuggestions(this.#promptSuggestions, event, () => this.root.promptSuggestionPrepareBlockReason());
        }
        const semanticOnly = event.type === "agent-run-started" || event.type === "assistant-message-completed";
        const view = event.type === "transcript-block" && this.#sessionGeneration === this.backend.identity.sessionGeneration
          ? this.#syncBlock(event.block)
          : semanticOnly ? this.view() : this.#syncView();
        this.#syncTerminalProgress(view);
        const currentModelKey = suggestionModelKey(view);
        if (this.backend.identity.sessionGeneration !== this.#sessionGeneration || currentModelKey !== this.#suggestionModelKey) {
          this.#promptSuggestions?.invalidate();
          this.#suggestionModelKey = currentModelKey;
        }
        if (event.type === "status" && /^(Retrying|Compacting)/.test(event.status.workingMessage ?? "")) {
          this.#promptSuggestions?.invalidate();
        }
        if (event.type === "agent-run-settled") {
          routeResponseToSuggestions(this.#promptSuggestions, event, () => this.root.promptSuggestionPrepareBlockReason());
        }
        if (event.type === "session-lifecycle" && event.lifecycle === "stopped") this.#stop.settleAfter(() => this.dispose());
      });
      constructed.push(this.#unsubscribe);
      this.#unbindClipboardWriter =this.#responseCopy === null ? () => {} : this.backend.extensions.bindClipboardWriter(async text => {
        const result = await this.#responseCopy!.submitText(text);
        if (result.outcome === "delivered") return true;
        if (result.outcome === "submitted-unverified") return false;
        throw new Error(result.outcome === "timed-out" ? "Clipboard delivery timed out" : "Clipboard delivery could not be completed");
      });
      constructed.push(this.#unbindClipboardWriter);
      if (this.backend.session.view().lifecycle === "stopped") this.#stop.resolve();
    } catch (error) {
      for (const release of constructed.reverse()) {
        try { release(); } catch { /* Rationale: the construction failure is the error worth reporting. */ }
      }
      throw error;
    }
  }

  view(): OwnedUiSessionViewModel {
    return this.backend.session.view();
  }

  get terminalHost(): OwnedUiTerminalHost {
    return this.#host;
  }

  render(width: number): readonly string[] {
    return this.root.render(width);
  }

  handleInput(data: string): void {
    this.root.handleInput(data);
  }

  invalidate(): void {
    this.root.invalidate();
  }

  setFocused(focused: boolean): void {
    this.root.setFocused(focused);
  }

  inputCoordinationSurface(): PiTuiInputSurfaceKind {
    return this.root.inputCoordinationSurface();
  }

  setOverlaySurfaces(surfaces: readonly PiTuiPointerSurface[] | null): void {
    this.root.setViewportOverlaySurfaces(surfaces);
  }

  noteImmediatePresentation(): void {
    this.#streamPresentation.noteImmediatePresentation();
  }

  layoutPart(part: PinnedLayoutPart): PiTuiComponentPort {
    this.#layoutParts ??= this.root.layoutParts();
    return this.#layoutParts[part];
  }

  activated(): void {
    this.#syncTerminalProgress(this.view());
  }

  handleViewportInput(data: string): PiTuiInputListenerResult | undefined {
    if (!this.#inputCoordination) this.#streamPresentation.noteImmediatePresentation();
    // Compatibility: route modal paging and boundary keys before Pi's fullscreen handlers.
    const isDefault = this.root.usesDefaultInputSurface();
    if (!this.#terminal.hasOverlay() && !isDefault
      && (this.root.editor.matchesTerminalKey(data, "pageUp")
        || this.root.editor.matchesTerminalKey(data, "pageDown"))) {
      this.root.handleInput(data);
      this.#terminal.requestRender();
      return { consume: true };
    }
    if (!this.#terminal.hasOverlay() && (this.root.editor.matchesTerminalKey(data, "home")
      || this.root.editor.matchesTerminalKey(data, "end")
      || !isDefault && (this.root.editor.matchesTerminalKey(data, "ctrl+home")
        || this.root.editor.matchesTerminalKey(data, "ctrl+end")))) {
      if (isDefault) this.root.handleViewportPreInput(data, true);
      this.root.handleInput(data);
      this.#terminal.requestRender();
      return { consume: true };
    }
    // Invariant: geometry must belong to the painted frame, including newly opened/nested
    // surfaces. Steady pointer input does not trigger a synchronous composition.
    const viewport = this.#terminal.viewport();
    if (data.includes("\u001b[<") && !this.root.viewportInputGeometryReady(viewport.columns, viewport.rows)) {
      this.#terminal.renderNow();
    }
    const routed = this.root.handleViewportPreInput(data, true, Date.now(),
      this.root.usesDefaultInputSurface() && !this.#terminal.hasFocusedOverlay());
    if (routed.copySelection !== undefined) {
      const snapshot = routed.copySelection;
      this.#trackCopy(this.#responseCopy?.submit(snapshot, this.#pendingClipboardWrite), copyCharacters(snapshot));
    }
    if (!routed.consumed) return routed.data === data ? undefined : { data: routed.data };
    return routed.data.length === 0 ? { consume: true } : { data: routed.data };
  }

  #trackCopy(delivery: Promise<CopyResult> | undefined, count?: number): void {
    const intent = ++this.#copyIntentSequence;
    void delivery?.then(({ outcome }) => {
      if (count === undefined || this.#disposed || !this.#terminal.running || intent !== this.#copyIntentSequence
        || outcome !== "delivered" && outcome !== "submitted-unverified") return;
      this.root.showCopyAcknowledgement(`copied ${count} chars to clipboard`);
    });
  }

  #promptSuggestionPresentationBlockReason(identity: OwnedUiPromptSuggestionIdentity): SuggestionDecision {
    return suggestionPresentationBlockReason(
      identity,
      { disposed: this.#disposed, view: this.view(), sessionGeneration: this.backend.identity.sessionGeneration },
      () => this.root.promptSuggestionPresentationBlockReason(),
    );
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.#terminal.start();
    this.#promptHistory?.start();
    this.#syncTerminalProgress(this.view());
    void this.backend.extensions.bindExtensionUi(this.#extensionBridge.context, () => { void this.shutdown(); });
    this.#syncView();
    // Performance: the spare clipboard helpers fork after the first frame is out, so startup never waits on them.
    setImmediate(() => {
      if (this.#disposed || !this.#customViewport) return;
      this.#dialogs.presentStartupRoute();
      void this.#loadLazySelectors().then(selectors => selectors.prepare()).catch(() => {});
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
    return this.#stop.stopped;
  }

  async submit(text: string): Promise<OwnedUiCommandResult> {
    return this.#submission.submit(text);
  }

  async clearOrExit(now = Date.now()): Promise<OwnedUiCommandResult> {
    this.#promptSuggestions?.abortPending();
    if (now - this.#lastClearTime < CLEAR_EXIT_INTERVAL_MS) return this.shutdown();
    this.root.editor.setText("");
    this.#lastClearTime = now;
    this.#terminal.requestRender();
    return { outcome: "completed", diagnostic: null };
  }

  async interrupt(now = Date.now()): Promise<OwnedUiCommandResult> {
    this.#promptSuggestions?.invalidate();
    if (this.#submission.waiting) {
      this.#submission.cancelWaiting();
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
    const action = this.backend.settings.snapshot().doubleEscapeAction;
    if (action === "none") return { outcome: "rejected", diagnostic: "nothing to interrupt" };
    if (now - this.#lastEscapeTime < 500) {
      this.#lastEscapeTime = 0;
      if (action === "tree") await this.showTreeSelector();
      else this.showForkSelector();
      return { outcome: "completed", diagnostic: null };
    }
    this.#lastEscapeTime = now;
    return { outcome: "completed", diagnostic: null };
  }

  async abort(): Promise<OwnedUiCommandResult> {
    return this.#submission.execute(this.#simple("abort"));
  }

  async retry(): Promise<OwnedUiCommandResult> {
    this.#promptSuggestions?.invalidate();
    return this.#submission.execute(this.#simple("retry"));
  }

  async compact(): Promise<OwnedUiCommandResult> {
    this.#promptSuggestions?.invalidate();
    return this.#submission.execute(this.#simple("compact"));
  }

  async newSession(): Promise<OwnedUiCommandResult> {
    this.#promptSuggestions?.invalidate();
    return this.#submission.execute(this.#simple("new-session"));
  }

  async resumeSession(sessionPath: string): Promise<OwnedUiCommandResult> {
    this.#promptSuggestions?.invalidate();
    return this.#submission.execute({
      type: "resume-session",
      correlationId: this.#correlation("resume"),
      sessionId: this.backend.identity.sessionId,
      sessionPath,
    });
  }

  async setModel(providerId: string, modelId: string): Promise<OwnedUiCommandResult> {
    this.#promptSuggestions?.invalidate();
    return this.#submission.execute({
      type: "set-model",
      correlationId: this.#correlation("model"),
      sessionId: this.backend.identity.sessionId,
      model: { providerId, modelId, displayName: modelId },
    });
  }

  async setThinkingLevel(thinkingLevel: OwnedUiThinkingLevel): Promise<OwnedUiCommandResult> {
    return this.#submission.execute({
      type: "set-thinking-level",
      correlationId: this.#correlation("thinking"),
      sessionId: this.backend.identity.sessionId,
      thinkingLevel,
    });
  }

  async cycleThinkingLevel(): Promise<OwnedUiCommandResult> {
    const levels: readonly OwnedUiThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];
    const current = Math.max(0, levels.indexOf(this.view().thinkingLevel));
    return this.setThinkingLevel(levels[(current + 1) % levels.length] ?? "off");
  }

  async cycleModel(direction: "forward" | "backward"): Promise<OwnedUiCommandResult> {
    const result = await this.backend.workflows.cycleModelWorkflow(direction);
    this.root.appendWorkflowResult(result);
    this.#terminal.requestRender();
    return workflowAdapterResult(result);
  }

  async queueFollowUp(): Promise<OwnedUiCommandResult> {
    return this.#submission.queueFollowUp(this.root.editor.getText());
  }

  restoreQueuedInput(): void {
    this.#submission.restoreQueued();
  }

  showSelector(
    title: string,
    options: readonly PiShellSelectorOption[],
    onSelect: (id: string) => void,
    onCancel?: () => void,
  ): PiTuiOverlayHandle {
    return this.#dialogs.showSelector(title, options, onSelect, onCancel);
  }

  // Rationale: presenters see the shell only as a dialog host; selectors open in the input dock and run choices as workflows.
  #createDialogHost(): OwnedUiDialogHost {
    const isDisposed = () => this.#disposed;
    return {
      get disposed() { return isDisposed(); },
      setInputSurface: surface => this.root.setInputSurface(surface),
      requestRender: () => this.#terminal.requestRender(),
      viewport: () => this.#terminal.viewport(),
      appendWorkflowStatus: text => this.root.appendWorkflowStatus(text),
      appendWorkflowResult: result => this.root.appendWorkflowResult(result),
      runWorkflow: request => this.runWorkflow(request),
      // Invariant: the custom bare-A1 surface holds frames while optional selectors load and is permanently
      // fullscreen; the pinned comparison profiles render immediately and keep Pi's TUI mode switch.
      ...(this.#customViewport
        ? { beginPresentationHold: () => this.#terminal.beginPresentationHold() }
        : { switchTuiMode: mode => this.#terminal.switchMode(mode) }),
    };
  }

  #loadLazySelectors(): Promise<PiShellLazySelectorLoader> {
    if (this.#lazySelectors !== undefined) return Promise.resolve(this.#lazySelectors);
    return this.#lazySelectorsPromise ??= import("../../integrations/pi/components/lazy-selectors.js").then(module => {
      this.#lazySelectors = module.piShellLazySelectors;
      return module.piShellLazySelectors;
    });
  }

  async showThinkingSelector(): Promise<void> {
    const snapshot = this.backend.settings.snapshot();
    const close = () => {
      this.root.setFooterLevel(true);
      this.root.setInputSurface(null);
      this.#terminal.requestRender();
    };
    const select = (level: string) => {
      close();
      void this.runWorkflow({ command: "thinking", argument: "", selection: level });
    };
    const releasePresentation = this.#customViewport ? this.#terminal.beginPresentationHold() : undefined;
    try {
      const selectors = await this.#loadLazySelectors();
      const component = await selectors.createThinking({
        currentLevel: snapshot.thinkingLevel,
        availableLevels: snapshot.availableThinkingLevels,
        onSelect: select,
        onCancel: close,
        onSelectAsDefault: level => this.backend.settings.setDefaultThinkingLevel(level),
        defaultLevel: snapshot.defaultThinkingLevel,
        ...(this.#customViewport ? {
          presentation: {
            profile: "bare" as const,
            cycleBinding: this.root.editor.keybindingConfig()["app.thinking.cycle"] ?? [],
          },
        } : {}),
      });
      if (this.#disposed) return;
      this.root.setFooterLevel(false);
      this.root.setInputSurface(component);
      this.#terminal.requestRender();
    } finally {
      releasePresentation?.();
    }
  }

  /** The Skills dialog: a replacement input like the model selector, applying the chosen skill through the prompt path. */
  showSkillsSelector(skills: readonly PiShellSkillSummary[] = this.#skillSummaries()): void {
    const close = this.#dialogs.closeInputSurface;
    const component = createPiShellSkillsSelector({
      skills,
      onSelect: name => {
        close();
        void this.#submission.sendSlashPrompt(skillPrompt(name), skillPrompt(name)).catch(() => this.#submission.reportError());
      },
      onCancel: close,
    });
    this.root.setInputSurface(component);
    this.#terminal.requestRender();
  }

  showModelSelector(initialSearchInput?: string): void {
    this.#presenters.openModelSelector(this.#dialogHost, initialSearchInput);
  }

  showForkSelector(): void {
    const options = this.backend.catalog.pinnedForkOptions();
    if (options.length === 0) {
      this.root.appendWorkflowResult({ command: "fork", outcome: "completed", message: "No messages to fork from", messageKind: "status" });
      this.#terminal.requestRender();
      return;
    }
    const close = this.#dialogs.closeInputSurface;
    const component = createPiShellUserMessageSelector(options, selection => {
      close();
      void this.runWorkflow({ command: "fork", argument: "", selection });
    }, close);
    this.root.setInputSurface(component);
    this.#terminal.requestRender();
  }

  async showLogoutSelector(): Promise<void> {
    let options;
    try {
      options = await this.backend.catalog.pinnedLogoutOptions();
    } catch (error) {
      this.root.appendWorkflowResult({
        command: "logout",
        outcome: "failed",
        message: `Could not read stored credentials: ${error instanceof Error ? error.message : String(error)}`,
      });
      this.#terminal.requestRender();
      return;
    }
    if (options.length === 0) {
      this.root.appendWorkflowStatus("No stored credentials to remove. /logout only removes credentials saved by /login; environment variables and models.json config are unchanged.");
      this.#terminal.requestRender();
      return;
    }
    const close = this.#dialogs.closeInputSurface;
    const component = createPiShellAuthProviderSelector("logout", options, selection => {
      close();
      void this.runWorkflow({ command: "logout", argument: "", selection });
    }, close);
    this.root.setInputSurface(component);
    this.#terminal.requestRender();
  }

  showLoginMethodSelector(providerReference: string): void {
    const method = this.backend.catalog.pinnedLoginMethodOptions(providerReference);
    if (method.options.length === 0) {
      this.showLoginProviderSelector(undefined, providerReference);
      return;
    }
    if (method.options.length === 1) {
      const selection = method.options[0]?.id;
      if (selection) void this.runWorkflow({ command: "login", argument: "", selection });
      return;
    }
    const close = this.#dialogs.closeInputSurface;
    const labels = method.options.map(option => option.label);
    const component = createPiShellExtensionSelector(method.title, labels, label => {
      const selection = method.options.find(option => option.label === label)?.id;
      if (!selection) return;
      close();
      void this.runWorkflow({ command: "login", argument: "", selection });
    }, close);
    this.root.setInputSurface(component);
    this.#terminal.requestRender();
  }

  showTreeSelector(initialSelectedId?: string): Promise<void> {
    return this.#presenters.openTreeSelector(this.#dialogHost, (entryId, skipSummaryPrompt) => {
      void this.#completeTreeSelection(entryId, skipSummaryPrompt);
    }, initialSelectedId);
  }

  showLoginAuthTypeSelector(): void {
    const close = this.#dialogs.closeInputSurface;
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
    this.#terminal.requestRender();
  }

  showLoginProviderSelector(authType?: "oauth" | "api_key", initialSearchInput?: string): void {
    const options = this.backend.catalog.pinnedLoginOptions(authType);
    if (options.length === 0) {
      this.root.appendWorkflowStatus(authType === "oauth" ? "No account providers available." : authType === "api_key" ? "No API key providers available." : "No login providers available.");
      this.#terminal.requestRender();
      return;
    }
    const close = this.#dialogs.closeInputSurface;
    const component = createPiShellAuthProviderSelector("login", options, id => {
      close();
      void this.runWorkflow({ command: "login", argument: "", selection: id });
    }, () => {
      close();
      if (authType !== undefined) this.showLoginAuthTypeSelector();
    }, initialSearchInput);
    this.root.setInputSurface(component);
    this.#terminal.requestRender();
  }

  showSessionSelector(): Promise<void> {
    return this.#presenters.openSessionSelector(this.#dialogHost, () => { void this.shutdown(); });
  }

  showSettingsSelector(): void {
    this.#presenters.openSettingsSelector(this.#dialogHost);
  }

  shutdown(): Promise<OwnedUiCommandResult> {
    this.#shutdownPromise ??= this.#shutdown().finally(() => {
      // Invariant: a rejected resident detach is retryable; ordinary shutdown has disposed the shell already.
      if (!this.#disposed) this.#shutdownPromise = undefined;
    });
    return this.#shutdownPromise;
  }

  async #shutdown(): Promise<OwnedUiCommandResult> {
    const detached = await this.#resident.detach();
    if (detached === true) return { outcome: "completed", diagnostic: null };
    if (detached !== undefined) {
      this.root.appendWorkflowStatus(detached);
      this.#terminal.requestRender();
      return rejected("resident tab detach is unavailable");
    }
    try {
      const quit = this.backend.workflows.executeWorkflow({ command: "quit", argument: "" });
      // Invariant: a slow or hung engine quit never holds the terminal past the cleanup deadline. The
      // shell restores it then, and the result still waits for the engine to finish quitting.
      const timedOut = await boundedCleanup(() => quit.catch(() => {})).then(() => false, () => true);
      if (timedOut) await this.dispose();
      const result = await quit;
      await this.dispose();
      return workflowAdapterResult(result);
    } finally {
      this.#stop.resolve();
    }
  }

  #currentSessionFile(): string | null {
    const direct = this.backend.identity.currentSessionFile?.();
    if (direct !== undefined && direct !== null) return direct;
    const resume = this.backend.identity.currentSessionResumeMetadata();
    return resume === null ? null : `${resume.sessionDir}/${resume.sessionId}`;
  }

  async runWorkflow(request: OwnedUiWorkflowRequest): Promise<OwnedUiCommandResult> {
    if (request.command === "quit") return this.shutdown();
    if (this.#customViewport && request.command === "name" && request.argument.trim().length === 0) {
      void this.#extensionBridge.input("Session Name", "Enter name").then(value => {
        if (this.#disposed || value === undefined || value.trim().length === 0) return;
        return this.runWorkflow({ ...request, argument: value });
      }).catch(error => {
        if (this.#disposed) return;
        this.root.appendWorkflowResult({ command: "name", outcome: "failed", message: error instanceof Error ? error.message : String(error) });
        this.#terminal.requestRender();
      });
      return { outcome: "completed", diagnostic: null };
    }
    const copyGeneration = request.command === "copy" ? this.backend.identity.sessionBindingGeneration : undefined;
    if (request.command === "login" && request.selection !== undefined) {
      const setup = this.backend.catalog.pinnedAmbientAuthentication(request.selection);
      if (setup) {
        const close = this.#dialogs.closeInputSurface;
        const dialog = createPiShellLoginDialog(componentRuntime(this.#terminal), setup.providerId, close, setup.providerName, setup.title);
        dialog.showInfo(setup.message, [], true);
        this.root.setInputSurface(dialog);
        this.#terminal.requestRender();
        return { outcome: "completed", diagnostic: null };
      }
    }
    const selected = openWorkflowSelector(request, this, { residentTab: this.#resident.active });
    if (selected !== undefined) return selected;
    if (request.command === "reload") {
      const blocked = this.backend.workflows.reloadBlockedResult();
      if (blocked) {
        this.root.appendWorkflowResult(blocked);
        this.#terminal.requestRender();
        return workflowAdapterResult(blocked);
      }
      this.root.resetExtensionUi();
    }
    const shareDialog = request.command === "share"
      ? await import("./share-operation.js")
      : undefined;
    const shareSurface = shareDialog === undefined ? undefined
      : (this.#customViewport ? shareDialog.createPiShellShareOperationDialog : shareDialog.createPiShellOperationLoader)(componentRuntime(this.#terminal), "Creating gist…");
    const operationSurface = shareSurface ?? (request.command === "reload" ? createPiShellReloadBox() : undefined);
    const now = this.#reloadPresentation?.now ?? Date.now;
    const shownAt = now();
    if (operationSurface) {
      this.root.setInputSurface(operationSurface);
      this.#terminal.requestRender();
    }
    let result: OwnedUiWorkflowResult;
    try {
      result = await this.backend.workflows.executeWorkflow(shareSurface === undefined ? request : {
        ...request,
        signal: shareSurface.signal,
        onProgress: message => { shareSurface.setMessage?.(message); this.#terminal.requestRender(); },
      });
    } finally {
      if (operationSurface) {
        // Rationale: a near-instant reload would flash the box for a frame or skip it entirely; holding it
        // briefly keeps the reload legible regardless of how fast the resources actually load.
        if (request.command === "reload") await this.#holdReloadSurface(now() - shownAt);
        this.root.setInputSurface(null);
        this.#terminal.requestRender();
      }
    }
    if (copyGeneration !== undefined && (this.#disposed || copyGeneration !== this.backend.identity.sessionBindingGeneration)) {
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
      this.#terminal.requestRender();
      return { outcome: "failed", diagnostic: `Owned controller missing for ${request.command}` };
    }
    if (request.command === "reload" && result.outcome === "completed") {
      this.root.resetWorkflowPresentation();
      this.root.editor.reloadKeybindings();
      this.#installAutocompleteCommands();
    }
    if (request.command === "tree" && result.outcome === "completed") {
      if (result.detail && !this.root.editor.getText().trim()) this.root.editor.setText(result.detail);
      this.root.resumeViewportFollowing();
    }
    if (shareDialog !== undefined && this.#customViewport && result.outcome === "completed" && result.detail !== undefined) {
      this.root.appendWorkflowStatus(shareDialog.renderPiShellShareResult(result.message, result.detail));
    } else {
      this.root.appendWorkflowResult(result);
    }
    this.#terminal.requestRender();
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
    const context = this.backend.catalog.pinnedProjectTrustContext();
    const close = this.#dialogs.closeInputSurface;
    const component = createPiShellTrustSelector({
      ...context,
      onSelect: selection => {
        try {
          this.backend.catalog.persistProjectTrust(selection.updates);
          close();
          this.root.appendWorkflowStatus(`Saved trust decision: ${selection.trusted ? "trusted" : "untrusted"}. Restart pi for this to take effect.`);
        } catch (error) {
          close();
          this.root.appendWorkflowResult({ command: "trust", outcome: "failed", message: error instanceof Error ? error.message : String(error) });
        }
        this.#terminal.requestRender();
      },
      onCancel: close,
    });
    this.root.setInputSurface(component);
    this.#terminal.requestRender();
  }

  showScopedModelsSelector(): void {
    this.#presenters.openScopedModelsSelector(this.#dialogHost);
  }

  // Invariant: bare A1 routes `models`; the comparison profile keeps the pinned `model`/`scoped-models` pair. Hidden routes are shared.
  #isWorkflowRoute(value: string): value is OwnedUiWorkflowRoute {
    return (workflowCommandNames(this.#customViewport ? "bare" : "comparison") as readonly string[]).includes(value)
      || (OWNED_UI_HIDDEN_COMMAND_NAMES as readonly string[]).includes(value);
  }

  /** The bare-A1 unified Models dialog: switch on Enter, scope on Space, persist on Ctrl+S, all through the engine. */
  showModelsDialog(initialQuery?: string): void {
    this.#presenters.openModelsDialog(this.#dialogHost, initialQuery);
  }

  // Invariant: one teardown per presenter, starting on a microtask so never inside the event listener that
  // requested it. Callers during the teardown share its outcome; a later call finds it done. Closing the
  // terminal host's last presenter ends the terminal.
  dispose(): Promise<void> {
    if (this.#disposePromise !== undefined) return this.#disposePromise;
    if (this.#disposed) return Promise.resolve();
    this.#disposed = true;
    const pending = Promise.resolve().then(() => this.#host.close(this));
    this.#disposePromise = pending;
    const clear = () => { if (this.#disposePromise === pending) this.#disposePromise = undefined; };
    void pending.then(clear, clear);
    return pending;
  }

  release(terminal: { readonly mode: "regular" | "fullscreen"; readonly columns: number }): OwnedUiPresenterRelease {
    if (this.#released !== undefined) return { exitText: "", failures: [], settle: async () => [] };
    this.#disposed = true;
    const failures: unknown[] = [];
    const attempt = (action: () => void) => { try { action(); } catch (error) { failures.push(error); } };
    // Invariant: events stop first, so nothing re-enters the view during history close, outro, or restoration.
    attempt(() => this.#unsubscribe());
    this.#copyIntentSequence += 1;
    this.#responseCopy?.dispose();
    this.#copyExecutor?.dispose();
    this.#submission.cancelWaiting();
    let pasteCleanup = Promise.resolve();
    let historyCleanup = Promise.resolve(true);
    attempt(() => { historyCleanup = this.#promptHistory?.close() ?? Promise.resolve(true); });
    attempt(() => { pasteCleanup = this.root.disposePendingPastes(); });
    attempt(() => this.root.clearViewportPointerState());
    attempt(() => this.#streamPresentation.dispose());
    attempt(() => this.#promptSuggestions?.dispose());
    attempt(() => this.#unsubscribePromptSuggestions());
    attempt(() => this.#unsubscribePromptImages());
    attempt(() => this.#unsubscribeSkills());
    attempt(() => this.#unsubscribeSettings());
    let exitText = "";
    attempt(() => {
      exitText = composeExitText({
        terminalMode: terminal.mode,
        customViewport: this.#customViewport,
        exitMode: this.backend.identity.disposed ? this.#fullscreenExitOutput : this.backend.settings.snapshot().fullscreenExitOutput,
        resume: this.backend.identity.currentSessionResumeMetadata(),
        transcript: () => this.root.exitTranscript(terminal.columns),
      });
    });
    attempt(() => this.#unbindClipboardWriter());
    attempt(() => this.#unbindSessionSettings());
    attempt(() => this.backend.workflows.setWorkflowInteractionHost(DETACHED_WORKFLOW_INTERACTION));
    this.#concerns.dispose(attempt);
    attempt(() => this.#extensionBridge.dispose());
    attempt(() => this.#programStatus.clear());
    // Invariant: the host settles a presenter only once the terminal is restored, so these never stall it.
    const settle = async (): Promise<readonly unknown[]> => {
      const settled: unknown[] = [];
      try { this.root.dispose(); } catch (error) { settled.push(error); }
      await historyCleanup.catch(() => false); // Security: background durability outcomes never enter terminal output.
      await boundedCleanup(() => pasteCleanup).catch(error => settled.push(error));
      await boundedCleanup(() => this.#resident.gracefulStop(this.#currentSessionFile()))
        .catch(error => settled.push(error));
      await boundedCleanup(() => this.backend.extensions.unbindExtensionUi()).catch(error => settled.push(error));
      return settled;
    };
    this.#released = { exitText, failures, settle };
    return this.#released;
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

  // Rationale: extensions reach the shell only through this bridge; every surface they draw lands in the root.
  #createExtensionBridge(): PiExtensionUiBridge {
    return createPiExtensionUiBridge({
      runtime: componentRuntime(this.#terminal),
      agentDir: this.backend.identity.agentDir,
      setInputSurface: component => this.root.setInputSurface(component, true, "opaque"),
      setProgramStatusBlocked: status => this.#programStatus.setBlocked("extension-dialog", status),
      showOverlay: (component, overlayOptions) => this.#terminal.showOverlay(component, overlayOptions),
      listenInput: handler => this.#terminal.addInputListener(handler),
      replaceWidget: (key, component, placement) => this.root.setExtensionWidget(key, component, placement),
      replaceHeader: component => this.root.setExtensionHeader(component),
      replaceFooter: component => this.root.setExtensionFooter(component),
      setStatus: (key, text) => this.root.setExtensionStatus(key, text),
      setWorking: (message, visible) => this.root.setExtensionWorking(message, visible),
      notify: (message, type) => this.root.addExtensionNotification(message, type),
      setTitle: title => this.#terminal.setTitle(title),
      getEditorText: () => this.root.editor.getText(),
      setEditorText: text => this.root.editor.setText(text),
      pasteToEditor: text => this.root.editor.insertText(text),
      addAutocompleteProvider: factory => this.root.editor.addAutocompleteProvider(factory),
      setCustomEditor: component => this.root.setInputSurface(component, true, "opaque"),
      getFooterData: () => this.root.extensionFooterData(),
      getToolsExpanded: () => this.root.toolsExpanded,
      setToolsExpanded: expanded => this.root.setToolsExpanded(expanded),
    });
  }

  #createSubmission(cwd: string): PromptSubmission {
    return new PromptSubmission({
      backend: this.backend,
      root: this.root,
      terminal: this.#terminal,
      residentTab: this.#resident,
      cwd,
      promptHistory: () => this.#promptHistory,
      imageSidecar: () => this.#promptHistoryImageSidecar,
      disposed: () => this.#disposed,
      correlation: prefix => this.#correlation(prefix),
      lifecycle: () => this.view().lifecycle,
      currentSessionFile: () => this.#currentSessionFile(),
      slashCommand: text => this.#slashCommand(text),
      invalidateSuggestions: () => this.#promptSuggestions?.invalidate(),
    });
  }

  // Invariant: the order is the reset order on session replacement; copy intent before pastes before the input surface.
  #createConcerns(): SessionConcerns {
    return new SessionConcerns([
      { onSessionReplaced: () => { this.#copyIntentSequence += 1; this.#responseCopy?.reset(); } },
      this.#submission,
      { onSessionReplaced: () => this.root.resetPendingPastes() },
      { onSessionReplaced: () => this.#promptSuggestions?.invalidate() },
      { onSessionReplaced: () => { this.#sessionGeneration = this.backend.identity.sessionGeneration; this.#programStatus.reset(); } },
      { onSessionReplaced: () => this.#rebindTranscript() },
      this.#login,
      { onSessionReplaced: () => this.#extensionBridge.reset() },
      // Invariant: a replaced session takes its transient viewport and owned-route state with it.
      { onSessionReplaced: () => this.root.resetViewport() },
      this.#dialogs,
      { onSessionReplaced: () => this.root.setInputSurface(null) },
      { onSessionReplaced: () => this.root.resetExtensionUi() },
      { onSessionReplaced: () => this.root.resetWorkflowPresentation() },
      this.#resident,
    ]);
  }

  // Invariant: delivery recovery invalidates callbacks, not same-session local recall or its draft.
  #rebindTranscript(): void {
    if (this.#sessionBindingGeneration === this.backend.identity.sessionBindingGeneration) return;
    this.#sessionBindingGeneration = this.backend.identity.sessionBindingGeneration;
    this.root.resetTranscript();
    this.#promptHistory?.reset(this.view().transcript.flatMap(block => block.kind === "user" ? [block.text] : []));
  }

  #syncTerminalProgress(view: OwnedUiSessionViewModel): void {
    if (!this.#terminal.running) return;
    this.#terminal.setTerminalProgress(this.#terminalProgressEnabled && view.lifecycle === "busy");
    if (view.lifecycle === "stopped" || view.lifecycle === "stopping") {
      this.#programStatus.clear();
      return;
    }
    this.#programStatus.setBlocked("dialog", view.dialog === null ? undefined : {
      kind: "question",
      message: view.dialog.title,
    });
    if (view.lifecycle === "failed") this.#programStatus.setErrorMessage(view.status.diagnostics.at(-1));
    this.#programStatus.report();
  }

  #syncView(): OwnedUiSessionViewModel {
    this.#streamPresentation.noteImmediatePresentation();
    const view = this.view();
    if (this.backend.identity.sessionGeneration !== this.#sessionGeneration) this.#concerns.replaceSession();
    this.root.update(view);
    this.#dialogs.syncBackend(view.dialog);
    this.#presentStartupTrustWarning(view);
    this.#terminal.requestRender();
    for (const listener of this.#listeners) listener(view);
    return view;
  }

  // Rationale: a cancelled or failed trust choice explains the restricted session where the
  // user will next type, rather than leaving a lone warning at the top of an empty viewport.
  #presentStartupTrustWarning(view: OwnedUiSessionViewModel): void {
    if (this.#startupTrustHandled || !this.#customViewport) return;
    const diagnostic = view.diagnostics.find(candidate => candidate.code === "project-trust");
    if (diagnostic === undefined || !this.#terminal.running) return;
    this.#startupTrustHandled = true;
    this.root.appendWorkflowMessage({ kind: "warning", message: diagnostic.message });
  }

  openOwnedRoute(route: string): void {
    if (this.#disposed) return;
    // Invariant: a route requested before the runtime runs (the resident Settings bridge route arrives
    // before start()) is retained, latest wins, and presented through the startup-route path once started.
    if (!this.#terminal.running) {
      this.#dialogs.retainStartupRoute(route);
      return;
    }
    const result = this.#dialogs.openRoute(route);
    if (result.outcome !== "completed" && result.diagnostic !== null) {
      this.root.appendWorkflowMessage({ kind: "warning", message: result.diagnostic });
    }
  }

  hotkeysPresentation(): PiShellHotkeysPresentation {
    const presentation = this.root.hotkeysPresentation();
    return this.#resident.active ? { ...presentation, residentTabs: true } : presentation;
  }

  async #slashCommand(text: string): Promise<OwnedUiCommandResult> {
    const body = text.slice(1).trim();
    const separator = body.search(/\s/);
    const name = separator < 0 ? body : body.slice(0, separator);
    const argument = separator < 0 ? "" : body.slice(separator + 1).trimStart();
    if (name === "settings" && this.#resident.active) {
      return rejected("Settings is available from the global Settings tab.");
    }
    if (this.#dialogs.claimsRoute(name)) return this.#dialogs.openRoute(name);
    if (this.#isWorkflowRoute(name)) return this.runWorkflow({ command: name, argument });
    if (this.#skillsCollapsed()) {
      if (name === SKILLS_COMMAND_NAME) return this.#runSkillsCommand(text, argument);
      const rewritten = rewriteSkillsTunnelSubmission(text);
      if (rewritten !== text) return this.#submission.sendSlashPrompt(rewritten, text);
    }
    // Compatibility: unknown slash input, prompt templates, skills, and extension commands remain Pi prompt input.
    return this.#submission.sendSlashPrompt(text);
  }

  #installAutocompleteCommands(): void {
    this.root.editor.setAutocompleteCommands(this.backend.workflows.workflowAutocompleteCommands());
    this.#installedCommandSignature = this.#commandListSignature();
  }

  #commandListSignature(): string {
    return JSON.stringify([this.#skills?.presentation() ?? "expand", this.backend.identity.disposed ? [] : this.backend.workflows.workflowAutocompleteCommands().map(command => command.name)]);
  }

  // Invariant: collapse applies only while the engine registers skill commands; otherwise there is nothing to collapse.
  #skillsCollapsed(): boolean {
    return this.#skills !== null && this.#skills.presentation() === "collapse"
      && !this.backend.identity.disposed && this.backend.settings.snapshot().enableSkillCommands;
  }

  #skillSummaries(): readonly PiShellSkillSummary[] {
    return skillsFromCommands(this.backend.workflows.workflowAutocompleteCommands());
  }

  // Protocol: bare "/skills" opens the dialog, "/skills <name> [args]" applies directly, and an unknown name is a command outcome.
  async #runSkillsCommand(text: string, argument: string): Promise<OwnedUiCommandResult> {
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
      this.#terminal.requestRender();
      return { outcome: "failed", diagnostic: message };
    }
    return this.#submission.sendSlashPrompt(skillPrompt(skill.name, separator < 0 ? "" : trimmed.slice(separator + 1)), text);
  }

  #treeSummary(): Promise<string | undefined> {
    return new Promise(resolve => {
      this.root.setInputSurface(createPiShellExtensionSelector(
        "Summarize Branch?",
        ["No summary", "Summarize", "Summarize with custom prompt"],
        resolve,
        () => resolve(undefined),
      ), true, "opaque");
      this.#terminal.requestRender();
    });
  }

  async #completeTreeSelection(entryId: string, skipSummaryPrompt: boolean): Promise<void> {
    let summarize = false;
    let customInstructions: string | undefined;
    if (!skipSummaryPrompt) {
      while (true) {
        const choice = await this.#treeSummary();
        if (choice === undefined) {
          await this.showTreeSelector(entryId);
          return;
        }
        summarize = choice !== "No summary";
        if (choice === "Summarize with custom prompt") {
          customInstructions = await this.#extensionBridge.input("Custom Summarization Instructions", "", { retainSurfaceOnSettle: true });
          if (customInstructions === undefined) continue;
        }
        break;
      }
    }
    this.root.setInputSurface(null);
    this.#terminal.requestRender();
    const result = await this.runWorkflow({
      command: "tree",
      argument: "",
      selection: entryId,
      treeSummary: {
        summarize,
        ...(customInstructions === undefined ? {} : { customInstructions }),
      },
    });
    if (result.diagnostic === "Branch summarization cancelled") await this.showTreeSelector(entryId);
  }

  #simple(type: "abort" | "retry" | "compact" | "shutdown" | "new-session"): OwnedUiCommand {
    return { type, correlationId: this.#correlation(type), sessionId: this.backend.identity.sessionId };
  }

  #correlation(prefix: string): string {
    this.#sequence += 1;
    return `pi-shell-${prefix}-${this.#sequence}`;
  }
}

/**
 * One session on a terminal of its own: a terminal host with this presenter attached. Disposing it ends the
 * terminal, as quitting the single-session product does.
 */
export class OwnedUiSessionShell extends OwnedUiSessionPresenter {
  constructor(options: OwnedUiSessionShellOptions) {
    const host = new OwnedUiTerminalHost(sessionTerminalHostOptions(options));
    try {
      super(host, options);
    } catch (error) {
      void host.dispose().catch(() => {});
      throw error;
    }
    host.attach(this);
  }

  get runtime(): PiTuiRuntimeAdapter {
    return this.terminalHost.runtime;
  }

  damagePresentationDecision(): PiTuiDamageDecision | null {
    return this.terminalHost.damagePresentationDecision;
  }
}

function isCoalescedStreamBlock(kind: OwnedUiSessionViewModel["transcript"][number]["kind"]): boolean {
  return kind === "assistant" || kind === "thinking" || kind === "tool-call" || kind === "tool-result";
}

function copyCharacters(snapshot: SelectionCopySnapshot): number | undefined {
  if (snapshot.literal !== true) return snapshot.sourceUnits;
  let count = Math.max(0, snapshot.rows.length - 1), hasContent = false;
  for (const { text } of snapshot.rows) {
    count += text.length;
    hasContent ||= /\S/u.test(text);
  }
  return hasContent ? count : undefined;
}

function rejected(diagnostic: string): OwnedUiCommandResult {
  return { outcome: "rejected", diagnostic };
}

function workflowAdapterResult(result: OwnedUiWorkflowResult): OwnedUiCommandResult {
  if (result.outcome === "completed") return { outcome: "completed", diagnostic: null };
  if (result.outcome === "failed") return { outcome: "failed", diagnostic: result.message };
  return { outcome: "rejected", diagnostic: result.message };
}

const RELOAD_SURFACE_MIN_VISIBLE_MS = 400;
