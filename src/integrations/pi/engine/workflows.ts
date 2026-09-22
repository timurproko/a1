import type { SessionInfo } from "../startup-public.js";

export const PINNED_PI_WORKFLOW_COMMAND_NAMES = [
  "settings",
  "model",
  "tree",
  "thinking",
  "scoped-models",
  "export",
  "import",
  "share",
  "copy",
  "name",
  "session",
  "changelog",
  "hotkeys",
  "fork",
  "clone",
  "trust",
  "login",
  "logout",
  "new",
  "compact",
  "resume",
  "reload",
  "quit",
] as const;

export const PINNED_PI_HIDDEN_COMMAND_NAMES = ["debug", "arminsayshi", "dementedelves"] as const;

/**
 * Commands the pinned engine advertises that A1 deliberately does not present. `/bug` collects,
 * uploads, and archives a report through modules the package keeps off its public surface, so A1
 * cannot reproduce the route and does not offer a partial one. Naming them here keeps the manifest
 * comparison exact: a command upstream adds still fails the gate until it is classified.
 */
export const PINNED_PI_DECLINED_COMMAND_NAMES = ["bug"] as const;

export type PiWorkflowCommandName = typeof PINNED_PI_WORKFLOW_COMMAND_NAMES[number];
export type PiHiddenWorkflowCommandName = typeof PINNED_PI_HIDDEN_COMMAND_NAMES[number];

/** The one bare-A1 model command; it replaces the pinned `model` and `scoped-models` routes there. */
export const OWNED_MODELS_COMMAND_NAME = "models" as const;
export type OwnedModelsCommandName = typeof OWNED_MODELS_COMMAND_NAME;
export type OwnedWorkflowCommandName = Exclude<PiWorkflowCommandName, "model" | "scoped-models"> | OwnedModelsCommandName;

/** Bare A1's advertised catalog: `models` replaces the pinned pair and is followed by `thinking`. */
export const OWNED_WORKFLOW_COMMAND_NAMES: readonly OwnedWorkflowCommandName[] = Object.freeze(
  PINNED_PI_WORKFLOW_COMMAND_NAMES.flatMap((name): OwnedWorkflowCommandName[] =>
    name === "model"
      ? [OWNED_MODELS_COMMAND_NAME, "thinking"]
      : name === "thinking" || name === "scoped-models" ? [] : [name]),
);

export type PiProductMode = "bare" | "comparison";

/** The advertised command catalog for a product mode; hidden routes are shared by both. */
export function workflowCommandNames(productMode: PiProductMode): readonly (PiWorkflowCommandName | OwnedModelsCommandName)[] {
  return productMode === "bare" ? OWNED_WORKFLOW_COMMAND_NAMES : PINNED_PI_WORKFLOW_COMMAND_NAMES;
}

export type PiWorkflowRoute = PiWorkflowCommandName | PiHiddenWorkflowCommandName | OwnedModelsCommandName;

export const PINNED_PI_SETTINGS_CALLBACKS = [
  "onAutoCompactChange",
  "onShowImagesChange",
  "onImageWidthCellsChange",
  "onAutoResizeImagesChange",
  "onBlockImagesChange",
  "onEnableSkillCommandsChange",
  "onSteeringModeChange",
  "onFollowUpModeChange",
  "onTransportChange",
  "onHttpIdleTimeoutMsChange",
  "onCacheWarmingModeChange",
  "onModelThinkingLevelChange",
  "onModelThinkingLevelRemove",
  "onThemeChange",
  "onThemePreview",
  "onHideThinkingBlockChange",
  "onMermaidRenderingModeChange",
  "onShowCacheMissNoticesChange",
  "onCollapseChangelogChange",
  "onEnableInstallTelemetryChange",
  "onQuietStartupChange",
  "onDefaultProjectTrustChange",
  "onDoubleEscapeActionChange",
  "onTreeFilterModeChange",
  "onShowHardwareCursorChange",
  "onEditorPaddingXChange",
  "onOutputPadChange",
  "onAutocompleteMaxVisibleChange",
  "onClearOnShrinkChange",
  "onShowTerminalProgressChange",
  "onTuiModeChange",
  "onFullscreenExitOutputChange",
  "onFullscreenScrollbarChange",
  "onFullscreenCopyOnSelectChange",
  "onWarningsChange",
  "onCancel",
] as const;

export type PiPinnedSettingsCallback = typeof PINNED_PI_SETTINGS_CALLBACKS[number];

export interface PiPinnedSettingsSnapshot {
  readonly autoCompact: boolean;
  readonly showImages: boolean;
  readonly imageWidthCells: number;
  readonly autoResizeImages: boolean;
  readonly blockImages: boolean;
  readonly enableSkillCommands: boolean;
  readonly steeringMode: "all" | "one-at-a-time";
  readonly followUpMode: "all" | "one-at-a-time";
  readonly transport: "sse" | "websocket" | "websocket-cached" | "auto";
  readonly httpIdleTimeoutMs: number;
  readonly cacheWarmingMode: "off" | "streaming" | "idle";
  readonly thinkingLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
  readonly availableThinkingLevels: readonly ("off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max")[];
  /** The stored global default the selector offers to restore; the session's level may differ. */
  readonly defaultThinkingLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
  /** Per-model thinking overrides keyed `provider/modelId`. */
  readonly modelThinkingLevels: Readonly<Record<string, string>>;
  /** `provider/modelId` of the persisted default model, or the engine's "not set" wording. */
  readonly defaultModel: string;
  readonly currentModel?: unknown;
  readonly availableDefaultModels: readonly unknown[];
  readonly currentTheme: string;
  readonly terminalTheme: "dark" | "light";
  readonly availableThemes: readonly string[];
  readonly hideThinkingBlock: boolean;
  readonly mermaidRenderingMode: "off" | "final" | "streaming";
  readonly showCacheMissNotices: boolean;
  readonly collapseChangelog: boolean;
  readonly enableInstallTelemetry: boolean;
  readonly doubleEscapeAction: "fork" | "tree" | "none";
  readonly treeFilterMode: "default" | "no-tools" | "user-only" | "labeled-only" | "all";
  readonly showHardwareCursor: boolean;
  readonly editorPaddingX: number;
  readonly outputPad: 0 | 1;
  readonly autocompleteMaxVisible: number;
  readonly quietStartup: boolean;
  readonly defaultProjectTrust: "ask" | "always" | "never";
  readonly clearOnShrink: boolean;
  readonly showTerminalProgress: boolean;
  readonly tuiMode: "regular" | "fullscreen";
  readonly fullscreenExitOutput: "transcript" | "resume-hint";
  readonly fullscreenScrollbar: "hidden" | "auto" | "always";
  readonly fullscreenCopyOnSelect: boolean;
  readonly warnings: { readonly anthropicExtraUsage?: boolean };
}

export interface PiWorkflowOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface PiAuthenticationProviderStatus {
  readonly type: "oauth" | "api_key";
  readonly source?: string;
}

export interface PiAuthenticationProviderOption extends PiWorkflowOption {
  readonly providerId: string;
  readonly authType: "oauth" | "api_key";
  readonly status?: PiAuthenticationProviderStatus;
}

export interface PiWorkflowRequest {
  readonly command: PiWorkflowRoute;
  readonly argument: string;
  readonly selection?: string;
  /** For the model route: also persist the selection as the default model. The bare `models` route always persists. */
  readonly persist?: boolean;
  readonly confirmed?: boolean;
  /** Recovery cwd selected after an import/resume source cwd is unavailable. */
  readonly cwdOverride?: string;
  /** Cancellation for an owned operation surface such as `/share`. */
  readonly signal?: AbortSignal;
  readonly treeSummary?: {
    readonly summarize: boolean;
    readonly customInstructions?: string;
  };
}

export type PiWorkflowOutcome = "completed" | "cancelled" | "failed" | "requires-selection" | "requires-confirmation";

export interface PiSessionInfoPresentation {
  readonly kind: "session-info";
  readonly sessionName?: string;
  readonly stats: {
    readonly sessionFile?: string;
    readonly sessionId: string;
    readonly userMessages: number;
    readonly assistantMessages: number;
    readonly toolCalls: number;
    readonly toolResults: number;
    readonly totalMessages: number;
    readonly tokens: {
      readonly input: number;
      readonly output: number;
      readonly cacheRead: number;
      readonly cacheWrite: number;
      readonly total: number;
    };
    readonly cost: number;
  };
  readonly cacheWaste: { readonly missedTokens: number; readonly missedCost: number; readonly missCount: number };
  readonly usageBreakdown: readonly { readonly key: string; readonly cost: number; readonly tokens: number }[];
  readonly cacheWarming: PiCacheWarmingPresentation;
}

/** The engine's prompt-cache warming mode and, once warming has acted, the decision behind it. */
export interface PiCacheWarmingPresentation {
  readonly mode: string;
  readonly status?: {
    readonly state: "inactive" | "scheduled" | "refreshing";
    readonly reason?: string;
    readonly nextWarmAt?: number;
    readonly extensionOverride?: boolean;
    readonly decision?: {
      readonly phase: "streaming" | "idle";
      readonly action: string;
      readonly warmCost: number;
      readonly missCost: number;
      readonly continuationProbability: number;
      readonly expectedSavings: number;
      readonly economicsAvailable: boolean;
    };
  };
}

export type PiWorkflowPresentation = PiSessionInfoPresentation;

export type PiWorkflowMessageKind = "status" | "warning" | "error" | "accent" | "silent";

export interface PiWorkflowMessage {
  readonly kind: Exclude<PiWorkflowMessageKind, "silent">;
  readonly message: string;
}

export interface PiWorkflowResult {
  readonly command: PiWorkflowRoute;
  readonly outcome: PiWorkflowOutcome;
  readonly message: string;
  /** Explicit presentation semantics; never inferred from message prefixes. */
  readonly messageKind?: PiWorkflowMessageKind;
  /** Ordered messages for truthful partial-success outcomes. */
  readonly messages?: readonly PiWorkflowMessage[];
  readonly detail?: string;
  readonly selectorTitle?: string;
  readonly options?: readonly PiWorkflowOption[];
  readonly presentation?: PiWorkflowPresentation;
}

export interface PiWorkflowAutocompleteCommand {
  readonly name: string;
  readonly description?: string;
  readonly argumentHint?: string;
  readonly argumentOptions?: readonly PiWorkflowOption[];
  readonly source: "builtin" | "prompt" | "skill" | "extension";
}

export interface PiWorkflowInteractionRequest {
  readonly type: "text" | "secret" | "manual-code" | "select";
  readonly message: string;
  readonly placeholder?: string;
  readonly options?: readonly { readonly id: string; readonly label: string }[];
}

export interface PiWorkflowLoginStart {
  readonly providerId: string;
  readonly providerName: string;
  readonly authType: "oauth" | "api_key";
}

export type PiWorkflowLoginNotification =
  | { readonly type: "auth_url"; readonly url: string; readonly instructions?: string }
  | { readonly type: "device_code"; readonly verificationUri: string; readonly userCode: string }
  | { readonly type: "info"; readonly message: string; readonly links?: readonly { readonly label?: string; readonly url: string }[] }
  | { readonly type: "waiting" | "progress"; readonly message: string };

export interface PiWorkflowInteractionHost {
  startLogin?(request: PiWorkflowLoginStart): void;
  prompt(request: PiWorkflowInteractionRequest): Promise<string | null>;
  notify(event: PiWorkflowLoginNotification): void;
  /** Deliver a post-login status or warning after the authentication dialog closes. */
  publish?(message: PiWorkflowMessage): void;
  finishLogin?(): void;
}

export interface PiWorkflowHost {
  copyText(text: string): Promise<void>;
  // Protocol: resolve only on exit zero; reject process failures with their native code,
  // signal and stderr. Stderr content alone does not indicate a failed command.
  runCommand(command: string, arguments_: readonly string[], options?: { readonly signal?: AbortSignal }): Promise<{ readonly stdout: string; readonly stderr: string }>;
  readChangelog(sinceVersion?: string): Promise<string>;
}

export interface PiBashWorkflowResult {
  readonly command: string;
  readonly output: string;
  readonly exitCode: number | undefined;
  readonly cancelled: boolean;
  readonly truncated: boolean;
  readonly excludeFromContext: boolean;
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

/**
 * Progress a session listing reports. `partialSessions` carries what the pinned manager has
 * loaded so far, so the selector can show results before the listing finishes.
 */
export type PiSessionListProgress = (
  loaded: number,
  total: number,
  partialSessions?: readonly SessionInfo[],
) => void;

export interface PiSessionSelectorContext {
  readonly currentSessionFilePath: string | undefined;
  readonly loadCurrentSessions: (onProgress?: PiSessionListProgress) => Promise<SessionInfo[]>;
  readonly loadAllSessions: (onProgress?: PiSessionListProgress) => Promise<SessionInfo[]>;
  readonly renameSession: (sessionFilePath: string, nextName: string | undefined) => Promise<void>;
}

export interface PiScopedModelsRefreshResult extends PiScopedModelsContext {
  readonly status: string;
  readonly statusKind: "success" | "warning";
}

/** What the bare-A1 Models dialog reads: the authenticated catalog and the explicit session and persisted scopes, kept apart. */
export interface PiModelsContext {
  readonly models: readonly PiScopedModelDescriptor[];
  /** `provider/id` of the active model, or null before one is set. */
  readonly activeModelId: string | null;
  /** Ordered `provider/id` references the session cycles; empty is the all-model fallback, not an explicit full scope. */
  readonly sessionScopeIds: readonly string[];
  /** The persisted `enabledModels` patterns resolved against the catalog, in order; unmatched patterns stay verbatim. */
  readonly persistedScopeIds: readonly string[];
}

export interface PiModelsRefreshResult {
  readonly models: readonly PiScopedModelDescriptor[];
  readonly status: string;
  readonly statusKind: "success" | "warning";
}
