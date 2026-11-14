import { DIALOG_CLOSE_SHORTCUT_HINT, wrapChoiceIndex } from "../../contracts/presentation/index.js";
import type { AppHostServices, UiApp } from "../../ui/apps/index.js";
import type {
  ListViewRow,
  NumericRange,
  ScrollbarAppearance,
  ScrollbarSpeed,
  ScrollbarStyle,
} from "../../ui/components/index.js";
import {
  GLOBAL_SCOPE,
  LineInput,
  PLAIN_THEME,
  ShortcutRegistry,
  assertNoShortcutConflicts,
  blockJumpTarget,
  configureDialogChoiceCapacity,
  configureDialogTextRows,
  configureDialogWidth,
  numericValues,
  RAIL_COLUMNS,
  renderCenteredDialogOverlay,
  renderDialogPanel,
  renderEmptyState,
  renderGroupHeader,
  renderListRow,
  renderNote,
  renderShortcutHintsWithClose,
  menuRowAt,
  regionAt,
  renderValueMenu,
  withScrollbarRail,
  stepperEnds,
  steppedValue,
  truncateToWidth,
  valueColumnFor,
  valueMenuFrame,
  blockRowSpan,
  displayWidth,
  humanizeLabel,
  humanizeTitle,
  indexOfKey,
  layoutList,
  moveSelection,
  rowKey,
  scrollForSelection,
  scrollbarGeometry,
  scrollbarWheelRows,
  selectableIndexes,
  type ListRow,
  type ListRowSpan,
  type PaneInputResult,
  type PaneMouseEvent,
  type PaneRect,
  type UiTheme,
} from "../../ui/components/index.js";
import type {
  OwnedUiSettingValue,
  OwnedUiSettingsEntry,
  OwnedSettingsManager,
} from "../../ui/settings/index.js";
import { SettingsScrollRail } from "./settings-scroll-rail.js";
import { SettingsSpinnerPreview } from "./settings-spinner-preview.js";
import { SettingsEdits, replaceRecord, sameRecord } from "./settings-edits.js";
import { SETTINGS_APP_ID } from "./settings-route.js";
import type { SettingsSearchInput, SettingsSearchInputFactory } from "./settings-search-input.js";
import { dialogWindow, modelDialogKey, modelDialogLines, type StructuredEdit } from "./settings-model-dialog.js";
export { SETTINGS_APP_ID, SETTINGS_ROUTE } from "./settings-route.js";
const SCOPE = SETTINGS_APP_ID;
const SETTINGS_TOP_RULE_ROWS = 1;
const SETTINGS_TITLE_ROWS = 1;
const SETTINGS_FOOTER_DIVIDER_ROWS = 1;
const SETTINGS_SEARCH_INPUT_ROWS = 3;
const SETTINGS_STATUS_ROWS = 1;
const SETTINGS_CONTENT_INSET = 1;
/** The panel a setting with parts opens: its own keys, its own hint. */
const DIALOG_SCOPE = `${SETTINGS_APP_ID}-parts`;
const SCROLLBAR_TOP_INSET = 0;
/** What a structured value offers instead of printing itself. */
const CONFIGURE = "configure";

type Action =
  | "move-up" | "move-down" | "block-up" | "block-down" | "first" | "last"
  | "page-up" | "page-down" | "previous-value" | "next-value" | "activate" | "edit-filter" | "close" | "undo"
  | "part-previous" | "part-next" | "part-change";

export const SETTINGS_SHORTCUTS = new ShortcutRegistry<Action>();
SETTINGS_SHORTCUTS.declare({ key: "edit", scope: SCOPE, description: "Search settings", section: "Change", hint: { keys: "Type", does: "search" } }, "edit-filter");
SETTINGS_SHORTCUTS.declare({ key: "up", scope: SCOPE, description: "Previous setting", section: "Navigate", hint: { keys: "↑↓", does: "navigate" } }, "move-up");
SETTINGS_SHORTCUTS.declare({ key: "down", scope: SCOPE, description: "Next setting", section: "Navigate", hint: { keys: "↑↓", does: "navigate" } }, "move-down");
SETTINGS_SHORTCUTS.declare({ key: "ctrl+shift+up", scope: SCOPE, description: "Previous section", section: "Navigate", hint: { keys: "Ctrl+Shift+↑↓", does: "jump" } }, "block-up");
SETTINGS_SHORTCUTS.declare({ key: "ctrl+shift+down", scope: SCOPE, description: "Next section", section: "Navigate", hint: { keys: "Ctrl+Shift+↑↓", does: "jump" } }, "block-down");
SETTINGS_SHORTCUTS.declare({ key: "pageUp", scope: SCOPE, description: "Up a page", section: "Navigate" }, "page-up");
SETTINGS_SHORTCUTS.declare({ key: "pageDown", scope: SCOPE, description: "Down a page", section: "Navigate" }, "page-down");
// Compatibility: the same chords the transcript uses for its content boundaries; plain
// Home and End stay with the search input's cursor.
SETTINGS_SHORTCUTS.declare({ key: "ctrl+home", scope: SCOPE, description: "First setting", section: "Navigate" }, "first");
SETTINGS_SHORTCUTS.declare({ key: "ctrl+end", scope: SCOPE, description: "Last setting", section: "Navigate" }, "last");
SETTINGS_SHORTCUTS.declare({ key: "enter", scope: SCOPE, description: "Change value", section: "Change", hint: { keys: "Enter", does: "change" } }, "activate");
SETTINGS_SHORTCUTS.declare({ key: "left", scope: SCOPE, description: "Previous value", section: "Change", hint: { keys: "←→", does: "adjust" } }, "previous-value");
SETTINGS_SHORTCUTS.declare({ key: "right", scope: SCOPE, description: "Next value", section: "Change", hint: { keys: "←→", does: "adjust" } }, "next-value");
SETTINGS_SHORTCUTS.declare({ key: "ctrl+z", scope: SCOPE, description: "Undo setting change", section: "Change", hint: { keys: "Ctrl+Z", does: "undo" } }, "undo");
SETTINGS_SHORTCUTS.declare({ key: "enter", scope: DIALOG_SCOPE, description: "Change this part", section: "Parts", hint: { keys: "Enter", does: "change" } }, "part-change");
SETTINGS_SHORTCUTS.declare({ key: "left", scope: DIALOG_SCOPE, description: "Change this part", section: "Parts" }, "part-change");
SETTINGS_SHORTCUTS.declare({ key: "right", scope: DIALOG_SCOPE, description: "Change this part", section: "Parts" }, "part-change");
SETTINGS_SHORTCUTS.declare({ key: "up", scope: DIALOG_SCOPE, description: "Previous part", section: "Parts" }, "part-previous");
SETTINGS_SHORTCUTS.declare({ key: "down", scope: DIALOG_SCOPE, description: "Next part", section: "Parts" }, "part-next");
SETTINGS_SHORTCUTS.declare({ key: "ctrl+z", scope: DIALOG_SCOPE, description: "Undo setting change", section: "Parts", hint: { keys: "Ctrl+Z", does: "undo" } }, "undo");
SETTINGS_SHORTCUTS.declare({
  key: "escape", scope: GLOBAL_SCOPE, description: "Close", section: "Screen",
  hint: { keys: DIALOG_CLOSE_SHORTCUT_HINT.key, does: DIALOG_CLOSE_SHORTCUT_HINT.action },
}, "close");
assertNoShortcutConflicts(SETTINGS_SHORTCUTS.assemble());

const KEYS: Readonly<Record<string, string>> = {
  "\u001b[A": "up",
  "\u001b[B": "down",
  "\u001b[1;6A": "ctrl+shift+up",
  "\u001b[1;6B": "ctrl+shift+down",
  "\u001b[D": "left",
  "\u001b[C": "right",
  "\u001b[5~": "pageUp",
  "\u001b[6~": "pageDown",
  // Protocol: xterm modifier form, then the rxvt Ctrl form of the same chords.
  "\u001b[1;5H": "ctrl+home",
  "\u001b[1;5F": "ctrl+end",
  "\u001b[7^": "ctrl+home",
  "\u001b[8^": "ctrl+end",
  "\u001b": "escape",
  "\r": "enter",
  "\n": "enter",
  " ": "space",
  "\u001a": "ctrl+z",
};

type Row = ListRow<OwnedUiSettingsEntry>;

interface SettingsSearchState {
  input: SettingsSearchInput | null;
  scrollBefore: number | null;
  readonly factory: SettingsSearchInputFactory;
  readonly copyText: (text: string) => void;
}

interface ValueMenu {
  readonly entry: OwnedUiSettingsEntry;
  /** Index of the value in effect, where the keyboard starts from. */
  readonly current: number;
  /** Row this menu was opened from, so it anchors there rather than to the selection. */
  readonly anchorKey: string;
  readonly choices: readonly OwnedUiSettingValue[];
  readonly keyboardOpened: boolean;
  readonly preview: SettingsSpinnerPreview | null;
  index: number;
}


/**
 * The settings screen. Rows, sticky headers, scrolling, and the keymap come from
 * the shared component layer; what belongs to settings is which sections exist,
 * how a value is shown, and where an accepted change is routed.
 */
export class SettingsApp implements UiApp {
  readonly id = SETTINGS_APP_ID;
  readonly #session: OwnedSettingsManager;
  #selectedKey: string | undefined;
  #scroll = 0;
  // Invariant: keyboard navigation requests visibility once; pointer scrolling then stays free.
  #selectionNeedsReveal = true;
  #reveal: ListRowSpan | undefined;
  readonly #search: SettingsSearchState;
  #menu: ValueMenu | null = null;
  #structured: StructuredEdit | null = null;
  // Invariant: pending values remain visible until the source reflects them.
  readonly #edits: SettingsEdits;
  #bodyTopForFrame = SETTINGS_TOP_RULE_ROWS + SETTINGS_TITLE_ROWS;
  #bodyHeightForFrame = 0;
  #panelTopForFrame = 0;
  #hoverKey: string | null = null;
  #hoverRegion: "label" | "value" | "minus" | "plus" = "label";
  #frameRows: { key: string; screenRow: number; valueColumn: number; valueWidth: number; stepper: boolean }[] = [];
  #menuFrame: { top: number; column: number; width: number; rows: number } | null = null;
  // Invariant: rail hover and drag live in the shared keyed state, as the transcript's do.
  readonly #rail = new SettingsScrollRail();
  // Rationale: the rail as drawn in the last frame, or null when nothing can be pointed at.

  readonly #options: { readonly dialogPanel: ((text: string) => string) | null };

  constructor(session: OwnedSettingsManager, options: {
    readonly searchInputFactory: SettingsSearchInputFactory;
    readonly copyText?: (text: string) => void;
    readonly dialogPanel?: (text: string) => string;
  }) {
    this.#session = session;
    this.#edits = new SettingsEdits(session, () => this.#structured);
    this.#options = {
      dialogPanel: options.dialogPanel ?? null,
    };
    this.#search = {
      input: null,
      scrollBefore: null,
      factory: options.searchInputFactory,
      copyText: options.copyText ?? (() => {}),
    };
  }

  onActivate(host: AppHostServices): void {
    this.#edits.open();
    void this.#session.load().then(() => host.requestRender());
  }

  onClose(_host: AppHostServices): void {
    this.#menu?.preview?.dispose();
    this.#menu = null;
    this.#edits.close();
    this.#search.input?.setFocused(false);
    this.#search.input = null;
    this.#rail.dispose();
  }

  render(rect: PaneRect, host: AppHostServices): readonly string[] {
    const theme = host.theme ?? PLAIN_THEME;
    const rows = this.#rows(), selected = indexOfKey(rows, this.#selectedKey);
    const footer = this.#footerLines(rect.width, theme);
    // Invariant: search owns its ruled footer. Configure dialogs float over the complete ordinary
    // Settings frame, so the standing divider and guidance remain visible in the dimmed backdrop.
    const dividerRows = this.#search.input === null ? SETTINGS_FOOTER_DIVIDER_ROWS : 0;
    const topRows = Math.min(SETTINGS_TOP_RULE_ROWS, rect.height);
    const contentHeight = Math.max(0, rect.height - topRows - dividerRows - footer.length);
    let titleRows = this.#scroll <= 0 ? Math.min(SETTINGS_TITLE_ROWS, contentHeight) : 0;
    let bodyHeight = contentHeight - titleRows;
    if (this.#selectionNeedsReveal && bodyHeight > 0) {
      this.#scroll = scrollForSelection(rows, bodyHeight, this.#scroll, selected, this.#reveal);
      this.#selectionNeedsReveal = false;
      this.#reveal = undefined;
    }
    if (this.#scroll > 0 && titleRows > 0) {
      titleRows = 0;
      bodyHeight = contentHeight;
    }

    let layout = layoutList(rows, bodyHeight, this.#scroll);
    if (layout.scroll === 0 && titleRows === 0) {
      titleRows = Math.min(SETTINGS_TITLE_ROWS, contentHeight);
      bodyHeight = contentHeight - titleRows;
      layout = layoutList(rows, bodyHeight, 0);
    }
    this.#bodyTopForFrame = topRows + titleRows;
    this.#bodyHeightForFrame = bodyHeight;
    this.#panelTopForFrame = topRows + contentHeight + dividerRows;
    this.#scroll = layout.scroll;
    const now = Date.now();
    this.#rail.noteRenderedScroll(layout.scroll, now, () => host.requestRender());
    // Invariant: auto and always keep the rail columns while the list fits, so a revealed
    // rail never reflows the rows; hidden gives the columns back to the rows.
    const appearance = this.#scrollbarAppearance();
    const reservesRail = appearance !== "hidden";
    const contentWidth = reservesRail ? Math.max(0, rect.width - RAIL_COLUMNS) : rect.width;
    const valueColumn = this.#valueColumn(rows);
    const geometry = scrollbarGeometry({
      contentLength: rows.length,
      viewportHeight: layout.visible,
      scroll: layout.scroll,
      trackHeight: Math.max(0, titleRows + bodyHeight - SCROLLBAR_TOP_INSET),
    });
    const presentation = this.#rail.presentation({ geometry, appearance, style: this.#scrollbarStyle(), now });
    this.#rail.setFrame(reservesRail && geometry !== null
      ? { rail: { column: rect.width, rowStart: topRows + SCROLLBAR_TOP_INSET, trackHeight: geometry.trackHeight }, geometry, page: layout.visible }
      : null);

    const body: string[] = [];
    this.#frameRows = [];
    if (rows.length === 0) {
      body.push(...renderEmptyState("No settings found", "👀", bodyHeight, contentWidth, theme));
    } else {
      if (layout.topPadding > 0) body.push("");
      if (layout.stickyHeader !== undefined) body.push(this.#header(layout.stickyHeader, theme, contentWidth));
      for (const index of layout.rowIndexes) {
        const row = rows[index];
        if (row !== undefined && row.kind === "element") {
          const view = this.#viewRow(row.value);
          this.#frameRows.push({
            key: view.key,
            screenRow: this.#bodyTopForFrame + body.length,
            valueColumn: valueColumn + Math.min(SETTINGS_CONTENT_INSET, contentWidth),
            valueWidth: displayWidth(view.value),
            stepper: view.stepper !== undefined,
          });
        }
        body.push(this.#renderRow(row, index === selected, contentWidth, valueColumn, theme));
      }
      while (body.length < bodyHeight) body.push("");
    }

    const title = truncateToWidth(` ${theme.bold(theme.fg("accent", "Settings"))}`, contentWidth);
    const scrollingFrame = [...(titleRows === 0 ? [] : [title]), ...body.slice(0, bodyHeight)];
    const withRail = withScrollbarRail(scrollingFrame, geometry, contentWidth, theme, {
      topInset: SCROLLBAR_TOP_INSET,
      presentation,
    });
    const rule = theme.fg("border", "─".repeat(Math.max(0, rect.width)));
    const frame = this.#withMenu(
      [rule, ...withRail, ...(dividerRows === 0 ? [] : [rule]), ...footer],
      selected,
      layout,
      valueColumn,
      theme,
      rect,
      reservesRail ? RAIL_COLUMNS : 0,
    );
    const complete = frame.slice(0, rect.height).concat(Array(Math.max(0, rect.height - frame.length)).fill("")), open = this.#structured, dialogTheme: UiTheme = this.#options.dialogPanel === null ? theme : { ...theme, panel: this.#options.dialogPanel };
    return open === null ? complete : renderCenteredDialogOverlay(complete, this.#dialogLines(open, configureDialogWidth(rect.width), rect.height, dialogTheme), rect, dialogTheme);
  }

  onInput(data: string, host: AppHostServices): PaneInputResult {
    if (data === "\u0003" && this.#search.input === null) return { consumed: false };
    if (this.#structured !== null) return this.#structuredKey(data);
    if (this.#menu !== null) return this.#menuKey(data);
    if (this.#search.input !== null) return this.#filterKey(data);

    const key = KEYS[data];
    const action = key === undefined ? null : SETTINGS_SHORTCUTS.resolve(key, SCOPE);
    if (action === null) {
      if (!this.#search.factory.isTextInput(data)) return { consumed: false };
      openSettingsSearch(this.#search, host, data, this.#scroll);
      this.#scroll = 0;
      return { consumed: true };
    }

    const rows = this.#rows();
    const selected = indexOfKey(rows, this.#selectedKey);
    switch (action) {
      case "close":
        host.close();
        return { consumed: true };
      case "edit-filter":
        return { consumed: false };
      case "activate": {
        const row = rows[selected];
        if (row?.kind === "element" && (row.value.structured || isDefaultModelEntry(row.value))) this.#openStructured(row.value);
        else if (row?.kind === "element" && typeof this.#edits.shown(row.value) === "number") this.#cycle(rows, selected, 1);
        else this.#openMenu(rows, selected, host, true);
        return { consumed: true };
      }
      case "move-up":
      case "move-down":
        this.#select(rows, moveSelection(rows, selected, action === "move-down" ? 1 : -1, true));
        return { consumed: true };
      case "page-up":
      case "page-down":
        this.#select(rows, moveSelection(rows, selected, action === "page-down" ? 8 : -8));
        return { consumed: true };
      case "block-up":
      case "block-down": {
        const target = blockJumpTarget(rows, selected, action === "block-down" ? 1 : -1);
        if (target !== undefined) this.#jump(rows, target);
        return { consumed: true };
      }
      case "first":
      case "last": {
        // Invariant: End lands on the very last setting, not on the head of its section.
        const selectable = selectableIndexes(rows);
        const target = action === "last" ? selectable.at(-1) : selectable[0];
        if (target !== undefined) {
          this.#select(rows, target);
          if (action === "first") this.#scroll = 0;
        }
        return { consumed: true };
      }
      case "previous-value":
      case "next-value":
        this.#cycle(rows, selected, action === "next-value" ? 1 : -1);
        return { consumed: true };
      case "undo":
        this.#edits.undo();
        return { consumed: true };
      default:
        return { consumed: false };
    }
  }

  onMouse(event: PaneMouseEvent, host: AppHostServices): PaneInputResult {
    const searchPointer = handleSettingsSearchPointer(this.#search, event, this.#panelTopForFrame);
    if (searchPointer !== null) return searchPointer;

    const menu = this.#menu;
    const frame = this.#menuFrame;
    if (menu !== null && frame !== null) {
      const overRow = menuRowAt(frame, event.row - 1, event.column);
      const overMenu = overRow !== null;
      if (event.kind === "motion") {
        // Invariant: the menu owns the pointer, but the row it came from is still the thing
        // being changed, so its value keeps reading as the one under the pointer.
        // Only a dialog that takes the screen puts that out.
        const hadHover = this.#hoverKey !== menu.anchorKey || this.#hoverRegion !== "value";
        this.#hoverKey = menu.anchorKey;
        this.#hoverRegion = "value";
        if (!overMenu) {
          const cleared = menu.index !== -1;
          menu.index = -1;
          return { consumed: true, render: hadHover || cleared };
        }
        if (menu.index === overRow) return { consumed: true, render: hadHover };
        menu.index = overRow ?? -1;
        return { consumed: true, render: true };
      }
      if (event.kind !== "press") return { consumed: true, render: false };
      if (overRow === null) {
        // Invariant: a press anywhere else dismisses the menu rather than acting through it.
        this.#closeMenu(menu);
        return { consumed: true };
      }
      const value = menu.choices[overRow];
      this.#closeMenu(menu);
      if (value !== undefined) this.#edits.apply(menu.entry, value);
      return { consumed: true };
    }

    if (event.kind === "wheel-up" || event.kind === "wheel-down") {
      // Invariant: the whole list pane owns wheel scrolling, including blank space beside
      // short labels. A fixed structured dialog keeps that content interaction available.
      const screenRow = event.row - 1;
      const wheelBottom = this.#search.input === null
        ? this.#bodyTopForFrame + this.#bodyHeightForFrame
        : this.#panelTopForFrame + SETTINGS_SEARCH_INPUT_ROWS + SETTINGS_STATUS_ROWS;
      if (screenRow >= 0 && screenRow < wheelBottom) {
        const distance = scrollbarWheelRows(this.#scrollbarSpeed());
        if (this.#search.input !== null) this.#search.scrollBefore = null;
        this.#scroll = Math.max(0, this.#scroll + (event.kind === "wheel-down" ? distance : -distance));
        return { consumed: true };
      }
      if (this.#structured === null) return { consumed: false };
    }

    if (this.#structured !== null) {
      // Invariant: the structured surface is keyboard-only. Non-content-wheel pointer reports
      // cannot change its selection or act on the Settings list behind it.
      return { consumed: true, render: false };
    }

    const rail = this.#rail.pointer(event, this.#scroll);
    if (rail.scroll !== undefined) this.#scroll = rail.scroll;
    // Invariant: the rail is not a row: pointing at it lights nothing in the list.
    if (rail.overRail) { this.#hoverKey = null; this.#hoverRegion = "label"; }
    if (rail.owned) return { consumed: true };

    const row = this.#frameRows.find(candidate => candidate.screenRow === event.row - 1);
    const previousKey = this.#hoverKey;
    const previousRegion = this.#hoverRegion;

    if (row === undefined) {
      this.#hoverKey = null;
      this.#hoverRegion = "label";
      return { consumed: event.kind !== "motion", render: previousKey !== null || rail.changed };
    }

    this.#hoverKey = row.key;
    this.#hoverRegion = regionAt(row, event.column);

    if (event.kind === "press") {
      const rows = this.#rows();
      const index = rows.findIndex(candidate => rowKey(candidate) === row.key);
      if (index >= 0) {
        // Rationale: the pointer acts where it points; the arrow belongs to the keyboard.
        if (this.#hoverRegion === "minus") this.#cycle(rows, index, -1);
        else if (this.#hoverRegion === "plus") this.#cycle(rows, index, 1);
        else if (this.#hoverRegion === "value") this.#openMenu(rows, index, host);
      }
      return { consumed: true };
    }
    const changed = previousKey !== this.#hoverKey || previousRegion !== this.#hoverRegion || rail.changed;
    return { consumed: event.kind !== "motion", render: changed };
  }

  #openMenu(rows: readonly Row[], selected: number, host: AppHostServices, selectCurrent = false): void {
    const row = rows[selected];
    if (row === undefined || row.kind !== "element") return;
    const entry = row.value;
    if (entry.structured || isDefaultModelEntry(entry)) {
      this.#openStructured(entry);
      return;
    }
    const shown = this.#edits.shown(entry);
    // Rationale: a number is stepped, not picked from a list: it has its own two controls,
    // and pointing at it is not a request for anything else.
    if (typeof shown === "number") return;
    if (!entry.editable || entry.choices === null || entry.choices.length === 0) return;
    const current = shown === null ? 0 : Math.max(0, entry.choices.indexOf(shown));
    const anchorKey = `${entry.backend}:${entry.id}`;
    // Compatibility: pointer opening already brightens the source value. Enter borrows that
    // same value-region state for the life of its menu rather than inventing a keyboard color.
    if (selectCurrent) {
      this.#hoverKey = anchorKey;
      this.#hoverRegion = "value";
    }
    // Invariant: the menu lays the value in effect over its source row, so both a press on
    // that value and Enter start on it: the pointer is already resting on that entry.
    this.#menu = {
      entry,
      current,
      anchorKey,
      choices: entry.choices,
      keyboardOpened: selectCurrent,
      preview: entry.backend === "a1" && entry.id === "spinnerStyle" ? new SettingsSpinnerPreview(() => host.requestRender()) : null,
      index: current,
    };
  }

  #closeMenu(menu: ValueMenu): void {
    menu.preview?.dispose();
    this.#menu = null;
    if (!menu.keyboardOpened || this.#hoverKey !== menu.anchorKey) return;
    this.#hoverKey = null;
    this.#hoverRegion = "label";
  }

  // Rationale: a structured setting opens as its own flag list rather than a value menu.
  #openStructured(entry: OwnedUiSettingsEntry): void {
    const modelDialog = entry.backend === "agent" && entry.id === "modelThinkingLevels"
      ? "thinking"
      : isDefaultModelEntry(entry) ? "default" : null;
    // Invariant: the flags come from the declaration, not from the stored value: an unset
    // flag still has a row, showing the default the source would apply. The default-model
    // selector may open empty so it can truthfully report that no authenticated models exist.
    if (entry.flags.length === 0 && modelDialog !== "default") return;
    const stored = typeof entry.rawValue === "object" && entry.rawValue !== null && !Array.isArray(entry.rawValue)
      ? (entry.rawValue as Record<string, unknown>)
      : {};
    const record: Record<string, boolean | string> = {};
    for (const flag of entry.flags) {
      const value = stored[flag.key];
      record[flag.key] = flag.choices === undefined
        ? (typeof value === "boolean" ? value : flag.fallback)
        : (typeof value === "string" && flag.choices.includes(value) ? value : flag.fallback);
    }
    // Invariant: the dialog takes the screen: the row it was opened from stops being the
    // thing under the pointer, so it stops looking like it.
    this.#hoverKey = null;
    this.#hoverRegion = "label";
    this.#rail.clear();
    const currentDefault = typeof entry.rawValue === "string" ? entry.rawValue : null;
    this.#structured = {
      entry,
      flags: entry.flags.map(flag => flag.key),
      modelDialog,
      filter: modelDialog === null ? null : new LineInput(""),
      step: "model",
      modelKey: null,
      modelIndex: 0,
      index: modelDialog === "default" ? Math.max(0, entry.flags.findIndex(flag => flag.key === currentDefault)) : 0,
      error: null,
      record,
    };
  }

  #structuredKey(data: string): PaneInputResult {
    const open = this.#structured;
    if (open === null) return { consumed: false };
    if (open.modelDialog !== null) {
      return modelDialogKey(open, data, KEYS[data] ?? data, {
        session: this.#session,
        close: () => { this.#structured = null; },
        reopen: reopened => { this.#structured = reopened; },
        save: (edit, previous, forward) => { this.#saveStructured(edit, previous, forward); },
      });
    }
    switch (SETTINGS_SHORTCUTS.resolve(KEYS[data] ?? data, DIALOG_SCOPE)) {
      case "close":
        this.#structured = null;
        return { consumed: true };
      case "part-previous":
        open.index = wrapChoiceIndex(open.index, -1, open.flags.length);
        return { consumed: true };
      case "part-next":
        open.index = wrapChoiceIndex(open.index, 1, open.flags.length);
        return { consumed: true };
      case "part-change":
        this.#toggleFlag(open.index);
        return { consumed: true };
      case "undo":
        this.#edits.undo();
        return { consumed: true };
      default:
        return { consumed: true, render: false };
    }
  }

  #toggleFlag(index: number): void {
    const open = this.#structured;
    const flag = open?.flags[index];
    if (open === null || open === undefined || flag === undefined) return;
    const previous = { ...open.record };
    const declared = open.entry.flags.find(candidate => candidate.key === flag);
    if (declared?.choices === undefined) open.record[flag] = !(open.record[flag] ?? false);
    else {
      // Rationale: Enter walks the offered choices in order and wraps, like the pinned value menu.
      const at = declared.choices.indexOf(String(open.record[flag] ?? declared.fallback));
      open.record[flag] = declared.choices[(at + 1) % declared.choices.length] ?? declared.fallback;
    }
    const forward = { ...open.record };
    this.#saveStructured(open, previous, forward);
  }

  #saveStructured(
    open: StructuredEdit,
    previous: Readonly<Record<string, boolean | string>>,
    forward: Readonly<Record<string, boolean | string>>,
  ): void {
    // Concurrency: only roll back the dialog if no later press has moved the record on.
    this.#edits.saveStructured(open.entry, previous, forward, () => {
      if (this.#structured === open && sameRecord(open.record, forward)) replaceRecord(open.record, previous);
    });
  }

  #menuKey(data: string): PaneInputResult {
    const menu = this.#menu;
    if (menu === null) return { consumed: false };
    const key = KEYS[data] ?? data;
    if (SETTINGS_SHORTCUTS.resolve(key, SCOPE) === "undo") {
      this.#closeMenu(menu);
      this.#edits.undo();
      return { consumed: true };
    }
    if (key === "escape") {
      this.#closeMenu(menu);
      return { consumed: true };
    }
    if (key === "up" || key === "down") {
      // Compatibility: the keyboard starts from the value in effect rather than from the top.
      menu.index = menu.index < 0
        ? menu.current
        : wrapChoiceIndex(menu.index, key === "down" ? 1 : -1, menu.choices.length);
    }
    else if (key === "enter") {
      const value = menu.choices[menu.index];
      this.#closeMenu(menu);
      if (value !== undefined) this.#edits.apply(menu.entry, value);
    }
    return { consumed: true };
  }

  #filterKey(data: string): PaneInputResult {
    const input = this.#search.input;
    if (input === null) return { consumed: false };

    if (data === "\u001b" || (data === "\u0003" && !input.hasSelection())) {
      this.#scroll = closeSettingsSearch(this.#search) ?? this.#scroll;
      return { consumed: true };
    }

    const key = KEYS[data];
    // Rationale: the boundary chords jump through the results; plain Home and End stay with
    // the search cursor, which the shared interactive input moves below.
    if (key === "ctrl+home" || key === "ctrl+end") {
      this.#search.scrollBefore = null;
      const rows = this.#rows();
      const selectable = selectableIndexes(rows);
      const target = key === "ctrl+end" ? selectable.at(-1) : selectable[0];
      if (target !== undefined) {
        this.#select(rows, target);
        if (key === "ctrl+home") this.#scroll = 0;
      }
      return { consumed: true };
    }
    if (key === "up" || key === "down" || key === "ctrl+shift+up" || key === "ctrl+shift+down") {
      this.#search.scrollBefore = null;
      const rows = this.#rows();
      // Rationale: nothing found means nothing to move through; the key is still swallowed
      // rather than typed into the search.
      if (selectableIndexes(rows).length === 0) return { consumed: true, render: false };
      const selected = indexOfKey(rows, this.#selectedKey);
      const forward = key === "down" || key === "ctrl+shift+down";
      if (key === "ctrl+shift+up" || key === "ctrl+shift+down") {
        const target = blockJumpTarget(rows, selected, forward ? 1 : -1);
        if (target !== undefined) this.#jump(rows, target);
        return { consumed: true };
      }
      this.#select(rows, moveSelection(rows, selected, forward ? 1 : -1, true));
      return { consumed: true };
    }

    const before = input.getText();
    input.handleInput(data);
    if (input.getText() !== before) {
      this.#search.scrollBefore = null;
      this.#scroll = 0;
    }
    return { consumed: true };
  }

  #cycle(rows: readonly Row[], selected: number, delta: -1 | 1): void {
    const row = rows[selected];
    if (row === undefined || row.kind !== "element") return;
    const entry = row.value;
    if (!entry.editable) return;
    const shown = this.#edits.shown(entry);
    if (typeof shown === "number") {
      // Rationale: at the end of the range there is nothing to say: the arrow already reads
      // as unavailable, so a message would only repeat it.
      const next = steppedValue(rangeOf(entry), shown, delta);
      if (next !== null) this.#edits.apply(entry, next);
      return;
    }
    const choices = entry.choices;
    if (choices === null || choices.length === 0) return;
    const current = shown === null ? -1 : choices.indexOf(shown);
    const next = choices[current < 0
      ? (delta > 0 ? 0 : choices.length - 1)
      : (current + delta + choices.length) % choices.length];
    if (next !== undefined) this.#edits.apply(entry, next);
  }

  #scrollbarSpeed(): ScrollbarSpeed {
    const value = this.#scrollSetting("scrollbarSpeed");
    return isScrollbarSpeed(value) ? value : "normal";
  }

  #scrollbarAppearance(): ScrollbarAppearance {
    const value = this.#scrollSetting("scrollbarAppearance");
    return value === "always" || value === "hidden" ? value : "auto";
  }

  #scrollbarStyle(): ScrollbarStyle {
    return this.#scrollSetting("scrollbarStyle") === "thick" ? "thick" : "thin";
  }

  // Invariant: a Scroll setting reads as the screen shows it: an accepted value first, then the source.
  #scrollSetting(id: "scrollbarAppearance" | "scrollbarStyle" | "scrollbarSpeed"): OwnedUiSettingValue | null {
    const entry = this.#session.sections()
      .flatMap(section => section.entries)
      .find(candidate => candidate.backend === "a1" && candidate.id === id);
    return entry === undefined ? this.#session.value(id) : this.#edits.shown(entry);
  }

  #jump(rows: readonly Row[], target: number): void {
    this.#select(rows, target);
    this.#reveal = blockRowSpan(rows, target);
  }

  #select(rows: readonly Row[], index: number): void {
    if (index < 0) return;
    this.#selectedKey = rowKey(rows[index]);
    this.#selectionNeedsReveal = true;
  }

  #rows(): readonly Row[] {
    const needle = this.#search.input?.getText().trim().toLowerCase() ?? "";
    const matches = (entry: OwnedUiSettingsEntry): boolean =>
      needle.length === 0
      || entry.id.toLowerCase().includes(needle)
      || labelOf(entry).toLowerCase().includes(needle);

    const rows: Row[] = [];
    for (const section of this.#session.sections()) {
      // Rationale: a section named by the search is what the reader asked for, so it arrives
      // whole rather than narrowed to the entries that happen to repeat its name.
      const named = needle.length > 0 && section.title.toLowerCase().includes(needle);
      const matching = named ? section.entries : section.entries.filter(matches);
      const entries = orderDefaultModelBeforeThinking(matching, section.id);
      if (needle.length > 0 && entries.length === 0) continue;
      if (rows.length > 0) rows.push({ kind: "spacer" });
      rows.push({ kind: "group", group: section.id, title: section.title });
      if (section.unavailableReason !== null) {
        rows.push({ kind: "note", group: section.id, text: section.unavailableReason });
        continue;
      }
      if (section.readOnlyReason !== null && (needle.length === 0 || named)) {
        rows.push({ kind: "note", group: section.id, text: section.readOnlyReason });
      }
      // Invariant: presented in the order the source reports, which is the order the
      // pinned engine shows and is neither declaration order nor alphabetical.
      for (const entry of entries) {
        rows.push({
          kind: "element",
          group: section.id,
          key: `${entry.backend}:${entry.id}`,
          selectable: entry.editable,
          value: entry,
        });
      }
    }
    return rows;
  }

  #valueColumn(rows: readonly Row[]): number {
    const shown = rows.flatMap(row => (row.kind === "element" ? [this.#viewRow(row.value)] : []));
    return valueColumnFor(shown);
  }

  #header(title: string, theme: UiTheme, width: number): string {
    return renderGroupHeader(humanizeTitle(title), width, theme);
  }

  #renderRow(row: Row | undefined, selected: boolean, width: number, valueColumn: number, theme: UiTheme): string {
    if (row === undefined || row.kind === "spacer" || width < SETTINGS_CONTENT_INSET) return "";
    if (row.kind === "group") return this.#header(row.title, theme, width);
    const innerWidth = width - SETTINGS_CONTENT_INSET;
    if (row.kind === "note") return ` ${renderNote(row.text, innerWidth, theme)}`;

    const entry = row.value;
    const key = `${entry.backend}:${entry.id}`;
    const hovered = this.#hoverKey === key;
    return ` ${renderListRow(this.#viewRow(entry), { selected, hovered, region: this.#hoverRegion }, valueColumn, innerWidth, theme)}`;
  }

  #viewRow(entry: OwnedUiSettingsEntry): ListViewRow {
    const key = `${entry.backend}:${entry.id}`;
    const shown = this.#edits.shown(entry);
    const value = entry.structured || isDefaultModelEntry(entry)
      ? CONFIGURE
      : shown === null
        ? describeRaw(entry.rawValue)
        : displaySettingValue(entry, shown);
    const range = rangeOf(entry);
    return {
      key,
      label: labelOf(entry),
      value,
      ...(typeof shown === "number" && entry.editable ? { stepper: stepperEnds(range, shown) } : {}),
    };
  }

  #withMenu(
    lines: readonly string[],
    _selected: number,
    _layout: { readonly rowIndexes: readonly number[]; readonly topPadding: number; readonly stickyHeader: string | undefined },
    valueColumn: number,
    theme: UiTheme,
    rect: PaneRect,
    reservedRight: number,
  ): readonly string[] {
    const menu = this.#menu;
    const anchor = menu === null ? undefined : this.#frameRows.find(candidate => candidate.key === menu.anchorKey);
    if (menu === null || anchor === undefined) {
      menu?.preview?.dispose();
      this.#menuFrame = null;
      return lines;
    }

    const state = {
      choices: menu.choices.map(choice => displaySettingValue(menu.entry, choice)),
      ...(menu.preview !== null ? { previews: menu.preview.frames(menu.choices, menu.index, theme) }
        : ["accentColor", "defaultAccentColor"].includes(menu.entry.id) ? {
          previews: menu.choices.map(choice => theme.accentPreview?.(String(choice), "■") ?? ""),
        } : {}),
      current: this.#edits.shown(menu.entry) === null ? null : displaySettingValue(menu.entry, this.#edits.shown(menu.entry)!),
      index: menu.index,
    };
    const frame = valueMenuFrame(state, {
      screenRow: anchor.screenRow,
      valueColumn: valueColumn + SETTINGS_CONTENT_INSET,
    }, {
      bodyTop: this.#bodyTopForFrame,
      bodyHeight: this.#bodyHeightForFrame,
      surfaceWidth: rect.width,
      reservedRight,
    });
    this.#menuFrame = frame;
    return renderValueMenu(lines, state, frame, theme);
  }

  #dialogLines(open: StructuredEdit, width: number, height: number, theme: UiTheme): readonly string[] {
    if (open.modelDialog !== null) return modelDialogLines(open, width, height, theme);
    const rows = open.flags.map(key => {
      const declared = open.entry.flags.find(flag => flag.key === key);
      return {
        label: declared?.label ?? humanizeLabel(key),
        // Protocol: the engine writes toggles as the booleans they are rather than as yes/no; a choice shows its word.
        value: declared?.choices === undefined ? ((open.record[key] ?? false) ? "true" : "false") : String(open.record[key] ?? declared.fallback),
        ...(declared?.description === undefined ? {} : { description: declared.description }),
      };
    });
    const visible = dialogWindow(
      rows,
      open.index,
      configureDialogChoiceCapacity(height, false, configureDialogTextRows(rows[open.index]?.description ?? "", width)),
    );
    return renderDialogPanel({ title: labelOf(open.entry), rows: visible.rows, index: visible.index, hint: SETTINGS_SHORTCUTS.hintEntries(DIALOG_SCOPE) }, width, theme);
  }

  #footerLines(width: number, theme: UiTheme): readonly string[] {
    // Rationale: standing guidance is more useful than transient feedback; failures still
    // roll back without displacing the Settings interaction contract.
    const entries = SETTINGS_SHORTCUTS.hintEntries(SCOPE);
    const status = renderShortcutHintsWithClose(entries, theme, width, width > 0 ? 1 : 0);
    const input = this.#search.input;
    if (input === null) return [status];
    return [...input.render(width), status];
  }
}


function openSettingsSearch(state: SettingsSearchState, host: AppHostServices, initial: string, scroll: number): void {
  state.scrollBefore = scroll;
  state.input = state.factory.create({
    theme: host.theme ?? PLAIN_THEME,
    getRows: () => host.getSize().height,
    requestRender: () => host.requestRender(),
    copyText: state.copyText,
  });
  state.input.setFocused(true);
  state.input.handleInput(initial);
}

function closeSettingsSearch(state: SettingsSearchState): number | null {
  state.input?.setFocused(false);
  state.input = null;
  const scroll = state.scrollBefore;
  state.scrollBefore = null;
  return scroll;
}

function handleSettingsSearchPointer(
  state: SettingsSearchState,
  event: PaneMouseEvent,
  panelTop: number,
): PaneInputResult | null {
  const input = state.input;
  if (input === null || event.kind === "wheel-up" || event.kind === "wheel-down") return null;
  const row = event.row - panelTop;
  const overInput = row >= 1 && row <= SETTINGS_SEARCH_INPUT_ROWS;
  if (!overInput && !input.ownsPointer()) return null;
  const handled = input.handlePointer({ kind: event.kind, button: event.button, column: event.column, row });
  return { consumed: handled || overInput, render: handled };
}

function orderDefaultModelBeforeThinking(
  entries: readonly OwnedUiSettingsEntry[],
  sectionId: string,
): readonly OwnedUiSettingsEntry[] {
  if (sectionId !== "agent") return entries;
  const defaultModel = entries.find(isDefaultModelEntry);
  if (defaultModel === undefined) return entries;
  const ordered = entries.filter(entry => entry !== defaultModel);
  const thinking = ordered.findIndex(entry => entry.backend === "agent" && entry.id === "modelThinkingLevels");
  ordered.splice(thinking < 0 ? ordered.length : thinking, 0, defaultModel);
  return ordered;
}

function isDefaultModelEntry(entry: OwnedUiSettingsEntry): boolean {
  return entry.backend === "agent" && entry.id === "defaultModel";
}

/** The source's own wording when it has one, otherwise the id made readable. */
function labelOf(entry: OwnedUiSettingsEntry): string {
  return entry.label ?? humanizeLabel(entry.id);
}

/** Where a setting's number may go: what the engine states, or what it offers. */
function rangeOf(entry: OwnedUiSettingsEntry): NumericRange {
  return { minimum: entry.minimum, maximum: entry.maximum, values: numericValues(entry.choices) };
}

/** Scalar choices use their readable presentation without changing stored values. */
function displaySettingValue(entry: OwnedUiSettingsEntry, value: OwnedUiSettingValue): string {
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (entry.backend === "a1" && entry.id === "spinnerStyle" && value === "current") return "dots";
  if (entry.backend === "a1" && entry.id === "sessionNameFormat") {
    if (value === "kebab") return "Kebab case";
    if (value === "sentence") return "Sentence case";
    if (value === "title") return "Title Case";
  }
  return String(value);
}

function describeRaw(value: unknown): string {
  if (value === null || value === undefined) return "unset";
  if (typeof value === "object") return Array.isArray(value) ? `${value.length} items` : "structured value";
  return String(value);
}

function isScrollbarSpeed(value: OwnedUiSettingValue | null): value is ScrollbarSpeed {
  return value === "normal" || value === "fast" || value === "high";
}
