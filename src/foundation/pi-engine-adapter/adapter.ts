import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import {
  copyToClipboard,
  getAgentDir,
  getPackageDir,
  ProjectTrustStore,
  SessionManager,
  type ExtensionUIContext,
  type SessionInfo,
} from "@earendil-works/pi-coding-agent";
import {
  OWNED_UI_EXTENSION_CONTRACT_VERSION,
  OWNED_UI_EXTENSION_RENDER_CALLBACKS,
  OWNED_UI_EXTENSION_UI_CALLBACKS,
  OWNED_UI_EXTENSION_UI_PROPERTIES,
  assertOwnedUiCommand,
  assertOwnedUiExtensionUiPort,
  assertOwnedUiSnapshot,
  type OwnedUiCommand,
  type OwnedUiCommandOutcome,
  type OwnedUiDiagnostics,
  type OwnedUiEditorState,
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
} from "../owned-ui-contracts/index.js";
import {
  PINNED_PI_SETTINGS_CALLBACKS,
  PINNED_PI_WORKFLOW_COMMAND_NAMES,
  type PiBashWorkflowResult,
  type PiPinnedSettingsCallback,
  type PiPinnedSettingsSnapshot,
  type PiSessionInfoPresentation,
  type PiWorkflowAutocompleteCommand,
  type PiWorkflowHost,
  type PiWorkflowInteractionHost,
  type PiWorkflowLoginNotification,
  type PiWorkflowOption,
  type PiWorkflowRequest,
  type PiWorkflowResult,
} from "./workflows.js";
import { createPiRuntimeIntegration } from "./runtime-integration.js";
import { PiSessionCommandIntegration } from "./session-integration.js";

const execFileAsync = promisify(execFile);

export interface PiEngineRuntimeFactoryInput {
  readonly cwd: string;
  readonly agentDir: string;
  readonly sessionId: string;
}

export interface PiScopedModelDescriptor {
  readonly provider: string;
  readonly id: string;
  readonly name: string;
}

export interface PiScopedModelsContext {
  readonly models: readonly PiScopedModelDescriptor[];
  readonly enabledModelIds: readonly string[] | null;
}

export interface PiProjectTrustUpdate {
  readonly path: string;
  readonly decision: boolean | null;
}

export interface PiProjectTrustContext {
  readonly cwd: string;
  readonly savedDecision: { readonly path: string; readonly decision: boolean } | null;
  readonly projectTrusted: boolean;
  readonly trustOptions: readonly {
    readonly label: string;
    readonly trusted: boolean;
    readonly updates: readonly PiProjectTrustUpdate[];
    readonly savedPath?: string;
  }[];
}

export interface PiTreeSelectorContext {
  readonly tree: readonly unknown[];
  readonly currentLeafId: string | null;
  readonly filterMode: "default" | "no-tools" | "user-only" | "labeled-only" | "all";
  readonly skipSummaryPrompt: boolean;
  readonly appendLabelChange: (entryId: string, label: string | undefined) => void;
}

export interface PiSessionSelectorContext {
  readonly currentSessionFilePath: string | undefined;
  readonly loadCurrentSessions: (onProgress?: (loaded: number, total: number) => void) => Promise<SessionInfo[]>;
  readonly loadAllSessions: (onProgress?: (loaded: number, total: number) => void) => Promise<SessionInfo[]>;
  readonly renameSession: (sessionFilePath: string, nextName: string | undefined) => Promise<void>;
}

export interface PiScopedModelsRefreshResult extends PiScopedModelsContext {
  readonly status: string;
  readonly statusKind: "success" | "warning";
}

export interface PiSessionLike {
  readonly sessionId: string;
  readonly model: unknown;
  readonly thinkingLevel: unknown;
  readonly isStreaming: boolean;
  readonly isIdle: boolean;
  readonly isRetrying: boolean;
  readonly isCompacting: boolean;
  readonly messages: readonly unknown[];
  readonly sessionManager?: {
    getSessionName(): string | undefined;
    getEntries(): readonly unknown[];
    getCwd?(): string;
    getSessionDir?(): string;
    getSessionFile?(): string | undefined;
    usesDefaultSessionDir?(): boolean;
    getTree?(): readonly unknown[];
    getLeafId?(): string | null | undefined;
    appendLabelChange?(entryId: string, label: string | undefined): void;
  };
  readonly extensionRunner?: {
    getCommands?(): readonly unknown[];
    getMessageRenderer?(customType: string): unknown;
    getToolDefinition?(toolName: string): unknown;
  };
  readonly scopedModels?: readonly unknown[];
  readonly autoCompactionEnabled?: boolean;
  readonly steeringMode?: PiPinnedSettingsSnapshot["steeringMode"];
  readonly followUpMode?: PiPinnedSettingsSnapshot["followUpMode"];
  getContextUsage?(): { readonly tokens: number | null; readonly contextWindow: number; readonly percent: number | null } | undefined;
  getScopedModels?(): readonly unknown[] | undefined;
  setScopedModels?(models: readonly unknown[]): void;
  cycleModel?(direction: "forward" | "backward"): Promise<unknown>;
  getUserMessagesForForking?(): readonly unknown[];
  getAvailableThinkingLevels?(): readonly unknown[];
  cycleThinkingLevel?(): unknown;
  setAutoCompactionEnabled?(enabled: unknown): void;
  clearQueue?(): unknown;
  abortBash?(): void;
  executeBash?(command: string, onChunk: unknown, options: { excludeFromContext: boolean }): Promise<unknown>;
  exportToJsonl?(path?: string): string;
  exportToHtml?(path?: string): Promise<string>;
  getLastAssistantText?(): string | undefined;
  setSessionName?(name: string): void;
  getSessionStats?(): unknown;
  navigateTree?(entryId: string, options?: { summarize?: boolean; customInstructions?: string }): Promise<unknown>;
  reload?(): Promise<void>;
  subscribe(listener: (event: unknown) => void): () => void;
  prompt(text: string, options?: unknown): Promise<void>;
  steer(text: string): Promise<void>;
  followUp(text: string): Promise<void>;
  abort(): Promise<void>;
  abortRetry(): void;
  abortCompaction(): void;
  compact(customInstructions?: string): Promise<unknown>;
  setModel(model: unknown): Promise<void>;
  setThinkingLevel(level: unknown): void;
  bindExtensions?(bindings: {
    readonly uiContext?: ExtensionUIContext;
    readonly mode?: "tui" | "print";
    readonly shutdownHandler?: () => void | Promise<void>;
    readonly onError?: (error: unknown) => void;
  }): Promise<void>;
  dispose(): void;
}

export interface PiServicesLike {
  readonly modelRuntime: {
    getModel(providerId: string, modelId: string): unknown;
    isUsingSubscription?(providerId: string): boolean;
    getAvailableSnapshot?(): readonly {
      readonly provider?: string;
      readonly id?: string;
      readonly name?: string;
    }[];
    refresh?(options?: { readonly signal?: AbortSignal }): Promise<unknown>;
    getProviders?(): readonly unknown[];
    getProvider?(providerId: string): unknown;
    listCredentials?(options?: { readonly signal?: AbortSignal }): Promise<readonly unknown[]>;
    login?(providerId: string, authType: string, interaction: unknown, options?: { readonly signal?: AbortSignal }): Promise<unknown>;
    logout?(providerId: string, options?: { readonly signal?: AbortSignal }): Promise<void>;
  };
  readonly settingsManager?: {
    getCompactionEnabled?: () => boolean;
    getEnabledModels?: () => readonly string[] | undefined;
    setEnabledModels?: (patterns: string[] | undefined) => void;
    isProjectTrusted?(): boolean;
    setProjectTrusted?(trusted: boolean): void;
    getTreeFilterMode?(): unknown;
    getBranchSummarySkipPrompt?(): boolean;
    setCompactionEnabled?(value: unknown): void;
    getShowImages?(): unknown; setShowImages?(value: unknown): void;
    getImageWidthCells?(): unknown; setImageWidthCells?(value: unknown): void;
    getImageAutoResize?(): unknown; setImageAutoResize?(value: unknown): void;
    getBlockImages?(): unknown; setBlockImages?(value: unknown): void;
    getEnableSkillCommands?(): boolean; setEnableSkillCommands?(value: unknown): void;
    getSteeringMode?(): unknown; setSteeringMode?(value: unknown): void;
    getFollowUpMode?(): unknown; setFollowUpMode?(value: unknown): void;
    getTransport?(): unknown; setTransport?(value: unknown): void;
    getHttpIdleTimeoutMs?(): unknown; setHttpIdleTimeoutMs?(value: unknown): void;
    getTheme?(): unknown; setTheme?(value: unknown): void;
    getHideThinkingBlock?(): unknown; setHideThinkingBlock?(value: unknown): void;
    getMermaidRenderingMode?(): unknown; setMermaidRenderingMode?(value: unknown): void;
    getShowCacheMissNotices?(): unknown; setShowCacheMissNotices?(value: unknown): void;
    getCollapseChangelog?(): unknown; setCollapseChangelog?(value: unknown): void;
    getEnableInstallTelemetry?(): unknown; setEnableInstallTelemetry?(value: unknown): void;
    getQuietStartup?(): unknown; setQuietStartup?(value: unknown): void;
    getDefaultProjectTrust?(): unknown; setDefaultProjectTrust?(value: unknown): void;
    getDoubleEscapeAction?(): unknown; setDoubleEscapeAction?(value: unknown): void;
    setTreeFilterMode?(value: unknown): void;
    getShowHardwareCursor?(): boolean; setShowHardwareCursor?(value: unknown): void;
    getEditorPaddingX?(): unknown; setEditorPaddingX?(value: unknown): void;
    getOutputPad?(): unknown; setOutputPad?(value: unknown): void;
    getAutocompleteMaxVisible?(): unknown; setAutocompleteMaxVisible?(value: unknown): void;
    getClearOnShrink?(): unknown; setClearOnShrink?(value: unknown): void;
    getShowTerminalProgress?(): unknown; setShowTerminalProgress?(value: unknown): void;
    getTuiMode?(): unknown; setTuiMode?(value: unknown): void;
    getFullscreenExitOutput?(): unknown; setFullscreenExitOutput?(value: unknown): void;
    getFullscreenScrollbar?(): unknown; setFullscreenScrollbar?(value: unknown): void;
    getWarnings?(): unknown; setWarnings?(value: unknown): void;
    getThemeSetting?(): unknown;
    getTerminalTheme?(): unknown;
    setDefaultModelAndProvider?(provider: string, model: string): void;
  };
  readonly resourceLoader?: {
    getSkills(): unknown;
    getPrompts(): unknown;
    getAgentsFiles(): unknown;
    getSystemPromptSource(): unknown;
    getAppendSystemPromptSources(): unknown;
    getExtensions?(): unknown;
    getThemes?(): unknown;
  };
  readonly diagnostics: readonly { readonly type: string; readonly message: string }[];
}

export interface PiRuntimeLike {
  readonly session: PiSessionLike;
  readonly services: PiServicesLike;
  readonly diagnostics: readonly { readonly type: string; readonly message: string }[];
  setRebindSession(callback: (session: PiSessionLike) => Promise<void>): void;
  listSessions?(): Promise<readonly unknown[]>;
  newSession(options?: unknown): Promise<unknown>;
  switchSession(sessionPath: string, options?: unknown): Promise<unknown>;
  fork?(entryId: string, options?: { position?: "before" | "at" }): Promise<unknown>;
  importFromJsonl?(path: string): Promise<unknown>;
  dispose(): Promise<void>;
}

export type PiEngineRuntimeFactory = (input: PiEngineRuntimeFactoryInput) => Promise<PiRuntimeLike>;

export interface OwnedPiResourceSummary {
  readonly kind: "skill" | "prompt-template" | "agent-context" | "system-prompt" | "theme";
  readonly id: string;
  readonly label: string;
  readonly sourcePath: string | null;
  readonly diagnostic: string | null;
}

export interface OwnedPiExtensionResourceSummary {
  readonly kind: "extension";
  readonly id: string;
  readonly sourcePath: string | null;
  readonly resolvedPath: string | null;
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
  readonly createRuntime?: PiEngineRuntimeFactory;
  readonly workflowHost?: PiWorkflowHost;
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

export class PiEngineAdapter {
  readonly #runtimeFactory: PiEngineRuntimeFactory;
  readonly #cwd: string;
  readonly #agentDir: string;
  readonly #sessionId: string;
  readonly #workflowHost: PiWorkflowHost;
  #workflowInteraction: PiWorkflowInteractionHost;
  readonly #listeners = new Set<(event: OwnedUiEvent) => void>();
  #runtime: PiRuntimeLike | undefined;
  #session: PiSessionLike | undefined;
  #unsubscribe: (() => void) | undefined;
  #sequence = 0;
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
  #transcript: OwnedUiTranscriptBlock[] = [];
  readonly #messageBlockIds = new WeakMap<object, string>();
  readonly #messageFallbackIds = new Map<string, string[]>();
  readonly #toolBlockIds = new Map<string, string>();
  #nextBlockSequence = 0;
  #diagnostics: OwnedUiDiagnostics[] = [];
  readonly #eventQueue: OwnedUiEvent[] = [];
  #eventQueueProcessing: Promise<void> | undefined;
  #droppedEventCount = 0;
  #sessionCommands: PiSessionCommandIntegration | undefined;
  #gitBranch: string | null = null;
  #extensionUi: ExtensionUIContext | undefined;
  #extensionShutdown: (() => void | Promise<void>) | undefined;
  #extensionBound = false;
  #disposed = false;

  constructor(options: PiEngineAdapterOptions = {}) {
    this.#cwd = options.cwd ?? process.cwd();
    this.#agentDir = options.agentDir ?? getAgentDir();
    this.#sessionId = options.sessionId ?? "owned-session-1";
    this.#runtimeFactory = options.createRuntime ?? createDefaultPiRuntime;
    this.#workflowHost = options.workflowHost ?? defaultWorkflowHost();
    this.#workflowInteraction = { prompt: async () => null, notify() {} };
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

  get agentDir(): string {
    return this.#agentDir;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  async start(): Promise<OwnedUiSessionViewModel> {
    if (this.#runtime) return this.view();
    const runtime = await this.#runtimeFactory({
      cwd: this.#cwd,
      agentDir: this.#agentDir,
      sessionId: this.#sessionId,
    }).catch(error => {
      this.#lifecycle = "failed";
      this.#addDiagnostic("error", "engine-startup", error instanceof Error ? error.message : String(error), false);
      throw error;
    });
    this.#runtime = runtime;
    this.#gitBranch = await readGitBranch(this.#cwd);
    this.#terminal = {
      ...this.#terminal,
      hardwareCursor: runtime.services.settingsManager?.getShowHardwareCursor?.() ?? this.#terminal.hardwareCursor,
    };
    runtime.setRebindSession(async session => {
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
    this.#lifecycle = "ready";
    this.#editor = { ...this.#editor, submitEnabled: true };
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "ready", reason: null });
    this.#emitView();
    return this.view();
  }

  onEvent(listener: (event: OwnedUiEvent) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#event({ type: "session-view", view: this.view() }));
    return () => this.#listeners.delete(listener);
  }

  async flushEvents(): Promise<void> {
    while (this.#eventQueueProcessing) await this.#eventQueueProcessing;
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
        argumentOptions: this.#modelOptions(),
        source: "builtin",
      },
      {
        name: "login",
        description: "Configure provider authentication",
        argumentHint: "<provider>",
        argumentOptions: this.#loginOptions().map(option => ({ ...option, id: option.id.split(":").at(-1) ?? option.id })),
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
    const extensionCommands = this.#session?.extensionRunner?.getCommands?.();
    if (Array.isArray(extensionCommands)) {
      for (const command of extensionCommands.filter(isRecord)) {
        const name = stringProperty(command, "name");
        if (!name || usedNames.has(name)) continue;
        commands.push({ name, description: stringProperty(command, "description") ?? "Extension command", source: "extension" });
        usedNames.add(name);
      }
    }
    return commands;
  }

  async cycleModelWorkflow(direction: "forward" | "backward"): Promise<PiWorkflowResult> {
    try {
      const session = this.#requireWorkflowSession();
      const result = await requireCapability(session.cycleModel, "cycleModel").call(session, direction);
      if (!isRecord(result) || !isRecord(result.model)) {
        return workflowResult("model", "cancelled", "No other model is available");
      }
      const model = readModel(result.model);
      if (model) this.#activeModel = model;
      if (result.thinkingLevel !== undefined) this.#thinkingLevel = readThinkingLevel(result.thinkingLevel);
      this.#emitView();
      return workflowResult("model", "completed", model ? `Selected model ${model.providerId}/${model.modelId}` : "Selected model");
    } catch (error) {
      return workflowResult("model", "failed", error instanceof Error ? error.message : String(error));
    }
  }

  pinnedModelSelectorContext(): {
    readonly currentModel: unknown;
    readonly settingsManager: unknown;
    readonly modelRuntime: unknown;
    readonly scopedModels: readonly unknown[];
  } {
    const session = this.#requireWorkflowSession();
    const runtime = this.#runtime;
    if (!runtime) throw new Error("engine runtime is unavailable");
    const scoped = session.getScopedModels?.() ?? session.scopedModels;
    const modelRuntime = runtime.services.modelRuntime;
    const selectorRuntime = typeof modelRuntime.getAvailableSnapshot === "function"
      ? modelRuntime
      : {
          getAvailableSnapshot: () => session.model === undefined ? [] : [session.model],
          getModel: (providerId: string, modelId: string) => modelRuntime.getModel(providerId, modelId),
          getError: () => undefined,
          refresh: async () => undefined,
        };
    const settingsManager = runtime.services.settingsManager;
    const selectorSettings = typeof settingsManager?.setDefaultModelAndProvider === "function"
      ? settingsManager
      : { setDefaultModelAndProvider() {} };
    return {
      currentModel: session.model,
      settingsManager: selectorSettings,
      modelRuntime: selectorRuntime,
      scopedModels: Array.isArray(scoped) ? scoped : [],
    };
  }

  pinnedProjectTrustContext(): PiProjectTrustContext {
    const runtime = this.#runtime;
    if (!runtime) throw new Error("engine runtime is unavailable");
    const cwd = resolve(this.#cwd);
    const parent = dirname(cwd);
    const trustStore = new ProjectTrustStore(this.#agentDir);
    const trustOptions: PiProjectTrustContext["trustOptions"] = [
      { label: "Trust", trusted: true, updates: [{ path: cwd, decision: true }], savedPath: cwd },
      ...(parent === cwd ? [] : [{
        label: `Trust parent folder (${parent})`,
        trusted: true,
        updates: [{ path: parent, decision: true }, { path: cwd, decision: null }],
        savedPath: parent,
      }]),
      { label: "Do not trust", trusted: false, updates: [{ path: cwd, decision: false }], savedPath: cwd },
    ];
    return {
      cwd,
      savedDecision: trustStore.getEntry(cwd),
      projectTrusted: runtime.services.settingsManager?.isProjectTrusted?.() === true,
      trustOptions,
    };
  }

  persistProjectTrust(updates: readonly PiProjectTrustUpdate[]): void {
    new ProjectTrustStore(this.#agentDir).setMany([...updates]);
  }

  pinnedSessionSelectorContext(): PiSessionSelectorContext {
    const session = this.#requireWorkflowSession();
    const manager = session.sessionManager;
    const cwd = manager?.getCwd?.();
    const sessionDir = manager?.getSessionDir?.();
    const currentSessionFilePath = manager?.getSessionFile?.();
    const usesDefaultSessionDir = manager?.usesDefaultSessionDir?.() === true;
    const resolvedCwd = typeof cwd === "string" ? cwd : this.#cwd;
    const resolvedSessionDir = typeof sessionDir === "string" ? sessionDir : undefined;
    return {
      currentSessionFilePath: typeof currentSessionFilePath === "string" ? currentSessionFilePath : undefined,
      loadCurrentSessions: onProgress => SessionManager.list(resolvedCwd, resolvedSessionDir, onProgress),
      loadAllSessions: onProgress => usesDefaultSessionDir
        ? SessionManager.listAll(onProgress)
        : resolvedSessionDir === undefined ? SessionManager.listAll(onProgress) : SessionManager.listAll(resolvedSessionDir, onProgress),
      renameSession: async (sessionFilePath, nextName) => {
        const next = (nextName ?? "").trim();
        if (!next) return;
        SessionManager.open(sessionFilePath).appendSessionInfo(next);
      },
    };
  }

  pinnedScopedModelsContext(): PiScopedModelsContext {
    const session = this.#requireWorkflowSession();
    const runtime = this.#runtime;
    if (!runtime) throw new Error("engine runtime is unavailable");
    const models = scopedModelRecords(runtime.services.modelRuntime);
    const scoped = session.getScopedModels?.() ?? session.scopedModels;
    if (Array.isArray(scoped) && scoped.length > 0) {
      return {
        models: models.map(item => item.descriptor),
        enabledModelIds: scoped.map(scopedModelReference).filter((id): id is string => id !== undefined),
      };
    }
    const patterns = runtime.services.settingsManager?.getEnabledModels?.();
    return {
      models: models.map(item => item.descriptor),
      enabledModelIds: Array.isArray(patterns)
        ? resolveConfiguredModelIds(patterns.filter((value): value is string => typeof value === "string"), models)
        : null,
    };
  }

  updateScopedModels(enabledModelIds: readonly string[] | null): void {
    const session = this.#requireWorkflowSession();
    const runtime = this.#runtime;
    if (!runtime) throw new Error("engine runtime is unavailable");
    const models = scopedModelRecords(runtime.services.modelRuntime);
    const availableIds = new Set(models.map(item => `${item.descriptor.provider}/${item.descriptor.id}`));
    const selected = enabledModelIds?.filter(id => availableIds.has(id)) ?? [];
    const allAvailableEnabled = enabledModelIds !== null && availableIds.size > 0 && selected.length === availableIds.size;
    const scoped = enabledModelIds !== null && selected.length > 0 && !allAvailableEnabled
      ? selected.flatMap(id => {
          const item = models.find(candidate => `${candidate.descriptor.provider}/${candidate.descriptor.id}` === id);
          return item === undefined ? [] : [{ model: item.model }];
        })
      : [];
    requireCapability(session.setScopedModels, "setScopedModels").call(session, scoped);
    this.#emitView();
  }

  persistScopedModels(enabledModelIds: readonly string[] | null): void {
    const runtime = this.#runtime;
    if (!runtime) throw new Error("engine runtime is unavailable");
    const availableCount = scopedModelRecords(runtime.services.modelRuntime).length;
    const patterns = enabledModelIds === null || enabledModelIds.length === availableCount
      ? undefined
      : [...enabledModelIds];
    requireCapability(runtime.services.settingsManager?.setEnabledModels, "setEnabledModels").call(runtime.services.settingsManager, patterns === undefined ? undefined : [...patterns]);
  }

  async refreshScopedModels(signal: AbortSignal): Promise<PiScopedModelsRefreshResult> {
    const runtime = this.#runtime;
    if (!runtime) throw new Error("engine runtime is unavailable");
    const result = await runtime.services.modelRuntime.refresh?.({ signal });
    const context = this.pinnedScopedModelsContext();
    if (isRecord(result) && result.aborted === true) {
      return { ...context, status: "Model refresh timed out; showing cached models.", statusKind: "warning" };
    }
    const errors = isRecord(result) ? result.errors : undefined;
    if (errors instanceof Map && errors.size > 0) {
      return {
        ...context,
        status: `Could not refresh ${[...errors.keys()].join(", ")}; showing cached models.`,
        statusKind: "warning",
      };
    }
    return { ...context, status: "Model catalogs refreshed.", statusKind: "success" };
  }

  pinnedLoginOptions(authType?: "oauth" | "api_key"): readonly PiWorkflowOption[] {
    return this.#loginOptions(authType);
  }

  pinnedLoginMethodOptions(providerReference: string): { readonly title: string; readonly options: readonly PiWorkflowOption[] } {
    const runtime = this.#runtime;
    if (!runtime) throw new Error("engine runtime is unavailable");
    const modelRuntime = runtime.services.modelRuntime;
    const normalized = providerReference.trim().toLowerCase();
    const providers = modelRuntime.getProviders?.();
    const matches = Array.isArray(providers) ? providers.filter(isRecord).filter(candidate =>
      stringProperty(candidate, "id")?.toLowerCase() === normalized
        || stringProperty(candidate, "name")?.toLowerCase() === normalized) : [];
    const providerId = matches.length === 1 ? stringProperty(matches[0], "id") ?? providerReference : providerReference;
    const provider = modelRuntime.getProvider?.(providerId);
    const providerName = stringProperty(provider, "name") ?? providerId;
    const oauth = dynamicObject(dynamicObject(provider, "auth"), "oauth");
    const loginLabel = stringProperty(oauth, "loginLabel") ?? "Sign in with an account";
    const options = this.#loginOptions().filter(option => option.id.endsWith(`:${providerId}`)).map(option => ({
      ...option,
      label: option.id.startsWith("api_key:") ? "Sign in with an API key" : loginLabel,
    }));
    return { title: `Select authentication method for ${providerName}:`, options };
  }

  pinnedLogoutOptions(): Promise<readonly PiWorkflowOption[]> {
    return this.#logoutOptions();
  }

  pinnedForkOptions(): readonly PiWorkflowOption[] {
    const session = this.#requireWorkflowSession();
    const messages = requireCapability(session.getUserMessagesForForking, "getUserMessagesForForking").call(session);
    return workflowOptions(messages, "entryId", "text");
  }

  pinnedTreeSelectorContext(): PiTreeSelectorContext {
    const manager = this.#requireWorkflowSession().sessionManager;
    const settings = this.#runtime?.services.settingsManager;
    const tree = manager?.getTree?.();
    const leaf = manager?.getLeafId?.();
    const configuredFilter = settings?.getTreeFilterMode?.();
    const filterMode = configuredFilter === "no-tools" || configuredFilter === "user-only" || configuredFilter === "labeled-only" || configuredFilter === "all"
      ? configuredFilter
      : "default";
    return {
      tree: Array.isArray(tree) ? tree : [],
      currentLeafId: typeof leaf === "string" ? leaf : null,
      filterMode,
      skipSummaryPrompt: settings?.getBranchSummarySkipPrompt?.() === true,
      appendLabelChange: (entryId, label) => {
        requireCapability(manager?.appendLabelChange, "appendLabelChange").call(manager, entryId, label);
      },
    };
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
      terminalTheme: setting(settings?.getTerminalTheme, "dark"),
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

  pinnedToolDefinition(toolName: string): unknown {
    return this.#requireWorkflowSession().extensionRunner?.getToolDefinition?.(toolName);
  }

  clearQueuedWorkflows(): readonly string[] {
    const session = this.#requireWorkflowSession();
    const result = session.clearQueue?.();
    if (!isRecord(result)) return [];
    return [...readStringArray(result.steering), ...readStringArray(result.followUp)];
  }

  abortBashWorkflow(): void {
    this.#requireWorkflowSession().abortBash?.();
  }

  async executeBashWorkflow(command: string, excludeFromContext: boolean): Promise<PiBashWorkflowResult> {
    const session = this.#requireWorkflowSession();
    const result = await requireCapability(session.executeBash, "executeBash").call(session, command, undefined, { excludeFromContext });
    if (!isRecord(result)) throw new Error("Pi bash workflow returned a malformed result");
    return {
      command,
      output: typeof result.output === "string" ? result.output : "",
      exitCode: typeof result.exitCode === "number" ? result.exitCode : undefined,
      cancelled: result.cancelled === true,
      truncated: result.truncated === true,
      excludeFromContext,
    };
  }

  applyPinnedSettingValue(callback: PiPinnedSettingsCallback, value: unknown): PiWorkflowResult {
    try {
      return this.#applyPinnedSetting(callback, value, true);
    } catch (error) {
      return workflowResult("settings", "failed", error instanceof Error ? error.message : String(error));
    }
  }

  async executeWorkflow(request: PiWorkflowRequest): Promise<PiWorkflowResult> {
    try {
      return await this.#performWorkflow(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const contextualMessage = request.command === "export"
        ? `Failed to export session: ${message}`
        : request.command === "reload" ? `Reload failed: ${message}` : message;
      return workflowResult(request.command, "failed", contextualMessage);
    }
  }

  view(): OwnedUiSessionViewModel {
    return {
      contractVersion: 1,
      sessionId: this.#sessionId,
      revision: this.#viewRevision,
      lifecycle: this.#lifecycle,
      transcript: this.#transcript.map(block => ({ ...block })),
      editor: { ...this.#editor, queuedSubmissions: [...this.#editor.queuedSubmissions] },
      status: {
        ...this.#status,
        diagnostics: [...this.#status.diagnostics],
        badges: [...this.#status.badges],
        usage: this.#readUsage(),
        footer: {
          branch: this.#gitBranch,
          sessionName: this.#session?.sessionManager?.getSessionName() ?? null,
          availableProviderCount: new Set(this.#runtime?.services.modelRuntime.getAvailableSnapshot?.().map(model => model.provider).filter(provider => provider !== undefined) ?? []).size || 1,
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
      sequence: this.#sequence,
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
    const existing = this.#completedCommands.get(command.correlationId);
    if (existing) return existing;
    if (this.#activeCommandIds.includes(command.correlationId)) {
      return this.#finishCommand(command, "rejected", "duplicate engine command correlation id");
    }

    this.#activeCommandIds.push(command.correlationId);
    this.#emitEvent({
      type: "command-outcome",
      correlationId: command.correlationId,
      outcome: "accepted",
      diagnostic: null,
    });
    try {
      await this.#perform(command);
      this.#emitView();
      return this.#recordCommand(command, "completed", null);
    } catch (error) {
      const diagnostic = error instanceof Error ? error.message : String(error);
      this.#addDiagnostic("error", "engine-command", diagnostic, true);
      this.#emitView();
      return this.#recordCommand(command, "failed", diagnostic);
    }
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#extensionBound = false;
    this.#extensionUi = undefined;
    this.#extensionShutdown = undefined;
    this.#lifecycle = "stopping";
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "stopping", reason: null });
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    await this.#runtime?.dispose();
    this.#lifecycle = "stopped";
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "stopped", reason: null });
    this.#emitView();
    await this.flushEvents();
  }

  async #performWorkflow(request: PiWorkflowRequest): Promise<PiWorkflowResult> {
    const session = this.#requireWorkflowSession();
    const runtime = this.#runtime;
    if (!runtime) throw new Error("engine runtime is unavailable");
    const argument = request.argument.trim();
    const selected = request.selection?.trim();
    const selection = selected && selected.length > 0 ? selected : undefined;

    switch (request.command) {
      case "settings": {
        if (!selection) return workflowResult(request.command, "failed", "Settings requires the owned settings controller");
        return this.#applyPinnedSetting(selection);
      }
      case "model": {
        const reference = selection ?? argument;
        if (!reference) return workflowResult(request.command, "failed", "Model requires the owned model controller");
        const [providerId, modelId] = reference.split("/", 2);
        if (!providerId || !modelId) return workflowResult(request.command, "failed", "Model requires provider/model");
        const model = runtime.services.modelRuntime.getModel(providerId, modelId);
        if (!model) return workflowResult(request.command, "failed", `Model is unavailable: ${reference}`);
        await session.setModel(model);
        this.#activeModel = { providerId, modelId, displayName: stringProperty(model, "name") ?? modelId };
        this.#emitView();
        return workflowResult(request.command, "completed", `Model: ${modelId}`);
      }
      case "scoped-models": {
        if (!selection) return workflowResult(request.command, "failed", "Scoped models requires the owned scoped-model controller");
        const [providerId, modelId] = selection.split("/", 2);
        const model = providerId && modelId ? runtime.services.modelRuntime.getModel(providerId, modelId) : undefined;
        if (!model) return workflowResult(request.command, "failed", `Model is unavailable: ${selection}`);
        requireCapability(session.setScopedModels, "setScopedModels").call(session, [{ model }]);
        return workflowResult(request.command, "completed", `Enabled scoped model ${selection}`);
      }
      case "export": {
        const path = pathArgument(argument);
        const file = path?.toLowerCase().endsWith(".jsonl")
          ? requireCapability(session.exportToJsonl, "exportToJsonl").call(session, path)
          : await requireCapability(session.exportToHtml, "exportToHtml").call(session, path);
        return workflowResult(request.command, "completed", `Session exported to: ${String(file)}`);
      }
      case "import": {
        const path = pathArgument(argument);
        if (!path) return workflowResult(request.command, "failed", "Usage: /import <path.jsonl>");
        if (request.confirmed === undefined) {
          return workflowConfirmation(request.command, `Replace current session with ${path}?`);
        }
        if (!request.confirmed) return workflowResult(request.command, "cancelled", "Import cancelled");
        const result = await requireCapability(runtime.importFromJsonl, "importFromJsonl").call(runtime, path);
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Import cancelled");
        return workflowResult(request.command, "completed", `Session imported from: ${path}`);
      }
      case "share": {
        const auth = await this.#workflowHost.runCommand("gh", ["auth", "status"]).catch(error => {
          throw new Error(`GitHub CLI is unavailable or not logged in: ${error instanceof Error ? error.message : String(error)}`);
        });
        if (auth.stderr && !auth.stdout) throw new Error(auth.stderr.trim());
        const temporary = join(tmpdir(), `${PRODUCT_IDENTITY.filesystem.temporaryPrefix}pi-session-${process.pid}.html`);
        try {
          await requireCapability(session.exportToHtml, "exportToHtml").call(session, temporary);
          const gist = await this.#workflowHost.runCommand("gh", ["gist", "create", "--public=false", temporary]);
          const gistUrl = gist.stdout.trim();
          const gistId = gistUrl.split("/").at(-1);
          if (!gistId) throw new Error("Failed to parse gist ID from gh output");
          return workflowResult(request.command, "completed", `Share URL: https://pi.gptscript.ai/gist/${gistId}`, gistUrl);
        } finally {
          await rm(temporary, { force: true });
        }
      }
      case "copy": {
        const text = requireCapability(session.getLastAssistantText, "getLastAssistantText").call(session);
        if (typeof text !== "string" || text.length === 0) return workflowResult(request.command, "failed", "No agent messages to copy yet.");
        await this.#workflowHost.copyText(text);
        return workflowResult(request.command, "completed", "Copied last agent message to clipboard");
      }
      case "name": {
        const manager = session.sessionManager;
        if (!argument) {
          const current = manager?.getSessionName();
          return typeof current === "string"
            ? workflowResult(request.command, "completed", `Session name: ${current}`)
            : workflowResult(request.command, "failed", "Usage: /name <name>");
        }
        requireCapability(session.setSessionName, "setSessionName").call(session, argument);
        const normalized = manager?.getSessionName();
        const actual = typeof normalized === "string" ? normalized : argument;
        return workflowResult(
          request.command,
          "completed",
          `Session name set: ${actual}`,
          actual === argument ? undefined : `Session name was normalized from ${JSON.stringify(argument)} to ${JSON.stringify(actual)}`,
        );
      }
      case "session": {
        const manager = session.sessionManager;
        const stats = requireCapability(session.getSessionStats, "getSessionStats").call(session);
        const entries = manager?.getEntries();
        return {
          ...workflowResult(request.command, "completed", "Session Info"),
          presentation: pinnedSessionInfoPresentation(
            stats,
            manager?.getSessionName(),
            Array.isArray(entries) ? entries : [],
            runtime.services.modelRuntime,
          ),
        };
      }
      case "changelog": {
        const changelog = await this.#workflowHost.readChangelog();
        return workflowResult(request.command, "completed", "What's New", changelog);
      }
      case "hotkeys":
        return workflowResult(request.command, "completed", "Keyboard Shortcuts", pinnedHotkeySummary());
      case "fork": {
        if (!selection) return workflowResult(request.command, "failed", "Fork requires the owned user-message controller");
        const result = await requireCapability(runtime.fork, "fork").call(runtime, selection, { position: "before" });
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Fork cancelled");
        return workflowResult(request.command, "completed", "Forked to new session");
      }
      case "clone": {
        const manager = session.sessionManager;
        const leaf = manager?.getLeafId?.();
        if (typeof leaf !== "string") return workflowResult(request.command, "failed", "No session position is available to clone");
        const result = await requireCapability(runtime.fork, "fork").call(runtime, leaf, { position: "at" });
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Clone cancelled");
        return workflowResult(request.command, "completed", "Cloned to new session");
      }
      case "tree": {
        if (!selection) return workflowResult(request.command, "failed", "Tree navigation requires the owned tree controller");
        const navigateTree = requireCapability(session.navigateTree, "navigateTree");
        const result = request.treeSummary === undefined
          ? await navigateTree.call(session, selection)
          : await navigateTree.call(session, selection, {
              summarize: request.treeSummary.summarize,
              ...(request.treeSummary.customInstructions === undefined ? {} : { customInstructions: request.treeSummary.customInstructions }),
            });
        if (isRecord(result) && result.aborted === true) return workflowResult(request.command, "cancelled", "Branch summarization cancelled");
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Navigation cancelled");
        return workflowResult(request.command, "completed", "Navigated to selected point");
      }
      case "trust": {
        if (!selection) return workflowResult(request.command, "failed", "Trust requires the owned trust controller");
        requireCapability(runtime.services.settingsManager?.setProjectTrusted, "setProjectTrusted").call(runtime.services.settingsManager, selection === "trust");
        return workflowResult(request.command, "completed", selection === "trust" ? "Project trusted" : "Project trust removed");
      }
      case "login": {
        if (!selection && !argument) return workflowResult(request.command, "failed", "Login requires the owned authentication controller");
        const modelRuntime = runtime.services.modelRuntime;
        let loginSelection = selection ?? argument;
        if (!selection && argument && !argument.includes(":")) {
          const normalized = argument.toLowerCase();
          const providers = modelRuntime.getProviders?.();
          const providerMatches = Array.isArray(providers) ? providers.filter(isRecord).filter(candidate =>
            stringProperty(candidate, "id")?.toLowerCase() === normalized
              || stringProperty(candidate, "name")?.toLowerCase() === normalized) : [];
          const providerReference = providerMatches.length === 1 ? stringProperty(providerMatches[0], "id") ?? argument : argument;
          const matching = this.#loginOptions().filter(option => option.id.endsWith(`:${providerReference}`));
          if (matching.length > 1) {
            const provider = modelRuntime.getProvider?.(providerReference);
            const providerName = stringProperty(provider, "name") ?? providerReference;
            return workflowResult(request.command, "failed", `Authentication method for ${providerName} requires the owned authentication controller`);
          }
          if (matching[0]) loginSelection = matching[0].id;
        }
        const [authTypeValue = "oauth", providerId = loginSelection] = loginSelection.includes(":")
          ? loginSelection.split(":", 2)
          : ["oauth", loginSelection];
        const authType = authTypeValue === "api_key" ? "api_key" as const : "oauth" as const;
        const provider = modelRuntime.getProvider?.(providerId);
        const providerName = stringProperty(provider, "name") ?? providerId;
        this.#workflowInteraction.startLogin?.({ providerId, providerName, authType });
        try {
          await requireCapability(modelRuntime.login, "login").call(modelRuntime, providerId, authType, {
            signal: AbortSignal.timeout(120_000),
            prompt: async (prompt: unknown) => {
              const promptType = stringProperty(prompt, "type");
              const options = isRecord(prompt) && Array.isArray(prompt.options)
                ? prompt.options.filter(isRecord).flatMap(option => {
                    const id = stringProperty(option, "id");
                    const label = stringProperty(option, "label");
                    return id && label ? [{ id, label }] : [];
                  })
                : [];
              const response = await this.#workflowInteraction.prompt({
                type: promptType === "select"
                  ? "select"
                  : promptType === "manual_code"
                    ? "manual-code"
                    : authType === "api_key"
                      ? "secret"
                      : "text",
                message: stringProperty(prompt, "message") ?? `Authenticate ${providerName}`,
                ...(stringProperty(prompt, "placeholder") === undefined ? {} : { placeholder: stringProperty(prompt, "placeholder")! }),
                ...(options.length === 0 ? {} : { options }),
              });
              if (response === null) throw new Error("Login cancelled");
              return response;
            },
            notify: (event: unknown) => {
              const notification = workflowLoginNotification(event);
              if (notification) this.#workflowInteraction.notify(notification);
            },
          });
        } catch (error) {
          if (error instanceof Error && error.message === "Login cancelled") return workflowResult(request.command, "cancelled", "Login cancelled");
          throw error;
        } finally {
          this.#workflowInteraction.finishLogin?.();
        }
        return workflowResult(request.command, "completed", `Logged in to ${providerName}. Credentials saved to ${join(this.#agentDir, "auth.json")}`);
      }
      case "logout": {
        if (!selection) return workflowResult(request.command, "failed", "Logout requires the owned authentication controller");
        const [credentialType = "oauth", providerId = selection] = selection.includes(":") ? selection.split(":", 2) : ["oauth", selection];
        const modelRuntime = runtime.services.modelRuntime;
        await requireCapability(modelRuntime.logout, "logout").call(modelRuntime, providerId, { signal: AbortSignal.timeout(15_000) });
        const provider = modelRuntime.getProvider?.(providerId);
        const providerName = stringProperty(provider, "name") ?? providerId;
        return workflowResult(
          request.command,
          "completed",
          credentialType === "api_key"
            ? `Removed stored API key for ${providerName}. Environment variables and models.json config are unchanged.`
            : `Logged out of ${providerName}`,
        );
      }
      case "new": {
        const result = await runtime.newSession();
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "New session cancelled");
        return workflowResult(request.command, "completed", "✓ New session started");
      }
      case "compact": {
        await session.compact(argument || undefined);
        return workflowResult(request.command, "completed", "Compaction requested");
      }
      case "resume": {
        if (!selection && !argument) return workflowResult(request.command, "failed", "Resume requires the owned session controller");
        const sessionPath = selection ?? argument;
        try {
          const result = await runtime.switchSession(sessionPath);
          if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Resume cancelled");
          return workflowResult(request.command, "completed", "Resumed session");
        } catch (error) {
          const issue = isRecord(error) && isRecord(error.issue) ? error.issue : undefined;
          const fallbackCwd = issue === undefined ? undefined : stringProperty(issue, "fallbackCwd");
          if (fallbackCwd === undefined) throw error;
          if (request.confirmed === undefined) {
            const sessionCwd = stringProperty(issue, "sessionCwd") ?? "the session working directory";
            return workflowConfirmation(request.command, `cwd from session file does not exist\n${sessionCwd}\n\ncontinue in current cwd\n${fallbackCwd}`);
          }
          if (!request.confirmed) return workflowResult(request.command, "cancelled", "Resume cancelled");
          const result = await runtime.switchSession(sessionPath, { cwdOverride: fallbackCwd });
          if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Resume cancelled");
          return workflowResult(request.command, "completed", "Resumed session in current cwd");
        }
      }
      case "reload": {
        if (session.isStreaming) return workflowResult(request.command, "failed", "Wait for the current response to finish before reloading.");
        if (session.isCompacting) return workflowResult(request.command, "failed", "Wait for compaction to finish before reloading.");
        await requireCapability(session.reload, "reload").call(session);
        await this.#bindExtensionUiToSession();
        return workflowResult(request.command, "completed", "Reloaded keybindings, extensions, skills, prompts, themes, and context files");
      }
      case "quit": {
        await this.dispose();
        return workflowResult(request.command, "completed", "Shutdown complete");
      }
      case "debug": {
        const debugPath = join(this.#agentDir, "pi-debug.log");
        await mkdir(dirname(debugPath), { recursive: true });
        await writeFile(debugPath, `${JSON.stringify(this.snapshot(), null, 2)}\n`, "utf8");
        return workflowResult(request.command, "completed", "✓ Debug log written", debugPath);
      }
      case "arminsayshi":
        return workflowResult(request.command, "completed", "Armin says hi");
      case "dementedelves":
        return workflowResult(request.command, "completed", "Demented elves announcement");
    }
  }

  #requireWorkflowSession(): PiSessionLike {
    if (this.#disposed || !this.#runtime || !this.#session) throw new Error("engine adapter is not running");
    return this.#session;
  }

  #modelOptions(): readonly PiWorkflowOption[] {
    const runtime = this.#runtime;
    if (!runtime) return [];
    const models = runtime.services.modelRuntime.getAvailableSnapshot?.();
    if (!Array.isArray(models)) {
      const active = this.#activeModel;
      return active ? [{ id: `${active.providerId}/${active.modelId}`, label: active.displayName, description: `${active.providerId}/${active.modelId}` }] : [];
    }
    return models.filter(isRecord).flatMap(model => {
      const provider = stringProperty(model, "provider");
      const id = stringProperty(model, "id");
      if (!provider || !id) return [];
      return [{ id: `${provider}/${id}`, label: stringProperty(model, "name") ?? id, description: `${provider}/${id}` }];
    });
  }

  #loginOptions(authType?: "oauth" | "api_key"): readonly PiWorkflowOption[] {
    const runtime = this.#runtime;
    const providers = runtime?.services.modelRuntime.getProviders?.();
    if (!Array.isArray(providers)) return [];
    return providers.filter(isRecord).flatMap(provider => {
      const id = stringProperty(provider, "id");
      if (!id) return [];
      const name = stringProperty(provider, "name") ?? id;
      const auth = isRecord(provider.auth) ? provider.auth : {};
      return [
        ...(authType !== "api_key" && auth.oauth ? [{ id: `oauth:${id}`, label: name, description: "Account / OAuth" }] : []),
        ...(authType !== "oauth" && auth.apiKey ? [{ id: `api_key:${id}`, label: name, description: "API key" }] : []),
      ];
    });
  }

  async #logoutOptions(): Promise<readonly PiWorkflowOption[]> {
    const runtime = this.#runtime;
    if (!runtime) return [];
    const modelRuntime = runtime.services.modelRuntime;
    const credentials = await requireCapability(modelRuntime.listCredentials, "listCredentials").call(modelRuntime, { signal: AbortSignal.timeout(15_000) });
    if (!Array.isArray(credentials)) return [];
    return credentials.filter(isRecord).flatMap(credential => {
      const providerId = stringProperty(credential, "providerId");
      if (!providerId) return [];
      const credentialType = stringProperty(credential, "type") === "api_key" ? "api_key" : "oauth";
      const provider = modelRuntime.getProvider?.(providerId);
      return [{
        id: `${credentialType}:${providerId}`,
        label: stringProperty(provider, "name") ?? providerId,
        description: credentialType,
      }];
    });
  }

  async #sessionOptions(): Promise<readonly PiWorkflowOption[]> {
    const session = this.#requireWorkflowSession();
    const manager = session.sessionManager;
    const runtimeSessions = await this.#runtime?.listSessions?.();
    if (Array.isArray(runtimeSessions)) return sessionInfoOptions(runtimeSessions);
    const cwd = manager?.getCwd?.();
    const sessionDir = manager?.getSessionDir?.();
    if (typeof cwd !== "string") return [];
    return sessionInfoOptions(await SessionManager.list(cwd, typeof sessionDir === "string" ? sessionDir : undefined));
  }

  #applyPinnedSetting(selection: string, selectedValue?: unknown, hasSelectedValue = false): PiWorkflowResult {
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
    const settings = this.#runtime?.services.settingsManager;
    if (!settings) return workflowResult("settings", "failed", "Settings are unavailable");
    const session = this.#requireWorkflowSession();
    const apply = (setter: ((value: unknown) => void) | undefined, name: string) =>
      requireCapability(setter, name).call(settings, selectedValue);
    switch (callback) {
      case "onAutoCompactChange":
        session.setAutoCompactionEnabled?.(selectedValue);
        apply(settings.setCompactionEnabled, "setCompactionEnabled");
        break;
      case "onThinkingLevelChange": session.setThinkingLevel(selectedValue); break;
      case "onShowImagesChange": apply(settings.setShowImages, "setShowImages"); break;
      case "onImageWidthCellsChange": apply(settings.setImageWidthCells, "setImageWidthCells"); break;
      case "onAutoResizeImagesChange": apply(settings.setImageAutoResize, "setImageAutoResize"); break;
      case "onBlockImagesChange": apply(settings.setBlockImages, "setBlockImages"); break;
      case "onEnableSkillCommandsChange": apply(settings.setEnableSkillCommands, "setEnableSkillCommands"); break;
      case "onSteeringModeChange": apply(settings.setSteeringMode, "setSteeringMode"); break;
      case "onFollowUpModeChange": apply(settings.setFollowUpMode, "setFollowUpMode"); break;
      case "onTransportChange": apply(settings.setTransport, "setTransport"); break;
      case "onHttpIdleTimeoutMsChange": apply(settings.setHttpIdleTimeoutMs, "setHttpIdleTimeoutMs"); break;
      case "onThemeChange": apply(settings.setTheme, "setTheme"); break;
      case "onHideThinkingBlockChange": apply(settings.setHideThinkingBlock, "setHideThinkingBlock"); break;
      case "onMermaidRenderingModeChange": apply(settings.setMermaidRenderingMode, "setMermaidRenderingMode"); break;
      case "onShowCacheMissNoticesChange": apply(settings.setShowCacheMissNotices, "setShowCacheMissNotices"); break;
      case "onCollapseChangelogChange": apply(settings.setCollapseChangelog, "setCollapseChangelog"); break;
      case "onEnableInstallTelemetryChange": apply(settings.setEnableInstallTelemetry, "setEnableInstallTelemetry"); break;
      case "onQuietStartupChange": apply(settings.setQuietStartup, "setQuietStartup"); break;
      case "onDefaultProjectTrustChange": apply(settings.setDefaultProjectTrust, "setDefaultProjectTrust"); break;
      case "onDoubleEscapeActionChange": apply(settings.setDoubleEscapeAction, "setDoubleEscapeAction"); break;
      case "onTreeFilterModeChange": apply(settings.setTreeFilterMode, "setTreeFilterMode"); break;
      case "onShowHardwareCursorChange": apply(settings.setShowHardwareCursor, "setShowHardwareCursor"); break;
      case "onEditorPaddingXChange": apply(settings.setEditorPaddingX, "setEditorPaddingX"); break;
      case "onOutputPadChange": apply(settings.setOutputPad, "setOutputPad"); break;
      case "onAutocompleteMaxVisibleChange": apply(settings.setAutocompleteMaxVisible, "setAutocompleteMaxVisible"); break;
      case "onClearOnShrinkChange": apply(settings.setClearOnShrink, "setClearOnShrink"); break;
      case "onShowTerminalProgressChange": apply(settings.setShowTerminalProgress, "setShowTerminalProgress"); break;
      case "onTuiModeChange": apply(settings.setTuiMode, "setTuiMode"); break;
      case "onFullscreenExitOutputChange": apply(settings.setFullscreenExitOutput, "setFullscreenExitOutput"); break;
      case "onFullscreenScrollbarChange": apply(settings.setFullscreenScrollbar, "setFullscreenScrollbar"); break;
      case "onWarningsChange": apply(settings.setWarnings, "setWarnings"); break;
      default: return workflowResult("settings", "failed", `${settingLabel(callback)} is unavailable in this runtime`);
    }
    this.#emitView();
    return workflowResult("settings", "completed", `${settingLabel(callback)}: ${String(selectedValue)}`);
  }

  async #perform(command: OwnedUiCommand): Promise<void> {
    const runtime = this.#runtime;
    const session = this.#session;
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
            ? { type: command.type, text: command.text }
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
        this.#activeModel = { ...command.model };
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

  #bindSession(session: PiSessionLike): void {
    this.#unsubscribe?.();
    this.#sessionGeneration += 1;
    this.#session = session;
    this.#activeCommandIds = [];
    this.#completedCommands.clear();
    this.#sessionCommands = new PiSessionCommandIntegration(session);
    this.#editor = {
      text: "",
      queuedSubmissions: [],
      selection: null,
      cursorOffset: 0,
      historyRevision: this.#editor.historyRevision + 1,
      submitEnabled: true,
    };
    this.#status = { ...this.#status, workingMessage: null, badges: [] };
    this.#activeModel = readModel(session.model);
    this.#thinkingLevel = readThinkingLevel(session.thinkingLevel);
    this.#rebuildTranscript(session.messages, "finalized");
    this.#unsubscribe = session.subscribe(event => this.#handlePiEvent(event));
    if (this.#extensionUi !== undefined) void this.#bindExtensionUiToSession();
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

  #handlePiEvent(event: unknown): void {
    if (!isRecord(event) || typeof event.type !== "string") return;
    switch (event.type) {
      case "agent_start":
        this.#lifecycle = "busy";
        this.#status = { ...this.#status, workingMessage: "Working..." };
        this.#emitEvent({ type: "session-lifecycle", lifecycle: "busy", reason: null });
        this.#emitEvent({ type: "status", status: this.#status });
        return;
      case "message_start":
        this.#upsertMessageBlock(event.message, "live");
        return;
      case "message_update": {
        const block = this.#upsertMessageBlock(event.message, "live");
        if (block && isRecord(event.assistantMessageEvent) && typeof event.assistantMessageEvent.delta === "string") {
          this.#upsertTranscriptBlock({
            ...block,
            text: block.text.endsWith(event.assistantMessageEvent.delta)
              ? block.text
              : `${block.text}${event.assistantMessageEvent.delta}`,
          });
        }
        return;
      }
      case "message_end":
        this.#upsertMessageBlock(event.message, "finalized");
        return;
      case "turn_end":
        this.#upsertMessageBlock(event.message, "finalized");
        if (Array.isArray(event.toolResults)) {
          for (const result of event.toolResults) this.#upsertMessageBlock(result, "finalized");
        }
        return;
      case "tool_execution_start":
      case "tool_execution_update":
      case "tool_execution_end":
        this.#upsertToolExecutionBlock(event);
        return;
      case "agent_settled":
      case "agent_end": {
        if (event.type === "agent_end" && event.willRetry === true) return;
        const finalMessages = Array.isArray(event.messages) && event.messages.length > 0
          ? event.messages
          : this.#session?.messages ?? [];
        if (finalMessages.length > 0) this.#rebuildTranscript(finalMessages, "finalized");
        else this.#transcript = this.#transcript.map(block => block.status === "live" ? { ...block, status: "finalized" } : block);
        this.#lifecycle = "ready";
        this.#status = { ...this.#status, workingMessage: null };
        this.#emitEvent({ type: "session-lifecycle", lifecycle: "ready", reason: null });
        this.#emitEvent({ type: "status", status: this.#status });
        this.#emitView();
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
        this.#lifecycle = "busy";
        this.#status = { ...this.#status, workingMessage: "Retrying…" };
        this.#emitEvent({ type: "status", status: this.#status });
        return;
      case "auto_retry_end":
      case "compaction_end":
        this.#lifecycle = "ready";
        this.#status = { ...this.#status, workingMessage: null };
        this.#emitEvent({ type: "status", status: this.#status });
        return;
      case "compaction_start":
        this.#lifecycle = "busy";
        this.#status = { ...this.#status, workingMessage: "Compacting…" };
        this.#emitEvent({ type: "status", status: this.#status });
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
    const entries = this.#session?.sessionManager?.getEntries()
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

  #rebuildTranscript(messages: readonly unknown[], status: OwnedUiTranscriptBlock["status"]): void {
    const blocks: OwnedUiTranscriptBlock[] = [];
    const blockIndexes = new Map<string, number>();
    const occurrences = new Map<string, number>();
    for (const [index, message] of messages.entries()) {
      const key = messageFallbackKey(message, index);
      const occurrence = occurrences.get(key) ?? 0;
      occurrences.set(key, occurrence + 1);
      for (const block of this.#messageBlocks(message, status, index, occurrence)) {
        const existingIndex = blockIndexes.get(block.id);
        if (existingIndex === undefined) {
          blockIndexes.set(block.id, blocks.length);
          blocks.push(block);
          continue;
        }
        const existing = blocks[existingIndex];
        if (existing !== undefined) {
          blocks[existingIndex] = {
            ...block,
            payload: {
              ...(isRecord(existing.payload) ? existing.payload : {}),
              ...(isRecord(block.payload) ? block.payload : {}),
            },
          };
        }
      }
    }
    this.#transcript = blocks;
  }

  #upsertMessageBlock(
    message: unknown,
    status: OwnedUiTranscriptBlock["status"],
  ): OwnedUiTranscriptBlock | undefined {
    const blocks = this.#messageBlocks(message, status, this.#transcript.length);
    const first = blocks[0];
    for (const block of blocks) this.#upsertTranscriptBlock(block);
    return first;
  }

  #messageBlocks(
    message: unknown,
    status: OwnedUiTranscriptBlock["status"],
    fallbackIndex: number,
    occurrence?: number,
  ): OwnedUiTranscriptBlock[] {
    if (!isRecord(message) || typeof message.role !== "string") return [];
    const baseId = this.#messageBlockId(message, fallbackIndex, status, occurrence);
    if (message.role === "user") {
      return [{
        id: baseId,
        kind: "user",
        status,
        revision: this.#nextBlockRevision(baseId),
        title: "User",
        text: textFromContent(message.content),
        payload: { role: "user", imageCount: contentImageCount(message.content) },
      }];
    }
    if (message.role === "bashExecution") {
      return [{
        id: baseId,
        kind: "bash",
        status,
        revision: this.#nextBlockRevision(baseId),
        title: stringValue(message.command) ?? "Bash",
        text: stringValue(message.output) ?? "",
        payload: {
          role: "bashExecution",
          command: stringValue(message.command) ?? "",
          exitCode: typeof message.exitCode === "number" ? message.exitCode : null,
          cancelled: message.cancelled === true,
          truncated: message.truncated === true,
          fullOutputPath: stringValue(message.fullOutputPath) ?? null,
          excludeFromContext: message.excludeFromContext === true,
        },
      }];
    }
    if (message.role === "custom") {
      if (message.display === false) return [];
      return [{
        id: baseId,
        kind: "custom",
        status,
        revision: this.#nextBlockRevision(baseId),
        title: stringValue(message.customType) ?? "Custom",
        text: textFromContent(message.content),
        payload: {
          role: "custom",
          customType: stringValue(message.customType) ?? "custom",
          display: true,
          details: message.details,
          timestamp: typeof message.timestamp === "number" ? message.timestamp : 0,
        },
      }];
    }
    if (message.role === "compactionSummary" || message.role === "branchSummary") {
      return [{
        id: baseId,
        kind: "compaction",
        status,
        revision: this.#nextBlockRevision(baseId),
        title: message.role === "branchSummary" ? "Branch summary" : "Compaction summary",
        text: stringValue(message.summary) ?? "",
        payload: {
          role: message.role,
          tokensBefore: typeof message.tokensBefore === "number" ? message.tokensBefore : 0,
          fromId: stringValue(message.fromId) ?? null,
          timestamp: typeof message.timestamp === "number" ? message.timestamp : 0,
        },
      }];
    }
    if (message.role === "toolResult") {
      const toolCallId = stringValue(message.toolCallId);
      const blockId = toolCallId === undefined
        ? baseId
        : this.#toolBlockIds.get(toolCallId) ?? `tool-${toolCallId}`;
      if (toolCallId !== undefined) this.#toolBlockIds.set(toolCallId, blockId);
      const existing = this.#transcript.find(block => block.id === blockId);
      const existingPayload = isRecord(existing?.payload) ? existing.payload : undefined;
      return [{
        id: blockId,
        kind: "tool-result",
        status,
        revision: this.#nextBlockRevision(blockId),
        title: stringValue(message.toolName) ?? existing?.title ?? "Tool result",
        text: textFromContent(message.content),
        payload: {
          ...(existingPayload ?? {}),
          role: "toolResult",
          toolCallId: toolCallId ?? null,
          toolName: stringValue(message.toolName) ?? stringValue(existingPayload?.toolName) ?? "unknown",
          argsComplete: true,
          isError: message.isError === true,
          details: jsonSummary(message.details),
        },
      }];
    }
    if (message.role !== "assistant" || !Array.isArray(message.content)) return [];

    const blocks: OwnedUiTranscriptBlock[] = [{
      id: baseId,
      kind: "assistant",
      status,
      revision: this.#nextBlockRevision(baseId),
      title: "Assistant",
      text: textFromContent(message.content),
      payload: {
        role: "assistant",
        content: assistantContent(message.content),
        provider: stringValue(message.provider) ?? null,
        model: stringValue(message.model) ?? null,
        api: stringValue(message.api) ?? null,
        usage: sanitizeJson(message.usage),
        stopReason: stringValue(message.stopReason) ?? null,
        errorMessage: stringValue(message.errorMessage) ?? null,
        timestamp: typeof message.timestamp === "number" ? message.timestamp : 0,
      },
    }];
    for (const item of message.content) {
      if (!isRecord(item) || item.type !== "toolCall") continue;
      const toolCallId = stringValue(item.id) ?? `${baseId}:${blocks.length}`;
      const blockId = this.#toolBlockIds.get(toolCallId) ?? `tool-${toolCallId}`;
      this.#toolBlockIds.set(toolCallId, blockId);
      blocks.push({
        id: blockId,
        kind: "tool-call",
        status,
        revision: this.#nextBlockRevision(blockId),
        title: stringValue(item.name) ?? "Tool",
        text: jsonSummary(item.arguments).summary,
        payload: {
          toolCallId,
          toolName: stringValue(item.name) ?? "unknown",
          arguments: jsonSummary(item.arguments),
          argsComplete: status === "finalized",
        },
      });
    }
    return blocks;
  }

  #upsertToolExecutionBlock(event: Record<string, unknown>): void {
    const toolCallId = stringValue(event.toolCallId);
    if (!toolCallId) return;
    const blockId = this.#toolBlockIds.get(toolCallId) ?? `tool-${toolCallId}`;
    this.#toolBlockIds.set(toolCallId, blockId);
    const ended = event.type === "tool_execution_end";
    const source = ended ? event.result : event.partialResult;
    this.#upsertTranscriptBlock({
      id: blockId,
      kind: ended ? "tool-result" : "tool-call",
      status: ended ? "finalized" : "live",
      revision: this.#nextBlockRevision(blockId),
      title: stringValue(event.toolName) ?? "Tool",
      text: textFromContent(isRecord(source) ? source.content : source),
      payload: {
        toolCallId,
        toolName: stringValue(event.toolName) ?? "unknown",
        arguments: jsonSummary(event.args),
        result: jsonSummary(source),
        partialResult: event.type === "tool_execution_update",
        argsComplete: ended,
        isError: event.isError === true,
      },
    });
  }

  #upsertTranscriptBlock(block: OwnedUiTranscriptBlock): void {
    const index = this.#transcript.findIndex(existing => existing.id === block.id);
    if (index >= 0) this.#transcript[index] = block;
    else this.#transcript.push(block);
    this.#emitEvent({ type: "transcript-block", block });
  }

  #messageBlockId(
    message: Record<string, unknown>,
    fallbackIndex: number,
    status: OwnedUiTranscriptBlock["status"],
    occurrence?: number,
  ): string {
    const existing = this.#messageBlockIds.get(message);
    if (existing) return existing;
    const fallback = messageFallbackKey(message, fallbackIndex);
    const cached = this.#messageFallbackIds.get(fallback) ?? [];
    let id: string | undefined;
    if (occurrence !== undefined) {
      id = cached[occurrence];
      if (id === undefined) {
        id = `${fallback}-${occurrence}`;
        cached[occurrence] = id;
      }
    } else {
      id = [...cached].reverse().find(candidate =>
        this.#transcript.some(block => block.id === candidate && block.status === "live"));
      if (id === undefined && status === "finalized") id = cached.at(-1);
      if (id === undefined) {
        id = `${fallback}-${cached.length}`;
        cached.push(id);
      }
    }
    this.#messageFallbackIds.set(fallback, cached);
    this.#messageBlockIds.set(message, id);
    return id;
  }

  #nextBlockRevision(id: string): number {
    const existing = this.#transcript.find(block => block.id === id);
    if (existing) return existing.revision + 1;
    this.#nextBlockSequence += 1;
    return this.#nextBlockSequence;
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
    this.#viewRevision += 1;
    this.#emitEvent({ type: "session-view", view: this.view() });
  }

  #emitEvent(
    value:
      | Omit<Extract<OwnedUiEvent, { type: "session-lifecycle" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "session-view" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "transcript-block" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "editor-state" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "status" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "command-outcome" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "terminal-surface" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "diagnostic" }>, "sessionId" | "sequence">,
  ): void {
    const event = this.#event(value);
    if (event.type !== "session-view") this.#viewRevision += 1;
    this.#enqueueEvent(event);
  }

  #enqueueEvent(event: OwnedUiEvent): void {
    const capacity = 1_024;
    if (this.#eventQueue.length >= capacity) {
      const coalescible = this.#eventQueue.findIndex(queued =>
        queued.type === "session-view"
        || queued.type === "status"
        || queued.type === "editor-state"
        || queued.type === "transcript-block"
      );
      if (coalescible >= 0) this.#eventQueue.splice(coalescible, 1);
      else this.#eventQueue.shift();
      this.#droppedEventCount += 1;
      if (this.#droppedEventCount === 1 || this.#droppedEventCount % 128 === 0) {
        this.#recordDiagnostic(
          "warning",
          "event-backpressure",
          `owned UI coalesced ${this.#droppedEventCount} engine events under backpressure`,
          true,
        );
      }
    }
    this.#eventQueue.push(event);
    this.#eventQueueProcessing ??= Promise.resolve().then(() => this.#processEventQueue());
  }

  async #processEventQueue(): Promise<void> {
    try {
      while (this.#eventQueue.length > 0) {
        const event = this.#eventQueue.shift();
        if (!event) continue;
        for (const listener of this.#listeners) {
          try {
            listener(event);
          } catch (error) {
            this.#recordDiagnostic(
              "warning",
              "event-listener",
              error instanceof Error ? error.message : String(error),
              true,
            );
          }
        }
      }
    } finally {
      this.#eventQueueProcessing = undefined;
      if (this.#eventQueue.length > 0) {
        this.#eventQueueProcessing = Promise.resolve().then(() => this.#processEventQueue());
      }
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

  #event(
    value:
      | Omit<Extract<OwnedUiEvent, { type: "session-lifecycle" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "session-view" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "transcript-block" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "editor-state" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "status" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "command-outcome" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "terminal-surface" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "diagnostic" }>, "sessionId" | "sequence">,
  ): OwnedUiEvent {
    this.#sequence += 1;
    return { ...value, sessionId: this.#sessionId, sequence: this.#sequence } as OwnedUiEvent;
  }
}

export async function createPiEngineAdapter(
  options: PiEngineAdapterOptions = {},
): Promise<PiEngineAdapter> {
  const adapter = new PiEngineAdapter(options);
  await adapter.start();
  return adapter;
}

async function createDefaultPiRuntime(input: PiEngineRuntimeFactoryInput): Promise<PiRuntimeLike> {
  return createPiRuntimeIntegration({ cwd: input.cwd, agentDir: input.agentDir });
}

function pinnedSessionInfoPresentation(
  value: unknown,
  sessionName: string | undefined,
  entries: readonly unknown[],
  modelRuntime: PiServicesLike["modelRuntime"],
): PiSessionInfoPresentation {
  const stats = isRecord(value) ? value : {};
  const tokens = dynamicObject(stats, "tokens");
  return {
    kind: "session-info",
    ...(sessionName === undefined ? {} : { sessionName }),
    stats: {
      ...(stringProperty(stats, "sessionFile") === undefined ? {} : { sessionFile: stringProperty(stats, "sessionFile")! }),
      sessionId: stringProperty(stats, "sessionId") ?? "unknown",
      userMessages: finiteNumber(stats.userMessages),
      assistantMessages: finiteNumber(stats.assistantMessages),
      toolCalls: finiteNumber(stats.toolCalls),
      toolResults: finiteNumber(stats.toolResults),
      totalMessages: finiteNumber(stats.totalMessages),
      tokens: {
        input: finiteNumber(tokens.input),
        output: finiteNumber(tokens.output),
        cacheRead: finiteNumber(tokens.cacheRead),
        cacheWrite: finiteNumber(tokens.cacheWrite),
        total: finiteNumber(tokens.total),
      },
      cost: finiteNumber(stats.cost),
    },
    cacheWaste: pinnedCacheWaste(entries, modelRuntime),
    usageBreakdown: pinnedUsageCostBreakdown(entries),
  };
}

function pinnedUsageCostBreakdown(entries: readonly unknown[]): PiSessionInfoPresentation["usageBreakdown"] {
  const totals = new Map<string, { cost: number; tokens: number }>();
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    let key: string | undefined;
    let usage: Record<string, unknown> | undefined;
    const message = dynamicObject(entry, "message");
    if (entry.type === "message" && message.role === "assistant") {
      const provider = stringProperty(message, "provider");
      const model = stringProperty(message, "responseModel") ?? stringProperty(message, "model");
      if (provider && model) key = `${provider}/${model}`;
      usage = dynamicObject(message, "usage");
    } else if (entry.type === "message" && message.role === "toolResult" && isRecord(message.usage)) {
      key = "Tools/summaries";
      usage = message.usage;
    } else if ((entry.type === "branch_summary" || entry.type === "compaction") && isRecord(entry.usage)) {
      key = "Tools/summaries";
      usage = entry.usage;
    }
    if (!key || !usage) continue;
    const cost = finiteNumber(dynamicObject(usage, "cost").total);
    const tokens = finiteNumber(usage.input) + finiteNumber(usage.output)
      + finiteNumber(usage.cacheRead) + finiteNumber(usage.cacheWrite);
    const current = totals.get(key) ?? { cost: 0, tokens: 0 };
    current.cost += cost;
    current.tokens += tokens;
    totals.set(key, current);
  }
  return [...totals].map(([key, total]) => ({ key, ...total }))
    .filter(entry => entry.cost > 0 || entry.tokens > 0)
    .sort((a, b) => b.cost - a.cost);
}

function pinnedCacheWaste(
  entries: readonly unknown[],
  modelRuntime: PiServicesLike["modelRuntime"],
): PiSessionInfoPresentation["cacheWaste"] {
  let previous: { promptTokens: number; modelKey: string; timestamp: number; reportedCache: boolean } | undefined;
  const totals = { missedTokens: 0, missedCost: 0, missCount: 0 };
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    if (entry.type === "compaction" || entry.type === "branch_summary") {
      previous = undefined;
      continue;
    }
    const message = dynamicObject(entry, "message");
    if (entry.type !== "message" || message.role !== "assistant") continue;
    const usage = dynamicObject(message, "usage");
    const input = finiteNumber(usage.input);
    const cacheRead = finiteNumber(usage.cacheRead);
    const cacheWrite = finiteNumber(usage.cacheWrite);
    const promptTokens = input + cacheRead + cacheWrite;
    if (previous && promptTokens > 0 && (cacheRead + cacheWrite > 0 || previous.reportedCache)) {
      const missedTokens = Math.min(previous.promptTokens, promptTokens) - cacheRead;
      if (missedTokens > 1024) {
        const cost = dynamicObject(usage, "cost");
        const paidTokens = input + cacheWrite;
        const paidRate = paidTokens > 0 ? (finiteNumber(cost.input) + finiteNumber(cost.cacheWrite)) / paidTokens : 0;
        const provider = stringProperty(message, "provider") ?? "";
        const modelId = stringProperty(message, "model") ?? "";
        const model = modelRuntime.getModel(provider, modelId);
        const modelCost = dynamicObject(dynamicObject(model, "cost"));
        const readRate = cacheRead > 0
          ? finiteNumber(cost.cacheRead) / cacheRead
          : finiteNumber(modelCost.cacheRead) / 1_000_000;
        totals.missedTokens += missedTokens;
        totals.missedCost += missedTokens * Math.max(0, paidRate - readRate);
        totals.missCount += 1;
      }
    }
    if (promptTokens > 0) {
      const provider = stringProperty(message, "provider") ?? "";
      const model = stringProperty(message, "model") ?? "";
      previous = {
        promptTokens,
        modelKey: `${provider}/${model}`,
        timestamp: finiteNumber(message.timestamp),
        reportedCache: (previous?.reportedCache ?? false) || cacheRead + cacheWrite > 0,
      };
    }
  }
  return totals;
}

function defaultWorkflowHost(): PiWorkflowHost {
  return {
    copyText: copyToClipboard,
    async runCommand(command, arguments_) {
      const result = await execFileAsync(command, [...arguments_], { encoding: "utf8" });
      return { stdout: result.stdout, stderr: result.stderr };
    },
    readChangelog: async () => pinnedChangelogMarkdown(await readFile(join(getPackageDir(), "CHANGELOG.md"), "utf8")),
  };
}

function workflowLoginNotification(event: unknown): PiWorkflowLoginNotification | undefined {
  if (!isRecord(event)) return undefined;
  if (event.type === "auth_url") {
    const url = stringProperty(event, "url");
    if (!url) return undefined;
    const instructions = stringProperty(event, "instructions");
    return { type: "auth_url", url, ...(instructions === undefined ? {} : { instructions }) };
  }
  if (event.type === "device_code") {
    const verificationUri = stringProperty(event, "verificationUri");
    const userCode = stringProperty(event, "userCode");
    return verificationUri && userCode ? { type: "device_code", verificationUri, userCode } : undefined;
  }
  const message = stringProperty(event, "message");
  if (!message) return undefined;
  if (event.type === "info") {
    const links = Array.isArray(event.links) ? event.links.filter(isRecord).flatMap(link => {
      const url = stringProperty(link, "url");
      if (!url) return [];
      const label = stringProperty(link, "label");
      return [{ ...(label === undefined ? {} : { label }), url }];
    }) : [];
    return { type: "info", message, ...(links.length === 0 ? {} : { links }) };
  }
  return { type: event.type === "waiting" ? "waiting" : "progress", message };
}

function workflowResult(
  command: PiWorkflowRequest["command"],
  outcome: PiWorkflowResult["outcome"],
  message: string,
  detail?: string,
): PiWorkflowResult {
  return { command, outcome, message, ...(detail === undefined ? {} : { detail }) };
}

function workflowConfirmation(command: PiWorkflowRequest["command"], message: string): PiWorkflowResult {
  return {
    command,
    outcome: "requires-confirmation",
    message,
    selectorTitle: "Confirm",
    options: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
  };
}

function workflowOptions(value: unknown, idKey: string, labelKey: string): readonly PiWorkflowOption[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap(item => {
    const id = stringProperty(item, idKey);
    if (!id) return [];
    return [{ id, label: stringProperty(item, labelKey) ?? id }];
  });
}

function sessionInfoOptions(value: readonly unknown[]): readonly PiWorkflowOption[] {
  return value.filter(isRecord).flatMap(info => {
    const path = stringProperty(info, "path");
    if (!path) return [];
    const modified = info.modified instanceof Date ? info.modified.toISOString() : stringProperty(info, "modified") ?? "unknown time";
    const messageCount = typeof info.messageCount === "number" ? info.messageCount : 0;
    return [{
      id: path,
      label: stringProperty(info, "name") ?? stringProperty(info, "firstMessage") ?? stringProperty(info, "id") ?? path,
      description: `${messageCount} messages · ${modified}`,
    }];
  });
}

function assertPiExtensionUiContext(value: unknown): asserts value is ExtensionUIContext {
  assertOwnedUiExtensionUiPort(value);
}

function dynamicObject(value: unknown, key?: string): Record<string, unknown> {
  const candidate = key === undefined ? value : isRecord(value) ? value[key] : undefined;
  return isRecord(candidate) ? candidate : {};
}

function requireCapability<T>(capability: T | undefined, name: string): T {
  if (typeof capability !== "function") throw new Error(`Pi workflow capability is unavailable: ${name}`);
  return capability;
}

function pathArgument(value: string): string | undefined {
  if (!value) return undefined;
  const quote = value[0];
  if (quote === '"' || quote === "'") {
    const closing = value.indexOf(quote, 1);
    return closing < 0 ? undefined : value.slice(1, closing);
  }
  return value.split(/\s/, 1)[0] || undefined;
}

function settingLabel(callback: PiPinnedSettingsCallback): string {
  return callback
    .replace(/^on/, "")
    .replace(/Change$|Preview$|Cancel$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, character => character.toUpperCase());
}

function pinnedHotkeySummary(): string {
  return [
    "Enter: send message · Alt+Enter: queue follow-up",
    "Escape: cancel/abort · Ctrl+C: clear/exit · Ctrl+D: exit when empty",
    "Shift+Tab: cycle thinking · Ctrl+P/Shift+Ctrl+P: cycle models · Ctrl+L: select model",
    "Ctrl+O: expand tools · Ctrl+T: toggle thinking · Ctrl+X: copy message",
    "Alt+Up: restore queued messages · /: commands · !/!!: bash",
  ].join("\n");
}

function scopedModelRecords(modelRuntime: PiServicesLike["modelRuntime"]): readonly {
  readonly descriptor: PiScopedModelDescriptor;
  readonly model: unknown;
}[] {
  const snapshot = modelRuntime.getAvailableSnapshot?.() ?? [];
  return snapshot.flatMap(model => {
    if (!isRecord(model)) return [];
    const provider = stringValue(model.provider);
    const id = stringValue(model.id);
    if (!provider || !id) return [];
    return [{ descriptor: { provider, id, name: stringValue(model.name) ?? id }, model }];
  });
}

function scopedModelReference(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.model)) return undefined;
  const provider = stringValue(value.model.provider);
  const id = stringValue(value.model.id);
  return provider && id ? `${provider}/${id}` : undefined;
}

function resolveConfiguredModelIds(
  patterns: readonly string[],
  models: readonly { readonly descriptor: PiScopedModelDescriptor }[],
): readonly string[] {
  const references = models.map(item => `${item.descriptor.provider}/${item.descriptor.id}`);
  const resolved: string[] = [];
  for (const pattern of patterns) {
    const thinkingSuffix = /:(?:off|minimal|low|medium|high|xhigh)$/.exec(pattern);
    const modelPattern = thinkingSuffix === null ? pattern : pattern.slice(0, -thinkingSuffix[0].length);
    const matcher = wildcardMatcher(modelPattern);
    const matches = references.filter((reference, index) => matcher.test(reference) || matcher.test(models[index]?.descriptor.id ?? ""));
    if (matches.length === 0) {
      resolved.push(pattern);
    } else {
      for (const match of matches) if (!resolved.includes(match)) resolved.push(match);
    }
  }
  return resolved;
}

function wildcardMatcher(pattern: string): RegExp {
  let source = "";
  for (const character of pattern) {
    if (character === "*") source += ".*";
    else if (character === "?") source += ".";
    else source += character.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }
  return new RegExp(`^${source}$`, "i");
}

function readModel(value: unknown): OwnedUiModelInfo | null {
  if (!isRecord(value)) return null;
  const providerId = stringValue(value.provider) ?? stringValue(value.providerId);
  const modelId = stringValue(value.id) ?? stringValue(value.modelId);
  if (!providerId || !modelId) return null;
  return {
    providerId,
    modelId,
    displayName: stringValue(value.name) ?? modelId,
  };
}

function readThinkingLevel(value: unknown): OwnedUiThinkingLevel {
  return value === "off" || value === "minimal" || value === "low" || value === "medium"
    || value === "high" || value === "xhigh"
    ? value
    : "medium";
}

function readStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function messageFallbackKey(message: unknown, fallbackIndex: number): string {
  if (!isRecord(message)) return `message-unknown-${fallbackIndex}`;
  const timestamp = typeof message.timestamp === "number" && Number.isSafeInteger(message.timestamp)
    ? message.timestamp
    : `index-${fallbackIndex}`;
  return `message-${stringValue(message.role) ?? "unknown"}-${timestamp}`;
}

function extensionResourceDiagnostic(index: number, sourcePath: string | null, diagnostic: string): OwnedPiExtensionResourceSummary {
  return {
    kind: "extension",
    id: `extension-diagnostic-${index}`,
    sourcePath,
    resolvedPath: null,
    loaded: false,
    hidden: false,
    diagnostic,
  };
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

function stringProperty(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const item = value[key];
  return typeof item === "string" && item.length > 0 ? item : undefined;
}

function compactResourceLabel(path: string): string {
  const segments = path.replaceAll("\\", "/").split("/").filter(Boolean);
  return segments.at(-1) ?? path;
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map(item => isRecord(item) && item.type === "text" ? stringValue(item.text) ?? "" : "")
    .filter(text => text.length > 0)
    .join("\n");
}

function assistantContent(content: readonly unknown[]): readonly Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  for (const item of content) {
    if (!isRecord(item)) continue;
    if (item.type === "text") result.push({ type: "text", text: stringValue(item.text) ?? "" });
    else if (item.type === "thinking") {
      result.push({
        type: "thinking",
        thinking: stringValue(item.thinking) ?? "",
        ...(item.redacted === true ? { redacted: true } : {}),
      });
    } else if (item.type === "toolCall") {
      result.push({
        type: "toolCall",
        id: stringValue(item.id) ?? "",
        name: stringValue(item.name) ?? "unknown",
        arguments: sanitizeJson(item.arguments),
      });
    }
  }
  return result;
}

function contentImageCount(content: unknown): number {
  return Array.isArray(content)
    ? content.filter(item => isRecord(item) && item.type === "image").length
    : 0;
}

function pinnedChangelogMarkdown(content: string): string {
  const entries = content.split(/^##\s+/m).slice(1).flatMap(section => {
    const markdown = `## ${section}`.trim();
    return /^##\s+\[?\d+\.\d+\.\d+\]?/.test(markdown) ? [markdown] : [];
  });
  return entries.reverse().join("\n\n") || "No changelog entries found.";
}

function jsonSummary(value: unknown): { readonly summary: string; readonly json: unknown } {
  const json = sanitizeJson(value);
  let summary = "";
  try {
    summary = JSON.stringify(json);
  } catch {
    summary = String(value);
  }
  if (summary.length > 512) summary = `${summary.slice(0, 509)}...`;
  return { summary, json };
}

function sanitizeJson(value: unknown, depth = 0): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (depth >= 8) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 100).map(item => sanitizeJson(item, depth + 1));
  if (isRecord(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).slice(0, 100)) {
      output[key] = sanitizeJson(item, depth + 1);
    }
    return output;
  }
  return String(value);
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

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
