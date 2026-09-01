import type { AppHostServices, UiApp } from "../../ui/apps/index.js";
import type { ListViewRow, NumericRange } from "../../ui/components/index.js";
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
  renderListRow,
  renderNote,
  dialogRowAt,
  menuRowAt,
  regionAt,
  renderValueMenu,
  withScrollbarRail,
  stepperEnds,
  steppedValue,
  valueColumnFor,
  valueMenuFrame,
  caretCell,
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
  scrollbarGeometry,
  selectableIndexes,
  type ListRow,
  type ListRowSpan,
  type PaneInputResult,
  type PaneMouseEvent,
  type PaneRect,
  type UiTheme,
  truncateToWidth,
} from "../../ui/components/index.js";
import type {
  OwnedUiSettingValue,
  OwnedUiSettingsEntry,
  OwnedUiSettingsSession,
} from "../../ui/settings/index.js";

export const SETTINGS_APP_ID = "settings";
export const SETTINGS_ROUTE = "settings";
const SCOPE = SETTINGS_APP_ID;
/** The panel a setting with parts opens: its own keys, its own hint. */
const DIALOG_SCOPE = `${SETTINGS_APP_ID}-parts`;
const SCROLLBAR_TOP_INSET = 1;
/** What a structured value offers instead of printing itself. */
const CONFIGURE = "configure";

type Action =
  | "move-up" | "move-down" | "block-up" | "block-down" | "first" | "last"
  | "page-up" | "page-down" | "previous-value" | "next-value" | "activate" | "open-filter" | "close"
  | "part-previous" | "part-next" | "part-change";

export const SETTINGS_SHORTCUTS = new ShortcutRegistry<Action>();
SETTINGS_SHORTCUTS.declare({ key: "/", scope: SCOPE, description: "Search settings", section: "Change" }, "open-filter");
SETTINGS_SHORTCUTS.declare({ key: "printable", scope: SCOPE, description: "Type to search settings", section: "Change", hint: { keys: "Type", does: "to search" } }, "open-filter");
SETTINGS_SHORTCUTS.declare({ key: "up", scope: SCOPE, description: "Previous setting", section: "Navigate" }, "move-up");
SETTINGS_SHORTCUTS.declare({ key: "down", scope: SCOPE, description: "Next setting", section: "Navigate" }, "move-down");
SETTINGS_SHORTCUTS.declare({ key: "shift+up", scope: SCOPE, description: "Previous section", section: "Navigate" }, "block-up");
SETTINGS_SHORTCUTS.declare({ key: "shift+down", scope: SCOPE, description: "Next section", section: "Navigate" }, "block-down");
SETTINGS_SHORTCUTS.declare({ key: "pageUp", scope: SCOPE, description: "Up a page", section: "Navigate" }, "page-up");
SETTINGS_SHORTCUTS.declare({ key: "pageDown", scope: SCOPE, description: "Down a page", section: "Navigate" }, "page-down");
SETTINGS_SHORTCUTS.declare({ key: "home", scope: SCOPE, description: "First setting", section: "Navigate" }, "first");
SETTINGS_SHORTCUTS.declare({ key: "end", scope: SCOPE, description: "Last setting", section: "Navigate" }, "last");
SETTINGS_SHORTCUTS.declare({ key: "enter", scope: SCOPE, description: "Change value", section: "Change", hint: { keys: "Enter/Space", does: "to change" } }, "activate");
SETTINGS_SHORTCUTS.declare({ key: "space", scope: SCOPE, description: "Change value", section: "Change", hint: { keys: "Enter/Space", does: "to change" } }, "activate");
SETTINGS_SHORTCUTS.declare({ key: "left", scope: SCOPE, description: "Previous value", section: "Change" }, "previous-value");
SETTINGS_SHORTCUTS.declare({ key: "right", scope: SCOPE, description: "Next value", section: "Change" }, "next-value");
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
  "\u001b[H": "home",
  "\u001b[F": "end",
  "\u001b": "escape",
  "\r": "enter",
  "\n": "enter",
  " ": "space",
  "/": "/",
};

type Row = ListRow<OwnedUiSettingsEntry>;

/** A structured setting being edited: its flags, the row in hand, and their values. */
interface StructuredEdit {
  readonly entry: OwnedUiSettingsEntry;
  readonly flags: readonly string[];
  index: number;
  readonly record: Record<string, boolean>;
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
  readonly #session: OwnedUiSettingsSession;
  #selectedKey: string | undefined;
  #scroll = 0;
  // Invariant: keyboard navigation requests visibility once; pointer scrolling then stays free.
  #selectionNeedsReveal = true;
  #reveal: ListRowSpan | undefined;
  #notice: string | null = null;
  #filter: LineInput | null = null;
  #menu: ValueMenu | null = null;
  #structured: StructuredEdit | null = null;
  #loading = true;
  #interruptArmed = false;
  // Invariant: pending values remain visible until the source reflects them.
  readonly #pending = new Map<string, OwnedUiSettingValue>();
  #footerHeight = 1;
  #dialogValueColumn = 0;
  #panelTop = 0;
  #panelTopForFrame = 0;
  #hoverKey: string | null = null;
  #hoverRegion: "label" | "value" | "minus" | "plus" = "label";
  #frameRows: { key: string; screenRow: number; valueColumn: number; valueWidth: number; stepper: boolean }[] = [];
  #menuFrame: { top: number; column: number; width: number; rows: number } | null = null;

  constructor(session: OwnedUiSettingsSession) {
    this.#session = session;
  }

  onActivate(host: AppHostServices): void {
    void this.#session.load().then(() => {
      this.#loading = false;
      host.requestRender();
    });
  }

  render(rect: PaneRect, host: AppHostServices): readonly string[] {
    const theme = host.theme ?? PLAIN_THEME;
    this.#interruptArmed = host.interruptArmed;
    const rows = this.#rows();
    const selected = indexOfKey(rows, this.#selectedKey);
    const selectedRow = rows[selected];
    const selectedEntry = selectedRow?.kind === "element" ? selectedRow.value : undefined;
    const footer = this.#footerLines(rect.width, theme, selectedEntry);
    this.#footerHeight = footer.length;
    this.#panelTopForFrame = Math.max(0, rect.height - footer.length);
    this.#panelTop = this.#panelTopForFrame;
    const bodyHeight = Math.max(0, rect.height - footer.length);
    if (this.#selectionNeedsReveal) {
      this.#scroll = scrollForSelection(rows, bodyHeight, this.#scroll, selected, this.#reveal);
      this.#selectionNeedsReveal = false;
    }
    this.#reveal = undefined;

    const layout = layoutList(rows, bodyHeight, this.#scroll);
    this.#scroll = layout.scroll;
    const contentWidth = Math.max(0, rect.width - RAIL_COLUMNS);
    const valueColumn = this.#valueColumn(rows);
    const geometry = scrollbarGeometry({
      contentLength: rows.length,
      viewportHeight: layout.visible,
      scroll: layout.scroll,
      trackHeight: Math.max(0, bodyHeight - SCROLLBAR_TOP_INSET),
    });

    const body: string[] = [];
    this.#frameRows = [];
    if (rows.length === 0) {
      const message = this.#loading ? "Loading settings…" : "No settings found.";
      body.push(...renderEmptyState(message, "👀", bodyHeight, contentWidth, theme));
    } else {
      if (layout.topPadding > 0) body.push("");
      if (layout.stickyHeader !== undefined) body.push(this.#header(layout.stickyHeader, theme, contentWidth));
      for (const index of layout.rowIndexes) {
        const row = rows[index];
        if (row !== undefined && row.kind === "element") {
          const view = this.#viewRow(row.value);
          this.#frameRows.push({
            key: view.key,
            screenRow: body.length,
            valueColumn,
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
    });
    return this.#withMenu([...withRail, ...footer], selected, layout, valueColumn, theme, rect);
  }

  onInput(data: string, host: AppHostServices): PaneInputResult {
    if (this.#structured !== null) return this.#structuredKey(data);
    if (this.#menu !== null) return this.#menuKey(data);
    if (this.#filter !== null) return this.#filterKey(data);

    // Compatibility: pinned SettingsList searches as soon as printable text is entered. `/`
    // remains an explicit shortcut, while the printable declaration keeps the
    // dispatched action and its reader-facing hint under one authority.
    const key = KEYS[data] ?? (data.length === 1 && data >= "!" && data !== "\u007f" ? "printable" : data);
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
        return key === "printable" ? this.#filterKey(data) : { consumed: true };
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
      if (event.row < 1 || event.row > this.#panelTopForFrame) return { consumed: false };
      this.#scroll = Math.max(0, this.#scroll + (event.kind === "wheel-down" ? 8 : -8));
      return { consumed: true };
    }

    const row = this.#frameRows.find(candidate => candidate.screenRow === event.row - 1);
    const previousKey = this.#hoverKey;
    const previousRegion = this.#hoverRegion;

    if (row === undefined) {
      this.#hoverKey = null;
      this.#hoverRegion = "label";
      return { consumed: event.kind !== "motion", render: previousKey !== null };
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
    const changed = previousKey !== this.#hoverKey || previousRegion !== this.#hoverRegion;
    return { consumed: event.kind !== "motion", render: changed };
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
    const record: Record<string, boolean> = {};
    for (const flag of entry.flags) {
      const value = stored[flag.key];
      record[flag.key] = typeof value === "boolean" ? value : flag.fallback;
    }
    // Invariant: the dialog takes the screen: the row it was opened from stops being the
    // thing under the pointer, so it stops looking like it.
    this.#hoverKey = null;
    this.#hoverRegion = "label";
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
    open.record[flag] = !(open.record[flag] ?? false);
    const next = { ...open.record };
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
    if (key === "home" || key === "end") {
      const rows = this.#rows();
      const selectable = selectableIndexes(rows);
      const target = key === "end" ? selectable.at(-1) : selectable[0];
      if (target !== undefined) {
        this.#select(rows, target);
        if (key === "home") this.#scroll = 0;
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
    if (row === undefined || row.kind === "spacer") return "";
    if (row.kind === "group") return this.#header(row.title, theme, width);
    if (row.kind === "note") return renderNote(row.text, width, theme);

    const entry = row.value;
    const key = `${entry.backend}:${entry.id}`;
    const hovered = this.#hoverKey === key;
    return renderListRow(this.#viewRow(entry), { selected, hovered, region: this.#hoverRegion }, valueColumn, width, theme);
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
      bodyHeight: lines.length - this.#footerHeight,
      surfaceWidth: rect.width,
      reservedRight: RAIL_COLUMNS,
    });
    this.#menuFrame = frame;
    return renderValueMenu(lines, state, frame, theme);
  }

  #dialogLines(open: StructuredEdit, width: number, theme: UiTheme): readonly string[] {
    const rows = open.flags.map(key => {
      const declared = open.entry.flags.find(flag => flag.key === key);
      return {
        label: declared?.label ?? humanizeLabel(key),
        // Protocol: the engine writes these as the booleans they are rather than as yes/no.
        value: (open.record[key] ?? false) ? "true" : "false",
        ...(declared?.description === undefined ? {} : { description: declared.description }),
      };
    });
    this.#dialogValueColumn = dialogValueColumn(rows);
    this.#panelTop = this.#panelTopForFrame;
    return renderDialogPanel({ rows, index: open.index, hint: SETTINGS_SHORTCUTS.hint(DIALOG_SCOPE) }, width, theme);
  }

  #footerLines(width: number, theme: UiTheme, selected?: OwnedUiSettingsEntry): readonly string[] {
    const open = this.#structured;
    if (open !== null) return this.#dialogLines(open, width, theme);

    const hint = this.#interruptArmed
      ? "press ctrl+c again to exit A1"
      : `  ${SETTINGS_SHORTCUTS.hint(SCOPE)}`;
    const report = this.#notice;
    const statusText = report === null ? hint : `  ${report}`;
    const status = truncateToWidth(
      report?.startsWith("Could not save") === true ? theme.fg("error", statusText) : theme.fg("dim", statusText),
      width,
    );
    const description = selected?.description?.trim();
    const details = description
      ? ["", ...wrapSettingDescription(description, Math.max(1, width - 4)).map(line => theme.fg("dim", `  ${line}`)), ""]
      : [];
    const input = this.#filter;
    if (input === null) return [...details, status];
    return [...details, renderPinnedSettingsSearch(input, width), status];
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

function renderPinnedSettingsSearch(input: LineInput, width: number): string {
  const available = Math.max(0, width - 2);
  const view = input.view(available);
  const before = view.text.slice(0, view.caretColumn);
  const at = view.text.slice(view.caretColumn, view.caretColumn + 1) || " ";
  const after = view.text.slice(view.caretColumn + at.length);
  const row = `> ${before}${caretCell(at)}${after}`;
  return `${row}${" ".repeat(Math.max(0, width - displayWidth(row)))}`;
}

function wrapSettingDescription(text: string, width: number): readonly string[] {
  const words = text.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line.length === 0) {
      line = word;
      continue;
    }
    if (displayWidth(`${line} ${word}`) <= width) {
      line += ` ${word}`;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line.length > 0) lines.push(line);
  return lines;
}
