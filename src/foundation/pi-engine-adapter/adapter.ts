import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  copyToClipboard,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  getPackageDir,
  SessionManager,
  type CreateAgentSessionRuntimeFactory,
} from "@earendil-works/pi-coding-agent";
import {
  OWNED_UI_EXTENSION_CONTRACT_VERSION,
  OWNED_UI_EXTENSION_RENDER_CALLBACKS,
  OWNED_UI_EXTENSION_UI_CALLBACKS,
  OWNED_UI_EXTENSION_UI_PROPERTIES,
  assertOwnedUiCommand,
  assertOwnedUiSnapshot,
  type OwnedUiCommand,
  type OwnedUiCommandOutcome,
  type OwnedUiDiagnostics,
  type OwnedUiEditorState,
  type OwnedUiEvent,
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
  type PiWorkflowAutocompleteCommand,
  type PiWorkflowHost,
  type PiWorkflowInteractionHost,
  type PiWorkflowOption,
  type PiWorkflowRequest,
  type PiWorkflowResult,
} from "./workflows.js";

const execFileAsync = promisify(execFile);

export interface PiEngineRuntimeFactoryInput {
  readonly cwd: string;
  readonly agentDir: string;
  readonly sessionId: string;
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
  readonly sessionManager?: { getSessionName(): string | undefined; getEntries(): readonly unknown[] };
  getContextUsage?(): { readonly tokens: number | null; readonly contextWindow: number; readonly percent: number | null } | undefined;
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
  dispose(): void;
}

export interface PiServicesLike {
  readonly modelRuntime: {
    getModel(providerId: string, modelId: string): unknown;
    isUsingSubscription?(providerId: string): boolean;
    getAvailableSnapshot?(): readonly { readonly provider?: string }[];
  };
  readonly settingsManager?: { getCompactionEnabled?: () => boolean };
  readonly resourceLoader?: {
    getSkills(): unknown;
    getPrompts(): unknown;
    getAgentsFiles(): unknown;
    getSystemPromptSource(): unknown;
    getAppendSystemPromptSources(): unknown;
    getExtensions?(): unknown;
  };
  readonly diagnostics: readonly { readonly type: string; readonly message: string }[];
}

export interface PiRuntimeLike {
  readonly session: PiSessionLike;
  readonly services: PiServicesLike;
  readonly diagnostics: readonly { readonly type: string; readonly message: string }[];
  setRebindSession(callback: (session: PiSessionLike) => Promise<void>): void;
  newSession(options?: unknown): Promise<unknown>;
  switchSession(sessionPath: string, options?: unknown): Promise<unknown>;
  dispose(): Promise<void>;
}

export type PiEngineRuntimeFactory = (input: PiEngineRuntimeFactoryInput) => Promise<PiRuntimeLike>;

export interface OwnedPiResourceSummary {
  readonly kind: "skill" | "prompt-template" | "agent-context" | "system-prompt";
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
  readonly available: false;
  readonly contractComplete: true;
  readonly contractVersion: typeof OWNED_UI_EXTENSION_CONTRACT_VERSION;
  readonly binding: "unbound";
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
  readonly #messageFallbackIds = new Map<string, string>();
  readonly #toolBlockIds = new Map<string, string>();
  #nextBlockSequence = 0;
  #diagnostics: OwnedUiDiagnostics[] = [];
  readonly #eventQueue: OwnedUiEvent[] = [];
  #eventQueueProcessing: Promise<void> | undefined;
  #droppedEventCount = 0;
  #lastPrompt: string | null = null;
  #gitBranch: string | null = null;
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
        sourcePath: stringProperty(skill, "path") ?? stringProperty(skill, "location") ?? null,
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
        sourcePath: stringProperty(prompt, "path") ?? null,
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
      available: false,
      contractComplete: true,
      contractVersion: OWNED_UI_EXTENSION_CONTRACT_VERSION,
      binding: "unbound",
      uiCallbacks: OWNED_UI_EXTENSION_UI_CALLBACKS,
      uiProperties: OWNED_UI_EXTENSION_UI_PROPERTIES,
      renderCallbacks: OWNED_UI_EXTENSION_RENDER_CALLBACKS,
      diagnostic: "The complete AddOne-owned extension UI contract is available, but runtime binding remains unavailable until the pinned extension lifecycle port is complete.",
    };
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
    const settings = dynamicObject(this.#runtime?.services, "settingsManager");
    const skillsEnabled = dynamicCall(settings, "getEnableSkillCommands") !== false;
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
    const extensionCommands = dynamicCall(dynamicObject(this.#session, "extensionRunner"), "getCommands");
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
      const result = await requiredDynamicCallAsync(session, "cycleModel", direction);
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

  clearQueuedWorkflows(): readonly string[] {
    const session = this.#requireWorkflowSession();
    const result = dynamicCall(session, "clearQueue");
    if (!isRecord(result)) return [];
    return [...readStringArray(result.steering), ...readStringArray(result.followUp)];
  }

  abortBashWorkflow(): void {
    dynamicCall(this.#requireWorkflowSession(), "abortBash");
  }

  async executeBashWorkflow(command: string, excludeFromContext: boolean): Promise<PiBashWorkflowResult> {
    const session = this.#requireWorkflowSession();
    const result = await requiredDynamicCallAsync(session, "executeBash", command, undefined, { excludeFromContext });
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

  async executeWorkflow(request: PiWorkflowRequest): Promise<PiWorkflowResult> {
    try {
      return await this.#performWorkflow(request);
    } catch (error) {
      return workflowResult(request.command, "failed", error instanceof Error ? error.message : String(error));
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
        if (!selection) {
          return workflowSelector(request.command, "Settings", PINNED_PI_SETTINGS_CALLBACKS.map(callback => ({
            id: callback,
            label: settingLabel(callback),
            description: callback,
          })));
        }
        return this.#applyPinnedSetting(selection);
      }
      case "model": {
        const reference = selection ?? argument;
        if (!reference) return workflowSelector(request.command, "Model", this.#modelOptions());
        const [providerId, modelId] = reference.split("/", 2);
        if (!providerId || !modelId) return workflowResult(request.command, "failed", "Model requires provider/model");
        const model = runtime.services.modelRuntime.getModel(providerId, modelId);
        if (!model) return workflowResult(request.command, "failed", `Model is unavailable: ${reference}`);
        await session.setModel(model);
        this.#activeModel = { providerId, modelId, displayName: stringProperty(model, "name") ?? modelId };
        this.#emitView();
        return workflowResult(request.command, "completed", `Selected model ${providerId}/${modelId}`);
      }
      case "scoped-models": {
        if (!selection) return workflowSelector(request.command, "Scoped models", this.#modelOptions());
        const [providerId, modelId] = selection.split("/", 2);
        const model = providerId && modelId ? runtime.services.modelRuntime.getModel(providerId, modelId) : undefined;
        if (!model) return workflowResult(request.command, "failed", `Model is unavailable: ${selection}`);
        dynamicCall(session, "setScopedModels", [{ model }]);
        return workflowResult(request.command, "completed", `Enabled scoped model ${selection}`);
      }
      case "export": {
        const path = pathArgument(argument);
        const file = path?.toLowerCase().endsWith(".jsonl")
          ? requiredDynamicCall(session, "exportToJsonl", path)
          : await requiredDynamicCallAsync(session, "exportToHtml", path);
        return workflowResult(request.command, "completed", `Session exported to: ${String(file)}`);
      }
      case "import": {
        const path = pathArgument(argument);
        if (!path) return workflowResult(request.command, "failed", "Usage: /import <path.jsonl>");
        if (request.confirmed === undefined) {
          return workflowConfirmation(request.command, `Replace current session with ${path}?`);
        }
        if (!request.confirmed) return workflowResult(request.command, "cancelled", "Import cancelled");
        const result = await requiredDynamicCallAsync(runtime, "importFromJsonl", path);
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Import cancelled");
        return workflowResult(request.command, "completed", `Session imported from: ${path}`);
      }
      case "share": {
        const auth = await this.#workflowHost.runCommand("gh", ["auth", "status"]).catch(error => {
          throw new Error(`GitHub CLI is unavailable or not logged in: ${error instanceof Error ? error.message : String(error)}`);
        });
        if (auth.stderr && !auth.stdout) throw new Error(auth.stderr.trim());
        const temporary = join(tmpdir(), `addone-pi-session-${process.pid}.html`);
        try {
          await requiredDynamicCallAsync(session, "exportToHtml", temporary);
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
        const text = requiredDynamicCall(session, "getLastAssistantText");
        if (typeof text !== "string" || text.length === 0) return workflowResult(request.command, "failed", "No agent messages to copy yet.");
        await this.#workflowHost.copyText(text);
        return workflowResult(request.command, "completed", "Copied last agent message to clipboard");
      }
      case "name": {
        if (!argument) {
          const current = dynamicCall(dynamicObject(session, "sessionManager"), "getSessionName");
          return typeof current === "string"
            ? workflowResult(request.command, "completed", `Session name: ${current}`)
            : workflowResult(request.command, "failed", "Usage: /name <name>");
        }
        requiredDynamicCall(session, "setSessionName", argument);
        return workflowResult(request.command, "completed", `Session name set: ${argument}`);
      }
      case "session": {
        const stats = requiredDynamicCall(session, "getSessionStats");
        return workflowResult(request.command, "completed", "Session Info", JSON.stringify(stats, null, 2));
      }
      case "changelog": {
        const changelog = await this.#workflowHost.readChangelog();
        return workflowResult(request.command, "completed", "What's New", changelog);
      }
      case "hotkeys":
        return workflowResult(request.command, "completed", "Keyboard Shortcuts", pinnedHotkeySummary());
      case "fork": {
        if (!selection) {
          const messages = requiredDynamicCall(session, "getUserMessagesForForking");
          return workflowSelector(request.command, "Fork from message", workflowOptions(messages, "entryId", "text"));
        }
        const result = await requiredDynamicCallAsync(runtime, "fork", selection, { position: "before" });
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Fork cancelled");
        return workflowResult(request.command, "completed", "Forked session");
      }
      case "clone": {
        const manager = dynamicObject(session, "sessionManager");
        const leaf = dynamicCall(manager, "getLeafId");
        if (typeof leaf !== "string") return workflowResult(request.command, "failed", "No session position is available to clone");
        const result = await requiredDynamicCallAsync(runtime, "fork", leaf, { position: "at" });
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Clone cancelled");
        return workflowResult(request.command, "completed", "Cloned session");
      }
      case "tree": {
        const manager = dynamicObject(session, "sessionManager");
        if (!selection) return workflowSelector(request.command, "Session tree", workflowOptions(dynamicCall(manager, "getEntries"), "id", "type"));
        const result = await requiredDynamicCallAsync(session, "navigateTree", selection);
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Tree navigation cancelled");
        return workflowResult(request.command, "completed", "Navigated session tree");
      }
      case "trust": {
        if (!selection) return workflowSelector(request.command, "Project trust", [
          { id: "trust", label: "Trust this project" },
          { id: "untrust", label: "Do not trust this project" },
        ]);
        dynamicCall(dynamicObject(runtime.services, "settingsManager"), "setProjectTrusted", selection === "trust");
        return workflowResult(request.command, "completed", selection === "trust" ? "Project trusted" : "Project trust removed");
      }
      case "login": {
        if (!selection && !argument) return workflowSelector(request.command, "Login provider", this.#loginOptions());
        const loginSelection = selection ?? argument;
        const [authType = "oauth", providerId = loginSelection] = loginSelection.includes(":")
          ? loginSelection.split(":", 2)
          : ["oauth", loginSelection];
        const modelRuntime = dynamicObject(runtime.services, "modelRuntime");
        try {
          await requiredDynamicCallAsync(modelRuntime, "login", providerId, authType, {
            signal: AbortSignal.timeout(120_000),
            prompt: async (prompt: unknown) => {
              const response = await this.#workflowInteraction.prompt({
                type: authType === "api_key" ? "secret" : isRecord(prompt) && prompt.type === "manual_code" ? "manual-code" : "text",
                message: stringProperty(prompt, "message") ?? `Authenticate ${providerId}`,
                ...(stringProperty(prompt, "placeholder") === undefined ? {} : { placeholder: stringProperty(prompt, "placeholder")! }),
              });
              if (response === null) throw new Error("Login cancelled");
              return response;
            },
            notify: (event: unknown) => {
              const message = stringProperty(event, "message") ?? stringProperty(event, "url") ?? stringProperty(event, "instructions");
              if (message) this.#workflowInteraction.notify(message);
            },
          });
        } catch (error) {
          if (error instanceof Error && error.message === "Login cancelled") return workflowResult(request.command, "cancelled", "Login cancelled");
          throw error;
        }
        return workflowResult(request.command, "completed", `Logged in to ${providerId}`);
      }
      case "logout": {
        if (!selection) return workflowSelector(request.command, "Logout provider", await this.#logoutOptions());
        await requiredDynamicCallAsync(dynamicObject(runtime.services, "modelRuntime"), "logout", selection, { signal: AbortSignal.timeout(15_000) });
        return workflowResult(request.command, "completed", `Logged out of ${selection}`);
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
        if (!selection && !argument) return workflowSelector(request.command, "Resume session", await this.#sessionOptions());
        const result = await runtime.switchSession(selection ?? argument);
        if (isRecord(result) && result.cancelled === true) return workflowResult(request.command, "cancelled", "Resume cancelled");
        return workflowResult(request.command, "completed", "Resumed session");
      }
      case "reload": {
        if (session.isStreaming) return workflowResult(request.command, "failed", "Wait for the current response to finish before reloading.");
        if (session.isCompacting) return workflowResult(request.command, "failed", "Wait for compaction to finish before reloading.");
        await requiredDynamicCallAsync(session, "reload");
        return workflowResult(request.command, "completed", "Reloaded keybindings, extensions, skills, prompts, themes, and context files");
      }
      case "quit": {
        await this.dispose();
        return workflowResult(request.command, "completed", "Shutdown complete");
      }
      case "debug":
        return workflowResult(request.command, "completed", "Debug output", JSON.stringify(this.snapshot(), null, 2));
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
    const models = dynamicCall(dynamicObject(runtime.services, "modelRuntime"), "getAvailableSnapshot");
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

  #loginOptions(): readonly PiWorkflowOption[] {
    const runtime = this.#runtime;
    const providers = runtime ? dynamicCall(dynamicObject(runtime.services, "modelRuntime"), "getProviders") : undefined;
    if (!Array.isArray(providers)) return [];
    return providers.filter(isRecord).flatMap(provider => {
      const id = stringProperty(provider, "id");
      if (!id) return [];
      const name = stringProperty(provider, "name") ?? id;
      const auth = isRecord(provider.auth) ? provider.auth : {};
      return [
        ...(auth.oauth ? [{ id: `oauth:${id}`, label: name, description: "Account / OAuth" }] : []),
        ...(auth.apiKey ? [{ id: `api_key:${id}`, label: name, description: "API key" }] : []),
      ];
    });
  }

  async #logoutOptions(): Promise<readonly PiWorkflowOption[]> {
    const runtime = this.#runtime;
    if (!runtime) return [];
    const credentials = await requiredDynamicCallAsync(dynamicObject(runtime.services, "modelRuntime"), "listCredentials", { signal: AbortSignal.timeout(15_000) });
    if (!Array.isArray(credentials)) return [];
    return credentials.filter(isRecord).flatMap(credential => {
      const id = stringProperty(credential, "providerId");
      return id ? [{ id, label: id, description: stringProperty(credential, "type") ?? "stored credential" }] : [];
    });
  }

  async #sessionOptions(): Promise<readonly PiWorkflowOption[]> {
    const session = this.#requireWorkflowSession();
    const manager = dynamicObject(session, "sessionManager");
    const runtimeSessions = await dynamicCallAsync(this.#runtime, "listSessions");
    if (Array.isArray(runtimeSessions)) return sessionInfoOptions(runtimeSessions);
    const cwd = dynamicCall(manager, "getCwd");
    const sessionDir = dynamicCall(manager, "getSessionDir");
    if (typeof cwd !== "string") return [];
    return sessionInfoOptions(await SessionManager.list(cwd, typeof sessionDir === "string" ? sessionDir : undefined));
  }

  #applyPinnedSetting(selection: string): PiWorkflowResult {
    if (!(PINNED_PI_SETTINGS_CALLBACKS as readonly string[]).includes(selection)) {
      return workflowResult("settings", "failed", `Unknown setting callback: ${selection}`);
    }
    const callback = selection as PiPinnedSettingsCallback;
    if (callback === "onCancel") return workflowResult("settings", "cancelled", "Settings cancelled");
    if (callback === "onThemePreview") return workflowResult("settings", "completed", "Theme preview refreshed");
    const runtime = this.#runtime;
    if (!runtime) return workflowResult("settings", "failed", "Settings are unavailable");
    const settings = dynamicObject(runtime.services, "settingsManager");
    const session = this.#requireWorkflowSession();
    const toggles: Partial<Record<PiPinnedSettingsCallback, readonly [string, string]>> = {
      onAutoCompactChange: ["getCompactionEnabled", "setCompactionEnabled"],
      onShowImagesChange: ["getShowImages", "setShowImages"],
      onAutoResizeImagesChange: ["getImageAutoResize", "setImageAutoResize"],
      onBlockImagesChange: ["getBlockImages", "setBlockImages"],
      onEnableSkillCommandsChange: ["getEnableSkillCommands", "setEnableSkillCommands"],
      onHideThinkingBlockChange: ["getHideThinkingBlock", "setHideThinkingBlock"],
      onShowCacheMissNoticesChange: ["getShowCacheMissNotices", "setShowCacheMissNotices"],
      onCollapseChangelogChange: ["getCollapseChangelog", "setCollapseChangelog"],
      onEnableInstallTelemetryChange: ["getEnableInstallTelemetry", "setEnableInstallTelemetry"],
      onQuietStartupChange: ["getQuietStartup", "setQuietStartup"],
      onShowHardwareCursorChange: ["getShowHardwareCursor", "setShowHardwareCursor"],
      onClearOnShrinkChange: ["getClearOnShrink", "setClearOnShrink"],
      onShowTerminalProgressChange: ["getShowTerminalProgress", "setShowTerminalProgress"],
    };
    const toggle = toggles[callback];
    if (toggle) {
      const current = dynamicCall(settings, toggle[0]);
      dynamicCall(settings, toggle[1], current !== true);
      return workflowResult("settings", "completed", `${settingLabel(callback)}: ${current === true ? "off" : "on"}`);
    }
    const cycles: Partial<Record<PiPinnedSettingsCallback, readonly [string, string, readonly unknown[]]>> = {
      onSteeringModeChange: ["getSteeringMode", "setSteeringMode", ["all", "one-at-a-time"]],
      onFollowUpModeChange: ["getFollowUpMode", "setFollowUpMode", ["all", "one-at-a-time"]],
      onTransportChange: ["getTransport", "setTransport", ["sse", "websocket", "websocket-cached", "auto"]],
      onMermaidRenderingModeChange: ["getMermaidRenderingMode", "setMermaidRenderingMode", ["off", "final", "streaming"]],
      onDefaultProjectTrustChange: ["getDefaultProjectTrust", "setDefaultProjectTrust", ["ask", "always", "never"]],
      onDoubleEscapeActionChange: ["getDoubleEscapeAction", "setDoubleEscapeAction", ["fork", "tree", "none"]],
      onTreeFilterModeChange: ["getTreeFilterMode", "setTreeFilterMode", ["default", "no-tools", "user-only", "labeled-only", "all"]],
      onOutputPadChange: ["getOutputPad", "setOutputPad", [0, 1]],
      onTuiModeChange: ["getTuiMode", "setTuiMode", ["regular", "fullscreen"]],
      onFullscreenScrollbarChange: ["getFullscreenScrollbar", "setFullscreenScrollbar", ["hidden", "auto", "always"]],
    };
    const cycle = cycles[callback];
    if (cycle) {
      const current = dynamicCall(settings, cycle[0]);
      const index = cycle[2].findIndex(value => value === current);
      const next = cycle[2][(Math.max(index, 0) + 1) % cycle[2].length];
      dynamicCall(settings, cycle[1], next);
      return workflowResult("settings", "completed", `${settingLabel(callback)}: ${String(next)}`);
    }
    switch (callback) {
      case "onThinkingLevelChange": {
        const level = dynamicCall(session, "cycleThinkingLevel");
        return level === undefined
          ? workflowResult("settings", "failed", "Current model does not support thinking")
          : workflowResult("settings", "completed", `Thinking level: ${String(level)}`);
      }
      case "onImageWidthCellsChange": return incrementSetting(settings, callback, "getImageWidthCells", "setImageWidthCells", 10, 10, 120);
      case "onHttpIdleTimeoutMsChange": return incrementSetting(settings, callback, "getHttpIdleTimeoutMs", "setHttpIdleTimeoutMs", 5_000, 5_000, 120_000);
      case "onEditorPaddingXChange": return incrementSetting(settings, callback, "getEditorPaddingX", "setEditorPaddingX", 1, 0, 4);
      case "onAutocompleteMaxVisibleChange": return incrementSetting(settings, callback, "getAutocompleteMaxVisible", "setAutocompleteMaxVisible", 1, 3, 20);
      case "onThemeChange": {
        const loader = dynamicObject(this.#runtime?.services, "resourceLoader");
        const themes = collectionResult(dynamicCall(loader, "getThemes"), "themes").values;
        const current = dynamicCall(settings, "getTheme");
        const names = themes.map(theme => stringProperty(theme, "name")).filter((name): name is string => !!name);
        if (names.length === 0) return workflowResult("settings", "failed", "No themes are available");
        const next = names[(Math.max(names.indexOf(String(current)), 0) + 1) % names.length] ?? names[0]!;
        dynamicCall(settings, "setTheme", next);
        return workflowResult("settings", "completed", `Theme: ${next}`);
      }
      case "onWarningsChange": {
        const current = dynamicCall(settings, "getWarnings");
        const enabled = !(isRecord(current) && current.anthropicExtraUsage === true);
        dynamicCall(settings, "setWarnings", { anthropicExtraUsage: enabled });
        return workflowResult("settings", "completed", `Warnings: ${enabled ? "on" : "off"}`);
      }
      default:
        return workflowResult("settings", "failed", `${settingLabel(callback)} is unavailable in this runtime`);
    }
  }

  async #perform(command: OwnedUiCommand): Promise<void> {
    const runtime = this.#runtime;
    const session = this.#session;
    if (!runtime || !session) throw new Error("engine session is unavailable");

    switch (command.type) {
      case "prompt": {
        this.#lastPrompt = command.text;
        await session.prompt(
          command.text,
          session.isStreaming ? { streamingBehavior: "followUp" } : undefined,
        );
        return;
      }
      case "steer":
        this.#lastPrompt = command.text;
        await session.steer(command.text);
        return;
      case "follow-up":
        this.#lastPrompt = command.text;
        await session.followUp(command.text);
        return;
      case "abort":
        if (session.isRetrying) session.abortRetry();
        if (session.isCompacting) session.abortCompaction();
        await session.abort();
        return;
      case "retry":
        if (this.#lastPrompt === null) throw new Error("no previous prompt is available to retry");
        await session.prompt(
          this.#lastPrompt,
          session.isStreaming ? { streamingBehavior: "followUp" } : undefined,
        );
        return;
      case "compact":
        await session.compact();
        return;
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
    this.#session = session;
    this.#activeCommandIds = [];
    this.#completedCommands.clear();
    this.#lastPrompt = null;
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
  }

  #handlePiEvent(event: unknown): void {
    if (!isRecord(event) || typeof event.type !== "string") return;
    switch (event.type) {
      case "agent_start":
        this.#lifecycle = "busy";
        this.#status = { ...this.#status, workingMessage: "Working…" };
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
    for (const [index, message] of messages.entries()) {
      blocks.push(...this.#messageBlocks(message, status, index));
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
  ): OwnedUiTranscriptBlock[] {
    if (!isRecord(message) || typeof message.role !== "string") return [];
    const baseId = this.#messageBlockId(message, fallbackIndex);
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
      return [{
        id: baseId,
        kind: "tool-result",
        status,
        revision: this.#nextBlockRevision(baseId),
        title: stringValue(message.toolName) ?? "Tool result",
        text: textFromContent(message.content),
        payload: {
          role: "toolResult",
          toolCallId: stringValue(message.toolCallId) ?? null,
          isError: message.isError === true,
          details: jsonSummary(message.details),
        },
      }];
    }
    if (message.role !== "assistant" || !Array.isArray(message.content)) return [];

    const blocks: OwnedUiTranscriptBlock[] = [];
    const text = textFromContent(message.content);
    if (text) {
      blocks.push({
        id: baseId,
        kind: "assistant",
        status,
        revision: this.#nextBlockRevision(baseId),
        title: "Assistant",
        text,
        payload: {
          role: "assistant",
          provider: stringValue(message.provider) ?? null,
          model: stringValue(message.model) ?? null,
          stopReason: stringValue(message.stopReason) ?? null,
          errorMessage: stringValue(message.errorMessage) ?? null,
        },
      });
    }
    const thinking = thinkingFromContent(message.content);
    if (thinking) {
      blocks.push({
        id: `${baseId}:thinking`,
        kind: "thinking",
        status,
        revision: this.#nextBlockRevision(`${baseId}:thinking`),
        title: "Thinking",
        text: thinking,
        payload: { role: "assistant", redacted: contentHasRedactedThinking(message.content) },
      });
    }
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

  #messageBlockId(message: Record<string, unknown>, fallbackIndex: number): string {
    const existing = this.#messageBlockIds.get(message);
    if (existing) return existing;
    const timestamp = typeof message.timestamp === "number" && Number.isSafeInteger(message.timestamp)
      ? message.timestamp
      : fallbackIndex;
    const fallback = `message-${stringValue(message.role) ?? "unknown"}-${timestamp}`;
    const cached = this.#messageFallbackIds.get(fallback) ?? fallback;
    this.#messageFallbackIds.set(fallback, cached);
    this.#messageBlockIds.set(message, cached);
    return cached;
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
  const sessionManager = SessionManager.create(input.cwd);
  const createRuntime: CreateAgentSessionRuntimeFactory = async ({
    cwd,
    sessionManager: targetSessionManager,
    sessionStartEvent,
  }) => {
    const services = await createAgentSessionServices({ cwd, agentDir: input.agentDir });
    const created = await createAgentSessionFromServices({
      services,
      sessionManager: targetSessionManager,
      ...(sessionStartEvent ? { sessionStartEvent } : {}),
    });
    return {
      ...created,
      services,
      diagnostics: services.diagnostics,
    };
  };
  const runtime = await createAgentSessionRuntime(createRuntime, {
    cwd: input.cwd,
    agentDir: input.agentDir,
    sessionManager,
  });
  return runtime as unknown as PiRuntimeLike;
}

function defaultWorkflowHost(): PiWorkflowHost {
  return {
    copyText: copyToClipboard,
    async runCommand(command, arguments_) {
      const result = await execFileAsync(command, [...arguments_], { encoding: "utf8" });
      return { stdout: result.stdout, stderr: result.stderr };
    },
    readChangelog: () => readFile(join(getPackageDir(), "CHANGELOG.md"), "utf8"),
  };
}

function workflowResult(
  command: PiWorkflowRequest["command"],
  outcome: PiWorkflowResult["outcome"],
  message: string,
  detail?: string,
): PiWorkflowResult {
  return { command, outcome, message, ...(detail === undefined ? {} : { detail }) };
}

function workflowSelector(
  command: PiWorkflowRequest["command"],
  title: string,
  options: readonly PiWorkflowOption[],
): PiWorkflowResult {
  if (options.length === 0) return workflowResult(command, "failed", `No ${title.toLowerCase()} options are available`);
  return { command, outcome: "requires-selection", message: title, selectorTitle: title, options };
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

function dynamicObject(value: unknown, key?: string): Record<string, unknown> {
  const candidate = key === undefined ? value : isRecord(value) ? value[key] : undefined;
  return isRecord(candidate) ? candidate : {};
}

function dynamicCall(target: unknown, method: string, ...args: readonly unknown[]): unknown {
  if (!isRecord(target)) return undefined;
  const operation = target[method];
  return typeof operation === "function" ? operation.apply(target, args) : undefined;
}

async function dynamicCallAsync(target: unknown, method: string, ...args: readonly unknown[]): Promise<unknown> {
  return await dynamicCall(target, method, ...args);
}

function requiredDynamicCall(target: unknown, method: string, ...args: readonly unknown[]): unknown {
  if (!isRecord(target) || typeof target[method] !== "function") {
    throw new Error(`Pi workflow capability is unavailable: ${method}`);
  }
  return target[method].apply(target, args);
}

async function requiredDynamicCallAsync(target: unknown, method: string, ...args: readonly unknown[]): Promise<unknown> {
  return await requiredDynamicCall(target, method, ...args);
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

function incrementSetting(
  settings: Record<string, unknown>,
  callback: PiPinnedSettingsCallback,
  getter: string,
  setter: string,
  increment: number,
  minimum: number,
  maximum: number,
): PiWorkflowResult {
  const currentValue = dynamicCall(settings, getter);
  const current = typeof currentValue === "number" && Number.isFinite(currentValue) ? currentValue : minimum;
  const next = current + increment > maximum ? minimum : current + increment;
  dynamicCall(settings, setter, next);
  return workflowResult("settings", "completed", `${settingLabel(callback)}: ${next}`);
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

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map(item => isRecord(item) && item.type === "text" ? stringValue(item.text) ?? "" : "")
    .filter(text => text.length > 0)
    .join("\n");
}

function thinkingFromContent(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map(item => isRecord(item) && item.type === "thinking" ? stringValue(item.thinking) ?? "" : "")
    .filter(text => text.length > 0)
    .join("\n");
}

function contentImageCount(content: unknown): number {
  return Array.isArray(content)
    ? content.filter(item => isRecord(item) && item.type === "image").length
    : 0;
}

function contentHasRedactedThinking(content: unknown): boolean {
  return Array.isArray(content)
    && content.some(item => isRecord(item) && item.type === "thinking" && item.redacted === true);
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
