import type { SessionInfo } from "../startup-public.js";
import {
  OWNED_UI_HIDDEN_COMMAND_NAMES,
  OWNED_UI_MODELS_COMMAND_NAME,
  OWNED_UI_WORKFLOW_COMMAND_NAMES,
  type OwnedUiAuthenticationProviderOption,
  type OwnedUiAuthenticationProviderStatus,
  type OwnedUiBashWorkflowResult,
  type OwnedUiCacheWarmingPresentation,
  type OwnedUiHiddenWorkflowCommandName,
  type OwnedUiModelsCommandName,
  type OwnedUiModelsContext,
  type OwnedUiModelsRefreshResult,
  type OwnedUiProjectTrustContext,
  type OwnedUiProjectTrustUpdate,
  type OwnedUiScopedModelDescriptor,
  type OwnedUiScopedModelsContext,
  type OwnedUiScopedModelsRefreshResult,
  type OwnedUiSessionInfoPresentation,
  type OwnedUiSessionProductMode,
  type OwnedUiSessionResumeMetadata,
  type OwnedUiSessionSettingsSnapshot,
  type OwnedUiWorkflowAutocompleteCommand,
  type OwnedUiWorkflowCommandName,
  type OwnedUiWorkflowInteractionHost,
  type OwnedUiWorkflowInteractionRequest,
  type OwnedUiWorkflowLoginNotification,
  type OwnedUiWorkflowLoginStart,
  type OwnedUiWorkflowMessage,
  type OwnedUiWorkflowMessageKind,
  type OwnedUiWorkflowOption,
  type OwnedUiWorkflowOutcome,
  type OwnedUiWorkflowPresentation,
  type OwnedUiWorkflowRequest,
  type OwnedUiWorkflowResult,
  type OwnedUiWorkflowRoute,
} from "../../../contracts/owned-ui/index.js";

// Compatibility: one-cycle aliases for the payloads that moved to the owned-UI contract, so engine
// internals keep their names until extract-pi-session-presenters retires them.
export const PINNED_PI_WORKFLOW_COMMAND_NAMES = OWNED_UI_WORKFLOW_COMMAND_NAMES;
export const PINNED_PI_HIDDEN_COMMAND_NAMES = OWNED_UI_HIDDEN_COMMAND_NAMES;

/**
 * Commands the pinned engine advertises that A1 deliberately does not present. `/bug` collects,
 * uploads, and archives a report through modules the package keeps off its public surface, so A1
 * cannot reproduce the route and does not offer a partial one. Naming them here keeps the manifest
 * comparison exact: a command upstream adds still fails the gate until it is classified.
 */
export const PINNED_PI_DECLINED_COMMAND_NAMES = ["bug"] as const;

export type PiWorkflowCommandName = OwnedUiWorkflowCommandName;
export type PiHiddenWorkflowCommandName = OwnedUiHiddenWorkflowCommandName;

export const OWNED_MODELS_COMMAND_NAME = OWNED_UI_MODELS_COMMAND_NAME;
export type OwnedModelsCommandName = OwnedUiModelsCommandName;
export type OwnedWorkflowCommandName = Exclude<PiWorkflowCommandName, "model" | "scoped-models"> | OwnedModelsCommandName;

/** Bare A1's advertised catalog: `models` replaces the pinned pair and is followed by `thinking`. */
export const OWNED_WORKFLOW_COMMAND_NAMES: readonly OwnedWorkflowCommandName[] = Object.freeze(
  PINNED_PI_WORKFLOW_COMMAND_NAMES.flatMap((name): OwnedWorkflowCommandName[] =>
    name === "model"
      ? [OWNED_MODELS_COMMAND_NAME, "thinking"]
      : name === "thinking" || name === "scoped-models" ? [] : [name]),
);

export type PiProductMode = OwnedUiSessionProductMode;

/** The advertised command catalog for a product mode; hidden routes are shared by both. */
export function workflowCommandNames(productMode: PiProductMode): readonly (PiWorkflowCommandName | OwnedModelsCommandName)[] {
  return productMode === "bare" ? OWNED_WORKFLOW_COMMAND_NAMES : PINNED_PI_WORKFLOW_COMMAND_NAMES;
}

export type PiWorkflowRoute = OwnedUiWorkflowRoute;

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
  "onFullscreenWheelScrollLinesChange",
  "onWarningsChange",
  "onCancel",
] as const;

export type PiPinnedSettingsCallback = typeof PINNED_PI_SETTINGS_CALLBACKS[number];

/** The neutral settings snapshot plus the model values only the pinned settings selector reads. */
export interface PiPinnedSettingsSnapshot extends OwnedUiSessionSettingsSnapshot {
  readonly currentModel?: unknown;
  readonly availableDefaultModels: readonly unknown[];
}

export type PiWorkflowOption = OwnedUiWorkflowOption;
export type PiAuthenticationProviderStatus = OwnedUiAuthenticationProviderStatus;
export type PiAuthenticationProviderOption = OwnedUiAuthenticationProviderOption;
export type PiWorkflowRequest = OwnedUiWorkflowRequest;
export type PiWorkflowOutcome = OwnedUiWorkflowOutcome;
export type PiSessionInfoPresentation = OwnedUiSessionInfoPresentation;
export type PiCacheWarmingPresentation = OwnedUiCacheWarmingPresentation;
export type PiWorkflowPresentation = OwnedUiWorkflowPresentation;
export type PiWorkflowMessageKind = OwnedUiWorkflowMessageKind;
export type PiWorkflowMessage = OwnedUiWorkflowMessage;
export type PiWorkflowResult = OwnedUiWorkflowResult;
export type PiWorkflowAutocompleteCommand = OwnedUiWorkflowAutocompleteCommand;
export type PiWorkflowInteractionRequest = OwnedUiWorkflowInteractionRequest;
export type PiWorkflowLoginStart = OwnedUiWorkflowLoginStart;
export type PiWorkflowLoginNotification = OwnedUiWorkflowLoginNotification;
export type PiWorkflowInteractionHost = OwnedUiWorkflowInteractionHost;
export type PiBashWorkflowResult = OwnedUiBashWorkflowResult;
export type PiScopedModelDescriptor = OwnedUiScopedModelDescriptor;
export type PiScopedModelsContext = OwnedUiScopedModelsContext;
export type PiProjectTrustUpdate = OwnedUiProjectTrustUpdate;
export type PiProjectTrustContext = OwnedUiProjectTrustContext;
export type PiSessionResumeMetadata = OwnedUiSessionResumeMetadata;
export type PiScopedModelsRefreshResult = OwnedUiScopedModelsRefreshResult;
export type PiModelsContext = OwnedUiModelsContext;
export type PiModelsRefreshResult = OwnedUiModelsRefreshResult;

export interface PiWorkflowHost {
  copyText(text: string): Promise<void>;
  // Protocol: resolve only on exit zero; reject process failures with their native code,
  // signal and stderr. Stderr content alone does not indicate a failed command.
  runCommand(command: string, arguments_: readonly string[], options?: { readonly signal?: AbortSignal }): Promise<{ readonly stdout: string; readonly stderr: string }>;
  readChangelog(sinceVersion?: string): Promise<string>;
}

export interface PiTreeSelectorContext {
  readonly tree: readonly unknown[];
  readonly currentLeafId: string | null;
  readonly filterMode: "default" | "no-tools" | "user-only" | "labeled-only" | "all";
  readonly skipSummaryPrompt: boolean;
  readonly appendLabelChange: (entryId: string, label: string | undefined) => void;
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
