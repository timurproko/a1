import type { AppHostServices, UiApp } from "../../foundation/ui-apps/index.js";
import {
  GLOBAL_SCOPE,
  LineInput,
  PLAIN_THEME,
  ShortcutRegistry,
  blockJumpTarget,
  blockRowSpan,
  displayWidth,
  handleLineInputKey,
  humanizeLabel,
  humanizeTitle,
  indexOfKey,
  isThumbRow,
  lastBlockTarget,
  layoutList,
  moveSelection,
  padToWidth,
  rowKey,
  scrollForSelection,
  overlaySpan,
  scrollbarGeometry,
  selectableIndexes,
  truncateToWidth,
  type ListRow,
  type ListRowSpan,
  type PaneInputResult,
  type PaneMouseEvent,
  type PaneRect,
  type UiTheme,
} from "../../foundation/ui-components/index.js";
import type {
  OwnedUiSettingValue,
  OwnedUiSettingsEntry,
  OwnedUiSettingsSession,
} from "../../foundation/owned-ui-settings/index.js";

export const SETTINGS_APP_ID = "settings";
export const SETTINGS_ROUTE = "settings";
const SCOPE = SETTINGS_APP_ID;
const SCROLLBAR_TOP_INSET = 1;
const RAIL_COLUMNS = 2;
const HINT = "/ search • ↑↓ navigate • shift+↑↓ block • enter change/edit • ←→ adjust • esc close";
const SEARCH_PLACEHOLDER = "search settings";
/** Columns a number stepper hangs to the left of the value column. */
const STEPPER_RESERVE = 2;

type Action =
  | "move-up" | "move-down" | "block-up" | "block-down" | "first" | "last"
  | "page-up" | "page-down" | "previous-value" | "next-value" | "open-menu" | "open-filter" | "close";

export const SETTINGS_SHORTCUTS = new ShortcutRegistry<Action>();
SETTINGS_SHORTCUTS.declare({ key: "up", scope: SCOPE, description: "Previous setting", section: "Navigate" }, "move-up");
SETTINGS_SHORTCUTS.declare({ key: "down", scope: SCOPE, description: "Next setting", section: "Navigate" }, "move-down");
SETTINGS_SHORTCUTS.declare({ key: "shift+up", scope: SCOPE, description: "Previous section", section: "Navigate" }, "block-up");
SETTINGS_SHORTCUTS.declare({ key: "shift+down", scope: SCOPE, description: "Next section", section: "Navigate" }, "block-down");
SETTINGS_SHORTCUTS.declare({ key: "pageUp", scope: SCOPE, description: "Up a page", section: "Navigate" }, "page-up");
SETTINGS_SHORTCUTS.declare({ key: "pageDown", scope: SCOPE, description: "Down a page", section: "Navigate" }, "page-down");
SETTINGS_SHORTCUTS.declare({ key: "home", scope: SCOPE, description: "First setting", section: "Navigate" }, "first");
SETTINGS_SHORTCUTS.declare({ key: "end", scope: SCOPE, description: "Last setting", section: "Navigate" }, "last");
SETTINGS_SHORTCUTS.declare({ key: "left", scope: SCOPE, description: "Previous value", section: "Change" }, "previous-value");
SETTINGS_SHORTCUTS.declare({ key: "right", scope: SCOPE, description: "Next value", section: "Change" }, "next-value");
SETTINGS_SHORTCUTS.declare({ key: "enter", scope: SCOPE, description: "Open value menu", section: "Change" }, "open-menu");
SETTINGS_SHORTCUTS.declare({ key: "/", scope: SCOPE, description: "Search settings", section: "Change" }, "open-filter");
SETTINGS_SHORTCUTS.declare({ key: "escape", scope: GLOBAL_SCOPE, description: "Close", section: "Screen" }, "close");

const KEYS: Readonly<Record<string, string>> = {
  "[A": "up",
  "[B": "down",
  "[1;2A": "shift+up",
  "[1;2B": "shift+down",
  "[D": "left",
  "[C": "right",
  "[5~": "pageUp",
  "[6~": "pageDown",
  "[H": "home",
  "[F": "end",
  "": "escape",
  "\r": "enter",
  "\n": "enter",
  "/": "/",
};

type Row = ListRow<OwnedUiSettingsEntry>;

interface ValueMenu {
  readonly entry: OwnedUiSettingsEntry;
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
  #reveal: ListRowSpan | undefined;
  #notice: string | null = null;
  #filter: LineInput | null = null;
  #menu: ValueMenu | null = null;
  #loading = true;
  #interruptArmed = false;
  #footerHeight = 1;
  /** Row key under the pointer, and where each row was drawn last frame. */
  #hoverKey: string | null = null;
  #hoverRegion: "label" | "value" | "minus" | "plus" = "label";
  #frameRows: { key: string; screenRow: number; valueColumn: number; valueWidth: number; stepper: boolean }[] = [];
  /** Where the value menu was drawn last frame, for hit testing. */
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
    const footer = this.#footerLines(rect.width, theme);
    this.#footerHeight = footer.length;
    const bodyHeight = Math.max(0, rect.height - footer.length);
    const selected = indexOfKey(rows, this.#selectedKey);
    this.#scroll = scrollForSelection(rows, bodyHeight, this.#scroll, selected, this.#reveal);
    this.#reveal = undefined;

    const layout = layoutList(rows, bodyHeight, this.#scroll);
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
      const middle = Math.floor(bodyHeight / 2);
      for (let index = 0; index < bodyHeight; index++) {
        body.push(index === middle - 1
          ? centered(theme.fg("muted", "👀"), "👀", contentWidth)
          : index === middle ? centered(theme.fg("muted", message), message, contentWidth) : "");
      }
    } else {
      if (layout.topPadding > 0) body.push("");
      if (layout.stickyHeader !== undefined) body.push(this.#header(layout.stickyHeader, theme, contentWidth));
      for (const index of layout.rowIndexes) {
        const row = rows[index];
        if (row !== undefined && row.kind === "element") {
          this.#frameRows.push({
            key: `${row.value.backend}:${row.value.id}`,
            screenRow: body.length,
            valueColumn,
            valueWidth: row.value.value === null ? 0 : displayWidth(displayValue(row.value.value)),
            stepper: isStepper(row.value),
          });
        }
        body.push(this.#renderRow(row, index === selected, contentWidth, valueColumn, theme));
      }
      while (body.length < bodyHeight) body.push("");
    }

    const withRail = body.slice(0, bodyHeight).map((line, offset) => {
      const cell = offset < SCROLLBAR_TOP_INSET || geometry === null
        ? " "
        : isThumbRow(geometry, offset - SCROLLBAR_TOP_INSET) ? theme.fg("accent", "│") : theme.fg("dim", "│");
      return `${padVisible(line, contentWidth)} ${cell}`;
    });
    return this.#withMenu([...withRail, ...footer], selected, layout, valueColumn, theme, rect);
  }

  onInput(data: string, host: AppHostServices): PaneInputResult {
    if (this.#menu !== null) return this.#menuKey(data);
    if (this.#filter !== null) return this.#filterKey(data);

    const action = SETTINGS_SHORTCUTS.resolve(KEYS[data] ?? data, SCOPE);
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
      case "open-menu":
        this.#openMenu(rows, selected);
        return { consumed: true };
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
        const target = action === "last" ? lastBlockTarget(rows) : selectableIndexes(rows)[0];
        if (target !== undefined) this.#jump(rows, target);
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
      const overRow = event.row - 1 - frame.top;
      const overMenu = overRow >= 0
        && overRow < frame.rows
        && event.column > frame.column
        && event.column <= frame.column + frame.width;
      if (event.kind === "motion") {
        // The pointer drives the highlight, so the row under it is the one that lights up.
        if (!overMenu || menu.index === overRow) return { consumed: true, render: false };
        menu.index = overRow;
        return { consumed: true, render: true };
      }
      if (event.kind !== "press") return { consumed: true, render: false };
      const menuRow = overRow;
      if (!overMenu) {
        // A press anywhere else dismisses the menu rather than acting through it.
        this.#menu = null;
        return { consumed: true };
      }
      const value = menu.choices[menuRow];
      this.#menu = null;
      if (value !== undefined) this.#apply(menu.entry, value);
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
    // The minus sits in the reserved space before the value; the plus after it.
    // The label is a label: pointing at it selects nothing and changes nothing.
    // Only the value area acts, and only a numeric row has stepper buttons.
    const valueStart = row.valueColumn + 1;
    const valueEnd = valueStart + row.valueWidth;
    const column = event.column;
    this.#hoverRegion = column >= valueStart && column <= valueEnd
      ? "value"
      : row.stepper && column >= valueStart - STEPPER_RESERVE && column < valueStart
        ? "minus"
        : row.stepper && column > valueEnd && column <= valueEnd + STEPPER_RESERVE
          ? "plus"
          : "label";

    if (event.kind === "press") {
      const rows = this.#rows();
      const index = rows.findIndex(candidate => rowKey(candidate) === row.key);
      if (index >= 0) {
        // The pointer acts where it points; the arrow belongs to the keyboard.
        this.#notice = null;
        if (this.#hoverRegion === "minus") this.#cycle(rows, index, -1);
        else if (this.#hoverRegion === "plus") this.#cycle(rows, index, 1);
        else if (this.#hoverRegion === "value") this.#openMenu(rows, index);
      }
      return { consumed: true };
    }
    if (event.kind === "wheel-up" || event.kind === "wheel-down") {
      this.#scroll = Math.max(0, this.#scroll + (event.kind === "wheel-down" ? 3 : -3));
      return { consumed: true };
    }
    const changed = previousKey !== this.#hoverKey || previousRegion !== this.#hoverRegion;
    return { consumed: event.kind !== "motion", render: changed };
  }

  #openMenu(rows: readonly Row[], selected: number): void {
    const row = rows[selected];
    if (row === undefined || row.kind !== "element") return;
    const entry = row.value;
    if (!entry.editable || entry.choices === null || entry.choices.length === 0) {
      this.#notice = `${humanizeLabel(entry.id)} cannot be changed here`;
      return;
    }
    const current = entry.value === null ? 0 : Math.max(0, entry.choices.indexOf(entry.value));
    this.#menu = { entry, anchorKey: `${entry.backend}:${entry.id}`, choices: entry.choices, index: current };
  }

  #menuKey(data: string): PaneInputResult {
    const menu = this.#menu;
    if (menu === null) return { consumed: false };
    const key = KEYS[data] ?? data;
    if (key === "escape") {
      this.#menu = null;
      return { consumed: true };
    }
    if (key === "up") menu.index = Math.max(0, menu.index - 1);
    else if (key === "down") menu.index = Math.min(menu.choices.length - 1, menu.index + 1);
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
      this.#notice = `${humanizeLabel(entry.id)} cannot be changed here`;
      return;
    }
    if (typeof entry.value === "number") {
      this.#apply(entry, entry.value + delta);
      return;
    }
    const choices = entry.choices;
    if (choices === null || choices.length === 0) {
      this.#notice = `${humanizeLabel(entry.id)} cannot be changed here`;
      return;
    }
    const current = entry.value === null ? -1 : choices.indexOf(entry.value);
    const next = choices[current < 0
      ? (delta > 0 ? 0 : choices.length - 1)
      : (current + delta + choices.length) % choices.length];
    if (next !== undefined) this.#apply(entry, next);
  }

  #apply(entry: OwnedUiSettingsEntry, value: OwnedUiSettingValue): void {
    void this.#session.change(entry.backend, entry.id, value).then(outcome => {
      this.#notice = outcome.failure !== null
        ? `Could not save ${humanizeLabel(entry.id)}: ${outcome.failure}`
        : outcome.pendingRestart
          ? `${humanizeLabel(entry.id)} applies on the next start`
          : null;
    });
  }

  #jump(rows: readonly Row[], target: number): void {
    this.#select(rows, target);
    this.#reveal = blockRowSpan(rows, target);
  }

  #select(rows: readonly Row[], index: number): void {
    if (index < 0) return;
    this.#selectedKey = rowKey(rows[index]);
    this.#notice = null;
  }

  #rows(): readonly Row[] {
    const needle = this.#filter?.value.trim().toLowerCase() ?? "";
    const matches = (entry: OwnedUiSettingsEntry): boolean =>
      needle.length === 0
      || entry.id.toLowerCase().includes(needle)
      || humanizeLabel(entry.id).toLowerCase().includes(needle);

    const rows: Row[] = [];
    for (const section of this.#session.sections()) {
      const entries = section.entries.filter(matches);
      if (needle.length > 0 && entries.length === 0) continue;
      if (rows.length > 0) rows.push({ kind: "spacer" });
      rows.push({ kind: "group", group: section.id, title: section.title });
      if (section.unavailableReason !== null) {
        rows.push({ kind: "note", group: section.id, text: section.unavailableReason });
        continue;
      }
      if (section.readOnlyReason !== null && needle.length === 0) {
        rows.push({ kind: "note", group: section.id, text: section.readOnlyReason });
      }
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
    let widest = 0;
    let hasStepper = false;
    for (const row of rows) {
      if (row.kind !== "element") continue;
      widest = Math.max(widest, displayWidth(humanizeLabel(row.value.id)));
      if (isStepper(row.value)) hasStepper = true;
    }
    // Prefix, indent, widest label, gap, plus the stepper prefix reserved for
    // every row so a number does not shift its own value out of the column.
    return 2 + 2 + widest + 2 + (hasStepper ? STEPPER_RESERVE : 0);
  }

  #header(title: string, theme: UiTheme, width: number): string {
    return truncateToWidth(theme.fg("accent", theme.bold(humanizeTitle(title))), width);
  }

  #renderRow(row: Row | undefined, selected: boolean, width: number, valueColumn: number, theme: UiTheme): string {
    if (row === undefined || row.kind === "spacer") return "";
    if (row.kind === "group") return this.#header(row.title, theme, width);
    if (row.kind === "note") return truncateToWidth(theme.fg("muted", `    ${row.text}`), width);

    const entry = row.value;
    const label = humanizeLabel(entry.id);
    const prefix = selected ? theme.fg("accent", "→ ") : "  ";
    const leftRaw = `${selected ? "→ " : "  "}  ${label}`;
    const left = `${prefix}  ${theme.fg(selected ? "accent" : "text", label)}`;
    const gap = Math.max(2, valueColumn - displayWidth(leftRaw));
    const raw = entry.value === null ? describeRaw(entry.rawValue) : displayValue(entry.value);
    const key = `${entry.backend}:${entry.id}`;
    const hovered = this.#hoverKey === key;
    // The stepper is an affordance, not decoration: it appears under the pointer.
    const stepper = isStepper(entry) && hovered;
    // Bright means "what the pointer or the selection is on", never "this is a number".
    const valueToken = hovered || selected ? "text" : "muted";
    const minus = theme.fg(this.#hoverRegion === "minus" && hovered ? "accent" : "dim", "- ");
    const plus = theme.fg(this.#hoverRegion === "plus" && hovered ? "accent" : "dim", " +");
    const value = stepper
      ? `${minus}${theme.fg(valueToken, raw)}${plus}`
      : theme.fg(valueToken, raw);
    const indent = Math.max(2, stepper ? gap - STEPPER_RESERVE : gap);
    const suffix = entry.origin === "default" ? theme.fg("dim", "  (default)") : "";
    return truncateToWidth(`${left}${" ".repeat(indent)}${value}${suffix}`, width);
  }

  /** The value menu floats over the body, anchored to the selected row. */
  #withMenu(
    lines: readonly string[],
    _selected: number,
    layout: { readonly rowIndexes: readonly number[]; readonly topPadding: number; readonly stickyHeader: string | undefined },
    valueColumn: number,
    theme: UiTheme,
    rect: PaneRect,
  ): readonly string[] {
    const menu = this.#menu;
    if (menu === null) {
      this.#menuFrame = null;
      return lines;
    }
    const anchor = this.#frameRows.find(candidate => candidate.key === menu.anchorKey);
    if (anchor === undefined) {
      this.#menuFrame = null;
      return lines;
    }

    // Opens at its own row and grows downward, flipping up only when it would
    // run past the body rather than always covering what is above.
    const body = lines.length - this.#footerHeight;
    const below = anchor.screenRow;
    const top = below + menu.choices.length <= body ? below : Math.max(0, below - menu.choices.length + 1);
    const width = Math.max(...menu.choices.map(choice => displayWidth(displayValue(choice)) + 4), 6);
    const column = Math.min(valueColumn, Math.max(0, rect.width - width - RAIL_COLUMNS));
    this.#menuFrame = { top, column, width, rows: menu.choices.length };

    const output = [...lines];
    menu.choices.forEach((choice, index) => {
      const target = top + index;
      if (target < 0 || target >= output.length) return;
      const mark = choice === menu.entry.value ? "✓ " : "  ";
      const text = padToWidth(`${mark}${displayValue(choice)} `, width);
      const painted = index === menu.index ? theme.highlight(text) : theme.panel(text);
      output[target] = overlaySpan(output[target] ?? "", column, column + width, painted);
    });
    return output;
  }

  #footerLines(width: number, theme: UiTheme): readonly string[] {
    const hint = this.#interruptArmed
      ? "press ctrl+c again to exit A1"
      : this.#notice ?? HINT;
    const hintLine = rightAligned(theme.fg("dim", hint), hint, width);
    const input = this.#filter;
    if (input === null) return [hintLine];

    const rule = theme.fg("border", "─".repeat(Math.max(0, width)));
    const view = input.view(Math.max(0, width - 2));
    const empty = view.text.length === 0;
    const painted = `${theme.fg("accent", "❯ ")}${empty ? theme.fg("muted", SEARCH_PLACEHOLDER) : theme.fg("text", view.text)}`;
    const raw = `❯ ${empty ? SEARCH_PLACEHOLDER : view.text}`;
    return [rule, padVisible(truncateToWidth(painted, width), width, raw), rule, hintLine];
  }
}

/** Pads by visible width so styling escapes do not shift the layout. */
function padVisible(line: string, width: number, raw?: string): string {
  const visible = displayWidth(raw ?? line);
  return visible >= width ? line : line + " ".repeat(width - visible);
}

function rightAligned(painted: string, raw: string, width: number): string {
  if (displayWidth(raw) >= width) return truncateToWidth(painted, width);
  return `${" ".repeat(width - displayWidth(raw))}${painted}`;
}

function centered(painted: string, raw: string, width: number): string {
  return `${" ".repeat(Math.max(0, Math.floor((width - displayWidth(raw)) / 2)))}${painted}`;
}


function isStepper(entry: OwnedUiSettingsEntry): boolean {
  return typeof entry.value === "number" && entry.editable;
}

/** Booleans read as yes and no; everything else prints as itself. */
function displayValue(value: OwnedUiSettingValue): string {
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

function describeRaw(value: unknown): string {
  if (value === null || value === undefined) return "unset";
  if (typeof value === "object") return Array.isArray(value) ? `${value.length} items` : "structured value";
  return String(value);
}
