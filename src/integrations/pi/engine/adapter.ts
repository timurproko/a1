import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import type { PiSessionForkPrompt, PiSessionSelection } from "./session-selection.js";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { PRODUCT_IDENTITY } from "../../../product-identity.js";
import { configureOwnedHttpDispatcher } from "./http-dispatcher.js";
import {
  copyToClipboard,
  DefaultPackageManager,
  getAgentDir,
  ProjectTrustStore,
  SessionManager,
  VERSION,
  type AgentSession,
  type AgentSessionRuntime,
  type AgentSessionServices,
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
  type OwnedUiImageAttachment,
  type OwnedUiTranscriptImageReference,
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
import { PiSettingsIntegration } from "./settings-integration.js";
import type { PiSettingOwnerHandlers } from "./settings-effects.js";
import type { PiProjectTrustPreflightPrompt } from "./project-trust-preflight.js";
import type { AgentJsonValue, AgentSettingOwner } from "../../../contracts/agent-engine/index.js";

const execFileAsync = promisify(execFile);

/**
 * Engine events delivered before the queue hands the event loop a turn. Small enough
 * that a streaming burst never holds input, large enough that an ordinary turn is one
 * batch.
 */
// Performance: deliver at most one engine event per event-loop turn. Transcript updates can
// be expensive in long sessions; a larger synchronous batch starves terminal
// input and makes an in-progress mouse selection appear frozen.
const EVENT_DELIVERY_BATCH = 1;
const TOOL_UPDATE_COALESCE_MS = 50;

export interface PiEngineRuntimeFactoryInput {
  readonly cwd: string;
  readonly agentDir: string;
  readonly sessionId: string;
  readonly sessionPath?: string;
  readonly sessionSelection?: PiSessionSelection;
  readonly sessionForkPrompt?: PiSessionForkPrompt;
  readonly projectTrustPrompt?: PiProjectTrustPreflightPrompt;
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

export interface PiSessionResumeMetadata {
  readonly sessionId: string;
  readonly sessionDir: string;
  readonly usesDefaultSessionDir: boolean;
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
export class PiEngineAdapter {
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
  readonly #listeners = new Set<(event: OwnedUiEvent) => void>();
  #runtime: PiRuntimeApi | undefined;
  #session: PiSessionApi | undefined;
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
  readonly #transcriptIndex = new Map<string, number>();
  #transcriptSnapshot: readonly OwnedUiTranscriptBlock[] | undefined;
  readonly #messageBlockIds = new WeakMap<object, string>();
  readonly #messageFallbackIds = new Map<string, string[]>();
  readonly #toolBlockIds = new Map<string, string>();
  readonly #transcriptImageAssets = new Map<string, OwnedUiImageAttachment>();
  readonly #pendingToolUpdates = new Map<string, Record<string, unknown>>();
  #toolUpdateFlush: ReturnType<typeof setTimeout> | null = null;
  #usageCache: OwnedUiUsageView | undefined;
  #nextBlockSequence = 0;
  #diagnostics: OwnedUiDiagnostics[] = [];
  readonly #eventQueue: OwnedUiEvent[] = [];
  #eventQueueProcessing: Promise<void> | undefined;
  #droppedEventCount = 0;
  #agentRunActive = false;
  #statusKind: "working" | "retry" | "compaction" | null = null;
  #sessionCommands: PiSessionCommandIntegration | undefined;
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

  get cwd(): string {
    return this.#runtime?.cwd ?? this.#cwd;
  }

  get agentDir(): string {
    return this.#agentDir;
  }

  resolveTranscriptImage(assetId: string): OwnedUiImageAttachment | null {
    return this.#transcriptImageAssets.get(assetId) ?? null;
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
    if (settingsManager.getLastChangelogVersion() === VERSION) return;
    const markdown = await this.#workflowHost.readChangelog().catch(() => "");
    if (markdown.trim().length > 0) {
      this.#addDiagnostic(
        "info",
        settingsManager.getCollapseChangelog() ? "changelog-collapsed" : "changelog-expanded",
        markdown,
        true,
      );
    }
    settingsManager.setLastChangelogVersion(VERSION);
    await settingsManager.flush();
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
    this.#listeners.add(listener);
    listener(this.#event({ type: "session-view", view: this.view() }));
    return () => this.#listeners.delete(listener);
  }

  async flushEvents(): Promise<void> {
    this.#flushPendingToolUpdates();
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

  bindSettingsOwner(owner: AgentSettingOwner, handlers: PiSettingOwnerHandlers): () => void {
    const settings = this.settingsPort();
    if (settings === null) return () => {};
    return settings.bindOwner(owner, handlers);
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
    const scoped = session.scopedModels;
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
      currentModel: this.#activeModel === null ? undefined : session.model,
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
    const scoped = session.scopedModels;
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

  pinnedLoginOptions(authType?: "oauth" | "api_key"): readonly PiAuthenticationProviderOption[] {
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
      id: option.id,
      label: option.id.startsWith("api_key:") ? "Sign in with an API key" : loginLabel,
      ...(option.description === undefined ? {} : { description: option.description }),
    }));
    return { title: `Select authentication method for ${providerName}:`, options };
  }

  pinnedLogoutOptions(): Promise<readonly PiAuthenticationProviderOption[]> {
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

  async applyPinnedSettingValue(callback: PiPinnedSettingsCallback, value: unknown): Promise<PiWorkflowResult> {
    try {
      return await this.#applyPinnedSetting(callback, value, true);
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
      transcript: this.#transcriptSnapshot ??= Object.freeze([...this.#transcript]),
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
    if (this.#toolUpdateFlush !== null) {
      clearTimeout(this.#toolUpdateFlush);
      this.#toolUpdateFlush = null;
    }
    this.#pendingToolUpdates.clear();
    this.#transcriptImageAssets.clear();
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
        return await this.#applyPinnedSetting(selection);
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
        this.#reconcileActiveModelAvailability();
        this.#emitView();
        return workflowResult(request.command, "completed", `Logged in to ${providerName}. Credentials saved to ${join(this.#agentDir, "auth.json")}`);
      }
      case "logout": {
        if (!selection) return workflowResult(request.command, "failed", "Logout requires the owned authentication controller");
        const [credentialType = "oauth", providerId = selection] = selection.includes(":") ? selection.split(":", 2) : ["oauth", selection];
        const modelRuntime = runtime.services.modelRuntime;
        await requireCapability(modelRuntime.logout, "logout").call(modelRuntime, providerId, { signal: AbortSignal.timeout(15_000) });
        const provider = modelRuntime.getProvider?.(providerId);
        const providerName = stringProperty(provider, "name") ?? providerId;
        this.#reconcileActiveModelAvailability();
        this.#emitView();
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

  #requireWorkflowSession(): PiSessionApi {
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

  #loginOptions(authType?: "oauth" | "api_key"): readonly PiAuthenticationProviderOption[] {
    const runtime = this.#runtime;
    const modelRuntime = runtime?.services.modelRuntime;
    if (!modelRuntime) return [];
    const providers = modelRuntime.getProviders?.();
    if (!Array.isArray(providers)) return [];
    return providers.filter(isRecord).flatMap(provider => {
      const id = stringProperty(provider, "id");
      if (!id) return [];
      const name = stringProperty(provider, "name") ?? id;
      const auth = isRecord(provider.auth) ? provider.auth : {};
      const authStatus = modelRuntime.getProviderAuthStatus?.(id);
      const source = authStatus?.label ?? authStatus?.source;
      const status = authStatus?.configured === true
        ? {
            type: modelRuntime.isUsingOAuth?.(id) === true ? "oauth" as const : "api_key" as const,
            ...(source === undefined ? {} : { source }),
          }
        : undefined;
      return [
        ...(authType !== "api_key" && auth.oauth ? [{
          id: `oauth:${id}`,
          providerId: id,
          label: name,
          description: "Account / OAuth",
          authType: "oauth" as const,
          ...(status === undefined ? {} : { status }),
        }] : []),
        ...(authType !== "oauth" && auth.apiKey ? [{
          id: `api_key:${id}`,
          providerId: id,
          label: name,
          description: "API key",
          authType: "api_key" as const,
          ...(status === undefined ? {} : { status }),
        }] : []),
      ];
    }).sort((left, right) => left.label.localeCompare(right.label));
  }

  async #logoutOptions(): Promise<readonly PiAuthenticationProviderOption[]> {
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
        providerId,
        label: stringProperty(provider, "name") ?? providerId,
        description: credentialType,
        authType: credentialType,
        status: { type: credentialType, source: "stored credential" },
      }];
    });
  }

  async #sessionOptions(): Promise<readonly PiWorkflowOption[]> {
    const session = this.#requireWorkflowSession();
    const manager = session.sessionManager;
    const cwd = manager?.getCwd?.();
    const sessionDir = manager?.getSessionDir?.();
    if (typeof cwd !== "string") return [];
    return sessionInfoOptions(await SessionManager.list(cwd, typeof sessionDir === "string" ? sessionDir : undefined));
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

  #bindSession(session: PiSessionApi): void {
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
    this.#statusKind = null;
    this.#agentRunActive = false;
    this.#activeModel = readModel(session.model);
    this.#reconcileActiveModelAvailability();
    this.#thinkingLevel = readThinkingLevel(session.thinkingLevel);
    this.#transcriptImageAssets.clear();
    this.#rebuildTranscript(session.messages, "finalized");
    this.#unsubscribe = session.subscribe(event => this.#handlePiEvent(event));
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

  // Performance: replacing the transcript rebuilds its index so block lookup stays constant-time.
  #setTranscript(blocks: OwnedUiTranscriptBlock[]): void {
    this.#transcript = blocks;
    this.#transcriptIndex.clear();
    for (const [index, block] of blocks.entries()) this.#transcriptIndex.set(block.id, index);
    const retainedAssets = new Set(blocks.flatMap(block => block.imageReferences?.map(reference => reference.assetId) ?? []));
    for (const assetId of this.#transcriptImageAssets.keys()) {
      if (!retainedAssets.has(assetId)) this.#transcriptImageAssets.delete(assetId);
    }
    this.#transcriptSnapshot = undefined;
  }

  #transcriptBlock(id: string): OwnedUiTranscriptBlock | undefined {
    const index = this.#transcriptIndex.get(id);
    return index === undefined ? undefined : this.#transcript[index];
  }

  // Invariant: the named work state is the only state a matching end may clear.
  #enterWorkState(kind: "working" | "retry" | "compaction", message: string): void {
    const wasBusy = this.#lifecycle === "busy";
    this.#statusKind = kind;
    this.#lifecycle = "busy";
    this.#status = { ...this.#status, workingMessage: message };
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
    this.#status = { ...this.#status, workingMessage: null };
    this.#emitEvent({ type: "session-lifecycle", lifecycle: "ready", reason: null });
    this.#emitEvent({ type: "status", status: this.#status });
  }

  #handlePiEvent(event: unknown): void {
    if (!isRecord(event) || typeof event.type !== "string") return;
    // Invariant: usage moves at message and lifecycle boundaries, not with stream chunks, so the
    // two streaming event kinds keep the memo and everything else drops it.
    if (event.type !== "message_update" && event.type !== "tool_execution_update") this.#usageCache = undefined;
    switch (event.type) {
      case "agent_start":
        this.#agentRunActive = true;
        this.#emitEvent({ type: "agent-run-started" });
        this.#enterWorkState("working", "Working");
        return;
      case "message_start":
        this.#upsertMessageBlock(event.message, "live");
        return;
      case "message_update": {
        const delta = isRecord(event.assistantMessageEvent) && typeof event.assistantMessageEvent.delta === "string"
          ? event.assistantMessageEvent.delta
          : undefined;
        // Invariant: the delta is folded in before the block is stored, so a chunk is one update to
        // one block rather than a store without the delta followed by a store with it.
        const blocks = this.#messageBlocks(event.message, "live", this.#transcript.length);
        for (const [index, block] of blocks.entries()) {
          this.#upsertTranscriptBlock(index === 0 && delta !== undefined && !block.text.endsWith(delta)
            ? { ...block, text: `${block.text}${delta}` }
            : block);
        }
        return;
      }
      case "message_end":
        this.#upsertMessageBlock(event.message, "finalized");
        // Compatibility: preserve the same semantic boundary v2 counted. Transcript block
        // finalization is intentionally not a substitute: rebuilds, retries,
        // thinking parts, and tool rows can all finalize independently.
        if (isRecord(event.message) && event.message.role === "assistant") {
          this.#emitEvent({ type: "assistant-message-completed" });
        }
        return;
      case "turn_end":
        this.#upsertMessageBlock(event.message, "finalized");
        if (Array.isArray(event.toolResults)) {
          for (const result of event.toolResults) this.#upsertMessageBlock(result, "finalized");
        }
        return;
      case "tool_execution_start":
      case "tool_execution_end": {
        // Concurrency: the end supersedes any update still waiting on the coalescing timer.
        const toolCallId = stringValue(event.toolCallId);
        if (toolCallId !== undefined) this.#pendingToolUpdates.delete(toolCallId);
        this.#upsertToolExecutionBlock(event);
        return;
      }
      case "tool_execution_update":
        this.#coalesceToolExecutionUpdate(event);
        return;
      case "agent_settled":
      case "agent_end": {
        if (event.type === "agent_end" && event.willRetry === true) return;
        const finalMessages = Array.isArray(event.messages) && event.messages.length > 0
          ? event.messages
          : this.#session?.messages ?? [];
        if (finalMessages.length > 0) this.#rebuildTranscript(finalMessages, "finalized");
        else this.#setTranscript(this.#transcript.map(block => block.status === "live" ? { ...block, status: "finalized" } : block));
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
        return;
      case "compaction_end":
        this.#endWorkState("compaction");
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
    // Performance: an authoritative rebuild restates most of what is already there. Reusing the block
    // that already says it keeps its revision, and with it the rows the shell rendered for
    // it — otherwise every turn that ends re-renders the whole session.
    this.#setTranscript(blocks.map(block => {
      const existing = this.#transcriptBlock(block.id);
      return existing !== undefined && sameBlockContent(existing, block) ? existing : block;
    }));
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
        imageReferences: this.#imageReferences(message.content, "user"),
        payload: {
          role: "user",
          imageCount: contentImageCount(message.content),
          timestamp: typeof message.timestamp === "number" && Number.isFinite(message.timestamp) ? message.timestamp : null,
        },
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
      const existing = this.#transcriptBlock(blockId);
      const existingPayload = isRecord(existing?.payload) ? existing.payload : undefined;
      return [{
        id: blockId,
        kind: "tool-result",
        status,
        revision: this.#nextBlockRevision(blockId),
        title: stringValue(message.toolName) ?? existing?.title ?? "Tool result",
        text: textFromContent(message.content),
        imageReferences: this.#imageReferences(message.content, "tool-result"),
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

  #imageReferences(content: unknown, source: OwnedUiTranscriptImageReference["source"]): readonly OwnedUiTranscriptImageReference[] {
    if (!Array.isArray(content)) return [];
    const references: OwnedUiTranscriptImageReference[] = [];
    for (const item of content) {
      if (references.length >= 16 || !isRecord(item) || item.type !== "image"
        || typeof item.data !== "string" || item.data.length === 0
        || typeof item.mimeType !== "string" || !/^image\/[a-z0-9.+-]+$/i.test(item.mimeType)) continue;
      const byteLength = Buffer.from(item.data, "base64").byteLength;
      if (byteLength < 1 || byteLength > 20 * 1024 * 1024) continue;
      const assetId = `image-${createHash("sha256").update(item.mimeType).update("\0").update(item.data).digest("hex").slice(0, 24)}`;
      this.#transcriptImageAssets.set(assetId, { type: "image", data: item.data, mimeType: item.mimeType });
      references.push({ assetId, mimeType: item.mimeType, byteLength, source });
    }
    return references;
  }

  // Performance: coalescing each tool to its newest chunk bounds work by frames, not stream events.
  #coalesceToolExecutionUpdate(event: Record<string, unknown>): void {
    const toolCallId = stringValue(event.toolCallId);
    if (!toolCallId) return;
    this.#pendingToolUpdates.set(toolCallId, event);
    this.#toolUpdateFlush ??= setTimeout(() => {
      this.#toolUpdateFlush = null;
      if (!this.#disposed) this.#flushPendingToolUpdates();
    }, TOOL_UPDATE_COALESCE_MS);
  }

  #flushPendingToolUpdates(): void {
    if (this.#toolUpdateFlush !== null) {
      clearTimeout(this.#toolUpdateFlush);
      this.#toolUpdateFlush = null;
    }
    if (this.#pendingToolUpdates.size === 0) return;
    const pending = [...this.#pendingToolUpdates.values()];
    this.#pendingToolUpdates.clear();
    for (const update of pending) this.#upsertToolExecutionBlock(update);
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
        // Performance: a partial result repeats the whole accumulated output on every chunk;
        // summarizing it each time would cost quadratic work over the stream.
        result: ended ? jsonSummary(source) : { summary: "", json: null },
        partialResult: event.type === "tool_execution_update",
        argsComplete: ended,
        isError: event.isError === true,
      },
    });
  }

  #upsertTranscriptBlock(block: OwnedUiTranscriptBlock): void {
    const index = this.#transcriptIndex.get(block.id);
    if (index !== undefined) {
      const existing = this.#transcript[index];
      // Performance: nothing is emitted for a block that repeats itself, and keeping the
      // revision keeps the rows it already rendered.
      if (existing !== undefined && sameBlockContent(existing, block)) return;
      this.#transcript[index] = block;
    } else {
      this.#transcriptIndex.set(block.id, this.#transcript.length);
      this.#transcript.push(block);
    }
    this.#transcriptSnapshot = undefined;
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
        this.#transcriptBlock(candidate)?.status === "live");
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
    const existing = this.#transcriptBlock(id);
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
    this.#usageCache = undefined;
    this.#viewRevision += 1;
    this.#emitEvent({ type: "session-view", view: this.view() });
  }

  #emitEvent(
    value:
      | Omit<Extract<OwnedUiEvent, { type: "session-lifecycle" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "session-view" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "transcript-block" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "assistant-message-completed" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "agent-run-started" }>, "sessionId" | "sequence">
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
      let deliveredSinceYield = 0;
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
        deliveredSinceYield += 1;
        // Concurrency: a microtask chain runs to exhaustion before the loop turns, so a streaming
        // burst would hold typed input, pointer reports, and timed indicators until it
        // drained. Yielding on a macrotask hands those their turn between batches.
        if (deliveredSinceYield >= EVENT_DELIVERY_BATCH && this.#eventQueue.length > 0) {
          deliveredSinceYield = 0;
          await new Promise<void>(resolve => { setImmediate(resolve); });
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
      | Omit<Extract<OwnedUiEvent, { type: "assistant-message-completed" }>, "sessionId" | "sequence">
      | Omit<Extract<OwnedUiEvent, { type: "agent-run-started" }>, "sessionId" | "sequence">
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

function pinnedSessionInfoPresentation(
  value: unknown,
  sessionName: string | undefined,
  entries: readonly unknown[],
  modelRuntime: PiServicesApi["modelRuntime"],
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
  modelRuntime: PiServicesApi["modelRuntime"],
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
    readChangelog: async () => "No changelog entries found.",
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

function pinnedHotkeySummary(): string {
  return [
    "Enter: send message · Alt+Enter: queue follow-up",
    "Escape: cancel/abort · Ctrl+C: clear/exit · Ctrl+D: exit when empty",
    "Shift+Tab: cycle thinking · Ctrl+P/Shift+Ctrl+P: cycle models · Ctrl+L: select model",
    "Ctrl+O: expand tools · Ctrl+T: toggle thinking · Ctrl+X: copy message",
    "Alt+Up: restore queued messages · /: commands · !/!!: bash",
  ].join("\n");
}

function scopedModelRecords(modelRuntime: PiServicesApi["modelRuntime"]): readonly {
  readonly descriptor: PiScopedModelDescriptor;
  readonly model: ReturnType<PiServicesApi["modelRuntime"]["getAvailableSnapshot"]>[number];
}[] {
  return modelRuntime.getAvailableSnapshot().map(model => ({
    descriptor: { provider: model.provider, id: model.id, name: model.name ?? model.id },
    model,
  }));
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

function stringProperty(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const item = value[key];
  return typeof item === "string" && item.length > 0 ? item : undefined;
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

/**
 * Whether two blocks say the same thing. A block that says what it already said is not a
 * new revision: the shell renders a block once per revision, so bumping one it did not
 * need re-renders it for nothing.
 */
function sameBlockContent(left: OwnedUiTranscriptBlock, right: OwnedUiTranscriptBlock): boolean {
  return left.kind === right.kind
    && left.status === right.status
    && left.title === right.title
    && left.text === right.text
    && sameValue(left.payload, right.payload)
    && sameValue(left.imageReferences ?? [], right.imageReferences ?? []);
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => sameValue(value, right[index]));
  }
  if (typeof left !== "object") return false;
  const leftKeys = Object.keys(left as Record<string, unknown>);
  const rightRecord = right as Record<string, unknown>;
  if (leftKeys.length !== Object.keys(rightRecord).length) return false;
  return leftKeys.every(key =>
    Object.hasOwn(rightRecord, key) && sameValue((left as Record<string, unknown>)[key], rightRecord[key]));
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
