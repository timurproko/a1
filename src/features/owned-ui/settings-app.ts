import type { AppHostServices, UiApp } from "../../ui/apps/index.js";
import type {
  ListViewRow,
  NumericRange,
  RailPosition,
  ScrollbarAppearance,
  ScrollbarGeometry,
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
  dialogValueColumn,
  numericValues,
  RAIL_COLUMNS,
  renderDialogPanel,
  renderEmptyState,
  renderGroupHeader,
  renderInputRow,
  renderListRow,
  renderNote,
  statusText,
  dialogRowAt,
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
  handleLineInputKey,
  humanizeLabel,
  humanizeTitle,
  indexOfKey,
  isThumbRow,
  layoutList,
  moveSelection,
  rowKey,
  scrollForSelection,
  scrollForTrackPage,
  scrollbarGeometry,
  scrollbarPresentation,
  ScrollbarRails,
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
import { SETTINGS_APP_ID, SETTINGS_ROUTE } from "./settings-route.js";
export { SETTINGS_APP_ID, SETTINGS_ROUTE } from "./settings-route.js";
const SCOPE = SETTINGS_APP_ID;
const SETTINGS_HEADER_ROWS = 2;
const SETTINGS_FOOTER_DIVIDER_ROWS = 1;
const SETTINGS_CONTENT_INSET = 1;
/** The panel a setting with parts opens: its own keys, its own hint. */
const DIALOG_SCOPE = `${SETTINGS_APP_ID}-parts`;
const SCROLLBAR_TOP_INSET = 1;
/** Identity of the settings list rail in the shared rail state. */
const RAIL_KEY = "settings";
// Compatibility: the transcript rail stays lit this long after a scroll, and repaints just after.
const SCROLL_LINGER_MS = 900;
const SCROLL_LINGER_REPAINT_MS = 925;
const SEARCH_PLACEHOLDER = "search settings";
/** What a structured value offers instead of printing itself. */
const CONFIGURE = "configure";

type Action =
  | "move-up" | "move-down" | "block-up" | "block-down" | "first" | "last"
  | "page-up" | "page-down" | "previous-value" | "next-value" | "activate" | "open-filter" | "close"
  | "part-previous" | "part-next" | "part-change";

export const SETTINGS_SHORTCUTS = new ShortcutRegistry<Action>();
SETTINGS_SHORTCUTS.declare({ key: "/", scope: SCOPE, description: "Search settings", section: "Change", hint: { keys: "/", does: "to search" } }, "open-filter");
SETTINGS_SHORTCUTS.declare({ key: "up", scope: SCOPE, description: "Previous setting", section: "Navigate", hint: { keys: "↑↓", does: "to navigate" } }, "move-up");
SETTINGS_SHORTCUTS.declare({ key: "down", scope: SCOPE, description: "Next setting", section: "Navigate", hint: { keys: "↑↓", does: "to navigate" } }, "move-down");
SETTINGS_SHORTCUTS.declare({ key: "shift+up", scope: SCOPE, description: "Previous section", section: "Navigate", hint: { keys: "Shift+↑↓", does: "to jump" } }, "block-up");
SETTINGS_SHORTCUTS.declare({ key: "shift+down", scope: SCOPE, description: "Next section", section: "Navigate", hint: { keys: "Shift+↑↓", does: "to jump" } }, "block-down");
SETTINGS_SHORTCUTS.declare({ key: "pageUp", scope: SCOPE, description: "Up a page", section: "Navigate" }, "page-up");
SETTINGS_SHORTCUTS.declare({ key: "pageDown", scope: SCOPE, description: "Down a page", section: "Navigate" }, "page-down");
// Compatibility: the same chords the transcript uses for its content boundaries; plain
// Home and End stay with the search input's cursor.
SETTINGS_SHORTCUTS.declare({ key: "ctrl+home", scope: SCOPE, description: "First setting", section: "Navigate" }, "first");
SETTINGS_SHORTCUTS.declare({ key: "ctrl+end", scope: SCOPE, description: "Last setting", section: "Navigate" }, "last");
SETTINGS_SHORTCUTS.declare({ key: "enter", scope: SCOPE, description: "Change value", section: "Change", hint: { keys: "Enter/Space", does: "to change" } }, "activate");
SETTINGS_SHORTCUTS.declare({ key: "space", scope: SCOPE, description: "Change value", section: "Change", hint: { keys: "Enter/Space", does: "to change" } }, "activate");
SETTINGS_SHORTCUTS.declare({ key: "left", scope: SCOPE, description: "Previous value", section: "Change", hint: { keys: "←→", does: "to adjust" } }, "previous-value");
SETTINGS_SHORTCUTS.declare({ key: "right", scope: SCOPE, description: "Next value", section: "Change", hint: { keys: "←→", does: "to adjust" } }, "next-value");
SETTINGS_SHORTCUTS.declare({ key: "escape", scope: GLOBAL_SCOPE, description: "Close", section: "Screen", hint: { keys: "Esc", does: "to cancel" } }, "close");
SETTINGS_SHORTCUTS.declare({ key: "enter", scope: DIALOG_SCOPE, description: "Change this part", section: "Parts", hint: { keys: "Enter/Space", does: "to change" } }, "part-change");
SETTINGS_SHORTCUTS.declare({ key: "space", scope: DIALOG_SCOPE, description: "Change this part", section: "Parts", hint: { keys: "Enter/Space", does: "to change" } }, "part-change");
SETTINGS_SHORTCUTS.declare({ key: "left", scope: DIALOG_SCOPE, description: "Change this part", section: "Parts" }, "part-change");
SETTINGS_SHORTCUTS.declare({ key: "right", scope: DIALOG_SCOPE, description: "Change this part", section: "Parts" }, "part-change");
SETTINGS_SHORTCUTS.declare({ key: "up", scope: DIALOG_SCOPE, description: "Previous part", section: "Parts" }, "part-previous");
SETTINGS_SHORTCUTS.declare({ key: "down", scope: DIALOG_SCOPE, description: "Next part", section: "Parts" }, "part-next");
assertNoShortcutConflicts(SETTINGS_SHORTCUTS.assemble());

const KEYS: Readonly<Record<string, string>> = {
  "\u001b[A": "up",
  "\u001b[B": "down",
  "\u001b[1;2A": "shift+up",
  "\u001b[1;2B": "shift+down",
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
  "/": "/",
};

type Row = ListRow<OwnedUiSettingsEntry>;

/**
 * A structured setting being edited: its parts, the row in hand, and their values. A part is a
 * toggle when the declaration offers no choices, and a choice cycle otherwise; a choice part at its
 * fallback is unset and leaves the record.
 */
interface StructuredEdit {
  readonly entry: OwnedUiSettingsEntry;
  readonly flags: readonly string[];
  index: number;
  readonly record: Record<string, boolean | string>;
}

interface ValueMenu {
  readonly entry: OwnedUiSettingsEntry;
  /** Index of the value in effect, where the keyboard starts from. */
  readonly current: number;
  /** Row this menu was opened from, so it anchors there rather than to the selection. */
  readonly anchorKey: string;
  readonly choices: readonly OwnedUiSettingValue[];
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
  #notice: string | null = null;
  #filter: LineInput | null = null;
  #menu: ValueMenu | null = null;
  #structured: StructuredEdit | null = null;
  #interruptArmed = false;
  // Invariant: pending values remain visible until the source reflects them.
  readonly #pending = new Map<string, OwnedUiSettingValue>();
  #dialogValueColumn = 0;
  #bodyTopForFrame = SETTINGS_HEADER_ROWS;
  #bodyHeightForFrame = 0;
  #panelTop = 0;
  #panelTopForFrame = 0;
  #hoverKey: string | null = null;
  #hoverRegion: "label" | "value" | "minus" | "plus" = "label";
  #frameRows: { key: string; screenRow: number; valueColumn: number; valueWidth: number; stepper: boolean }[] = [];
  #menuFrame: { top: number; column: number; width: number; rows: number } | null = null;
  // Invariant: rail hover and drag live in the shared keyed state, as the transcript's do.
  readonly #rails = new ScrollbarRails();
  // Rationale: the rail as drawn in the last frame, or null when nothing can be pointed at.
  #railFrame: { readonly rail: RailPosition; readonly geometry: ScrollbarGeometry; readonly page: number } | null = null;
  // Invariant: a scroll lights the rail until this time; the timer repaints once it has passed.
  #activeUntil = 0;
  #activityTimer: ReturnType<typeof setTimeout> | undefined;
  #renderedScroll: number | undefined;

  constructor(session: OwnedSettingsManager) {
    this.#session = session;
  }

  onActivate(host: AppHostServices): void {
    void this.#session.load().then(() => host.requestRender());
  }

  onClose(_host: AppHostServices): void {
    this.#clearActivityTimer();
    this.#rails.clear();
  }

  render(rect: PaneRect, host: AppHostServices): readonly string[] {
    const theme = host.theme ?? PLAIN_THEME;
    this.#interruptArmed = host.interruptArmed;
    const rows = this.#rows();
    const selected = indexOfKey(rows, this.#selectedKey);
    const footer = this.#footerLines(rect.width, theme);
    const dividerRows = this.#filter === null ? SETTINGS_FOOTER_DIVIDER_ROWS : 0;
    const bodyHeight = Math.max(0, rect.height - SETTINGS_HEADER_ROWS - dividerRows - footer.length);
    this.#bodyTopForFrame = SETTINGS_HEADER_ROWS;
    this.#bodyHeightForFrame = bodyHeight;
    this.#panelTopForFrame = SETTINGS_HEADER_ROWS + bodyHeight + dividerRows;
    this.#panelTop = this.#panelTopForFrame;
    if (this.#selectionNeedsReveal) {
      this.#scroll = scrollForSelection(rows, bodyHeight, this.#scroll, selected, this.#reveal);
      this.#selectionNeedsReveal = false;
    }
    this.#reveal = undefined;

    const layout = layoutList(rows, bodyHeight, this.#scroll);
    this.#scroll = layout.scroll;
    const now = Date.now();
    // Rationale: every way of scrolling ends in this frame, so a moved list is noticed here
    // once rather than at each wheel, drag, key, and search branch.
    if (this.#renderedScroll !== undefined && this.#renderedScroll !== layout.scroll) this.#noteScrollActivity(host, now);
    this.#renderedScroll = layout.scroll;
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
      trackHeight: Math.max(0, bodyHeight - SCROLLBAR_TOP_INSET),
    });
    const presentation = scrollbarPresentation({
      geometry,
      appearance,
      style: this.#scrollbarStyle(),
      hovered: this.#rails.isHovered(RAIL_KEY),
      dragging: this.#rails.isDragging(RAIL_KEY),
      activeUntil: this.#activeUntil,
      now,
    });
    this.#railFrame = reservesRail && geometry !== null
      ? {
        rail: { key: RAIL_KEY, column: rect.width, rowStart: this.#bodyTopForFrame + SCROLLBAR_TOP_INSET, trackHeight: geometry.trackHeight },
        geometry,
        page: layout.visible,
      }
      : null;

    const body: string[] = [];
    this.#frameRows = [];
    if (rows.length === 0) {
      body.push(...renderEmptyState("No settings found.", "👀", bodyHeight, contentWidth, theme));
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

    const withRail = withScrollbarRail(body.slice(0, bodyHeight), geometry, contentWidth, theme, {
      topInset: SCROLLBAR_TOP_INSET,
      presentation,
    });
    const rule = theme.fg("border", "─".repeat(Math.max(0, rect.width)));
    const title = truncateToWidth(` ${theme.bold(theme.fg("accent", "Settings"))}`, rect.width);
    const frame = this.#withMenu(
      [rule, title, ...withRail, ...(dividerRows === 0 ? [] : [rule]), ...footer],
      selected,
      layout,
      valueColumn,
      theme,
      rect,
      reservesRail ? RAIL_COLUMNS : 0,
    );
    return frame.slice(0, rect.height).concat(Array(Math.max(0, rect.height - frame.length)).fill(""));
  }

  onInput(data: string, host: AppHostServices): PaneInputResult {
    if (this.#structured !== null) return this.#structuredKey(data);
    if (this.#menu !== null) return this.#menuKey(data);
    if (this.#filter !== null) return this.#filterKey(data);

    const key = KEYS[data] ?? data;
    const action = SETTINGS_SHORTCUTS.resolve(key, SCOPE);
    if (action === null) return { consumed: false };

    const rows = this.#rows();
    const selected = indexOfKey(rows, this.#selectedKey);
    switch (action) {
      case "close":
        host.close();
        return { consumed: true };
      case "open-filter":
        this.#filter = new LineInput("");
        this.#notice = null;
        return { consumed: true };
      case "activate": {
        const row = rows[selected];
        if (row?.kind === "element" && row.value.structured) this.#openStructured(row.value);
        else this.#cycle(rows, selected, 1);
        return { consumed: true };
      }
      case "move-up":
      case "move-down":
        this.#select(rows, moveSelection(rows, selected, action === "move-down" ? 1 : -1));
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
      default:
        return { consumed: false };
    }
  }

  onMouse(event: PaneMouseEvent, _host: AppHostServices): PaneInputResult {
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
        this.#menu = null;
        return { consumed: true };
      }
      const value = menu.choices[overRow];
      this.#menu = null;
      if (value !== undefined) this.#apply(menu.entry, value);
      return { consumed: true };
    }

    const open = this.#structured;
    if (open !== null) {
      // Invariant: the panel owns the pointer while it is open; its flag rows are the targets.
      // The panel's rows begin one line below its rule.
      const panel = { firstRow: this.#panelTop + 1, rows: open.flags.length, valueColumn: this.#dialogValueColumn };
      const row = event.row - 1 - panel.firstRow;
      if (row < 0 || row >= panel.rows) return { consumed: true, render: false };
      if (event.kind === "motion") {
        if (open.index === row) return { consumed: true, render: false };
        open.index = row;
        return { consumed: true, render: true };
      }
      if (event.kind === "press") {
        open.index = row;
        // Rationale: pointing at the label picks the row; the value is what changes it,
        // exactly as in the list behind the dialog.
        const key = open.flags[row] ?? "";
        const width = displayWidth((open.record[key] ?? false) ? "true" : "false");
        if (dialogRowAt(panel, event.row - 1, event.column, width) !== null) this.#toggleFlag(row);
        return { consumed: true };
      }
      return { consumed: true, render: false };
    }

    if (event.kind === "wheel-up" || event.kind === "wheel-down") {
      // Invariant: the whole list pane owns wheel scrolling, including blank space beside
      // short labels. It must not depend on finding an item under the pointer.
      const screenRow = event.row - 1;
      if (screenRow < this.#bodyTopForFrame || screenRow >= this.#bodyTopForFrame + this.#bodyHeightForFrame) {
        return { consumed: false };
      }
      const distance = scrollbarWheelRows(this.#scrollbarSpeed());
      this.#scroll = Math.max(0, this.#scroll + (event.kind === "wheel-down" ? distance : -distance));
      return { consumed: true };
    }

    const rail = this.#railPointer(event);
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
        this.#notice = null;
        if (this.#hoverRegion === "minus") this.#cycle(rows, index, -1);
        else if (this.#hoverRegion === "plus") this.#cycle(rows, index, 1);
        else if (this.#hoverRegion === "value") this.#openMenu(rows, index);
      }
      return { consumed: true };
    }
    const changed = previousKey !== this.#hoverKey || previousRegion !== this.#hoverRegion || rail.changed;
    return { consumed: event.kind !== "motion", render: changed };
  }

  // Rationale: the rail takes its share of a pointer report first: hover, a thumb drag, or a
  // track page. Owned means the list must not see the report; changed means the rail looks different.
  #railPointer(event: PaneMouseEvent): { readonly owned: boolean; readonly changed: boolean } {
    const frame = this.#railFrame;
    const wasHovered = this.#rails.isHovered(RAIL_KEY);
    if (frame === null) {
      this.#rails.clear();
      return { owned: false, changed: wasHovered };
    }
    const pointer = { column: event.column, row: event.row - 1 };
    if (this.#rails.isDragging(RAIL_KEY)) {
      // Invariant: a drag keeps the pointer wherever it goes until the button comes up.
      if (event.kind === "release") this.#rails.endDrag();
      else {
        const target = this.#rails.dragTo(frame.rail, frame.geometry, pointer);
        if (target !== null) this.#scroll = target;
      }
      return { owned: true, changed: true };
    }
    const over = this.#rails.notePointer([frame.rail], pointer) !== null;
    if (!over) return { owned: false, changed: wasHovered };
    // Invariant: the rail is not a row: pointing at it lights nothing in the list.
    this.#hoverKey = null;
    this.#hoverRegion = "label";
    if (event.kind === "press" && !this.#rails.beginDrag(frame.rail, frame.geometry, pointer)) {
      this.#scroll = scrollForTrackPage(frame.geometry, pointer.row - frame.rail.rowStart, this.#scroll, frame.page);
    }
    return { owned: true, changed: true };
  }

  #noteScrollActivity(host: AppHostServices, now: number): void {
    this.#activeUntil = Math.max(this.#activeUntil, now + SCROLL_LINGER_MS);
    this.#clearActivityTimer();
    this.#activityTimer = setTimeout(() => {
      this.#activityTimer = undefined;
      host.requestRender();
    }, SCROLL_LINGER_REPAINT_MS);
    this.#activityTimer.unref?.();
  }

  #clearActivityTimer(): void {
    if (this.#activityTimer !== undefined) clearTimeout(this.#activityTimer);
    this.#activityTimer = undefined;
  }

  #openMenu(rows: readonly Row[], selected: number): void {
    const row = rows[selected];
    if (row === undefined || row.kind !== "element") return;
    const entry = row.value;
    if (entry.structured) {
      this.#openStructured(entry);
      return;
    }
    const shown = this.#shownValue(entry);
    // Rationale: a number is stepped, not picked from a list: it has its own two controls,
    // and pointing at it is not a request for anything else.
    if (typeof shown === "number") return;
    if (!entry.editable || entry.choices === null || entry.choices.length === 0) {
      this.#notice = `${labelOf(entry)} cannot be changed here`;
      return;
    }
    const current = shown === null ? 0 : Math.max(0, entry.choices.indexOf(shown));
    // Compatibility: pinned SelectList opens on the value currently in effect.
    this.#menu = { entry, current, anchorKey: `${entry.backend}:${entry.id}`, choices: entry.choices, index: current };
  }

  // Rationale: a structured setting opens as its own flag list rather than a value menu.
  #openStructured(entry: OwnedUiSettingsEntry): void {
    // Invariant: the flags come from the declaration, not from the stored value: an unset
    // flag still has a row, showing the default the source would apply.
    if (entry.flags.length === 0) {
      this.#notice = `${labelOf(entry)} has nothing to configure`;
      return;
    }
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
    this.#rails.clear();
    this.#structured = { entry, flags: entry.flags.map(flag => flag.key), index: 0, record };
  }

  #structuredKey(data: string): PaneInputResult {
    const open = this.#structured;
    if (open === null) return { consumed: false };
    switch (SETTINGS_SHORTCUTS.resolve(KEYS[data] ?? data, DIALOG_SCOPE)) {
      case "close":
        this.#structured = null;
        return { consumed: true };
      case "part-previous":
        open.index = Math.max(0, open.index - 1);
        return { consumed: true };
      case "part-next":
        open.index = Math.min(open.flags.length - 1, open.index + 1);
        return { consumed: true };
      case "part-change":
        this.#toggleFlag(open.index);
        return { consumed: true };
      default:
        return { consumed: true, render: false };
    }
  }

  #toggleFlag(index: number): void {
    const open = this.#structured;
    const flag = open?.flags[index];
    if (open === null || open === undefined || flag === undefined) return;
    const declared = open.entry.flags.find(candidate => candidate.key === flag);
    if (declared?.choices === undefined) open.record[flag] = !(open.record[flag] ?? false);
    else {
      // Rationale: Enter walks the offered choices in order and wraps, like the pinned value menu.
      const at = declared.choices.indexOf(String(open.record[flag] ?? declared.fallback));
      open.record[flag] = declared.choices[(at + 1) % declared.choices.length] ?? declared.fallback;
    }
    // Invariant: a choice part at its fallback is unset: it is not written, so the engine's default applies.
    const next = Object.fromEntries(Object.entries(open.record).filter(([key, value]) => {
      const part = open.entry.flags.find(candidate => candidate.key === key);
      return part?.choices === undefined || value !== part.fallback;
    }));
    void this.#session.changeStructured(open.entry.backend, open.entry.id, next).then(outcome => {
      this.#notice = outcome.failure === null ? null : `Could not save ${labelOf(open.entry)}: ${outcome.failure}`;
    });
  }

  #menuKey(data: string): PaneInputResult {
    const menu = this.#menu;
    if (menu === null) return { consumed: false };
    const key = KEYS[data] ?? data;
    if (key === "escape") {
      this.#menu = null;
      return { consumed: true };
    }
    if (key === "up" || key === "down") {
      // Compatibility: the keyboard starts from the value in effect rather than from the top.
      menu.index = menu.index < 0
        ? menu.current
        : Math.min(menu.choices.length - 1, Math.max(0, menu.index + (key === "down" ? 1 : -1)));
    }
    else if (key === "enter") {
      const value = menu.choices[menu.index];
      this.#menu = null;
      if (value !== undefined) this.#apply(menu.entry, value);
    }
    return { consumed: true };
  }

  #filterKey(data: string): PaneInputResult {
    const input = this.#filter;
    if (input === null) return { consumed: false };

    const key = KEYS[data];
    // Rationale: the boundary chords jump through the results; plain Home and End stay with
    // the search cursor, which the shared line input moves below.
    if (key === "ctrl+home" || key === "ctrl+end") {
      const rows = this.#rows();
      const selectable = selectableIndexes(rows);
      const target = key === "ctrl+end" ? selectable.at(-1) : selectable[0];
      if (target !== undefined) {
        this.#select(rows, target);
        if (key === "ctrl+home") this.#scroll = 0;
      }
      return { consumed: true };
    }
    if (key === "up" || key === "down" || key === "shift+up" || key === "shift+down") {
      const rows = this.#rows();
      // Rationale: nothing found means nothing to move through; the key is still swallowed
      // rather than typed into the search.
      if (selectableIndexes(rows).length === 0) return { consumed: true, render: false };
      const selected = indexOfKey(rows, this.#selectedKey);
      const forward = key === "down" || key === "shift+down";
      if (key === "shift+up" || key === "shift+down") {
        const target = blockJumpTarget(rows, selected, forward ? 1 : -1);
        if (target !== undefined) this.#jump(rows, target);
        return { consumed: true };
      }
      this.#select(rows, moveSelection(rows, selected, forward ? 1 : -1));
      return { consumed: true };
    }

    const outcome = handleLineInputKey(input, data);
    if (outcome.kind === "cancelled") this.#filter = null;
    this.#scroll = 0;
    return { consumed: true };
  }

  #cycle(rows: readonly Row[], selected: number, delta: -1 | 1): void {
    const row = rows[selected];
    if (row === undefined || row.kind !== "element") return;
    const entry = row.value;
    if (!entry.editable) {
      this.#notice = `${labelOf(entry)} cannot be changed here`;
      return;
    }
    const shown = this.#shownValue(entry);
    if (typeof shown === "number") {
      // Rationale: at the end of the range there is nothing to say: the arrow already reads
      // as unavailable, so a message would only repeat it.
      const next = steppedValue(rangeOf(entry), shown, delta);
      if (next !== null) this.#apply(entry, next);
      return;
    }
    const choices = entry.choices;
    if (choices === null || choices.length === 0) {
      this.#notice = `${labelOf(entry)} cannot be changed here`;
      return;
    }
    const current = shown === null ? -1 : choices.indexOf(shown);
    const next = choices[current < 0
      ? (delta > 0 ? 0 : choices.length - 1)
      : (current + delta + choices.length) % choices.length];
    if (next !== undefined) this.#apply(entry, next);
  }

  #apply(entry: OwnedUiSettingsEntry, value: OwnedUiSettingValue): void {
    const key = `${entry.backend}:${entry.id}`;
    // Invariant: shown immediately so the row never lags a keypress, and so the next press
    // steps from here rather than from a value the source has not caught up to.
    this.#pending.set(key, value);
    void this.#session.change(entry.backend, entry.id, value).then(outcome => {
      if (outcome.failure !== null || outcome.status === "failed") {
        this.#pending.delete(key);
        this.#notice = `Could not save ${labelOf(entry)}: ${outcome.failure ?? "the effect failed"}`;
        return;
      }
      if (outcome.status === "unavailable" || outcome.limitationReason !== null) {
        this.#pending.delete(key);
        this.#notice = outcome.limitationReason ?? `${labelOf(entry)} is unavailable`;
        return;
      }
      // Concurrency: a later press may have moved on; only the last request clears itself.
      if (this.#pending.get(key) === value) this.#pending.delete(key);
      this.#notice = outcome.status === "deferred" && outcome.application !== null
        ? `${labelOf(entry)} is stored and applies ${applicationLabel(outcome.application)}`
        : null;
    });
  }

  #shownValue(entry: OwnedUiSettingsEntry): OwnedUiSettingValue | null {
    return this.#pending.get(`${entry.backend}:${entry.id}`) ?? entry.value;
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
    return entry === undefined ? this.#session.value(id) : this.#shownValue(entry);
  }

  #jump(rows: readonly Row[], target: number): void {
    this.#select(rows, target);
    this.#reveal = blockRowSpan(rows, target);
  }

  #select(rows: readonly Row[], index: number): void {
    if (index < 0) return;
    this.#selectedKey = rowKey(rows[index]);
    this.#selectionNeedsReveal = true;
    this.#notice = null;
  }

  #rows(): readonly Row[] {
    const needle = this.#filter?.value.trim().toLowerCase() ?? "";
    const matches = (entry: OwnedUiSettingsEntry): boolean =>
      needle.length === 0
      || entry.id.toLowerCase().includes(needle)
      || labelOf(entry).toLowerCase().includes(needle);

    const rows: Row[] = [];
    for (const section of this.#session.sections()) {
      // Rationale: a section named by the search is what the reader asked for, so it arrives
      // whole rather than narrowed to the entries that happen to repeat its name.
      const named = needle.length > 0 && section.title.toLowerCase().includes(needle);
      const entries = named ? section.entries : section.entries.filter(matches);
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
    if (this.#filter !== null && rows.length > 0) rows.push({ kind: "spacer" });
    return rows;
  }

  #valueColumn(rows: readonly Row[]): number {
    const shown = rows.flatMap(row => (row.kind === "element" ? [this.#viewRow(row.value)] : []));
    return valueColumnFor(shown);
  }

  #header(title: string, theme: UiTheme, width: number): string {
    if (width < SETTINGS_CONTENT_INSET) return "";
    return ` ${renderGroupHeader(humanizeTitle(title), width - SETTINGS_CONTENT_INSET, theme)}`;
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
    const shown = this.#shownValue(entry);
    const value = entry.structured
      ? CONFIGURE
      : shown === null
        ? describeRaw(entry.rawValue)
        : effectiveDisplay(entry, shown);
    const range = rangeOf(entry);
    return {
      key: `${entry.backend}:${entry.id}`,
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
      this.#menuFrame = null;
      return lines;
    }

    const state = {
      choices: menu.choices.map(choice => displayValue(choice)),
      current: this.#shownValue(menu.entry) === null ? null : displayValue(this.#shownValue(menu.entry)!),
      index: menu.index,
    };
    const frame = valueMenuFrame(state, { screenRow: anchor.screenRow, valueColumn }, {
      bodyTop: this.#bodyTopForFrame,
      bodyHeight: this.#bodyHeightForFrame,
      surfaceWidth: rect.width,
      reservedRight,
    });
    this.#menuFrame = frame;
    return renderValueMenu(lines, state, frame, theme);
  }

  #dialogLines(open: StructuredEdit, width: number, theme: UiTheme): readonly string[] {
    const rows = open.flags.map(key => {
      const declared = open.entry.flags.find(flag => flag.key === key);
      return {
        label: declared?.label ?? humanizeLabel(key),
        // Protocol: the engine writes toggles as the booleans they are rather than as yes/no; a choice shows its word.
        value: declared?.choices === undefined ? ((open.record[key] ?? false) ? "true" : "false") : String(open.record[key] ?? declared.fallback),
        ...(declared?.description === undefined ? {} : { description: declared.description }),
      };
    });
    this.#dialogValueColumn = dialogValueColumn(rows);
    this.#panelTop = this.#panelTopForFrame;
    return renderDialogPanel({ rows, index: open.index, hint: SETTINGS_SHORTCUTS.hint(DIALOG_SCOPE) }, width, theme);
  }

  #footerLines(width: number, theme: UiTheme): readonly string[] {
    const open = this.#structured;
    if (open !== null) return this.#dialogLines(open, width, theme);

    const hint = this.#interruptArmed ? "press ctrl+c again to exit a1" : SETTINGS_SHORTCUTS.hint(SCOPE);
    const report = statusText({ hint, report: this.#notice });
    const status = truncateToWidth(`${width > 0 ? " " : ""}${theme.fg("dim", report)}`, width);
    const input = this.#filter;
    if (input === null) return [status];
    const inputWidth = Math.max(0, width - SETTINGS_CONTENT_INSET);
    const lines = renderInputRow(input, inputWidth, { placeholder: SEARCH_PLACEHOLDER, ruled: false, theme }).lines;
    return [width > 0 ? ` ${lines[0] ?? ""}` : "", status];
  }
}


/** The source's own wording when it has one, otherwise the id made readable. */
function labelOf(entry: OwnedUiSettingsEntry): string {
  return entry.label ?? humanizeLabel(entry.id);
}

function isStepper(entry: OwnedUiSettingsEntry, shown: OwnedUiSettingValue | null = entry.value): boolean {
  return typeof shown === "number" && entry.editable;
}

/** Where a setting's number may go: what the engine states, or what it offers. */
function rangeOf(entry: OwnedUiSettingsEntry): NumericRange {
  return { minimum: entry.minimum, maximum: entry.maximum, values: numericValues(entry.choices) };
}

/** Booleans read as yes and no; everything else prints as itself. */
function displayValue(value: OwnedUiSettingValue): string {
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

function effectiveDisplay(entry: OwnedUiSettingsEntry, stored: OwnedUiSettingValue): string {
  const effective = entry.effectiveValue;
  if (effective === stored) return displayValue(stored);
  const shownEffective = typeof effective === "string" || typeof effective === "number" || typeof effective === "boolean"
    ? displayValue(effective)
    : describeRaw(effective);
  return `${displayValue(stored)} (effective ${shownEffective}; ${applicationLabel(entry.application)})`;
}

function applicationLabel(application: OwnedUiSettingsEntry["application"]): string {
  switch (application) {
    case "live": return "live";
    case "next-session": return "in the next session";
    case "next-start": return "on the next start";
    case "current-exit": return "when the current session exits";
  }
}

function describeRaw(value: unknown): string {
  if (value === null || value === undefined) return "unset";
  if (typeof value === "object") return Array.isArray(value) ? `${value.length} items` : "structured value";
  return String(value);
}

function isScrollbarSpeed(value: OwnedUiSettingValue | null): value is ScrollbarSpeed {
  return value === "normal" || value === "fast" || value === "high";
}
