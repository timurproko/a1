import { PiTranscriptProjection } from "./transcript-projection.js";
import { isRecord, readModel, readStringArray, readThinkingLevel, stringProperty } from "./message-values.js";
import { getAgentDir, type AgentSession } from "../startup-public.js";
import {
  assertOwnedUiSnapshot,
  type OwnedUiCommand,
  type OwnedUiDiagnostics,
  type OwnedUiExtensionPort,
  type OwnedUiImageAttachment,
  type OwnedUiPromptSuggestionGeneratorPort,
  type OwnedUiPromptSuggestionReasoning,
  type OwnedUiPromptSuggestionRequest,
  type OwnedUiPromptSuggestionResult,
  type OwnedUiEvent,
  type OwnedUiReleaseUpdate,
  type OwnedUiSessionBackend,
  type OwnedUiSessionCatalogPort,
  type OwnedUiSessionIdentityPort,
  type OwnedUiSessionPort,
  type OwnedUiSessionSettingsPort,
  type OwnedUiSessionViewModel,
  type OwnedUiSnapshot,
  type OwnedUiTranscriptBlock,
  type OwnedUiWorkflowPort,
} from "../../../contracts/owned-ui/index.js";
import type {
  PiPinnedSettingsSnapshot,
  PiWorkflowHost,
  PiWorkflowInteractionHost,
  PiWorkflowRequest,
  PiWorkflowResult,
} from "./workflows.js";
import type { PiSettingsBridge } from "./settings-bridge.js";
import type { PiProjectTrustPreflightPrompt } from "./project-trust-preflight.js";
import type { PiSessionForkPrompt, PiSessionSelection } from "./session-selection.js";
import { PiCommandDispatch, performEngineCommand, type AdapterCommandResult, type EngineCommandContext } from "./command-dispatch.js";
import { PiEventDelivery, type PiEmittedEvent } from "./event-delivery.js";
import { PiExtensionUiBinding } from "./extension-ui-binding.js";
import { PiPromptSuggestions } from "./prompt-suggestions.js";
import { PiResourceCatalog } from "./resource-catalog.js";
import { PiEngineRuntime, type PiEnginePackageUpdateProbe, type PiEngineRuntimeFactory, type PiRepositoryContextReader } from "./session-runtime.js";
import { detachedEngineHostPorts, type PiEngineHostSessionPorts } from "./host-ports.js";
import { PiEngineSettings } from "./settings-port.js";
import { PiSessionEvents } from "./session-events.js";
import { readUsageView } from "./usage-view.js";
import { PiWorkflowContexts } from "./workflow-contexts.js";
import { PiWorkflowRunner } from "./workflow-runner.js";
import { defaultWorkflowHost } from "./workflow-support.js";
import { EngineViewState } from "./view-state.js";
import { createEnginePorts, type PiEngineAdapterPorts, type PiSessionPresentationSource } from "./ports.js";

export type { OwnedPiExtensionResourceSummary, OwnedPiExtensionSourceSummary, OwnedPiResourceSummary } from "./resource-catalog.js";
export type { PiEngineRuntimeFactory, PiEngineRuntimeFactoryInput } from "./session-runtime.js";
export type { AdapterCommandResult } from "./command-dispatch.js";
export type { OwnedPiVisualExtensionSupport } from "./extension-ui-binding.js";

export type { PiSessionPresentationSource } from "./ports.js";

/** Explicit flush failure when required delivery was interrupted rather than completed. */
export class EngineDeliveryError extends Error {
  constructor() { super("Engine delivery did not complete"); this.name = "EngineDeliveryError"; }
}


type PiSessionApi = AgentSession;

export interface PiEngineAdapterOptions {
  readonly cwd?: string;
  readonly agentDir?: string;
  /** Unique within the process; the engine host assigns one when the caller has none. */
  readonly sessionId: string;
  /**
   * The process-level host this session belongs to. Absent only for adapters built directly in
   * tests and tools: then no process dispatcher is installed and nothing is announced.
   */
  readonly engineHost?: PiEngineHostSessionPorts;
  readonly sessionPath?: string;
  readonly sessionSelection?: PiSessionSelection;
  readonly sessionForkPrompt?: PiSessionForkPrompt;
  readonly createRuntime?: PiEngineRuntimeFactory;
  readonly workflowHost?: PiWorkflowHost;
  /**
   * Themes installed on this machine. Supplied because listing them belongs to
   * the component adapter that owns the engine's theme unit; the grammar and the
   * offering stay here.
   */
  readonly availableThemes?: () => readonly string[];
  readonly settingsProductMode?: "bare" | "comparison";
  readonly projectTrustPrompt?: PiProjectTrustPreflightPrompt;
  /**
   * Startup extension-package update probe, mirroring pinned Pi's interactive
   * mode. Returns display names of packages with updates available.
   */
  readonly checkPackageUpdates?: PiEnginePackageUpdateProbe;
  readonly repositoryContextReader?: PiRepositoryContextReader;
}

/** Owns the pinned Pi session lifecycle and serves it to the owned shell as the neutral session backend. */
export class PiEngineAdapter implements OwnedUiSessionBackend, OwnedUiPromptSuggestionGeneratorPort {
  readonly #agentDir: string;
  readonly #sessionId: string;
  readonly #engineHost: PiEngineHostSessionPorts;
  readonly #workflowHost: PiWorkflowHost;
  readonly #engine: PiEngineRuntime;
  #workflowInteraction: PiWorkflowInteractionHost;
  readonly #contexts: PiWorkflowContexts;
  readonly #workflows: PiWorkflowRunner;
  readonly #resources: PiResourceCatalog;
  readonly #settings: PiEngineSettings;
  readonly #suggestions: PiPromptSuggestions;
  readonly #state = new EngineViewState();
  readonly #projection = new PiTranscriptProjection({
    retryAttempt: () => this.#engine.session?.retryAttempt ?? 0,
    blockChanged: block => this.#emitEvent({ type: "transcript-block", block }),
  });
  // Invariant: every port closes over adapter state read at call time, so delivery is built before a session binds.
  readonly #delivery = new PiEventDelivery({
    sessionId: () => this.#sessionId,
    sessionGeneration: () => this.#engine.generation,
    transcriptBlock: id => this.#projection.block(id),
    retainEvent: event => this.#projection.assets.retainEvent(event),
    isPendingCommand: correlationId => this.#commands.isPending(correlationId),
    cancelForOverload: () => this.#cancelForOverload(),
    reconcileOverload: cancelled => this.#reconcileOverload(cancelled),
    listenerFailed: message => { this.#recordDiagnostic("warning", "event-listener", message, true); },
  });
  #admissionStopped = false;
  #runningCommands = 0;
  readonly #commands: PiCommandDispatch;
  readonly #events = new PiSessionEvents(this.#projection, {
    sessionGeneration: () => this.#engine.generation,
    sessionMessages: () => this.#engine.session?.messages ?? [],
    activeModel: () => this.#state.activeModel,
    replaceTranscript: blocks => { this.#setTranscript(blocks); },
    emit: value => { this.#emitEvent(value); },
    emitView: () => { this.#emitView(); },
    enterWork: message => {
      if (!this.#state.enterWork(message)) this.#emitEvent({ type: "session-lifecycle", lifecycle: "busy", reason: null });
      this.#emitEvent({ type: "status", status: this.#state.status });
    },
    leaveWork: () => {
      this.#state.leaveWork();
      this.#emitEvent({ type: "session-lifecycle", lifecycle: "ready", reason: null });
      this.#emitEvent({ type: "status", status: this.#state.status });
    },
    workProgress: percent => {
      if (this.#state.setWorkProgress(percent)) this.#emitEvent({ type: "status", status: this.#state.status });
    },
    queueChanged: queuedSubmissions => {
      this.#state.setQueuedSubmissions(queuedSubmissions);
      this.#emitEvent({ type: "editor-state", editor: this.#state.editor });
    },
    thinkingLevelChanged: level => { this.#state.thinkingLevel = level; },
    usageInvalidated: () => { this.#state.invalidateUsage(); },
    compactionStarted: () => { this.#engine.compactionStarted(); },
    compactionEnded: () => { this.#engine.compactionEnded(); },
    deliverQueuedAfterCompaction: () => { this.#engine.deliverQueuedAfterCompaction(); },
  });
  readonly #extensions = new PiExtensionUiBinding({
    session: () => this.#engine.session,
    diagnostic: (severity, code, message, recoverable) => { this.#addDiagnostic(severity, code, message, recoverable); },
    emitView: () => { this.#emitView(); },
  });
  #disposed = false;
  readonly #ports: PiEngineAdapterPorts;
  constructor(options: PiEngineAdapterOptions) {
    if (typeof options.sessionId !== "string" || options.sessionId.length === 0) throw new TypeError("engine session id is required");
    this.#agentDir = options.agentDir ?? getAgentDir();
    this.#sessionId = options.sessionId;
    this.#engineHost = options.engineHost ?? detachedEngineHostPorts();
    this.#workflowHost = options.workflowHost ?? defaultWorkflowHost();
    this.#workflowInteraction = { prompt: async () => null, notify() {} };
    this.#engine = new PiEngineRuntime({
      cwd: options.cwd ?? process.cwd(),
      agentDir: this.#agentDir,
      sessionId: this.#sessionId,
      sessionPath: options.sessionPath,
      sessionSelection: options.sessionSelection,
      sessionForkPrompt: options.sessionForkPrompt,
      projectTrustPrompt: options.projectTrustPrompt,
      createRuntime: options.createRuntime,
      checkPackageUpdates: options.checkPackageUpdates,
      signal: this.#engineHost.signal,
      markStartupPhase: phase => this.#engineHost.markStartupPhase(phase),
      ...(options.repositoryContextReader === undefined ? {} : { repositoryContextReader: options.repositoryContextReader }),
      host: this.#workflowHost,
    }, {
      disposed: () => this.#disposed,
      started: runtime => {
        this.#state.setHardwareCursor(runtime.services.settingsManager?.getShowHardwareCursor?.() ?? this.#state.terminal.hardwareCursor);
        const httpIdleTimeoutMs = runtime.services.settingsManager?.getHttpIdleTimeoutMs?.();
        if (typeof httpIdleTimeoutMs === "number") this.#engineHost.httpPolicyLoaded(httpIdleTimeoutMs, this.#sessionId);
      },
      rebindBlocked: () => this.#delivery.overloaded || this.#admissionStopped || this.#disposed,
      sessionReplacing: () => { this.#commands.cancelPending(["new-session", "resume-session"]); },
      sessionReplaced: session => { this.#sessionReplaced(session); },
      rebound: () => { this.#emitView(); },
      event: event => { this.#events.handle(event); },
      compactionProgress: percent => { this.#events.compactionProgress(percent); },
      diagnostic: (severity, code, message, recoverable) => { this.#addDiagnostic(severity, code, message, recoverable); },
      emitView: () => { this.#emitView(); },
    });
    this.#contexts = new PiWorkflowContexts({ agentDir: this.#agentDir }, {
      cwd: () => this.#engine.cwd,
      session: () => this.#engine.session,
      runtime: () => this.#engine.runtime,
      disposed: () => this.#disposed,
      activeModel: () => this.#state.activeModel,
      emitView: () => { this.#emitView(); },
    });
    this.#workflows = new PiWorkflowRunner({ agentDir: this.#agentDir, host: this.#workflowHost, contexts: this.#contexts }, {
      session: () => this.#engine.session,
      runtime: () => this.#engine.runtime,
      disposed: () => this.#disposed,
      sessionGeneration: () => this.#engine.generation,
      interaction: () => this.#workflowInteraction,
      admissionStopped: () => this.#delivery.overloaded || this.#admissionStopped || this.#disposed,
      pendingCommandCount: () => this.#commands.pendingCount,
      beginRunning: () => { this.#runningCommands++; },
      endRunning: () => { this.#runningCommands--; },
      activeModel: () => this.#state.activeModel,
      setActiveModel: model => { this.#state.activeModel = model; },
      thinkingLevel: () => this.#state.thinkingLevel,
      setThinkingLevel: level => { this.#state.thinkingLevel = level; },
      emitView: () => { this.#emitView(); },
      reconcileActiveModelAvailability: () => { this.#reconcileActiveModelAvailability(); },
      bindExtensionUiToSession: () => this.#extensions.rebind(),
      applyPinnedSetting: selection => this.#settings.applyPinnedSetting(selection),
      snapshot: () => this.snapshot(),
      dispose: () => this.dispose(),
    });
    this.#commands = new PiCommandDispatch({
      sessionId: () => this.#sessionId,
      notRunning: () => this.#disposed || !this.#engine.runtime || !this.#engine.session,
      admissionStopped: () => this.#delivery.overloaded || this.#admissionStopped,
      pendingWorkflowCount: () => this.#workflows.pendingCount,
      sessionGeneration: () => this.#engine.generation,
      beginRunning: () => { this.#runningCommands++; },
      endRunning: () => { this.#runningCommands--; },
      perform: command => performEngineCommand(command, this.#commandContext()),
      emit: value => { this.#emitEvent(value); },
      emitView: () => { this.#emitView(); },
      diagnostic: (severity, code, message, recoverable) => { this.#addDiagnostic(severity, code, message, recoverable); },
    });
    this.#resources = new PiResourceCatalog({ contexts: this.#contexts, productMode: options.settingsProductMode ?? "bare" }, {
      session: () => this.#engine.session,
      runtime: () => this.#engine.runtime,
    });
    this.#settings = new PiEngineSettings({ availableThemes: options.availableThemes ?? null, productMode: options.settingsProductMode ?? "bare" }, {
      runtime: () => this.#engine.runtime,
      requireSession: () => this.#requireWorkflowSession(),
      thinkingLevelChanged: level => { this.#state.thinkingLevel = level; this.#emitView(); },
      httpPolicyChanged: timeoutMs => { this.#engineHost.httpPolicyChanged(timeoutMs, this.#sessionId); },
      emitView: () => { this.#emitView(); },
    });
    this.#suggestions = new PiPromptSuggestions({
      session: () => this.#engine.session,
      runtime: () => this.#engine.runtime,
      activeModel: () => this.#state.activeModel,
      identity: () => ({ sessionId: this.#sessionId, sessionGeneration: this.#engine.generation, runSequence: this.#events.runSequence, responseSequence: this.#events.responseSequence }),
      unavailable: () => this.#disposed || this.#delivery.overloaded || this.#admissionStopped,
    });
    this.#ports = this.#createPorts();
  }

  get identity(): OwnedUiSessionIdentityPort { return this.#ports.identity; }
  get session(): OwnedUiSessionPort { return this.#ports.session; }
  get workflows(): OwnedUiWorkflowPort { return this.#ports.workflows; }
  get settings(): OwnedUiSessionSettingsPort { return this.#ports.settings; }
  get catalog(): OwnedUiSessionCatalogPort { return this.#ports.catalog; }
  get extensions(): OwnedUiExtensionPort { return this.#ports.extensions; }
  /** The Pi objects behind pinned selectors and renderers, for the session presenters owner only. */
  presentationSource(): PiSessionPresentationSource { return this.#ports.presentation; }

  setWorkflowInteractionHost(interaction: PiWorkflowInteractionHost): void {
    this.#workflowInteraction = interaction;
  }

  #resolveTranscriptImage(assetId: string): OwnedUiImageAttachment | null {
    return this.#projection.assets.resolve(assetId);
  }

  // Rationale: the startup check's newer release becomes pinned Pi's `Update Available` notice; it arrives
  // whenever the check resolves, so a late result is appended like Pi's own fire-and-forget version check.
  #announceReleaseUpdate(release: OwnedUiReleaseUpdate): void {
    if (this.#disposed) return;
    const changelog = release.changelogUrl === null ? "" : `\nChangelog: ${release.changelogUrl}`;
    this.#addDiagnostic("info", "release-update", `New version ${release.version} is available. Run ${release.command}${changelog}`, true);
    this.#emitView();
  }

  suggestionReasoningPolicy(): OwnedUiPromptSuggestionReasoning {
    return this.#suggestions.reasoningPolicy();
  }

  generate(request: OwnedUiPromptSuggestionRequest): Promise<OwnedUiPromptSuggestionResult> {
    return this.#suggestions.generate(request);
  }

  generateResidentTabName(instruction: string, maxTokens: number, signal: AbortSignal): Promise<string | null> {
    return this.#suggestions.completeInstruction(instruction, maxTokens, signal);
  }

  async start(): Promise<OwnedUiSessionViewModel> {
    if (this.#engine.started) return this.view();
    await this.#engine.start().catch(error => {
      this.#state.lifecycle = "failed";
      this.#addDiagnostic("error", "engine-startup", error instanceof Error ? error.message : String(error), false);
      throw error;
    });
    this.#state.markReady();
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "ready", reason: null });
    this.#emitView();
    return this.view();
  }

  /** Announce pinned Pi's changelog since the profile's last seen version; the host calls this once per process. */
  announceStartupChangelog(): Promise<void> {
    return this.#engine.announceChangelog();
  }

  /** Probe extension packages for updates and announce them; the host calls this once per process. */
  announcePackageUpdates(): Promise<void> {
    return this.#engine.announcePackageUpdates();
  }

  onEvent(listener: (event: OwnedUiEvent) => void): () => void {
    return this.#delivery.subscribe(listener, this.#delivery.stamp({ type: "session-view", view: this.view() }));
  }

  /** Developer-only pressure evidence; never mirrored into visible diagnostic/status arrays. */
  deliveryDiagnostics() {
    return { ...this.#delivery.diagnostics(), pendingCommands: this.#commands.pendingCount + this.#workflows.pendingCount };
  }

  async flushEvents(): Promise<void> {
    const failed = this.#delivery.failed;
    await this.#delivery.settle();
    if (failed || this.#delivery.failed || this.#disposed && this.#state.lifecycle !== "stopped") {
      this.#delivery.clearFailure(); throw new EngineDeliveryError();
    }
  }

  abortBashWorkflow(): void {
    this.#workflows.abortBashWorkflow();
  }

  async executeWorkflow(request: PiWorkflowRequest): Promise<PiWorkflowResult> {
    const result = await this.#workflows.executeWorkflow(request);
    if (request.command === "tree" && result.outcome === "completed" && request.selection !== undefined) {
      this.#refreshNavigatedSession(result.detail);
    }
    return result;
  }

  /**
   * The theme the engine is configured with, in the engine's own grammar: a
   * theme's name, or a `light/dark` pair meaning "follow the terminal".
   */
  configuredTheme(): string | undefined {
    return this.#settings.configuredTheme();
  }

  /** Settings port for the live runtime, or null before the runtime is available. */
  settingsPort(): PiSettingsBridge | null {
    return this.#settings.settingsPort();
  }

  pinnedSettingsSnapshot(): PiPinnedSettingsSnapshot {
    return this.#settings.pinnedSettingsSnapshot();
  }

  clearQueuedWorkflows(): readonly string[] {
    const session = this.#requireWorkflowSession();
    const result = session.clearQueue?.();
    this.#engine.sessionCommands?.forgetQueuedImages();
    if (!isRecord(result)) return [];
    return [...readStringArray(result.steering), ...readStringArray(result.followUp)];
  }

  view(): OwnedUiSessionViewModel {
    const routed = this.#engine.session?.routedModel;
    const routedModel = routed === undefined ? null : readModel(routed.model);
    return {
      contractVersion: 1,
      sessionId: this.#sessionId,
      revision: this.#state.revision,
      lifecycle: this.#state.lifecycle,
      transcript: this.#projection.snapshot(),
      editor: { ...this.#state.editor, queuedSubmissions: [...this.#state.editor.queuedSubmissions] },
      status: {
        ...this.#state.status,
        diagnostics: [...this.#state.status.diagnostics],
        badges: [...this.#state.status.badges],
        usage: this.#state.usage(() => readUsageView(this.#engine.session, this.#engine.runtime, this.#state.activeModel)),
        footer: {
          branch: this.#engine.gitBranch,
          repositoryPath: this.#engine.repositoryCwd,
          pullRequest: this.#engine.pullRequest,
          sessionName: this.#engine.session?.sessionManager?.getSessionName() ?? null,
          availableProviderCount: new Set(this.#engine.runtime?.services.modelRuntime.getAvailableSnapshot?.().map(model => model.provider).filter(provider => provider !== undefined) ?? []).size,
          extensionStatuses: [],
        },
      },
      terminal: { ...this.#state.terminal },
      activeModel: this.#state.activeModel === null ? null : { ...this.#state.activeModel },
      routedModel: routedModel === null ? null : {
        model: routedModel,
        ...(routed?.thinkingLevel === undefined ? {} : { thinkingLevel: readThinkingLevel(routed.thinkingLevel) }),
      },
      thinkingLevel: this.#state.thinkingLevel,
      activeCommandIds: [...this.#commands.activeCommandIds],
      dialog: null,
      overlay: null,
      customizations: [],
      diagnostics: this.#state.diagnostics.map(diagnostic => ({ ...diagnostic })),
    };
  }

  snapshot(): OwnedUiSnapshot {
    const snapshot: OwnedUiSnapshot = {
      contractVersion: 1,
      snapshotId: `snapshot-${this.#state.revision}`,
      sessionId: this.#sessionId,
      sequence: this.#delivery.sequence,
      view: this.view(),
    };
    assertOwnedUiSnapshot(snapshot);
    return snapshot;
  }

  execute(command: OwnedUiCommand): Promise<AdapterCommandResult> {
    return this.#commands.execute(command);
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#commands.cancelPending(["shutdown"]);
    // Compatibility: /quit owns normal disposal and must report its actual completion, not cancel itself.
    this.#workflows.cancelPending("quit");
    this.#projection.assets.clear();
    await this.#extensions.unbind();
    this.#state.lifecycle = "stopping";
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "stopping", reason: null });
    await this.#engine.dispose();
    this.#state.lifecycle = "stopped";
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "stopped", reason: null });
    this.#emitView();
    try { await this.flushEvents(); } catch (error) { if (!(error instanceof EngineDeliveryError)) throw error; }
  }

  // Invariant: every port member delegates at call time, so ports built once follow session replacement.
  #createPorts(): PiEngineAdapterPorts {
    return createEnginePorts({
      sessionId: this.#sessionId,
      agentDir: this.#agentDir,
      engine: this.#engine,
      contexts: this.#contexts,
      workflows: this.#workflows,
      settings: this.#settings,
      resources: this.#resources,
      extensions: this.#extensions,
      session: {
        start: () => this.start(),
        view: () => this.view(),
        snapshot: () => this.snapshot(),
        onEvent: listener => this.onEvent(listener),
        execute: command => this.execute(command),
        flushEvents: () => this.flushEvents(),
        dispose: () => this.dispose(),
      },
      disposed: () => this.#disposed,
      executeWorkflow: request => this.executeWorkflow(request),
      clearQueuedWorkflows: () => this.clearQueuedWorkflows(),
      setWorkflowInteractionHost: interaction => { this.setWorkflowInteractionHost(interaction); },
      announceReleaseUpdate: release => { this.#announceReleaseUpdate(release); },
      resolveTranscriptImage: assetId => this.#resolveTranscriptImage(assetId),
      extensionRunner: () => this.#requireWorkflowSession().extensionRunner,
    });
  }

  #commandContext(): EngineCommandContext {
    return {
      engine: this.#engine,
      state: this.#state,
      admissionOpen: () => !this.#delivery.overloaded && !this.#admissionStopped,
      emit: value => { this.#emitEvent(value); },
      dispose: () => this.dispose(),
    };
  }

  #requireWorkflowSession(): PiSessionApi {
    if (this.#disposed || !this.#engine.runtime || !this.#engine.session) throw new Error("engine adapter is not running");
    return this.#engine.session;
  }

  // Invariant: in-place tree navigation rebuilds derived content without clearing the editor draft.
  #refreshNavigatedSession(editorText?: string): void {
    const session = this.#engine.session;
    if (!session) return;
    if (editorText) this.#state.offerEditorText(editorText);
    this.#state.activeModel = readModel(session.model);
    this.#reconcileActiveModelAvailability();
    this.#state.thinkingLevel = readThinkingLevel(session.thinkingLevel);
    this.#projection.assets.clear();
    this.#setTranscript(this.#projection.rebuild(session.messages, "finalized"));
    this.#emitView();
  }

  // Invariant: the runtime already advanced the generation and subscribed; this rebuilds what the view derives from a session.
  #sessionReplaced(session: PiSessionApi): void {
    this.#delivery.discardObsolete(this.#engine.generation);
    this.#commands.reset();
    this.#state.replaceSession();
    this.#events.reset();
    this.#state.activeModel = readModel(session.model);
    this.#reconcileActiveModelAvailability();
    this.#state.thinkingLevel = readThinkingLevel(session.thinkingLevel);
    this.#projection.assets.clear();
    // Invariant: a new binding cannot inherit arguments/results from a reused invocation id.
    this.#setTranscript([]);
    this.#setTranscript(this.#projection.rebuild(session.messages, "finalized"));
    if (this.#extensions.attached) void this.#extensions.rebind();
  }

  #reconcileActiveModelAvailability(): void {
    const modelRuntime = this.#engine.runtime?.services.modelRuntime;
    if (!modelRuntime) {
      this.#state.activeModel = null;
      return;
    }
    const available = modelRuntime.getAvailableSnapshot?.() ?? [];
    const sessionModel = readModel(this.#engine.session?.model);
    const authoritative = this.#state.activeModel ?? sessionModel;
    if (authoritative === null) return;
    const remainsAvailable = available.some(model =>
      stringProperty(model, "provider") === authoritative.providerId
        && stringProperty(model, "id") === authoritative.modelId);
    this.#state.activeModel = remainsAvailable ? authoritative : null;
  }

  #setTranscript(blocks: OwnedUiTranscriptBlock[]): void {
    // Invariant: lazy delivery snapshots must freeze before their authoritative source can be removed.
    if (!this.#delivery.seal()) { this.#delivery.beginOverload(); return; }
    this.#projection.replace(blocks);
  }

  #addDiagnostic(
    severity: OwnedUiDiagnostics["severity"],
    code: string,
    message: string,
    recoverable: boolean,
  ): void {
    const diagnostic = this.#recordDiagnostic(severity, code, message, recoverable);
    this.#emitEvent({ type: "diagnostic", diagnostic });
  }

  #emitView(): void {
    this.#state.invalidate();
    this.#emitEvent({ type: "session-view", view: this.view() });
  }

  #emitEvent(value: PiEmittedEvent): void {
    if (value.type !== "session-view") this.#state.advance();
    this.#delivery.emit(value);
  }

  // Concurrency: cancellation runs synchronously so the overload reservation already guards reentrant outcomes.
  #cancelForOverload(): Promise<void> {
    this.#commands.cancelPending();
    this.#workflows.cancelPending();
    const session = this.#engine.session;
    return Promise.resolve().then(() => session?.abort()).then(() => undefined);
  }

  async #reconcileOverload(cancelled: boolean): Promise<void> {
    const canResume = cancelled === true && this.#runningCommands === 0;
    this.#admissionStopped = !canResume;
    this.#engine.suspend();
    this.#events.abandonRun();
    this.#state.settleOverload(canResume, this.#disposed);
    // Invariant: overload publishes one authoritative view; settle tool phases before finalizing other live blocks.
    this.#projection.settleFailedDeclarations({ role: "assistant", stopReason: cancelled ? "aborted" : "error",
      errorMessage: "Tool result unavailable after UI delivery overload" });
    this.#setTranscript(this.#projection.blocks.map(block => block.status === "live" ? { ...block, status: "finalized", revision: block.revision + 1 } : block));
    for (const [correlationId, result] of this.#delivery.takeReservedOutcomes()) {
      this.#delivery.deliverNow(this.#delivery.stamp({ type: "command-outcome", correlationId, ...result }));
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    // Invariant: one out-of-band authoritative reconciliation, not an emergency transcript/event log.
    this.#delivery.deliverNow(this.#delivery.stamp({ type: "session-view", view: this.view() }));
    if (this.#disposed) this.#delivery.deliverNow(this.#delivery.stamp({ type: "session-lifecycle", lifecycle: "stopped", reason: null }));
    if (canResume && !this.#disposed) this.#engine.resume();
  }

  #recordDiagnostic(
    severity: OwnedUiDiagnostics["severity"],
    code: string,
    message: string,
    recoverable: boolean,
  ): OwnedUiDiagnostics {
    return this.#state.recordDiagnostic(severity, code, message, recoverable);
  }
}

export async function createPiEngineAdapter(
  options: PiEngineAdapterOptions,
): Promise<PiEngineAdapter> {
  const adapter = new PiEngineAdapter(options);
  await adapter.start();
  return adapter;
}
