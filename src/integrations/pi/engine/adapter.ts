import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import type { PiSessionForkPrompt, PiSessionSelection } from "./session-selection.js";
import { promisify } from "node:util";
import { PRODUCT_IDENTITY } from "../../../product-identity.js";
import { configureOwnedHttpDispatcher } from "./http-dispatcher.js";
import { PiTranscriptProjection } from "./transcript-projection.js";
import { finiteNumber, isRecord, readModel, readThinkingLevel, stringProperty, stringValue, textFromContent } from "./message-values.js";
import {
  DefaultPackageManager,
  getAgentDir,
  VERSION,
  type AgentSession,
  type AgentSessionRuntime,
  type AgentSessionServices,
  type ExtensionUIContext,
} from "../startup-public.js";
import {
  OWNED_UI_EXTENSION_CONTRACT_VERSION,
  OWNED_UI_EXTENSION_RENDER_CALLBACKS,
  OWNED_UI_EXTENSION_UI_CALLBACKS,
  OWNED_UI_EXTENSION_UI_PROPERTIES,
  CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION,
  transcriptToolState,
  assertOwnedUiCommand,
  assertOwnedUiExtensionUiPort,
  assertOwnedUiPromptSuggestionRequest,
  assertOwnedUiPromptSuggestionResult,
  assertOwnedUiSnapshot,
  normalizePromptSuggestionCandidate,
  type OwnedUiCommand,
  type OwnedUiCommandOutcome,
  type OwnedUiDiagnostics,
  type OwnedUiEditorState,
  type OwnedUiImageAttachment,
  type OwnedUiPromptSuggestionGeneratorPort,
  type OwnedUiPromptSuggestionReasoning,
  type OwnedUiPromptSuggestionRequest,
  type OwnedUiPromptSuggestionResult,
  type OwnedUiEvent,
  type OwnedUiExtensionUiPort,
  type OwnedUiModelInfo,
  type OwnedUiSessionViewModel,
  type OwnedUiSnapshot,
  type OwnedUiStatusView,
  type OwnedUiTerminalSurface,
  type OwnedUiThinkingLevel,
  type OwnedUiTranscriptBlock,
  type OwnedUiUsageView,
} from "../../../contracts/owned-ui/index.js";
import {
  PINNED_PI_SETTINGS_CALLBACKS,
  PINNED_PI_WORKFLOW_COMMAND_NAMES,
  type PiAuthenticationProviderOption,
  type PiBashWorkflowResult,
  type PiPinnedSettingsCallback,
  type PiPinnedSettingsSnapshot,
  type PiProjectTrustContext,
  type PiProjectTrustUpdate,
  type PiScopedModelsContext,
  type PiScopedModelsRefreshResult,
  type PiSessionResumeMetadata,
  type PiSessionSelectorContext,
  type PiTreeSelectorContext,
  type PiWorkflowAutocompleteCommand,
  type PiWorkflowHost,
  type PiWorkflowInteractionHost,
  type PiWorkflowOption,
  type PiWorkflowRequest,
  type PiWorkflowResult,
} from "./workflows.js";
import { createPiRuntimeIntegration } from "./runtime-integration.js";
import { PiSessionCommandIntegration } from "./session-integration.js";
import { observeCompactionProgress, type CompactionProgressObserver } from "./compaction-progress.js";
import { PiSettingsIntegration } from "./settings-integration.js";
import type { PiSettingOwnerHandlers } from "./settings-effects.js";
import type { PiProjectTrustPreflightPrompt } from "./project-trust-preflight.js";
import type { AgentJsonValue, AgentSettingOwner } from "../../../contracts/agent-engine/index.js";

import { PiEventDelivery, type PiEmittedEvent } from "./event-delivery.js";
import { PiWorkflowContexts } from "./workflow-contexts.js";
import { PiWorkflowRunner } from "./workflow-runner.js";
import { defaultWorkflowHost, workflowResult } from "./workflow-support.js";

/** Explicit flush failure when required delivery was interrupted rather than completed. */
export class EngineDeliveryError extends Error {
  constructor() { super("Engine delivery did not complete"); this.name = "EngineDeliveryError"; }
}
const execFileAsync = promisify(execFile);


export interface PiEngineRuntimeFactoryInput {
  readonly cwd: string;
  readonly agentDir: string;
  readonly sessionId: string;
  readonly sessionPath?: string;
  readonly sessionSelection?: PiSessionSelection;
  readonly sessionForkPrompt?: PiSessionForkPrompt;
  readonly projectTrustPrompt?: PiProjectTrustPreflightPrompt;
}

type PiSessionApi = AgentSession;
type PiRuntimeApi = AgentSessionRuntime;
type PiServicesApi = AgentSessionServices;

export type PiEngineRuntimeFactory = (input: PiEngineRuntimeFactoryInput) => Promise<AgentSessionRuntime>;

export interface OwnedPiResourceSummary {
  readonly kind: "skill" | "prompt-template" | "agent-context" | "system-prompt" | "theme";
  readonly id: string;
  readonly label: string;
  readonly sourcePath: string | null;
  readonly diagnostic: string | null;
}

export interface OwnedPiExtensionSourceSummary {
  readonly source: string;
  readonly scope: "user" | "project" | "temporary";
  readonly origin: "package" | "top-level";
  readonly baseDir: string | null;
}

export interface OwnedPiExtensionResourceSummary {
  readonly kind: "extension";
  readonly id: string;
  readonly sourcePath: string | null;
  readonly resolvedPath: string | null;
  readonly sourceInfo: OwnedPiExtensionSourceSummary | null;
  readonly loaded: boolean;
  readonly hidden: boolean;
  readonly diagnostic: string | null;
}

export interface OwnedPiVisualExtensionSupport {
  readonly available: boolean;
  readonly contractComplete: true;
  readonly contractVersion: typeof OWNED_UI_EXTENSION_CONTRACT_VERSION;
  readonly binding: "bound" | "unbound";
  readonly uiCallbacks: typeof OWNED_UI_EXTENSION_UI_CALLBACKS;
  readonly uiProperties: typeof OWNED_UI_EXTENSION_UI_PROPERTIES;
  readonly renderCallbacks: typeof OWNED_UI_EXTENSION_RENDER_CALLBACKS;
  readonly diagnostic: string;
}

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
  readonly checkPackageUpdates?: (settingsManager: PiServicesApi["settingsManager"]) => Promise<readonly string[]>;
}

export interface AdapterCommandResult {
  readonly outcome: OwnedUiCommandOutcome;
  readonly diagnostic: string | null;
}

const DEFAULT_SURFACE: OwnedUiTerminalSurface = {
  columns: 100,
  rows: 32,
  focusedRegion: "editor",
  hardwareCursor: false,
};

/** Owns the pinned Pi session lifecycle and translates its events into the neutral agent-engine contract. */
export class PiEngineAdapter implements OwnedUiPromptSuggestionGeneratorPort {
  readonly #runtimeFactory: PiEngineRuntimeFactory;
  readonly #checkPackageUpdates: (settingsManager: PiServicesApi["settingsManager"]) => Promise<readonly string[]>;
  #cwd: string;
  readonly #agentDir: string;
  readonly #sessionId: string;
  readonly #sessionPath: string | undefined;
  readonly #sessionSelection: PiSessionSelection | undefined;
  readonly #sessionForkPrompt: PiSessionForkPrompt | undefined;
  readonly #workflowHost: PiWorkflowHost;
  #workflowInteraction: PiWorkflowInteractionHost;
  readonly #contexts: PiWorkflowContexts;
  readonly #workflows: PiWorkflowRunner;
  #runtime: PiRuntimeApi | undefined;
  #session: PiSessionApi | undefined;
  #unsubscribe: (() => void) | undefined;
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
  #sessionGeneration = 0;
  #sessionBindingGeneration = 0;
  #status: OwnedUiStatusView = {
    title: "Pi",
    workingMessage: null,
    diagnostics: [],
    badges: [],
  };
  #terminal: OwnedUiTerminalSurface = DEFAULT_SURFACE;
  #activeModel: OwnedUiModelInfo | null = null;
  #thinkingLevel: OwnedUiThinkingLevel = "medium";
  #activeCommandIds: string[] = [];
  readonly #completedCommands = new Map<string, AdapterCommandResult>();
  readonly #projection = new PiTranscriptProjection({
    retryAttempt: () => this.#session?.retryAttempt ?? 0,
    blockChanged: block => this.#emitEvent({ type: "transcript-block", block }),
  });
  #usageCache: OwnedUiUsageView | undefined;
  #diagnostics: OwnedUiDiagnostics[] = [];
  // Invariant: every port closes over adapter state read at call time, so delivery is built before a session binds.
  readonly #delivery = new PiEventDelivery({
    sessionId: () => this.#sessionId,
    sessionGeneration: () => this.#sessionGeneration,
    transcriptBlock: id => this.#projection.block(id),
    retainEvent: event => this.#projection.assets.retainEvent(event),
    isPendingCommand: correlationId => this.#pendingCommands.has(correlationId),
    cancelForOverload: () => this.#cancelForOverload(),
    reconcileOverload: cancelled => this.#reconcileOverload(cancelled),
    listenerFailed: message => { this.#recordDiagnostic("warning", "event-listener", message, true); },
  });
  #admissionStopped = false;
  #runningCommands = 0;
  readonly #pendingCommands = new Map<string, { type: OwnedUiCommand["type"]; cancel(): void }>();
  #agentRunActive = false;
  #agentRunSequence = 0;
  #assistantResponseSequence = 0;
  #statusKind: "working" | "retry" | "compaction" | null = null;
  #sessionCommands: PiSessionCommandIntegration | undefined;
  #compactionProgress: CompactionProgressObserver | null = null;
  #gitBranch: string | null = null;
  #extensionUi: ExtensionUIContext | undefined;
  #extensionShutdown: (() => void | Promise<void>) | undefined;
  #extensionBound = false;
  #disposed = false;
  readonly #settingsProductMode: "bare" | "comparison";
  readonly #projectTrustPrompt: PiProjectTrustPreflightPrompt | undefined;
  #settingsIntegration: PiSettingsIntegration | undefined;
  #settingsIntegrationManager: unknown;

  readonly #availableThemes: (() => readonly string[]) | null;
  constructor(options: PiEngineAdapterOptions = {}) {
    this.#cwd = options.cwd ?? process.cwd();
    this.#agentDir = options.agentDir ?? getAgentDir();
    this.#sessionId = options.sessionId ?? "owned-session-1";
    this.#sessionPath = options.sessionPath;
    this.#sessionSelection = options.sessionSelection;
    this.#sessionForkPrompt = options.sessionForkPrompt;
    this.#runtimeFactory = options.createRuntime ?? createDefaultPiRuntime;
    this.#checkPackageUpdates = options.checkPackageUpdates
      ?? (options.createRuntime
        ? async () => []
        : settingsManager => checkDefaultPiPackageUpdates(this.#cwd, this.#agentDir, settingsManager));
    this.#workflowHost = options.workflowHost ?? defaultWorkflowHost();
    this.#availableThemes = options.availableThemes ?? null;
    this.#settingsProductMode = options.settingsProductMode ?? "bare";
    this.#projectTrustPrompt = options.projectTrustPrompt;
    this.#workflowInteraction = { prompt: async () => null, notify() {} };
    this.#contexts = new PiWorkflowContexts({ agentDir: this.#agentDir }, {
      cwd: () => this.#cwd,
      session: () => this.#session,
      runtime: () => this.#runtime,
      disposed: () => this.#disposed,
      activeModel: () => this.#activeModel,
      emitView: () => { this.#emitView(); },
    });
    this.#workflows = new PiWorkflowRunner({ agentDir: this.#agentDir, host: this.#workflowHost, contexts: this.#contexts }, {
      session: () => this.#session,
      runtime: () => this.#runtime,
      disposed: () => this.#disposed,
      sessionGeneration: () => this.#sessionGeneration,
      interaction: () => this.#workflowInteraction,
      admissionStopped: () => this.#delivery.overloaded || this.#admissionStopped || this.#disposed,
      pendingCommandCount: () => this.#pendingCommands.size,
      beginRunning: () => { this.#runningCommands++; },
      endRunning: () => { this.#runningCommands--; },
      activeModel: () => this.#activeModel,
      setActiveModel: model => { this.#activeModel = model; },
      thinkingLevel: () => this.#thinkingLevel,
      setThinkingLevel: level => { this.#thinkingLevel = level; },
      emitView: () => { this.#emitView(); },
      reconcileActiveModelAvailability: () => { this.#reconcileActiveModelAvailability(); },
      bindExtensionUiToSession: () => this.#bindExtensionUiToSession(),
      applyPinnedSetting: selection => this.#applyPinnedSetting(selection),
      snapshot: () => this.snapshot(),
      dispose: () => this.dispose(),
    });
  }

  setWorkflowInteractionHost(interaction: PiWorkflowInteractionHost): void {
    this.#workflowInteraction = interaction;
  }

  get sessionId(): string {
    return this.#sessionId;
  }

  get sessionGeneration(): number {
    return this.#sessionGeneration;
  }

  /** Actual session replacements, excluding delivery-only invalidation of callbacks. */
  get sessionBindingGeneration(): number { return this.#sessionBindingGeneration; }

  get cwd(): string {
    return this.#runtime?.cwd ?? this.#cwd;
  }

  get agentDir(): string {
    return this.#agentDir;
  }

  resolveTranscriptImage(assetId: string): OwnedUiImageAttachment | null {
    return this.#projection.assets.resolve(assetId);
  }

  currentSessionFile(): string | null {
    const value = this.#session?.sessionManager?.getSessionFile?.();
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  currentSessionResumeMetadata(): PiSessionResumeMetadata | null {
    const manager = this.#session?.sessionManager;
    if (manager === undefined
      || typeof manager.isPersisted !== "function"
      || typeof manager.getSessionId !== "function"
      || typeof manager.getSessionDir !== "function"
      || typeof manager.usesDefaultSessionDir !== "function"
      || manager.isPersisted() !== true
      || !existsSync(this.currentSessionFile() ?? "")) return null;
    const sessionId = manager.getSessionId();
    const sessionDir = manager.getSessionDir();
    if (!sessionId || !sessionDir) return null;
    return { sessionId, sessionDir, usesDefaultSessionDir: manager.usesDefaultSessionDir() };
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  suggestionReasoningPolicy(): OwnedUiPromptSuggestionReasoning {
    const session = this.#session;
    if (!session?.model) return "unavailable";
    if (!session.model.reasoning) return "ordinary";
    // Performance: the run's own level keeps the provider's thinking parameters, and the cached prefix, identical.
    return readSuggestionReasoning(session.thinkingLevel);
  }

  async generate(request: OwnedUiPromptSuggestionRequest): Promise<OwnedUiPromptSuggestionResult> {
    assertOwnedUiPromptSuggestionRequest(request);
    const identity = request.identity;
    const session = this.#session;
    const runtime = this.#runtime;
    const activeModel = this.#activeModel;
    if (this.#disposed || this.#delivery.overloaded || this.#admissionStopped || session === undefined || runtime === undefined || request.signal.aborted
      || identity.sessionId !== this.#sessionId
      || identity.sessionGeneration !== this.#sessionGeneration
      || identity.runSequence !== this.#agentRunSequence
      || identity.responseSequence !== this.#assistantResponseSequence
      || activeModel === null
      || identity.model.providerId !== activeModel.providerId
      || identity.model.modelId !== activeModel.modelId) {
      return { identity, outcome: request.signal.aborted ? "cancelled" : "unavailable", text: null };
    }

    const model = session.model;
    const agent = session.agent;
    const agentState = agent.state;
    const policy = this.suggestionReasoningPolicy();
    if (model === undefined || policy === "unavailable" || typeof runtime.services.modelRuntime.completeSimple !== "function") {
      return { identity, outcome: "unavailable", text: null };
    }
    // Performance: mirror the primary loop's request shape so the provider serves the conversation prefix
    // from the run's prompt cache. `onResponse` stays out: extensions must not see a suggestion as a response.
    const reasoning = policy === "ordinary" || policy === "off" ? undefined : policy;
    let response: unknown;
    try {
      const transformed = typeof agent.transformContext === "function"
        ? await agent.transformContext(agentState.messages, request.signal)
        : agentState.messages;
      const messages = typeof agent.convertToLlm === "function"
        ? await agent.convertToLlm(transformed)
        : transformed.filter(message => message.role === "user" || message.role === "assistant" || message.role === "toolResult");
      response = await runtime.services.modelRuntime.completeSimple(model, {
        systemPrompt: agentState.systemPrompt,
        messages: [
          ...messages,
          { role: "user", content: CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION, timestamp: Date.now() },
        ],
        tools: agentState.tools,
      }, {
        signal: request.signal,
        ...(reasoning === undefined ? {} : { reasoning }),
        ...(agent.sessionId === undefined ? {} : { sessionId: agent.sessionId }),
        ...(agent.thinkingBudgets === undefined ? {} : { thinkingBudgets: agent.thinkingBudgets }),
        ...(agent.transport === undefined ? {} : { transport: agent.transport }),
        ...(agent.onPayload === undefined ? {} : { onPayload: agent.onPayload }),
      });
    } catch {
      return { identity, outcome: request.signal.aborted ? "cancelled" : "provider-failure", text: null };
    }
    if (request.signal.aborted || (isRecord(response) && response.stopReason === "aborted")) {
      return { identity, outcome: "cancelled", text: null };
    }
    if (!isRecord(response) || stringValue(response.errorMessage) !== undefined || response.stopReason === "error") {
      return { identity, outcome: "provider-failure", text: null };
    }
    const content = Array.isArray(response.content) ? response.content : [];
    if (response.stopReason === "length" || content.some(block => isRecord(block) && block.type === "toolCall")) {
      return { identity, outcome: "rejected", text: null };
    }
    // Security: validate all text, not just the first block of a multi-part response.
    const rawText = content.filter(block => isRecord(block) && block.type === "text")
      .map(block => stringValue(block.text) ?? "").join("\n");
    const text = normalizePromptSuggestionCandidate(rawText);
    const result: OwnedUiPromptSuggestionResult = text === null
      ? { identity, outcome: rawText.trim() ? "rejected" : "empty", text: null }
      : { identity, outcome: "candidate", text };
    assertOwnedUiPromptSuggestionResult(result);
    return result;
  }

  async start(): Promise<OwnedUiSessionViewModel> {
    if (this.#runtime) return this.view();
    const runtime = await this.#runtimeFactory({
      cwd: this.#cwd,
      agentDir: this.#agentDir,
      sessionId: this.#sessionId,
      ...(this.#sessionPath === undefined ? {} : { sessionPath: this.#sessionPath }),
      ...(this.#sessionSelection === undefined ? {} : { sessionSelection: this.#sessionSelection }),
      ...(this.#sessionForkPrompt === undefined ? {} : { sessionForkPrompt: this.#sessionForkPrompt }),
      ...(this.#projectTrustPrompt === undefined ? {} : { projectTrustPrompt: this.#projectTrustPrompt }),
    }).catch(error => {
      this.#lifecycle = "failed";
      this.#addDiagnostic("error", "engine-startup", error instanceof Error ? error.message : String(error), false);
      throw error;
    });
    this.#runtime = runtime;
    this.#cwd = runtime.cwd ?? this.#cwd;
    this.#gitBranch = await readGitBranch(this.#cwd);
    this.#terminal = {
      ...this.#terminal,
      hardwareCursor: runtime.services.settingsManager?.getShowHardwareCursor?.() ?? this.#terminal.hardwareCursor,
    };
    runtime.setRebindSession(async session => {
      if (this.#delivery.overloaded || this.#admissionStopped || this.#disposed) return;
      this.#bindSession(session);
      this.#emitView();
    });
    for (const diagnostic of [...runtime.diagnostics, ...runtime.services.diagnostics]) {
      this.#addDiagnostic(
        diagnostic.type === "error" ? "error" : diagnostic.type === "warning" ? "warning" : "info",
        "engine-startup",
        diagnostic.message,
        diagnostic.type !== "error",
      );
    }
    this.#bindSession(runtime.session);
    await this.#announceChangelog(runtime.services.settingsManager);
    this.#lifecycle = "ready";
    this.#editor = { ...this.#editor, submitEnabled: true };
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "ready", reason: null });
    this.#emitView();
    void this.#announcePackageUpdates(runtime.services.settingsManager);
    return this.view();
  }

  async #announceChangelog(settingsManager: PiServicesApi["settingsManager"]): Promise<void> {
    if (!settingsManager || typeof settingsManager.getLastChangelogVersion !== "function"
      || typeof settingsManager.setLastChangelogVersion !== "function") return;
    if ((this.#session?.messages.length ?? 0) > 0) return;
    const lastVersion = settingsManager.getLastChangelogVersion();
    if (lastVersion === VERSION) return;
    if (!lastVersion) {
      settingsManager.setLastChangelogVersion(VERSION);
      await settingsManager.flush();
      return;
    }
    const markdown = await this.#workflowHost.readChangelog(lastVersion).catch(() => "");
    if (markdown.trim().length > 0) {
      this.#addDiagnostic(
        "info",
        settingsManager.getCollapseChangelog() ? "changelog-collapsed" : "changelog-expanded",
        markdown,
        true,
      );
      settingsManager.setLastChangelogVersion(VERSION);
      await settingsManager.flush();
    }
  }

  async #announcePackageUpdates(settingsManager: PiServicesApi["settingsManager"]): Promise<void> {
    if (process.env.PI_OFFLINE) return;
    let updates: readonly string[];
    try {
      updates = await this.#checkPackageUpdates(settingsManager);
    } catch {
      return;
    }
    if (this.#disposed || updates.length === 0) return;
    const packages = updates.map(name => `- ${name}`).join("\n");
    this.#addDiagnostic(
      "info",
      "package-updates",
      `Package updates are available. Run ${PRODUCT_IDENTITY.commandName} pi update --extensions\nPackages:\n${packages}`,
      true,
    );
    this.#emitView();
  }

  onEvent(listener: (event: OwnedUiEvent) => void): () => void {
    return this.#delivery.subscribe(listener, this.#delivery.stamp({ type: "session-view", view: this.view() }));
  }

  /** Developer-only pressure evidence; never mirrored into visible diagnostic/status arrays. */
  deliveryDiagnostics() {
    return { ...this.#delivery.diagnostics(), pendingCommands: this.#pendingCommands.size + this.#workflows.pendingCount };
  }

  async flushEvents(): Promise<void> {
    const failed = this.#delivery.failed;
    await this.#delivery.settle();
    if (failed || this.#delivery.failed || this.#disposed && this.#lifecycle !== "stopped") {
      this.#delivery.clearFailure(); throw new EngineDeliveryError();
    }
  }

  nonVisualResources(): readonly OwnedPiResourceSummary[] {
    const loader = this.#runtime?.services.resourceLoader;
    if (!loader) return [];
    const resources: OwnedPiResourceSummary[] = [];
    const skills = collectionResult(loader.getSkills(), "skills");
    for (const [index, skill] of skills.values.entries()) {
      resources.push({
        kind: "skill",
        id: `skill-${index}-${stringProperty(skill, "name") ?? "unknown"}`,
        label: stringProperty(skill, "name") ?? "Unnamed skill",
        sourcePath: stringProperty(skill, "filePath") ?? stringProperty(skill, "path") ?? stringProperty(skill, "location") ?? null,
        diagnostic: null,
      });
    }
    resources.push(...skills.diagnostics.map((diagnostic, index) => ({
      kind: "skill" as const,
      id: `skill-diagnostic-${index}`,
      label: "Skill diagnostic",
      sourcePath: null,
      diagnostic,
    })));

    const prompts = collectionResult(loader.getPrompts(), "prompts");
    for (const [index, prompt] of prompts.values.entries()) {
      resources.push({
        kind: "prompt-template",
        id: `prompt-${index}-${stringProperty(prompt, "name") ?? "unknown"}`,
        label: stringProperty(prompt, "name") ?? "Prompt template",
        sourcePath: stringProperty(prompt, "filePath") ?? stringProperty(prompt, "path") ?? null,
        diagnostic: null,
      });
    }
    resources.push(...prompts.diagnostics.map((diagnostic, index) => ({
      kind: "prompt-template" as const,
      id: `prompt-diagnostic-${index}`,
      label: "Prompt diagnostic",
      sourcePath: null,
      diagnostic,
    })));

    const agentsFilesResult = loader.getAgentsFiles();
    const agentsFiles = unknownArray(isRecord(agentsFilesResult) ? agentsFilesResult.agentsFiles : undefined);
    for (const [index, file] of agentsFiles.entries()) {
      resources.push({
        kind: "agent-context",
        id: `agent-context-${index}`,
        label: "Agent context",
        sourcePath: stringProperty(file, "path") ?? null,
        diagnostic: null,
      });
    }
    const systemPrompt = loader.getSystemPromptSource();
    if (isRecord(systemPrompt) && typeof systemPrompt.path === "string") {
      resources.push({
        kind: "system-prompt",
        id: "system-prompt",
        label: "System prompt",
        sourcePath: systemPrompt.path,
        diagnostic: null,
      });
    }
    for (const [index, source] of unknownArray(loader.getAppendSystemPromptSources()).entries()) {
      resources.push({
        kind: "system-prompt",
        id: `append-system-prompt-${index}`,
        label: "Append system prompt",
        sourcePath: stringProperty(source, "path") ?? null,
        diagnostic: null,
      });
    }
    if (loader.getThemes !== undefined) {
      const themes = collectionResult(loader.getThemes(), "themes");
      for (const [index, theme] of themes.values.entries()) {
        const sourcePath = stringProperty(theme, "sourcePath");
        if (!sourcePath) continue;
        resources.push({
          kind: "theme",
          id: `theme-${index}-${stringProperty(theme, "name") ?? "unknown"}`,
          label: stringProperty(theme, "name") ?? compactResourceLabel(sourcePath),
          sourcePath,
          diagnostic: null,
        });
      }
      resources.push(...themes.diagnostics.map((diagnostic, index) => ({
        kind: "theme" as const,
        id: `theme-diagnostic-${index}`,
        label: "Theme diagnostic",
        sourcePath: null,
        diagnostic,
      })));
    }
    return resources;
  }

  extensionResources(): readonly OwnedPiExtensionResourceSummary[] {
    const loader = this.#runtime?.services.resourceLoader;
    if (loader?.getExtensions === undefined) return [];
    let result: unknown;
    try {
      result = loader.getExtensions();
    } catch (error) {
      return [extensionResourceDiagnostic(0, null, `Extension discovery failed: ${error instanceof Error ? error.message : String(error)}`)];
    }
    if (!isRecord(result)) return [extensionResourceDiagnostic(0, null, "Extension discovery returned a malformed result")];

    const resources: OwnedPiExtensionResourceSummary[] = [];
    if (!Array.isArray(result.extensions)) {
      resources.push(extensionResourceDiagnostic(resources.length, null, "Extension discovery returned a malformed extensions collection"));
    } else {
      for (const extension of result.extensions) {
        if (!isRecord(extension) || typeof extension.path !== "string" || extension.path.length === 0
          || typeof extension.resolvedPath !== "string" || extension.resolvedPath.length === 0
          || (extension.hidden !== undefined && typeof extension.hidden !== "boolean")) {
          resources.push(extensionResourceDiagnostic(resources.length, null, "Extension discovery returned malformed extension metadata"));
          continue;
        }
        resources.push({
          kind: "extension",
          id: `extension-${resources.length}`,
          sourcePath: extension.path,
          resolvedPath: extension.resolvedPath,
          sourceInfo: extensionSourceSummary(extension.sourceInfo),
          loaded: true,
          hidden: extension.hidden === true,
          diagnostic: null,
        });
      }
    }

    if (!Array.isArray(result.errors)) {
      resources.push(extensionResourceDiagnostic(resources.length, null, "Extension discovery returned a malformed errors collection"));
    } else {
      for (const error of result.errors) {
        if (!isRecord(error) || typeof error.path !== "string" || typeof error.error !== "string") {
          resources.push(extensionResourceDiagnostic(resources.length, null, "Extension discovery returned malformed error metadata"));
          continue;
        }
        resources.push(extensionResourceDiagnostic(resources.length, error.path, error.error));
      }
    }
    return resources;
  }

  visualExtensionSupport(): OwnedPiVisualExtensionSupport {
    return {
      available: this.#extensionBound,
      contractComplete: true,
      contractVersion: OWNED_UI_EXTENSION_CONTRACT_VERSION,
      binding: this.#extensionBound ? "bound" : "unbound",
      uiCallbacks: OWNED_UI_EXTENSION_UI_CALLBACKS,
      uiProperties: OWNED_UI_EXTENSION_UI_PROPERTIES,
      renderCallbacks: OWNED_UI_EXTENSION_RENDER_CALLBACKS,
      diagnostic: this.#extensionBound
        ? `Pinned public extension UI lifecycle is bound through the ${PRODUCT_IDENTITY.displayName}-owned bridge.`
        : `The complete ${PRODUCT_IDENTITY.displayName}-owned extension UI contract is available; the active session has not been bound to the owned UI bridge.`,
    };
  }

  async bindExtensionUi(ui: unknown, shutdown?: () => void | Promise<void>): Promise<void> {
    assertPiExtensionUiContext(ui);
    this.#extensionUi = ui;
    this.#extensionShutdown = shutdown;
    await this.#bindExtensionUiToSession();
  }

  async unbindExtensionUi(): Promise<void> {
    this.#extensionUi = undefined;
    this.#extensionShutdown = undefined;
    this.#extensionBound = false;
  }

  workflowAutocompleteCommands(): readonly PiWorkflowAutocompleteCommand[] {
    const commands: PiWorkflowAutocompleteCommand[] = [
      {
        name: "model",
        description: "Select model (opens selector UI)",
        argumentHint: "<provider/model>",
        argumentOptions: this.#contexts.modelOptions(),
        source: "builtin",
      },
      {
        name: "login",
        description: "Configure provider authentication",
        argumentHint: "<provider>",
        argumentOptions: this.#contexts.loginOptions().map(option => ({ ...option, id: option.id.split(":").at(-1) ?? option.id })),
        source: "builtin",
      },
    ];
    const usedNames = new Set<string>(PINNED_PI_WORKFLOW_COMMAND_NAMES);
    const loader = this.#runtime?.services.resourceLoader;
    if (!loader) return commands;
    const prompts = collectionResult(loader.getPrompts(), "prompts");
    for (const prompt of prompts.values) {
      const name = stringProperty(prompt, "name");
      if (!name || usedNames.has(name)) continue;
      const argumentHint = stringProperty(prompt, "argumentHint");
      commands.push({
        name,
        description: stringProperty(prompt, "description") ?? "Prompt template",
        ...(argumentHint === undefined ? {} : { argumentHint }),
        source: "prompt",
      });
      usedNames.add(name);
    }
    const settings = this.#runtime?.services.settingsManager;
    const skillsEnabled = settings?.getEnableSkillCommands?.() !== false;
    if (skillsEnabled) {
      const skills = collectionResult(loader.getSkills(), "skills");
      for (const skill of skills.values) {
        const resourceName = stringProperty(skill, "name");
        const name = resourceName ? `skill:${resourceName}` : undefined;
        if (!name || usedNames.has(name)) continue;
        commands.push({ name, description: stringProperty(skill, "description") ?? "Skill", source: "skill" });
        usedNames.add(name);
      }
    }
    const extensionCommands = this.#session?.extensionRunner?.getRegisteredCommands?.();
    if (Array.isArray(extensionCommands)) {
      const registered = extensionCommands.filter(isRecord);
      for (const command of registered) {
        const name = stringProperty(command, "invocationName") ?? stringProperty(command, "name");
        if (!name || usedNames.has(name) || isPiPrefixedCompatibilityAlias(command, registered)) continue;
        commands.push({ name, description: stringProperty(command, "description") ?? "Extension command", source: "extension" });
        usedNames.add(name);
      }
    }
    return commands;
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
    return this.#runtime?.services.settingsManager.getThemeSetting();
  }

  /** Settings port for the live runtime, or null before the runtime is available. */
  settingsPort(): PiSettingsIntegration | null {
    const settings = this.#runtime?.services.settingsManager;
    if (!settings || typeof settings.getCompactionEnabled !== "function") return null;
    if (this.#settingsIntegration === undefined || this.#settingsIntegrationManager !== settings) {
      this.#settingsIntegrationManager = settings;
      configureOwnedHttpDispatcher(settings.getHttpIdleTimeoutMs());
      this.#settingsIntegration = new PiSettingsIntegration(settings, {
        ...(this.#availableThemes === null ? {} : { themes: this.#availableThemes }),
        thinkingLevels: () => {
          const levels = this.#runtime?.session?.getAvailableThinkingLevels?.();
          return Array.isArray(levels) ? levels.map(level => String(level)) : [];
        },
        productMode: this.#settingsProductMode,
      });
      this.#settingsIntegration.bindOwner("shell", {
        enableSkillCommands: { apply: value => {
          if (typeof value !== "boolean") throw new TypeError("Skill commands value is invalid");
          settings.setEnableSkillCommands(value);
        } },
        doubleEscapeAction: { apply: value => {
          if (value !== "tree" && value !== "fork" && value !== "none") throw new TypeError("Double-Escape action is invalid");
          settings.setDoubleEscapeAction(value);
        } },
        treeFilterMode: { apply: value => {
          if (value !== "default" && value !== "no-tools" && value !== "user-only" && value !== "labeled-only" && value !== "all") throw new TypeError("Tree filter mode is invalid");
          settings.setTreeFilterMode(value);
        } },
        showCacheMissNotices: { apply: value => {
          if (typeof value !== "boolean") throw new TypeError("Cache-miss notice setting is invalid");
          settings.setShowCacheMissNotices(value);
        } },
      });
      this.#settingsIntegration.bindOwner("startup", {
        // Invariant: deferred application is the owner operation: the next preflight reads
        // the persisted default before constructing project-backed services.
        defaultProjectTrust: { apply() {} },
        collapseChangelog: { apply() {} },
      });
      this.#settingsIntegration.bindOwner("agent", {
        autoCompact: { apply: value => {
          if (typeof value !== "boolean") throw new TypeError("Auto compact value is invalid");
          this.#requireWorkflowSession().setAutoCompactionEnabled(value);
        } },
        autoResizeImages: { apply: value => {
          if (typeof value !== "boolean") throw new TypeError("Auto-resize images value is invalid");
          settings.setImageAutoResize(value);
        } },
        blockImages: { apply: value => {
          if (typeof value !== "boolean") throw new TypeError("Block images value is invalid");
          settings.setBlockImages(value);
        } },
        steeringMode: { apply: value => {
          if (value !== "all" && value !== "one-at-a-time") throw new TypeError("Steering mode is invalid");
          this.#requireWorkflowSession().setSteeringMode(value);
        } },
        followUpMode: { apply: value => {
          if (value !== "all" && value !== "one-at-a-time") throw new TypeError("Follow-up mode is invalid");
          this.#requireWorkflowSession().setFollowUpMode(value);
        } },
        transport: { apply: value => {
          if (value !== "sse" && value !== "websocket" && value !== "websocket-cached" && value !== "auto") throw new TypeError("Transport is invalid");
          this.#requireWorkflowSession().agent.transport = value;
        } },
        httpIdleTimeoutMs: { apply: value => {
          if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new TypeError("HTTP idle timeout is invalid");
          // Invariant: provider streaming reads the manager per request; global fetch uses
          // the matching owned dispatcher and zero maps to disabled semantics.
          configureOwnedHttpDispatcher(value);
          settings.setHttpIdleTimeoutMs(value);
        } },
        thinkingLevel: { apply: value => {
          if (!isThinkingLevel(value)) throw new TypeError("Thinking level is invalid");
          this.#requireWorkflowSession().setThinkingLevel(value);
          this.#thinkingLevel = readThinkingLevel(this.#requireWorkflowSession().thinkingLevel);
          this.#emitView();
        } },
        warnings: { apply: value => {
          if (!isRecord(value) || Object.values(value).some(flag => typeof flag !== "boolean")) throw new TypeError("Warnings setting is invalid");
          settings.setWarnings(value);
        } },
      });
    }
    return this.#settingsIntegration;
  }

  /** Which settings surface this adapter serves; hidden-in-bare effects are unbindable in bare mode. */
  get settingsProductMode(): "bare" | "comparison" {
    return this.#settingsProductMode;
  }

  bindSettingsOwner(owner: AgentSettingOwner, handlers: PiSettingOwnerHandlers): () => void {
    const settings = this.settingsPort();
    if (settings === null) return () => {};
    return settings.bindOwner(owner, handlers);
  }

  pinnedSettingsSnapshot(): PiPinnedSettingsSnapshot {
    const session = this.#requireWorkflowSession();
    const settings = this.#runtime?.services.settingsManager;
    const setting = <T>(getter: (() => unknown) | undefined, fallback: T): T => {
      const value = getter?.call(settings);
      return value === undefined ? fallback : value as T;
    };
    const levels = session.getAvailableThinkingLevels?.();
    const themes = collectionResult(this.#runtime?.services.resourceLoader?.getThemes?.(), "themes").values
      .map(theme => stringProperty(theme, "name"))
      .filter((name): name is string => !!name);
    return {
      autoCompact: typeof session.autoCompactionEnabled === "boolean"
        ? session.autoCompactionEnabled
        : setting(settings?.getCompactionEnabled, true),
      showImages: setting(settings?.getShowImages, true),
      imageWidthCells: setting(settings?.getImageWidthCells, 80),
      autoResizeImages: setting(settings?.getImageAutoResize, true),
      blockImages: setting(settings?.getBlockImages, false),
      enableSkillCommands: setting(settings?.getEnableSkillCommands, true),
      steeringMode: session.steeringMode ?? setting(settings?.getSteeringMode, "one-at-a-time"),
      followUpMode: session.followUpMode ?? setting(settings?.getFollowUpMode, "one-at-a-time"),
      transport: setting(settings?.getTransport, "sse"),
      httpIdleTimeoutMs: setting(settings?.getHttpIdleTimeoutMs, 300_000),
      thinkingLevel: readThinkingLevel(session.thinkingLevel),
      availableThinkingLevels: Array.isArray(levels) ? levels.map(readThinkingLevel) : ["off", "minimal", "low", "medium", "high", "xhigh"],
      currentTheme: setting(settings?.getThemeSetting, setting(settings?.getTheme, "dark")),
      terminalTheme: "dark",
      availableThemes: themes.length > 0 ? themes : ["dark", "light"],
      hideThinkingBlock: setting(settings?.getHideThinkingBlock, false),
      mermaidRenderingMode: setting(settings?.getMermaidRenderingMode, "off"),
      showCacheMissNotices: setting(settings?.getShowCacheMissNotices, false),
      collapseChangelog: setting(settings?.getCollapseChangelog, true),
      enableInstallTelemetry: setting(settings?.getEnableInstallTelemetry, true),
      doubleEscapeAction: setting(settings?.getDoubleEscapeAction, "tree"),
      treeFilterMode: setting(settings?.getTreeFilterMode, "default"),
      showHardwareCursor: setting(settings?.getShowHardwareCursor, false),
      editorPaddingX: setting(settings?.getEditorPaddingX, 0),
      outputPad: setting(settings?.getOutputPad, 1),
      autocompleteMaxVisible: setting(settings?.getAutocompleteMaxVisible, 5),
      quietStartup: setting(settings?.getQuietStartup, false),
      defaultProjectTrust: setting(settings?.getDefaultProjectTrust, "ask"),
      clearOnShrink: setting(settings?.getClearOnShrink, false),
      showTerminalProgress: setting(settings?.getShowTerminalProgress, false),
      tuiMode: setting(settings?.getTuiMode, "regular"),
      fullscreenExitOutput: setting(settings?.getFullscreenExitOutput, "transcript"),
      fullscreenScrollbar: setting(settings?.getFullscreenScrollbar, "auto"),
      warnings: setting(settings?.getWarnings, { anthropicExtraUsage: true }),
    };
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
    this.#sessionCommands?.forgetQueuedImages();
    if (!isRecord(result)) return [];
    return [...readStringArray(result.steering), ...readStringArray(result.followUp)];
  }

  async applyPinnedSettingValue(callback: PiPinnedSettingsCallback, value: unknown): Promise<PiWorkflowResult> {
    try {
      return await this.#applyPinnedSetting(callback, value, true);
    } catch (error) {
      return workflowResult("settings", "failed", error instanceof Error ? error.message : String(error));
    }
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
        usage: this.#usageCache ??= this.#readUsage(),
        footer: {
          branch: this.#gitBranch,
          sessionName: this.#session?.sessionManager?.getSessionName() ?? null,
          availableProviderCount: new Set(this.#runtime?.services.modelRuntime.getAvailableSnapshot?.().map(model => model.provider).filter(provider => provider !== undefined) ?? []).size,
          extensionStatuses: [],
        },
      },
      terminal: { ...this.#terminal },
      activeModel: this.#activeModel === null ? null : { ...this.#activeModel },
      thinkingLevel: this.#thinkingLevel,
      activeCommandIds: [...this.#activeCommandIds],
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

  async execute(command: OwnedUiCommand): Promise<AdapterCommandResult> {
    assertOwnedUiCommand(command);
    if (command.sessionId !== this.#sessionId) {
      return this.#finishCommand(command, "rejected", "command targets a different owned session");
    }
    if (this.#disposed || !this.#runtime || !this.#session) {
      return this.#finishCommand(command, "rejected", "engine adapter is not running");
    }
    // Invariant: the bounded out-of-band cancellation path has one slot per admitted command.
    if (this.#delivery.overloaded || this.#admissionStopped || this.#pendingCommands.size + this.#workflows.pendingCount >= 32) return { outcome: "rejected", diagnostic: null };
    const existing = this.#completedCommands.get(command.correlationId);
    if (existing) return existing;
    if (this.#activeCommandIds.includes(command.correlationId)) {
      return this.#finishCommand(command, "rejected", "duplicate engine command correlation id");
    }

    this.#activeCommandIds.push(command.correlationId);
    const generation = this.#sessionGeneration;
    let cancelled = false;
    const cancellation = new Promise<AdapterCommandResult>(resolve => {
      this.#pendingCommands.set(command.correlationId, { type: command.type, cancel: () => {
        if (cancelled) return;
        cancelled = true;
        resolve(this.#recordCommand(command, "failed", null));
      } });
    });
    this.#emitEvent({ type: "command-outcome", correlationId: command.correlationId, outcome: "accepted", diagnostic: null });
    const operation = async (): Promise<AdapterCommandResult> => {
      try {
        if (cancelled) return { outcome: "failed", diagnostic: null };
        this.#runningCommands++;
        try { await this.#perform(command); } finally { this.#runningCommands--; }
        if (cancelled) return { outcome: "failed", diagnostic: null };
        if (generation === this.#sessionGeneration) this.#emitView();
        if (cancelled) return { outcome: "failed", diagnostic: null };
        return this.#recordCommand(command, "completed", null);
      } catch (error) {
        if (cancelled) return { outcome: "failed", diagnostic: null };
        const diagnostic = error instanceof Error ? error.message : String(error);
        this.#addDiagnostic("error", "engine-command", diagnostic, true);
        if (generation === this.#sessionGeneration) this.#emitView();
        return this.#recordCommand(command, "failed", diagnostic);
      }
    };
    try { return await Promise.race([operation(), cancellation]); }
    finally { this.#pendingCommands.delete(command.correlationId); }
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const pending of this.#pendingCommands.values()) if (pending.type !== "shutdown") pending.cancel();
    // Compatibility: /quit owns normal disposal and must report its actual completion, not cancel itself.
    this.#workflows.cancelPending("quit");
    this.#projection.assets.clear();
    this.#extensionBound = false;
    this.#extensionUi = undefined;
    this.#extensionShutdown = undefined;
    this.#lifecycle = "stopping";
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "stopping", reason: null });
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#compactionProgress?.dispose();
    this.#compactionProgress = null;
    await this.#runtime?.dispose();
    this.#lifecycle = "stopped";
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "stopped", reason: null });
    this.#emitView();
    try { await this.flushEvents(); } catch (error) { if (!(error instanceof EngineDeliveryError)) throw error; }
  }

  #requireWorkflowSession(): PiSessionApi {
    if (this.#disposed || !this.#runtime || !this.#session) throw new Error("engine adapter is not running");
    return this.#session;
  }

  async #applyPinnedSetting(selection: string, selectedValue?: unknown, hasSelectedValue = false): Promise<PiWorkflowResult> {
    if (!(PINNED_PI_SETTINGS_CALLBACKS as readonly string[]).includes(selection)) {
      return workflowResult("settings", "failed", `Unknown setting callback: ${selection}`);
    }
    const callback = selection as PiPinnedSettingsCallback;
    if (callback === "onCancel") return workflowResult("settings", "cancelled", "Settings cancelled");
    if (callback === "onThemePreview") return workflowResult("settings", "completed", "Theme preview refreshed");
    if (!hasSelectedValue) {
      const snapshot = this.pinnedSettingsSnapshot();
      const currentValues: Partial<Record<PiPinnedSettingsCallback, unknown>> = {
        onAutoCompactChange: snapshot.autoCompact,
        onShowImagesChange: snapshot.showImages,
        onImageWidthCellsChange: snapshot.imageWidthCells,
        onAutoResizeImagesChange: snapshot.autoResizeImages,
        onBlockImagesChange: snapshot.blockImages,
        onEnableSkillCommandsChange: snapshot.enableSkillCommands,
        onSteeringModeChange: snapshot.steeringMode,
        onFollowUpModeChange: snapshot.followUpMode,
        onTransportChange: snapshot.transport,
        onHttpIdleTimeoutMsChange: snapshot.httpIdleTimeoutMs,
        onThinkingLevelChange: snapshot.thinkingLevel,
        onThemeChange: snapshot.currentTheme,
        onHideThinkingBlockChange: snapshot.hideThinkingBlock,
        onMermaidRenderingModeChange: snapshot.mermaidRenderingMode,
        onShowCacheMissNoticesChange: snapshot.showCacheMissNotices,
        onCollapseChangelogChange: snapshot.collapseChangelog,
        onEnableInstallTelemetryChange: snapshot.enableInstallTelemetry,
        onQuietStartupChange: snapshot.quietStartup,
        onDefaultProjectTrustChange: snapshot.defaultProjectTrust,
        onDoubleEscapeActionChange: snapshot.doubleEscapeAction,
        onTreeFilterModeChange: snapshot.treeFilterMode,
        onShowHardwareCursorChange: snapshot.showHardwareCursor,
        onEditorPaddingXChange: snapshot.editorPaddingX,
        onOutputPadChange: snapshot.outputPad,
        onAutocompleteMaxVisibleChange: snapshot.autocompleteMaxVisible,
        onClearOnShrinkChange: snapshot.clearOnShrink,
        onShowTerminalProgressChange: snapshot.showTerminalProgress,
        onTuiModeChange: snapshot.tuiMode,
        onFullscreenExitOutputChange: snapshot.fullscreenExitOutput,
        onFullscreenScrollbarChange: snapshot.fullscreenScrollbar,
        onWarningsChange: snapshot.warnings,
      };
      selectedValue = currentValues[callback];
      hasSelectedValue = true;
    }
    const port = this.settingsPort();
    if (port === null) return workflowResult("settings", "failed", "Settings are unavailable");
    const key = settingKeyForCallback(callback);
    if (key === null) return workflowResult("settings", "failed", `${settingLabel(callback)} is unavailable in this runtime`);
    const result = await port.writeSetting(key, agentJsonValue(selectedValue));
    if (result.status === "failed" || result.status === "unavailable") {
      return workflowResult("settings", "failed", result.failure ?? result.limitationReason ?? `${settingLabel(callback)} is unavailable`);
    }
    this.#emitView();
    const suffix = result.status === "deferred" ? ` (${result.application})` : "";
    return workflowResult("settings", "completed", `${settingLabel(callback)}: ${String(selectedValue)}${suffix}`);
  }

  async #perform(command: OwnedUiCommand): Promise<void> {
    const runtime = this.#runtime;
    const session = this.#session;
    const generation = this.#sessionGeneration;
    if (!runtime || !session) throw new Error("engine session is unavailable");

    switch (command.type) {
      case "prompt":
      case "steer":
      case "follow-up":
      case "abort":
      case "retry":
      case "compact": {
        const result = await this.#sessionCommands?.execute(
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
        if (generation === this.#sessionGeneration && !this.#delivery.overloaded && !this.#admissionStopped) this.#activeModel = { ...command.model };
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

  #bindSession(session: PiSessionApi): void {
    this.#unsubscribe?.();
    for (const pending of this.#pendingCommands.values()) {
      if (pending.type !== "new-session" && pending.type !== "resume-session") pending.cancel();
    }
    this.#sessionGeneration += 1;
    this.#sessionBindingGeneration += 1;
    this.#delivery.discardObsolete(this.#sessionGeneration);
    this.#session = session;
    this.#activeCommandIds = [];
    this.#completedCommands.clear();
    this.#sessionCommands = new PiSessionCommandIntegration(session);
    this.#compactionProgress?.dispose();
    this.#compactionProgress = observeCompactionProgress(session, percent => {
      if (this.#session === session && !this.#disposed) this.#publishCompactionProgress(percent);
    });
    this.#editor = {
      text: "",
      queuedSubmissions: [],
      selection: null,
      cursorOffset: 0,
      historyRevision: this.#editor.historyRevision + 1,
      submitEnabled: true,
    };
    this.#status = { ...this.#status, workingMessage: null, workingProgress: null, badges: [] };
    this.#statusKind = null;
    this.#agentRunActive = false;
    this.#agentRunSequence = 0;
    this.#assistantResponseSequence = 0;
    this.#activeModel = readModel(session.model);
    this.#reconcileActiveModelAvailability();
    this.#thinkingLevel = readThinkingLevel(session.thinkingLevel);
    this.#projection.assets.clear();
    // Invariant: a new binding cannot inherit arguments/results from a reused invocation id.
    this.#setTranscript([]);
    this.#setTranscript(this.#projection.rebuild(session.messages, "finalized"));
    const generation = this.#sessionGeneration;
    this.#unsubscribe = session.subscribe(event => {
      if (generation === this.#sessionGeneration && !this.#disposed) this.#handlePiEvent(event);
    });
    if (this.#extensionUi !== undefined) void this.#bindExtensionUiToSession();
  }

  #reconcileActiveModelAvailability(): void {
    const modelRuntime = this.#runtime?.services.modelRuntime;
    if (!modelRuntime) {
      this.#activeModel = null;
      return;
    }
    const available = modelRuntime.getAvailableSnapshot?.() ?? [];
    const sessionModel = readModel(this.#session?.model);
    const authoritative = this.#activeModel ?? sessionModel;
    if (authoritative === null) return;
    const remainsAvailable = available.some(model =>
      stringProperty(model, "provider") === authoritative.providerId
        && stringProperty(model, "id") === authoritative.modelId);
    this.#activeModel = remainsAvailable ? authoritative : null;
  }

  async #bindExtensionUiToSession(): Promise<void> {
    const session = this.#session;
    const ui = this.#extensionUi;
    if (session === undefined || ui === undefined || session.bindExtensions === undefined) {
      this.#extensionBound = false;
      return;
    }
    try {
      await session.bindExtensions({
        uiContext: ui,
        mode: "tui",
        shutdownHandler: () => this.#extensionShutdown?.(),
        onError: error => {
          const message = isRecord(error) && typeof error.error === "string"
            ? error.error
            : error instanceof Error ? error.message : String(error);
          this.#addDiagnostic("warning", "extension-ui", message, true);
          this.#emitView();
        },
      });
      this.#extensionBound = true;
      this.#emitView();
    } catch (error) {
      this.#extensionBound = false;
      this.#addDiagnostic("error", "extension-ui-bind", error instanceof Error ? error.message : String(error), true);
      this.#emitView();
    }
  }

  #setTranscript(blocks: OwnedUiTranscriptBlock[]): void {
    // Invariant: lazy delivery snapshots must freeze before their authoritative source can be removed.
    if (!this.#delivery.seal()) { this.#delivery.beginOverload(); return; }
    this.#projection.replace(blocks);
  }

  // Invariant: the named work state is the only state a matching end may clear.
  #enterWorkState(kind: "working" | "retry" | "compaction", message: string): void {
    const wasBusy = this.#lifecycle === "busy";
    this.#statusKind = kind;
    this.#lifecycle = "busy";
    this.#status = { ...this.#status, workingMessage: message, workingProgress: null };
    if (!wasBusy) this.#emitEvent({ type: "session-lifecycle", lifecycle: "busy", reason: null });
    this.#emitEvent({ type: "status", status: this.#status });
  }

  // Invariant: ending retry or compaction cannot clear a different active work state.
  #endWorkState(kind: "retry" | "compaction"): void {
    if (this.#statusKind !== kind) return;
    if (this.#agentRunActive) {
      this.#enterWorkState("working", "Working");
      return;
    }
    this.#leaveWorkStates();
  }

  #leaveWorkStates(): void {
    this.#statusKind = null;
    this.#lifecycle = "ready";
    this.#status = { ...this.#status, workingMessage: null, workingProgress: null };
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "ready", reason: null });
    this.#emitEvent({ type: "status", status: this.#status });
  }

  // Invariant: progress belongs to the compaction state only and is published when the integer changes.
  #publishCompactionProgress(percent: number): void {
    if (this.#statusKind !== "compaction" || this.#status.workingProgress === percent) return;
    this.#status = { ...this.#status, workingProgress: percent };
    this.#emitEvent({ type: "status", status: this.#status });
  }

  // Rationale: a manual compaction ends with an idle session, so the engine would never consume
  // the messages queued during it; automatic compaction returns to a run or a pending prompt.
  #deliverQueuedAfterCompaction(): void {
    const commands = this.#sessionCommands;
    const generation = this.#sessionGeneration;
    if (commands === undefined) return;
    const report = (error: unknown): void => {
      if (generation !== this.#sessionGeneration || this.#disposed) return;
      this.#addDiagnostic("error", "engine-command", `Queued input could not be sent after compaction: ${error instanceof Error ? error.message : String(error)}`, true);
      this.#emitView();
    };
    commands.deliverQueuedAfterCompaction(report).catch(report);
  }

  #handlePiEvent(event: unknown): void {
    try { this.#applyPiEvent(event); }
    finally { this.#projection.assets.discardUnowned(); }
  }

  #applyPiEvent(event: unknown): void {
    if (!isRecord(event) || typeof event.type !== "string") return;
    // Invariant: usage moves at message and lifecycle boundaries, not with stream chunks, so the
    // two streaming event kinds keep the memo and everything else drops it.
    if (event.type !== "message_update" && event.type !== "tool_execution_update") this.#usageCache = undefined;
    switch (event.type) {
      case "agent_start":
        this.#agentRunActive = true;
        this.#agentRunSequence += 1;
        this.#emitEvent({ type: "agent-run-started" });
        this.#enterWorkState("working", "Working");
        return;
      case "message_start":
        this.#projection.upsertMessage(event.message, "live");
        return;
      case "message_update": {
        const delta = isRecord(event.assistantMessageEvent) && typeof event.assistantMessageEvent.delta === "string"
          ? event.assistantMessageEvent.delta
          : undefined;
        // Invariant: the delta is folded in before the block is stored, so a chunk is one update to
        // one block rather than a store without the delta followed by a store with it.
        const blocks = this.#projection.messageBlocks(event.message, "live", this.#projection.blocks.length);
        for (const [index, block] of blocks.entries()) {
          this.#projection.upsert(index === 0 && delta !== undefined && !block.text.endsWith(delta)
            ? { ...block, text: `${block.text}${delta}` }
            : block);
        }
        return;
      }
      case "message_end":
        this.#projection.upsertMessage(event.message, "finalized");
        this.#projection.settleFailedDeclarations(event.message);
        // Compatibility: preserve the same semantic boundary v2 counted. Transcript block
        // finalization is intentionally not a substitute: rebuilds, retries,
        // thinking parts, and tool rows can all finalize independently.
        if (isRecord(event.message) && event.message.role === "assistant") {
          this.#assistantResponseSequence += 1;
          const content = Array.isArray(event.message.content) ? event.message.content : [];
          const stopReason = stringValue(event.message.stopReason) ?? null;
          const toolContinuation = stopReason === "toolUse"
            || content.some(item => isRecord(item) && item.type === "toolCall");
          const successful = stringValue(event.message.errorMessage) === undefined
            && stopReason !== "error"
            && stopReason !== "aborted"
            && textFromContent(content).trim().length > 0;
          this.#emitEvent({
            type: "assistant-message-completed",
            sessionGeneration: this.#sessionGeneration,
            runSequence: this.#agentRunSequence,
            responseSequence: this.#assistantResponseSequence,
            model: this.#activeModel,
            assistantMessageCount: this.#projection.blocks.filter(block => block.kind === "assistant").length,
            successful,
            stopReason,
            toolContinuation,
          });
        }
        return;
      case "turn_end":
        this.#projection.upsertMessage(event.message, "finalized");
        if (Array.isArray(event.toolResults)) {
          for (const result of event.toolResults) this.#projection.upsertMessage(result, "finalized");
        }
        return;
      case "tool_execution_start":
      case "tool_execution_end": {
        this.#projection.upsertToolExecution(event);
        return;
      }
      case "tool_execution_update":
        this.#projection.upsertToolExecution(event);
        return;
      case "agent_settled":
      case "agent_end": {
        if (event.type === "agent_end" && event.willRetry === true) return;
        // Protocol: agent_end is run-local; only settlement reads the complete session scope.
        const finalMessages = event.type === "agent_settled"
          ? this.#session?.messages ?? []
          : Array.isArray(event.messages) ? event.messages : [];
        if (event.type === "agent_end") this.#projection.mergeRun(finalMessages, this.#session?.messages ?? []);
        else if (finalMessages.length > 0) this.#setTranscript(this.#projection.rebuild(finalMessages, "finalized"));
        // Invariant: missing final messages must not erase accumulated content or invent tool outcomes.
        if (finalMessages.length === 0) this.#setTranscript(this.#projection.blocks.map(block =>
          block.status === "live" && transcriptToolState(block) === undefined
            ? { ...block, status: "finalized", revision: block.revision + 1 } : block));
        // Compatibility: ending a turn leaves the working state, as the recorded pinned baseline does, but
        // it leaves only that state: a compaction or retry being shown outlives the turn
        // that ended under it. Settlement ends the run, and with it every state — the
        // engine ends a turn for each continuation it makes and settles once.
        if (event.type === "agent_settled") {
          this.#agentRunActive = false;
          this.#leaveWorkStates();
        } else if (this.#statusKind === null || this.#statusKind === "working") {
          this.#leaveWorkStates();
        }
        this.#emitView();
        if (event.type === "agent_settled") {
          const assistants = finalMessages.filter(message => isRecord(message) && message.role === "assistant");
          const lastAssistant = assistants.at(-1);
          const successful = lastAssistant !== undefined
            && stringValue(lastAssistant.errorMessage) === undefined
            && stringValue(lastAssistant.stopReason) !== "error"
            && stringValue(lastAssistant.stopReason) !== "aborted";
          this.#emitEvent({
            type: "agent-run-settled",
            sessionGeneration: this.#sessionGeneration,
            runSequence: this.#agentRunSequence,
            responseSequence: this.#assistantResponseSequence,
            model: this.#activeModel,
            assistantMessageCount: assistants.length,
            successful,
          });
        }
        return;
      }
      case "queue_update": {
        const steering = readStringArray(event.steering);
        const followUp = readStringArray(event.followUp);
        this.#editor = {
          ...this.#editor,
          queuedSubmissions: [...steering, ...followUp],
          historyRevision: this.#editor.historyRevision + 1,
        };
        this.#emitEvent({ type: "editor-state", editor: this.#editor });
        return;
      }
      case "auto_retry_start":
        this.#enterWorkState("retry", "Retrying");
        return;
      case "auto_retry_end":
        this.#endWorkState("retry");
        return;
      case "compaction_start":
        this.#enterWorkState("compaction", "Compacting");
        this.#compactionProgress?.begin();
        return;
      case "compaction_end":
        this.#compactionProgress?.end();
        this.#endWorkState("compaction");
        if (event.reason === "manual") this.#deliverQueuedAfterCompaction();
        return;
      case "thinking_level_changed":
        this.#thinkingLevel = readThinkingLevel(event.level);
        return;
      default:
        return;
    }
  }

  #readUsage(): OwnedUiUsageView {
    let input = 0;
    let output = 0;
    let cacheRead = 0;
    let cacheWrite = 0;
    let cost = 0;
    let latestCacheHitRate: number | null = null;
    let latestPrompt: OwnedUiUsageView["latestPrompt"] = null;
    const entries: readonly unknown[] = this.#session?.sessionManager?.getEntries?.()
      ?? (this.#session?.messages ?? []).map(message => ({ type: "message", message }));
    for (const entry of entries) {
      if (!isRecord(entry)) continue;
      const message = entry.type === "message" && isRecord(entry.message) ? entry.message : undefined;
      const usage = message !== undefined && isRecord(message.usage)
        ? message.usage
        : (entry.type === "branch_summary" || entry.type === "compaction") && isRecord(entry.usage) ? entry.usage : undefined;
      if (usage === undefined) continue;
      input += finiteNumber(usage.input);
      output += finiteNumber(usage.output);
      cacheRead += finiteNumber(usage.cacheRead);
      cacheWrite += finiteNumber(usage.cacheWrite);
      cost += isRecord(usage.cost) ? finiteNumber(usage.cost.total) : 0;
      if (message?.role === "assistant") {
        latestPrompt = {
          input: finiteNumber(usage.input),
          cacheRead: finiteNumber(usage.cacheRead),
          cacheWrite: finiteNumber(usage.cacheWrite),
        };
        const promptTokens = latestPrompt.input + latestPrompt.cacheRead + latestPrompt.cacheWrite;
        latestCacheHitRate = promptTokens > 0 ? (latestPrompt.cacheRead / promptTokens) * 100 : null;
      }
    }
    const context = this.#session?.getContextUsage?.();
    const providerId = this.#activeModel?.providerId;
    const usingSubscription = providerId === "kimi-coding"
      || (providerId !== undefined && this.#runtime?.services.modelRuntime.isUsingSubscription?.(providerId) === true);
    return {
      input,
      output,
      cacheRead,
      cacheWrite,
      cost,
      latestCacheHitRate,
      latestPrompt,
      contextAvailable: context !== undefined,
      contextTokens: context?.tokens ?? null,
      contextWindow: context?.contextWindow ?? 0,
      contextPercent: context?.percent ?? null,
      usingSubscription,
      autoCompactEnabled: this.#runtime?.services.settingsManager?.getCompactionEnabled?.() ?? true,
    };
  }

  #recordCommand(
    command: OwnedUiCommand,
    outcome: OwnedUiCommandOutcome,
    diagnostic: string | null,
  ): AdapterCommandResult {
    const result = this.#finishCommand(command, outcome, diagnostic);
    this.#completedCommands.set(command.correlationId, result);
    if (this.#completedCommands.size > 256) {
      const oldest = this.#completedCommands.keys().next().value;
      if (oldest) this.#completedCommands.delete(oldest);
    }
    return result;
  }

  #finishCommand(
    command: OwnedUiCommand,
    outcome: OwnedUiCommandOutcome,
    diagnostic: string | null,
  ): AdapterCommandResult {
    this.#activeCommandIds = this.#activeCommandIds.filter(id => id !== command.correlationId);
    this.#emitEvent({
      type: "command-outcome",
      correlationId: command.correlationId,
      outcome,
      diagnostic,
    });
    return { outcome, diagnostic };
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
    for (const pending of this.#pendingCommands.values()) pending.cancel();
    this.#workflows.cancelPending();
    const session = this.#session;
    return Promise.resolve().then(() => session?.abort()).then(() => undefined);
  }

  async #reconcileOverload(cancelled: boolean): Promise<void> {
    const canResume = cancelled === true && this.#runningCommands === 0;
    this.#admissionStopped = !canResume;
    this.#unsubscribe?.(); this.#unsubscribe = undefined;
    this.#compactionProgress?.dispose(); this.#compactionProgress = null;
    ++this.#sessionGeneration;
    this.#agentRunActive = false; this.#statusKind = null;
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
    if (canResume && !this.#disposed && this.#session !== undefined) {
      const generation = this.#sessionGeneration;
      this.#unsubscribe = this.#session.subscribe(event => {
        if (generation === this.#sessionGeneration && !this.#disposed) this.#handlePiEvent(event);
      });
    }
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

async function createDefaultPiRuntime(input: PiEngineRuntimeFactoryInput): Promise<AgentSessionRuntime> {
  return createPiRuntimeIntegration({
    cwd: input.cwd,
    agentDir: input.agentDir,
    ...(input.sessionPath === undefined ? {} : { sessionPath: input.sessionPath }),
    ...(input.sessionSelection === undefined ? {} : { sessionSelection: input.sessionSelection }),
    ...(input.sessionForkPrompt === undefined ? {} : { sessionForkPrompt: input.sessionForkPrompt }),
    ...(input.projectTrustPrompt === undefined ? {} : { projectTrustPrompt: input.projectTrustPrompt }),
  });
}

async function checkDefaultPiPackageUpdates(
  cwd: string,
  agentDir: string,
  settingsManager: PiServicesApi["settingsManager"],
): Promise<readonly string[]> {
  const packageManager = new DefaultPackageManager({ cwd, agentDir, settingsManager });
  const updates = await packageManager.checkForAvailableUpdates();
  return updates.map(update => update.displayName);
}

function assertPiExtensionUiContext(value: unknown): asserts value is ExtensionUIContext {
  assertOwnedUiExtensionUiPort(value);
}

function settingKeyForCallback(callback: PiPinnedSettingsCallback): string | null {
  const keys: Partial<Record<PiPinnedSettingsCallback, string>> = {
    onAutoCompactChange: "autoCompact", onShowImagesChange: "showImages", onImageWidthCellsChange: "imageWidthCells",
    onAutoResizeImagesChange: "autoResizeImages", onBlockImagesChange: "blockImages", onEnableSkillCommandsChange: "enableSkillCommands",
    onSteeringModeChange: "steeringMode", onFollowUpModeChange: "followUpMode", onTransportChange: "transport",
    onHttpIdleTimeoutMsChange: "httpIdleTimeoutMs", onThinkingLevelChange: "thinkingLevel", onThemeChange: "theme", onThemePreview: "theme",
    onHideThinkingBlockChange: "hideThinkingBlock", onMermaidRenderingModeChange: "mermaidRenderingMode",
    onShowCacheMissNoticesChange: "showCacheMissNotices", onCollapseChangelogChange: "collapseChangelog",
    onEnableInstallTelemetryChange: "enableInstallTelemetry", onQuietStartupChange: "quietStartup",
    onDefaultProjectTrustChange: "defaultProjectTrust", onDoubleEscapeActionChange: "doubleEscapeAction",
    onTreeFilterModeChange: "treeFilterMode", onShowHardwareCursorChange: "showHardwareCursor",
    onEditorPaddingXChange: "editorPaddingX", onOutputPadChange: "outputPad", onAutocompleteMaxVisibleChange: "autocompleteMaxVisible",
    onClearOnShrinkChange: "clearOnShrink", onShowTerminalProgressChange: "showTerminalProgress", onTuiModeChange: "tuiMode",
    onFullscreenExitOutputChange: "fullscreenExitOutput", onFullscreenScrollbarChange: "fullscreenScrollbar", onWarningsChange: "warnings",
  };
  return keys[callback] ?? null;
}

function agentJsonValue(value: unknown): AgentJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return value;
  if (Array.isArray(value)) return value.map(agentJsonValue);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, agentJsonValue(item)]));
  throw new TypeError("setting value must be JSON serializable");
}

function isThinkingLevel(value: unknown): value is "off" | "minimal" | "low" | "medium" | "high" | "xhigh" {
  return typeof value === "string" && ["off", "minimal", "low", "medium", "high", "xhigh"].includes(value);
}

function settingLabel(callback: PiPinnedSettingsCallback): string {
  return callback
    .replace(/^on/, "")
    .replace(/Change$|Preview$|Cancel$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, character => character.toUpperCase());
}

function readSuggestionReasoning(value: unknown): OwnedUiPromptSuggestionReasoning {
  return value === "minimal" || value === "low" || value === "medium" || value === "high" || value === "xhigh" || value === "max"
    ? value
    : "off";
}

function readStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function extensionResourceDiagnostic(index: number, sourcePath: string | null, diagnostic: string): OwnedPiExtensionResourceSummary {
  return {
    kind: "extension",
    id: `extension-diagnostic-${index}`,
    sourcePath,
    resolvedPath: null,
    sourceInfo: null,
    loaded: false,
    hidden: false,
    diagnostic,
  };
}

function extensionSourceSummary(value: unknown): OwnedPiExtensionSourceSummary | null {
  if (!isRecord(value)) return null;
  const source = stringProperty(value, "source");
  const scope = value.scope;
  const origin = value.origin;
  const baseDir = value.baseDir;
  if (!source
    || (scope !== "user" && scope !== "project" && scope !== "temporary")
    || (origin !== "package" && origin !== "top-level")
    || (baseDir !== undefined && typeof baseDir !== "string")) return null;
  return { source, scope, origin, baseDir: baseDir ?? null };
}

function collectionResult(value: unknown, key: string): { values: readonly unknown[]; diagnostics: readonly string[] } {
  if (!isRecord(value)) return { values: [], diagnostics: [] };
  const diagnostics = unknownArray(value.diagnostics).map(diagnostic => {
    if (typeof diagnostic === "string") return diagnostic;
    if (isRecord(diagnostic)) {
      const message = stringProperty(diagnostic, "message") ?? String(diagnostic);
      const path = stringProperty(diagnostic, "path");
      return path ? `${path}: ${message}` : message;
    }
    return String(diagnostic);
  });
  return { values: unknownArray(value[key]), diagnostics };
}

function unknownArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Some ecosystem extensions retain a `pi-<name>` slash-command alias beside
 * their unprefixed command. A1 presents the product-neutral command once while
 * leaving Pi's runner free to accept the compatibility alias when typed.
 */
function isPiPrefixedCompatibilityAlias(
  command: unknown,
  commands: readonly unknown[],
): boolean {
  const name = stringProperty(command, "name");
  if (!name?.startsWith("pi-") || name.length === 3) return false;
  const canonicalName = name.slice(3);
  const description = stringProperty(command, "description");
  const sourcePath = extensionCommandSourcePath(command);
  return commands.some(candidate =>
    candidate !== command
      && stringProperty(candidate, "name") === canonicalName
      && stringProperty(candidate, "description") === description
      && extensionCommandSourcePath(candidate) === sourcePath);
}

function extensionCommandSourcePath(command: unknown): string | undefined {
  return isRecord(command) ? stringProperty(command.sourceInfo, "path") : undefined;
}

function compactResourceLabel(path: string): string {
  const segments = path.replaceAll("\\", "/").split("/").filter(Boolean);
  return segments.at(-1) ?? path;
}

async function readGitBranch(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["branch", "--show-current"], { cwd, windowsHide: true });
    const branch = stdout.trim();
    return branch.length > 0 ? branch : null;
  } catch {
    return null;
  }
}
