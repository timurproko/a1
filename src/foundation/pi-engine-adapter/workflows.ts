export const PINNED_PI_WORKFLOW_COMMAND_NAMES = [
  "settings",
  "model",
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
  "tree",
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

export type PiWorkflowCommandName = typeof PINNED_PI_WORKFLOW_COMMAND_NAMES[number];
export type PiHiddenWorkflowCommandName = typeof PINNED_PI_HIDDEN_COMMAND_NAMES[number];
export type PiWorkflowRoute = PiWorkflowCommandName | PiHiddenWorkflowCommandName;

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
  "onThinkingLevelChange",
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
  "onFullscreenScrollbarChange",
  "onWarningsChange",
  "onCancel",
] as const;

export type PiPinnedSettingsCallback = typeof PINNED_PI_SETTINGS_CALLBACKS[number];

export interface PiWorkflowOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface PiWorkflowRequest {
  readonly command: PiWorkflowRoute;
  readonly argument: string;
  readonly selection?: string;
  readonly confirmed?: boolean;
}

export type PiWorkflowOutcome = "completed" | "cancelled" | "failed" | "requires-selection" | "requires-confirmation";

export interface PiWorkflowResult {
  readonly command: PiWorkflowRoute;
  readonly outcome: PiWorkflowOutcome;
  readonly message: string;
  readonly detail?: string;
  readonly selectorTitle?: string;
  readonly options?: readonly PiWorkflowOption[];
}

export interface PiWorkflowAutocompleteCommand {
  readonly name: string;
  readonly description?: string;
  readonly argumentHint?: string;
  readonly argumentOptions?: readonly PiWorkflowOption[];
  readonly source: "builtin" | "prompt" | "skill" | "extension";
}

export interface PiWorkflowInteractionRequest {
  readonly type: "text" | "secret" | "manual-code";
  readonly message: string;
  readonly placeholder?: string;
}

export interface PiWorkflowInteractionHost {
  prompt(request: PiWorkflowInteractionRequest): Promise<string | null>;
  notify(message: string): void;
}

export interface PiWorkflowHost {
  copyText(text: string): Promise<void>;
  runCommand(command: string, arguments_: readonly string[]): Promise<{ readonly stdout: string; readonly stderr: string }>;
  readChangelog(): Promise<string>;
}

export interface PiBashWorkflowResult {
  readonly command: string;
  readonly output: string;
  readonly exitCode: number | undefined;
  readonly cancelled: boolean;
  readonly truncated: boolean;
  readonly excludeFromContext: boolean;
}
