/**
 * Payloads that cross the session backend port: workflow requests and results, catalog and
 * settings snapshots, resource summaries, and the slash-command names the shell routes. Every
 * declaration is plain data, so a backend other than pinned Pi can produce it.
 */
import type { OWNED_UI_EXTENSION_CONTRACT_VERSION, OWNED_UI_EXTENSION_RENDER_CALLBACKS, OWNED_UI_EXTENSION_UI_CALLBACKS, OWNED_UI_EXTENSION_UI_PROPERTIES } from "./extension-ui.js";
import type { OwnedUiCommandOutcome, OwnedUiThinkingLevel } from "./model.js";

/** Every workflow command the session engine advertises, in its own catalog order. */
export const OWNED_UI_WORKFLOW_COMMAND_NAMES = [
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

/** Routes the engine answers but never advertises. */
export const OWNED_UI_HIDDEN_COMMAND_NAMES = ["debug", "arminsayshi", "dementedelves"] as const;

/** The one bare-A1 model command; it replaces the `model` and `scoped-models` routes there. */
export const OWNED_UI_MODELS_COMMAND_NAME = "models" as const;

export type OwnedUiWorkflowCommandName = typeof OWNED_UI_WORKFLOW_COMMAND_NAMES[number];
export type OwnedUiHiddenWorkflowCommandName = typeof OWNED_UI_HIDDEN_COMMAND_NAMES[number];
export type OwnedUiModelsCommandName = typeof OWNED_UI_MODELS_COMMAND_NAME;
export type OwnedUiWorkflowRoute = OwnedUiWorkflowCommandName | OwnedUiHiddenWorkflowCommandName | OwnedUiModelsCommandName;

/** Which settings surface a backend serves; hidden-in-bare effects are unbindable in bare mode. */
export type OwnedUiSessionProductMode = "bare" | "comparison";

export interface OwnedUiWorkflowOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface OwnedUiAuthenticationProviderStatus {
  readonly type: "oauth" | "api_key";
  readonly source?: string;
}

export interface OwnedUiAuthenticationProviderOption extends OwnedUiWorkflowOption {
  readonly providerId: string;
  readonly authType: "oauth" | "api_key";
  readonly status?: OwnedUiAuthenticationProviderStatus;
}

/** A provider configured outside the engine, which the login route explains instead of running. */
export interface OwnedUiAmbientAuthentication {
  readonly providerId: string;
  readonly providerName: string;
  readonly title: string;
  readonly message: string;
}

export interface OwnedUiWorkflowRequest {
  readonly command: OwnedUiWorkflowRoute;
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

export type OwnedUiWorkflowOutcome = "completed" | "cancelled" | "failed" | "requires-selection" | "requires-confirmation";

export interface OwnedUiSessionInfoPresentation {
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
  readonly cacheWarming: OwnedUiCacheWarmingPresentation;
}

/** The engine's prompt-cache warming mode and, once warming has acted, the decision behind it. */
export interface OwnedUiCacheWarmingPresentation {
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

export type OwnedUiWorkflowPresentation = OwnedUiSessionInfoPresentation;

export type OwnedUiWorkflowMessageKind = "status" | "warning" | "error" | "accent" | "silent";

export interface OwnedUiWorkflowMessage {
  readonly kind: Exclude<OwnedUiWorkflowMessageKind, "silent">;
  readonly message: string;
}

export interface OwnedUiWorkflowResult {
  readonly command: OwnedUiWorkflowRoute;
  readonly outcome: OwnedUiWorkflowOutcome;
  readonly message: string;
  /** Explicit presentation semantics; never inferred from message prefixes. */
  readonly messageKind?: OwnedUiWorkflowMessageKind;
  /** Ordered messages for truthful partial-success outcomes. */
  readonly messages?: readonly OwnedUiWorkflowMessage[];
  readonly detail?: string;
  readonly selectorTitle?: string;
  readonly options?: readonly OwnedUiWorkflowOption[];
  readonly presentation?: OwnedUiWorkflowPresentation;
}

export interface OwnedUiWorkflowAutocompleteCommand {
  readonly name: string;
  readonly description?: string;
  readonly argumentHint?: string;
  readonly argumentOptions?: readonly OwnedUiWorkflowOption[];
  readonly source: "builtin" | "prompt" | "skill" | "extension";
}

export interface OwnedUiWorkflowInteractionRequest {
  readonly type: "text" | "secret" | "manual-code" | "select";
  readonly message: string;
  readonly placeholder?: string;
  readonly options?: readonly { readonly id: string; readonly label: string }[];
}

export interface OwnedUiWorkflowLoginStart {
  readonly providerId: string;
  readonly providerName: string;
  readonly authType: "oauth" | "api_key";
}

export type OwnedUiWorkflowLoginNotification =
  | { readonly type: "auth_url"; readonly url: string; readonly instructions?: string }
  | { readonly type: "device_code"; readonly verificationUri: string; readonly userCode: string }
  | { readonly type: "info"; readonly message: string; readonly links?: readonly { readonly label?: string; readonly url: string }[] }
  | { readonly type: "waiting" | "progress"; readonly message: string };

/** The shell's side of an interactive workflow such as `/login`. */
export interface OwnedUiWorkflowInteractionHost {
  startLogin?(request: OwnedUiWorkflowLoginStart): void;
  prompt(request: OwnedUiWorkflowInteractionRequest): Promise<string | null>;
  notify(event: OwnedUiWorkflowLoginNotification): void;
  /** Deliver a post-login status or warning after the authentication dialog closes. */
  publish?(message: OwnedUiWorkflowMessage): void;
  finishLogin?(): void;
}

export interface OwnedUiBashWorkflowResult {
  readonly command: string;
  readonly output: string;
  readonly exitCode: number | undefined;
  readonly cancelled: boolean;
  readonly truncated: boolean;
  readonly excludeFromContext: boolean;
}

export interface OwnedUiScopedModelDescriptor {
  readonly provider: string;
  readonly id: string;
  readonly name: string;
}

export interface OwnedUiScopedModelsContext {
  readonly models: readonly OwnedUiScopedModelDescriptor[];
  readonly enabledModelIds: readonly string[] | null;
}

export interface OwnedUiScopedModelsRefreshResult extends OwnedUiScopedModelsContext {
  readonly status: string;
  readonly statusKind: "success" | "warning";
}

/** What the bare-A1 Models dialog reads: the authenticated catalog and the explicit session and persisted scopes, kept apart. */
export interface OwnedUiModelsContext {
  readonly models: readonly OwnedUiScopedModelDescriptor[];
  /** `provider/id` of the active model, or null before one is set. */
  readonly activeModelId: string | null;
  /** Ordered `provider/id` references the session cycles; empty is the all-model fallback, not an explicit full scope. */
  readonly sessionScopeIds: readonly string[];
  /** The persisted `enabledModels` patterns resolved against the catalog, in order; unmatched patterns stay verbatim. */
  readonly persistedScopeIds: readonly string[];
}

export interface OwnedUiModelsRefreshResult {
  readonly models: readonly OwnedUiScopedModelDescriptor[];
  readonly status: string;
  readonly statusKind: "success" | "warning";
}

export interface OwnedUiProjectTrustUpdate {
  readonly path: string;
  readonly decision: boolean | null;
}

export interface OwnedUiProjectTrustContext {
  readonly cwd: string;
  readonly savedDecision: { readonly path: string; readonly decision: boolean } | null;
  readonly projectTrusted: boolean;
  readonly trustOptions: readonly {
    readonly label: string;
    readonly trusted: boolean;
    readonly updates: readonly OwnedUiProjectTrustUpdate[];
    readonly savedPath?: string;
  }[];
}

export interface OwnedUiSessionResumeMetadata {
  readonly sessionId: string;
  readonly sessionDir: string;
  readonly usesDefaultSessionDir: boolean;
}

/** Settings-level thinking: the session's levels plus `max`, which only models that map it offer. */
export type OwnedUiSettingsThinkingLevel = OwnedUiThinkingLevel | "max";

/** The engine settings the shell reads to configure itself and to seed its settings surfaces. */
export interface OwnedUiSessionSettingsSnapshot {
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
  readonly thinkingLevel: OwnedUiSettingsThinkingLevel;
  readonly availableThinkingLevels: readonly OwnedUiSettingsThinkingLevel[];
  /** The stored global default the selector offers to restore; the session's level may differ. */
  readonly defaultThinkingLevel: OwnedUiSettingsThinkingLevel;
  /** Per-model thinking overrides keyed `provider/modelId`. */
  readonly modelThinkingLevels: Readonly<Record<string, string>>;
  /** `provider/modelId` of the persisted default model, or the engine's "not set" wording. */
  readonly defaultModel: string;
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
  readonly quietStartup: boolean | "header";
  readonly defaultProjectTrust: "ask" | "always" | "never";
  readonly clearOnShrink: boolean;
  readonly showTerminalProgress: boolean;
  readonly tuiMode: "regular" | "fullscreen";
  readonly fullscreenExitOutput: "transcript" | "resume-hint";
  readonly fullscreenScrollbar: "hidden" | "auto" | "always";
  readonly fullscreenCopyOnSelect: boolean;
  readonly fullscreenWheelScrollLines: number | "auto";
  readonly warnings: { readonly anthropicExtraUsage?: boolean };
}

export type OwnedUiJsonValue = null | boolean | number | string | readonly OwnedUiJsonValue[] | { readonly [key: string]: OwnedUiJsonValue };

/** The layer that installs a setting's live effect. */
export type OwnedUiSettingOwner = "agent" | "shell" | "terminal" | "startup" | "shutdown" | "installation";

/** Engine settings whose live effect an owner may bind. */
export type OwnedUiSessionSettingKey =
  | "autoCompact" | "showImages" | "imageWidthCells" | "autoResizeImages" | "blockImages"
  | "enableSkillCommands" | "steeringMode" | "followUpMode" | "transport" | "httpIdleTimeoutMs" | "cacheWarmingMode"
  | "modelThinkingLevels" | "theme" | "hideThinkingBlock" | "mermaidRenderingMode" | "showCacheMissNotices"
  | "collapseChangelog" | "enableInstallTelemetry" | "quietStartup" | "defaultProjectTrust"
  | "doubleEscapeAction" | "treeFilterMode" | "showHardwareCursor" | "editorPaddingX" | "outputPad"
  | "autocompleteMaxVisible" | "clearOnShrink" | "showTerminalProgress" | "tuiMode"
  | "fullscreenExitOutput" | "fullscreenScrollbar" | "fullscreenCopyOnSelect" | "fullscreenWheelScrollLines" | "warnings";

export interface OwnedUiSettingEffectHandler {
  /** Install one value in the active owner. Handlers must be idempotent and reversible. */
  apply(value: OwnedUiJsonValue): void | Promise<void>;
}

export type OwnedUiSettingOwnerHandlers = Partial<Record<OwnedUiSessionSettingKey, OwnedUiSettingEffectHandler>>;

/** How the backend settled one owned UI command. */
export interface OwnedUiCommandResult {
  readonly outcome: OwnedUiCommandOutcome;
  readonly diagnostic: string | null;
}

export interface OwnedUiResourceSummary {
  readonly kind: "skill" | "prompt-template" | "agent-context" | "system-prompt" | "theme";
  readonly id: string;
  readonly label: string;
  readonly sourcePath: string | null;
  readonly diagnostic: string | null;
}

export interface OwnedUiExtensionSourceSummary {
  readonly source: string;
  readonly scope: "user" | "project" | "temporary";
  readonly origin: "package" | "top-level";
  readonly baseDir: string | null;
}

export interface OwnedUiExtensionResourceSummary {
  readonly kind: "extension";
  readonly id: string;
  readonly sourcePath: string | null;
  readonly resolvedPath: string | null;
  readonly sourceInfo: OwnedUiExtensionSourceSummary | null;
  readonly loaded: boolean;
  readonly hidden: boolean;
  readonly diagnostic: string | null;
}

/** Whether the owned extension UI bridge is bound to the current session, and the contract it offers. */
export interface OwnedUiVisualExtensionSupport {
  readonly available: boolean;
  readonly contractComplete: true;
  readonly contractVersion: typeof OWNED_UI_EXTENSION_CONTRACT_VERSION;
  readonly binding: "bound" | "unbound";
  readonly uiCallbacks: typeof OWNED_UI_EXTENSION_UI_CALLBACKS;
  readonly uiProperties: typeof OWNED_UI_EXTENSION_UI_PROPERTIES;
  readonly renderCallbacks: typeof OWNED_UI_EXTENSION_RENDER_CALLBACKS;
  readonly diagnostic: string;
}

/** A newer release found by the startup check. */
export interface OwnedUiReleaseUpdate {
  readonly version: string;
  readonly command: string;
  readonly changelogUrl: string | null;
}
