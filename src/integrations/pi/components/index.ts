export { loadHistoryEditor, type HistoryEditorConstructor } from "./history-editor-loader.js";
export {
  createPiShellOperationLoader,
  createPiShellShareOperationDialog,
  type PiShellOperationLoaderPort,
} from "./share-operation-dialog.js";
export {
  OWNED_BUILTIN_SLASH_COMMANDS,
  PINNED_PI_BUILTIN_SLASH_COMMANDS,
  createPiShellEditor,
} from "./shell-editor-autocomplete.js";
export {
  componentFromPort,
  componentPort,
  createTuiFacade,
  createPiKeybindingsHost,
  ensureTheme,
  formatSessionTokens,
  isAutocompleteProvider,
  isRecord,
  piShellHyperlink,
  piShellTruncateToWidth,
  piShellVisibleWidth,
} from "./shell-shared-facade.js";
export {
  createPiExtensionUiBridge,
} from "./shell-extension-ui.js";
export {
  createPiQueuedInputStatus,
  createPiShellFooter,
  createPiShellHeader,
  createPiShellLoadedResources,
  createPiShellStatus,
} from "./shell-footer-status.js";
export {
  createPiShellArmin,
  createPiShellAuthProviderSelector,
  createPiShellDialog,
  createPiShellEarendilAnnouncement,
  createPiShellExtensionSelector,
  createPiShellLoginDialog,
  createPiShellModelSelector,
  createPiShellModelsDialog,
  createPiShellReloadBox,
  createPiShellScopedModelsSelector,
  createPiShellSelector,
  createPiShellSessionSelector,
  createPiShellSettingsSelector,
  createPiShellShowImagesSelector,
  createPiShellSkillsSelector,
  createPiShellThemeSelector,
  createPiShellTreeSelector,
  createPiShellTrustSelector,
  createPiShellUserMessageSelector,
} from "./shell-selectors-dialogs.js";
export {
  createPiShellChangelog,
  createPiShellCollapsedChangelog,
  createPiShellHotkeys,
  createPiShellSessionInfo,
  renderPiShellChangelogLines,
  renderPiShellCommandMessage,
  renderPiShellHotkeysLines,
  renderPiShellPackageUpdateNotice,
  renderPiShellReleaseUpdateBanner,
  renderPiShellReleaseUpdateNotice,
  renderPiShellStatusText,
} from "./shell-presenters-info.js";
export {
  createPiShellTranscriptComponent,
  isPiPromptStyleCompaction,
  renderPiShellStartupDiagnostic,
  renderPiShellTranscriptBlock,
  validatedAssistantMessage,
} from "./shell-presenters-transcript.js";
export { renderPiShellHotkeySections } from "./shell-hotkey-sections.js";
export type { PiShellHotkeySection } from "./shell-hotkey-sections.js";
export type {
  PiExtensionUiBridge,
  PiExtensionUiBridgeHost,
} from "./shell-extension-ui.js";
export type {
  PiShellAuthProviderOption,
  PiShellLoginDialogPort,
  PiShellModelSelectorOptions,
  PiShellModelsDialogOptions,
  PiShellModelsDialogPort,
  PiShellScopedModelDescriptor,
  PiShellScopedModelsSelectorOptions,
  PiShellScopedModelsSelectorPort,
  PiShellSettingsSelectorOptions,
} from "./shell-selectors-dialogs.js";
export type {
  PiShellAutocompleteCommand,
  PiShellClipboardContent,
  PiShellComponentPort,
  PiShellEditorBodyGeometry,
  PiShellEditorOptions,
  PiShellEditorPointerEvent,
  PiKeybindingsHost,
  PiShellEditorPort,
  PiShellEditorTextRange,
  PiShellExtensionRendererResolver,
  PiShellHeaderOptions,
  PiShellHeaderPort,
  PiShellImageAssetResolver,
  PiShellLoadedResourcesPort,
  PiShellPasteReservation,
  PiShellQueuedInputPort,
  PiShellResourceEntry,
  PiShellResourceSection,
  PiShellSelectorOption,
  PiShellSelectorOptions,
  PiShellStartupNotice,
  PiShellStatusPlacement,
  PiShellStatusPort,
  PiShellTranscriptComponentPort,
  PiShellViewComponentPort,
} from "./shell-shared-facade.js";
export type {
  PiShellCommandMessagePresentation,
  PiShellHotkeysPresentation,
  PiShellSessionInfoPresentation,
} from "./shell-presenters-info.js";
export type {
  PiShellSubmittedPromptComposer,
} from "./shell-presenters-transcript.js";
export {
  PINNED_PI_LAYOUT,
  applyConfiguredPiTheme,
  applyPiTheme,
  applyPiThemeInstance,
  currentPiAccentColor,
  currentPiThemeName,
  derivePiAccentProjection,
  derivePiCanvasBackground,
  detectPiTerminalBackgroundFromEnv,
  detectPiTerminalBackgroundTheme,
  detectPiTerminalThemeForAuto,
  ensurePiTheme,
  getAvailablePiThemes,
  loadPiTheme,
  onPiThemeChange,
  parsePiAutoThemeSetting,
  piCanvasBackgroundAnsi,
  piTheme,
  resolvePiThemeSetting,
  setPiAccentColor,
  setPiPackageBorderProjectionEnabled,
  stopPiThemeWatcher,
} from "./upstream/theme/theme.js";
export type { PiAccentProjection, PiColorMode, PiTerminalTheme, PiTerminalThemeDetection, PiTerminalThemeDetector, PiThemeBackground, PiThemeResult } from "./upstream/theme/theme.js";
export { PI_THEME_SOURCE, getPiSelectListTheme, piUiTheme } from "./theme.js";
export {
  PI_MODAL_CONTENT_PADDING_X,
  PiModalFrame,
  PiModalHeader,
  addPiModalHeader,
  adoptPiModalFrame,
  adoptPiModalHeader,
} from "./modal-frame.js";
export { ModelsDialogComponent } from "./models-dialog.js";
export type { ModelsDialogCallbacks, ModelsDialogConfig, ModelsDialogFilter, ModelsDialogModel } from "./models-dialog.js";
export { CountdownTimer } from "./upstream/components/countdown-timer.js";
export { ExtensionEditorComponent } from "./upstream/components/extension-editor.js";
export { SessionSelectorComponent } from "./upstream/components/session-selector.js";
export { filterAndSortSessions, hasSessionName, matchSession, parseSearchQuery } from "./upstream/components/session-selector-search.js";
export type { MatchResult, NameFilter, ParsedSearchQuery, SortMode } from "./upstream/components/session-selector-search.js";
export {
  BranchSummaryStatusIndicator,
  CompactionStatusIndicator,
  IdleStatus,
  RetryStatusIndicator,
  StatusIndicator,
  WorkingStatusIndicator,
} from "./upstream/components/status-indicator.js";
export type { CompactionStatusReason, StatusIndicatorKind } from "./upstream/components/status-indicator.js";
export { TreeSelectorComponent } from "./upstream/components/tree-selector.js";
export type { FilterMode } from "./upstream/components/tree-selector.js";
export { KEYBINDINGS, KeybindingsManager, migrateKeybindingsConfig } from "./upstream/adjacent/core/keybindings.js";
export type { AppKeybinding, AppKeybindings, KeyId, Keybinding, KeybindingsConfig } from "./upstream/adjacent/core/keybindings.js";
