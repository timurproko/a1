import { PiTranscriptProjection } from "./transcript-projection.js";
import { isRecord, readModel, readStringArray, readThinkingLevel, stringProperty } from "./message-values.js";
import { getAgentDir, type AgentSession } from "../startup-public.js";
import {
  assertOwnedUiSnapshot,
  type OwnedUiCommand,
  type OwnedUiDiagnostics,
  type OwnedUiEditorState,
  type OwnedUiImageAttachment,
  type OwnedUiPromptSuggestionGeneratorPort,
  type OwnedUiPromptSuggestionReasoning,
  type OwnedUiPromptSuggestionRequest,
  type OwnedUiPromptSuggestionResult,
  type OwnedUiEvent,
  type OwnedUiModelInfo,
  type OwnedUiSessionViewModel,
  type OwnedUiSnapshot,
  type OwnedUiStatusView,
  type OwnedUiTerminalSurface,
  type OwnedUiThinkingLevel,
  type OwnedUiTranscriptBlock,
  type OwnedUiUsageView,
} from "../../../contracts/owned-ui/index.js";
import type {
  PiAuthenticationProviderOption,
  PiBashWorkflowResult,
  PiPinnedSettingsCallback,
  PiPinnedSettingsSnapshot,
  PiProjectTrustContext,
  PiProjectTrustUpdate,
  PiScopedModelsContext,
  PiScopedModelsRefreshResult,
  PiSessionResumeMetadata,
  PiSessionSelectorContext,
  PiTreeSelectorContext,
  PiWorkflowAutocompleteCommand,
  PiWorkflowHost,
  PiWorkflowInteractionHost,
  PiWorkflowOption,
  PiWorkflowRequest,
  PiWorkflowResult,
} from "./workflows.js";
import type { PiSettingsIntegration } from "./settings-integration.js";
import type { PiSettingOwnerHandlers } from "./settings-effects.js";
import type { PiProjectTrustPreflightPrompt } from "./project-trust-preflight.js";
import type { PiSessionForkPrompt, PiSessionSelection } from "./session-selection.js";
import type { AgentSettingOwner } from "../../../contracts/agent-engine/index.js";
import { PiCommandDispatch, type AdapterCommandResult } from "./command-dispatch.js";
import { PiEventDelivery, type PiEmittedEvent } from "./event-delivery.js";
import { PiExtensionUiBinding, type OwnedPiVisualExtensionSupport } from "./extension-ui-binding.js";
import { PiPromptSuggestions } from "./prompt-suggestions.js";
import { PiResourceCatalog, type OwnedPiExtensionResourceSummary, type OwnedPiResourceSummary } from "./resource-catalog.js";
import { PiEngineRuntime, type PiEnginePackageUpdateProbe, type PiEngineRuntimeFactory } from "./session-runtime.js";
import { PiEngineSettings } from "./settings-port.js";
import { PiSessionEvents } from "./session-events.js";
import { readUsageView } from "./usage-view.js";
import { PiWorkflowContexts } from "./workflow-contexts.js";
import { PiWorkflowRunner } from "./workflow-runner.js";
import { defaultWorkflowHost } from "./workflow-support.js";

export type { OwnedPiExtensionResourceSummary, OwnedPiExtensionSourceSummary, OwnedPiResourceSummary } from "./resource-catalog.js";
export type { PiEngineRuntimeFactory, PiEngineRuntimeFactoryInput } from "./session-runtime.js";
export type { AdapterCommandResult } from "./command-dispatch.js";
export type { OwnedPiVisualExtensionSupport } from "./extension-ui-binding.js";

/** Explicit flush failure when required delivery was interrupted rather than completed. */
export class EngineDeliveryError extends Error {
  constructor() { super("Engine delivery did not complete"); this.name = "EngineDeliveryError"; }
}


type PiSessionApi = AgentSession;

export interface PiEngineAdapterOptions {
  readonly cwd?: string;
  readonly agentDir?: string;
  readonly sessionId?: string;
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
}

const DEFAULT_SURFACE: OwnedUiTerminalSurface = {
  columns: 100,
  rows: 32,
  focusedRegion: "editor",
  hardwareCursor: false,
};

/** Owns the pinned Pi session lifecycle and translates its events into the neutral agent-engine contract. */
export class PiEngineAdapter implements OwnedUiPromptSuggestionGeneratorPort {
  readonly #agentDir: string;
  readonly #sessionId: string;
  readonly #workflowHost: PiWorkflowHost;
  readonly #engine: PiEngineRuntime;
  #workflowInteraction: PiWorkflowInteractionHost;
  readonly #contexts: PiWorkflowContexts;
  readonly #workflows: PiWorkflowRunner;
  readonly #resources: PiResourceCatalog;
  readonly #settings: PiEngineSettings;
  readonly #suggestions: PiPromptSuggestions;
  #viewRevision = 0;
  #lifecycle: OwnedUiSessionViewModel["lifecycle"] = "starting";
  #editor: OwnedUiEditorState = {
    text: "",
    queuedSubmissions: [],
    selection: null,
    cursorOffset: 0,
    historyRevision: 0,
    submitEnabled: false,
  };
  #status: OwnedUiStatusView = {
    title: "Pi",
    workingMessage: null,
    diagnostics: [],
    badges: [],
  };
  #terminal: OwnedUiTerminalSurface = DEFAULT_SURFACE;
  #activeModel: OwnedUiModelInfo | null = null;
  #thinkingLevel: OwnedUiThinkingLevel = "medium";
  readonly #projection = new PiTranscriptProjection({
    retryAttempt: () => this.#engine.session?.retryAttempt ?? 0,
    blockChanged: block => this.#emitEvent({ type: "transcript-block", block }),
  });
  #usageCache: OwnedUiUsageView | undefined;
  #diagnostics: OwnedUiDiagnostics[] = [];
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
    activeModel: () => this.#activeModel,
    replaceTranscript: blocks => { this.#setTranscript(blocks); },
    emit: value => { this.#emitEvent(value); },
    emitView: () => { this.#emitView(); },
    enterWork: message => {
      const wasBusy = this.#lifecycle === "busy";
      this.#lifecycle = "busy";
      this.#status = { ...this.#status, workingMessage: message, workingProgress: null };
      if (!wasBusy) this.#emitEvent({ type: "session-lifecycle", lifecycle: "busy", reason: null });
      this.#emitEvent({ type: "status", status: this.#status });
    },
    leaveWork: () => {
      this.#lifecycle = "ready";
      this.#status = { ...this.#status, workingMessage: null, workingProgress: null };
      this.#emitEvent({ type: "session-lifecycle", lifecycle: "ready", reason: null });
      this.#emitEvent({ type: "status", status: this.#status });
    },
    workProgress: percent => {
      if (this.#status.workingProgress === percent) return;
      this.#status = { ...this.#status, workingProgress: percent };
      this.#emitEvent({ type: "status", status: this.#status });
    },
    queueChanged: queuedSubmissions => {
      this.#editor = { ...this.#editor, queuedSubmissions: [...queuedSubmissions], historyRevision: this.#editor.historyRevision + 1 };
      this.#emitEvent({ type: "editor-state", editor: this.#editor });
    },
    thinkingLevelChanged: level => { this.#thinkingLevel = level; },
    usageInvalidated: () => { this.#usageCache = undefined; },
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
  constructor(options: PiEngineAdapterOptions = {}) {
    this.#agentDir = options.agentDir ?? getAgentDir();
    this.#sessionId = options.sessionId ?? "owned-session-1";
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
      host: this.#workflowHost,
    }, {
      disposed: () => this.#disposed,
      started: runtime => {
        this.#terminal = {
          ...this.#terminal,
          hardwareCursor: runtime.services.settingsManager?.getShowHardwareCursor?.() ?? this.#terminal.hardwareCursor,
        };
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
      activeModel: () => this.#activeModel,
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
      activeModel: () => this.#activeModel,
      setActiveModel: model => { this.#activeModel = model; },
      thinkingLevel: () => this.#thinkingLevel,
      setThinkingLevel: level => { this.#thinkingLevel = level; },
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
      perform: command => this.#perform(command),
      emit: value => { this.#emitEvent(value); },
      emitView: () => { this.#emitView(); },
      diagnostic: (severity, code, message, recoverable) => { this.#addDiagnostic(severity, code, message, recoverable); },
    });
    this.#resources = new PiResourceCatalog({ contexts: this.#contexts }, {
      session: () => this.#engine.session,
      runtime: () => this.#engine.runtime,
    });
    this.#settings = new PiEngineSettings({ availableThemes: options.availableThemes ?? null, productMode: options.settingsProductMode ?? "bare" }, {
      runtime: () => this.#engine.runtime,
      requireSession: () => this.#requireWorkflowSession(),
      thinkingLevelChanged: level => { this.#thinkingLevel = level; this.#emitView(); },
      emitView: () => { this.#emitView(); },
    });
    this.#suggestions = new PiPromptSuggestions({
      session: () => this.#engine.session,
      runtime: () => this.#engine.runtime,
      activeModel: () => this.#activeModel,
      identity: () => ({ sessionId: this.#sessionId, sessionGeneration: this.#engine.generation, runSequence: this.#events.runSequence, responseSequence: this.#events.responseSequence }),
      unavailable: () => this.#disposed || this.#delivery.overloaded || this.#admissionStopped,
    });
  }

  setWorkflowInteractionHost(interaction: PiWorkflowInteractionHost): void {
    this.#workflowInteraction = interaction;
  }

  get sessionId(): string {
    return this.#sessionId;
  }

  get sessionGeneration(): number {
    return this.#engine.generation;
  }

  /** Actual session replacements, excluding delivery-only invalidation of callbacks. */
  get sessionBindingGeneration(): number { return this.#engine.bindingGeneration; }

  get cwd(): string {
    return this.#engine.cwd;
  }

  get agentDir(): string {
    return this.#agentDir;
  }

  resolveTranscriptImage(assetId: string): OwnedUiImageAttachment | null {
    return this.#projection.assets.resolve(assetId);
  }

  currentSessionFile(): string | null {
    return this.#engine.currentSessionFile();
  }

  currentSessionResumeMetadata(): PiSessionResumeMetadata | null {
    return this.#engine.currentSessionResumeMetadata();
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  suggestionReasoningPolicy(): OwnedUiPromptSuggestionReasoning {
    return this.#suggestions.reasoningPolicy();
  }

  generate(request: OwnedUiPromptSuggestionRequest): Promise<OwnedUiPromptSuggestionResult> {
    return this.#suggestions.generate(request);
  }

  async start(): Promise<OwnedUiSessionViewModel> {
    if (this.#engine.started) return this.view();
    await this.#engine.start().catch(error => {
      this.#lifecycle = "failed";
      this.#addDiagnostic("error", "engine-startup", error instanceof Error ? error.message : String(error), false);
      throw error;
    });
    this.#lifecycle = "ready";
    this.#editor = { ...this.#editor, submitEnabled: true };
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "ready", reason: null });
    this.#emitView();
    void this.#engine.announcePackageUpdates();
    return this.view();
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
    if (failed || this.#delivery.failed || this.#disposed && this.#lifecycle !== "stopped") {
      this.#delivery.clearFailure(); throw new EngineDeliveryError();
    }
  }

  nonVisualResources(): readonly OwnedPiResourceSummary[] {
    return this.#resources.nonVisualResources();
  }

  extensionResources(): readonly OwnedPiExtensionResourceSummary[] {
    return this.#resources.extensionResources();
  }

  workflowAutocompleteCommands(): readonly PiWorkflowAutocompleteCommand[] {
    return this.#resources.workflowAutocompleteCommands();
  }

  visualExtensionSupport(): OwnedPiVisualExtensionSupport {
    return this.#extensions.support();
  }

  bindExtensionUi(ui: unknown, shutdown?: () => void | Promise<void>): Promise<void> {
    return this.#extensions.bind(ui, shutdown);
  }

  unbindExtensionUi(): Promise<void> {
    return this.#extensions.unbind();
  }

  async cycleModelWorkflow(direction: "forward" | "backward"): Promise<PiWorkflowResult> {
    return this.#workflows.cycleModelWorkflow(direction);
  }

  pinnedModelSelectorContext(): ReturnType<PiWorkflowContexts["pinnedModelSelectorContext"]> {
    return this.#contexts.pinnedModelSelectorContext();
  }

  pinnedProjectTrustContext(): PiProjectTrustContext {
    return this.#contexts.pinnedProjectTrustContext();
  }

  persistProjectTrust(updates: readonly PiProjectTrustUpdate[]): void {
    this.#contexts.persistProjectTrust(updates);
  }

  pinnedSessionSelectorContext(): PiSessionSelectorContext {
    return this.#contexts.pinnedSessionSelectorContext();
  }

  pinnedScopedModelsContext(): PiScopedModelsContext {
    return this.#contexts.pinnedScopedModelsContext();
  }

  updateScopedModels(enabledModelIds: readonly string[] | null): void {
    this.#contexts.updateScopedModels(enabledModelIds);
  }

  persistScopedModels(enabledModelIds: readonly string[] | null): void {
    this.#contexts.persistScopedModels(enabledModelIds);
  }

  refreshScopedModels(signal: AbortSignal): Promise<PiScopedModelsRefreshResult> {
    return this.#contexts.refreshScopedModels(signal);
  }

  pinnedLoginOptions(authType?: "oauth" | "api_key"): readonly PiAuthenticationProviderOption[] {
    return this.#contexts.loginOptions(authType);
  }

  pinnedLoginMethodOptions(providerReference: string): { readonly title: string; readonly options: readonly PiWorkflowOption[] } {
    return this.#contexts.pinnedLoginMethodOptions(providerReference);
  }

  pinnedAmbientAuthentication(selection: string): ReturnType<PiWorkflowContexts["pinnedAmbientAuthentication"]> {
    return this.#contexts.pinnedAmbientAuthentication(selection);
  }

  pinnedLogoutOptions(): Promise<readonly PiAuthenticationProviderOption[]> {
    return this.#contexts.logoutOptions();
  }

  pinnedForkOptions(): readonly PiWorkflowOption[] {
    return this.#contexts.pinnedForkOptions();
  }

  pinnedTreeSelectorContext(): PiTreeSelectorContext {
    return this.#contexts.pinnedTreeSelectorContext();
  }

  /** Bind the owned UI's clipboard lifecycle without changing the comparison host. True means acknowledged delivery. */
  bindClipboardWriter(writer: (text: string) => Promise<boolean>): () => void {
    return this.#workflows.bindClipboardWriter(writer);
  }

  /** Workflow and tree copying share the active owner's write fence and delivery acknowledgment. */
  copyWorkflowText(text: string): Promise<boolean> {
    return this.#workflows.copyWorkflowText(text);
  }

  abortBashWorkflow(): void {
    this.#workflows.abortBashWorkflow();
  }

  executeBashWorkflow(command: string, excludeFromContext: boolean): Promise<PiBashWorkflowResult> {
    return this.#workflows.executeBashWorkflow(command, excludeFromContext);
  }

  reloadBlockedResult(): PiWorkflowResult | null {
    return this.#workflows.reloadBlockedResult();
  }

  executeWorkflow(request: PiWorkflowRequest): Promise<PiWorkflowResult> {
    return this.#workflows.executeWorkflow(request);
  }

  /**
   * The theme the engine is configured with, in the engine's own grammar: a
   * theme's name, or a `light/dark` pair meaning "follow the terminal".
   */
  configuredTheme(): string | undefined {
    return this.#settings.configuredTheme();
  }

  /** Settings port for the live runtime, or null before the runtime is available. */
  settingsPort(): PiSettingsIntegration | null {
    return this.#settings.settingsPort();
  }

  /** Which settings surface this adapter serves; hidden-in-bare effects are unbindable in bare mode. */
  get settingsProductMode(): "bare" | "comparison" {
    return this.#settings.productMode;
  }

  bindSettingsOwner(owner: AgentSettingOwner, handlers: PiSettingOwnerHandlers): () => void {
    return this.#settings.bindSettingsOwner(owner, handlers);
  }

  pinnedSettingsSnapshot(): PiPinnedSettingsSnapshot {
    return this.#settings.pinnedSettingsSnapshot();
  }

  applyPinnedSettingValue(callback: PiPinnedSettingsCallback, value: unknown): Promise<PiWorkflowResult> {
    return this.#settings.applyPinnedSettingValue(callback, value);
  }

  pinnedMessageRenderer(customType: string): unknown {
    return this.#requireWorkflowSession().extensionRunner?.getMessageRenderer?.(customType);
  }

  pinnedShortcutDescriptions(bindings: Parameters<AgentSession["extensionRunner"]["getShortcuts"]>[0]): readonly { readonly key: string; readonly description: string }[] {
    const shortcuts = this.#requireWorkflowSession().extensionRunner?.getShortcuts?.(bindings);
    return shortcuts === undefined ? [] : [...shortcuts].map(([key, shortcut]) => ({ key, description: shortcut.description ?? shortcut.extensionPath }));
  }

  pinnedToolDefinition(toolName: string): unknown {
    return this.#requireWorkflowSession().extensionRunner?.getToolDefinition?.(toolName);
  }

  clearQueuedWorkflows(): readonly string[] {
    const session = this.#requireWorkflowSession();
    const result = session.clearQueue?.();
    this.#engine.sessionCommands?.forgetQueuedImages();
    if (!isRecord(result)) return [];
    return [...readStringArray(result.steering), ...readStringArray(result.followUp)];
  }

  view(): OwnedUiSessionViewModel {
    return {
      contractVersion: 1,
      sessionId: this.#sessionId,
      revision: this.#viewRevision,
      lifecycle: this.#lifecycle,
      transcript: this.#projection.snapshot(),
      editor: { ...this.#editor, queuedSubmissions: [...this.#editor.queuedSubmissions] },
      status: {
        ...this.#status,
        diagnostics: [...this.#status.diagnostics],
        badges: [...this.#status.badges],
        usage: this.#usageCache ??= readUsageView(this.#engine.session, this.#engine.runtime, this.#activeModel),
        footer: {
          branch: this.#engine.gitBranch,
          sessionName: this.#engine.session?.sessionManager?.getSessionName() ?? null,
          availableProviderCount: new Set(this.#engine.runtime?.services.modelRuntime.getAvailableSnapshot?.().map(model => model.provider).filter(provider => provider !== undefined) ?? []).size,
          extensionStatuses: [],
        },
      },
      terminal: { ...this.#terminal },
      activeModel: this.#activeModel === null ? null : { ...this.#activeModel },
      thinkingLevel: this.#thinkingLevel,
      activeCommandIds: [...this.#commands.activeCommandIds],
      dialog: null,
      overlay: null,
      customizations: [],
      diagnostics: this.#diagnostics.map(diagnostic => ({ ...diagnostic })),
    };
  }

  snapshot(): OwnedUiSnapshot {
    const snapshot: OwnedUiSnapshot = {
      contractVersion: 1,
      snapshotId: `snapshot-${this.#viewRevision}`,
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
    this.#lifecycle = "stopping";
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "stopping", reason: null });
    await this.#engine.dispose();
    this.#lifecycle = "stopped";
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "stopped", reason: null });
    this.#emitView();
    try { await this.flushEvents(); } catch (error) { if (!(error instanceof EngineDeliveryError)) throw error; }
  }

  #requireWorkflowSession(): PiSessionApi {
    if (this.#disposed || !this.#engine.runtime || !this.#engine.session) throw new Error("engine adapter is not running");
    return this.#engine.session;
  }

  async #perform(command: OwnedUiCommand): Promise<void> {
    const runtime = this.#engine.runtime;
    const session = this.#engine.session;
    const generation = this.#engine.generation;
    if (!runtime || !session) throw new Error("engine session is unavailable");

    switch (command.type) {
      case "prompt":
      case "steer":
      case "follow-up":
      case "abort":
      case "retry":
      case "compact": {
        const result = await this.#engine.sessionCommands?.execute(
          command.type === "prompt" || command.type === "steer" || command.type === "follow-up"
            ? {
                type: command.type,
                text: command.text,
                ...(command.images === undefined ? {} : { images: [...command.images] }),
              }
            : { type: command.type },
        );
        if (!result || result.outcome === "rejected" || result.outcome === "failed") {
          throw new Error(command.type === "retry" ? "no previous prompt is available to retry" : `Pi session command failed: ${command.type}`);
        }
        return;
      }
      case "set-model": {
        const model = runtime.services.modelRuntime.getModel(
          command.model.providerId,
          command.model.modelId,
        );
        if (!model) {
          throw new Error(`model is unavailable: ${command.model.providerId}/${command.model.modelId}`);
        }
        await session.setModel(model);
        if (generation === this.#engine.generation && !this.#delivery.overloaded && !this.#admissionStopped) this.#activeModel = { ...command.model };
        return;
      }
      case "set-thinking-level":
        session.setThinkingLevel(command.thinkingLevel);
        this.#thinkingLevel = command.thinkingLevel;
        return;
      case "new-session":
        await runtime.newSession();
        return;
      case "resume-session":
        await runtime.switchSession(command.sessionPath);
        return;
      case "resize-surface":
        this.#terminal = { ...command.surface };
        this.#emitEvent({ type: "terminal-surface", surface: this.#terminal });
        return;
      case "shutdown":
        await this.dispose();
        return;
      case "set-setting":
      case "apply-customization":
      case "remove-customization":
        throw new Error("owned UI state commands belong to the owned UI layer, not the Pi engine adapter");
    }
  }

  // Invariant: the runtime already advanced the generation and subscribed; this rebuilds what the view derives from a session.
  #sessionReplaced(session: PiSessionApi): void {
    this.#delivery.discardObsolete(this.#engine.generation);
    this.#commands.reset();
    this.#editor = {
      text: "",
      queuedSubmissions: [],
      selection: null,
      cursorOffset: 0,
      historyRevision: this.#editor.historyRevision + 1,
      submitEnabled: true,
    };
    this.#status = { ...this.#status, workingMessage: null, workingProgress: null, badges: [] };
    this.#events.reset();
    this.#activeModel = readModel(session.model);
    this.#reconcileActiveModelAvailability();
    this.#thinkingLevel = readThinkingLevel(session.thinkingLevel);
    this.#projection.assets.clear();
    // Invariant: a new binding cannot inherit arguments/results from a reused invocation id.
    this.#setTranscript([]);
    this.#setTranscript(this.#projection.rebuild(session.messages, "finalized"));
    if (this.#extensions.attached) void this.#extensions.rebind();
  }

  #reconcileActiveModelAvailability(): void {
    const modelRuntime = this.#engine.runtime?.services.modelRuntime;
    if (!modelRuntime) {
      this.#activeModel = null;
      return;
    }
    const available = modelRuntime.getAvailableSnapshot?.() ?? [];
    const sessionModel = readModel(this.#engine.session?.model);
    const authoritative = this.#activeModel ?? sessionModel;
    if (authoritative === null) return;
    const remainsAvailable = available.some(model =>
      stringProperty(model, "provider") === authoritative.providerId
        && stringProperty(model, "id") === authoritative.modelId);
    this.#activeModel = remainsAvailable ? authoritative : null;
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
    this.#usageCache = undefined;
    this.#viewRevision += 1;
    this.#emitEvent({ type: "session-view", view: this.view() });
  }

  #emitEvent(value: PiEmittedEvent): void {
    if (value.type !== "session-view") this.#viewRevision += 1;
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
    this.#status = { ...this.#status, workingMessage: null, workingProgress: null };
    this.#lifecycle = this.#disposed ? "stopped" : canResume ? "ready" : "failed";
    this.#editor = { ...this.#editor, submitEnabled: canResume && !this.#disposed };
    this.#viewRevision += 1;
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
    const diagnostic: OwnedUiDiagnostics = {
      sequence: this.#diagnostics.length,
      code,
      severity,
      message,
      recoverable,
    };
    this.#diagnostics.push(diagnostic);
    if (this.#diagnostics.length > 100) this.#diagnostics.shift();
    this.#status = {
      ...this.#status,
      diagnostics: [...this.#status.diagnostics, message].slice(-8),
    };
    return diagnostic;
  }
}

export async function createPiEngineAdapter(
  options: PiEngineAdapterOptions = {},
): Promise<PiEngineAdapter> {
  const adapter = new PiEngineAdapter(options);
  await adapter.start();
  return adapter;
}
