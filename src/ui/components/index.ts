export { dialogRowAt, dialogValueColumn, renderDialogPanel } from "./dialog-panel.js";
export type { DialogPanelFrame, DialogPanelState, DialogRow } from "./dialog-panel.js";
export { FrameContractError, assertPaneRect, finalizeFrame, validateFrame } from "./frame.js";
export type { PaneRect } from "./frame.js";
export { humanizeLabel, humanizeTitle } from "./label.js";
export { LineInput, caretCell, handleLineInputKey, renderInputRow, wordLeft, wordRight } from "./line-input.js";
export type { InputRow, InputRowOptions, LineInputOutcome, LineInputView } from "./line-input.js";
export { PROMPT_GLYPH, PROMPT_PREFIX_WIDTH, PromptInput, promptArrow, promptRule, promptRuleText } from "./prompt-input.js";
export type { PromptInputBody, PromptInputMetrics } from "./prompt-input.js";
export {
  blockJumpTarget,
  blockRowSpan,
  clampScroll,
  indexOfKey,
  layoutList,
  maxScrollFor,
  moveSelection,
  rowKey,
  scrollForSelection,
  selectableIndexes,
  stickyHeaderFor,
  topPaddingRows,
  visibleRowCount,
} from "./list-block.js";
export type { ListLayout, ListRow, ListRowSpan } from "./list-block.js";
export { STEPPER_RESERVE, placementFor, regionAt, renderGroupHeader, renderListRow, renderNote, valueColumnFor } from "./list-view.js";
export type { ListRegion, ListRowPlacement, ListRowState, ListViewRow } from "./list-view.js";
export { MOUSE_TRACKING_OFF, MOUSE_TRACKING_ON, parseMouseInput, routeMouseInput } from "./mouse.js";
export type { ParsedMouseInput, RoutedMouseInput } from "./mouse.js";
export { isInsidePane, toPaneLocalMouse } from "./pane.js";
export type { Pane, PaneInputResult, PaneMouseEvent } from "./pane.js";
export { progressStatusText } from "./progress-status.js";
export { FrameCache, RENDER_REVISION_KINDS, RenderRevisionTracker, ZERO_REVISIONS, normalizeRevisions, revisionsEqual } from "./revision.js";
export type { RenderCacheContract, RenderRevisionKind, RenderRevisions } from "./revision.js";
export { MAX_COPY_ROWS, MAX_COPY_SOURCE_UNITS, selectionCopyLineContent, selectionCopyRowText } from "./selection-copy.js";
export type { SelectionCopyPrompt, SelectionCopyRow, SelectionCopySnapshot } from "./selection-copy.js";
export {
  ScrollbarRails,
  isThumbRow,
  scrollForThumbRow,
  scrollForTrackPage,
  scrollbarGeometry,
  scrollbarPresentation,
  scrollbarReservesSpace,
  scrollbarSelectionRows,
  scrollbarWheelRows,
} from "./scrollbar.js";
export type {
  RailPointer,
  RailPosition,
  ScrollbarAppearance,
  ScrollbarGeometry,
  ScrollbarInput,
  ScrollbarPresentation,
  ScrollbarPresentationInput,
  ScrollbarSpeed,
  ScrollbarStyle,
} from "./scrollbar.js";
export { GLOBAL_SCOPE, ShortcutRegistry, assembleShortcuts, assertNoShortcutConflicts } from "./shortcuts.js";
export type { ShortcutConflict, ShortcutDeclaration, ShortcutRegistryResult } from "./shortcuts.js";
export { backgroundSgrSpan, heldNativeHyperlinkStyle, hyperlinkSgrSpan, hyperlinkTargetAtColumn, nativeHyperlinkStyle, overlaySpan } from "./spans.js";
export { readVisibleHyperlinks } from "./visible-hyperlinks.js";
export type { VisibleHyperlinkRange, VisibleHyperlinkRow } from "./visible-hyperlinks.js";
export { renderStatusLine, statusText } from "./status-line.js";
export type { StatusLineInput } from "./status-line.js";
export { SUBMITTED_PROMPT_PREFIX_WIDTH, composeSubmittedPromptRows, formatSubmittedPromptTime, submittedPromptLayout } from "./submitted-prompt.js";
export type { SubmittedPromptLayout, SubmittedPromptStyle } from "./submitted-prompt.js";
export { numericValues, steppedValue, stepperEnds } from "./stepper.js";
export type { NumericRange } from "./stepper.js";
export { TranscriptViewport, assertTranscriptViewportFrameDescriptor } from "./transcript-viewport.js";
export type {
  TranscriptPromptAnchor,
  TranscriptViewportConfig,
  TranscriptViewportFrame,
  TranscriptViewportFrameDescriptor,
  TranscriptViewportFrameInput,
  TranscriptViewportHitRegions,
  TranscriptViewportTheme,
} from "./transcript-viewport.js";
export { RAIL_COLUMNS, renderEmptyState, withScrollbarRail } from "./surface.js";
export type { RailOptions } from "./surface.js";
export { displayColumnSlice, displayWidth, displayWordColumnRange, faint, padToWidth, stripAnsi, truncateToWidth } from "./text.js";
export type { DisplayColumnRange, DisplayColumnSlice } from "./text.js";
export {
  TEXT_SELECTION_MULTI_CLICK_MS,
  extendTextSelection,
  orderedTextSelection,
  plainTextBetweenColumns,
  pressTextSelection,
  releaseTextSelection,
  textSelectionLineExtendColumn,
  textSelectionPointAt,
  textSelectionText,
  usefulTextLineContent,
} from "./text-selection.js";
export type {
  OrderedTextSelection,
  TextSelection,
  TextSelectionClick,
  TextSelectionLineContent,
  TextSelectionPoint,
  TextSelectionPressInput,
} from "./text-selection.js";
export { PLAIN_THEME } from "./theme.js";
export type { UiTheme, UiThemeToken } from "./theme.js";
export { menuRowAt, renderValueMenu, valueMenuFrame } from "./value-menu.js";
export type { ValueMenuAnchor, ValueMenuFrame, ValueMenuLayout, ValueMenuState } from "./value-menu.js";
