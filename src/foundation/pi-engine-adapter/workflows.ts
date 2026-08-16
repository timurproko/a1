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
  readonly thinkingLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
  readonly availableThinkingLevels: readonly ("off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max")[];
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
  readonly fullscreenScrollbar: "hidden" | "auto" | "always";
  readonly warnings: { readonly anthropicExtraUsage?: boolean };
}

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
