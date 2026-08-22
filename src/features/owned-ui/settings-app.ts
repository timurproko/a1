import type { AppHostServices, UiApp } from "../../foundation/ui-apps/index.js";
import {
  GLOBAL_SCOPE,
  LineInput,
  ShortcutRegistry,
  blockJumpTarget,
  blockRowSpan,
  displayWidth,
  handleLineInputKey,
  indexOfKey,
  isThumbRow,
  lastBlockTarget,
  layoutList,
  moveSelection,
  padToWidth,
  rowKey,
  scrollForSelection,
  scrollbarGeometry,
  selectableIndexes,
  truncateToWidth,
  type ListRow,
  type ListRowSpan,
  type PaneInputResult,
  type PaneRect,
} from "../../foundation/ui-components/index.js";
import type {
  OwnedUiSettingsEntry,
  OwnedUiSettingsSession,
} from "../../foundation/owned-ui-settings/index.js";

export const SETTINGS_APP_ID = "settings";
export const SETTINGS_ROUTE = "settings";
const SCOPE = SETTINGS_APP_ID;
const SCROLLBAR_TOP_INSET = 1;
const RAIL_COLUMNS = 2;

type Action =
  | "move-up" | "move-down" | "block-up" | "block-down" | "first" | "last"
  | "page-up" | "page-down" | "previous-value" | "next-value" | "open-filter" | "close";

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
SETTINGS_SHORTCUTS.declare({ key: "/", scope: SCOPE, description: "Search settings", section: "Change" }, "open-filter");
SETTINGS_SHORTCUTS.declare({ key: "escape", scope: GLOBAL_SCOPE, description: "Close", section: "Screen" }, "close");

const KEYS: Readonly<Record<string, string>> = {
  "[A": "up",
  "[B": "down",
  "[1;2A": "shift+up",
  "[1;2B": "shift+down",
  "[D": "left",
  "[C": "right",
  "[5~": "pageUp",
  "[6~": "pageDown",
  "[H": "home",
  "[F": "end",
  "": "escape",
  "/": "/",
};

type Row = ListRow<OwnedUiSettingsEntry>;

/**
 * The settings screen. Rows, sticky headers, scrolling, and the keymap all come
 * from the shared component layer; what belongs to settings is which sections
 * exist, how a value is shown, and where an accepted change is routed.
 */
export class SettingsApp implements UiApp {
  readonly id = SETTINGS_APP_ID;
  readonly #session: OwnedUiSettingsSession;
  #selectedKey: string | undefined;
  #scroll = 0;
  #reveal: ListRowSpan | undefined;
  #notice: string | null = null;
  #filter: LineInput | null = null;
  #pending: Promise<void> | null = null;

  constructor(session: OwnedUiSettingsSession) {
    this.#session = session;
  }

  onActivate(host: AppHostServices): void {
    this.#pending = this.#session.load().then(() => {
      this.#pending = null;
      host.requestRender();
    });
  }

  render(rect: PaneRect, _host: AppHostServices): readonly string[] {
    const rows = this.#rows();
    const footer = this.#footerLines(rect.width);
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
    if (rows.length === 0) {
      const message = this.#pending === null ? "No settings found." : "Loading settings…";
      const top = Math.floor(bodyHeight / 2);
      for (let index = 0; index < bodyHeight; index++) {
        body.push(index === top ? centered(message, contentWidth) : "");
      }
    } else {
      if (layout.topPadding > 0) body.push("");
      if (layout.stickyHeader !== undefined) body.push(header(layout.stickyHeader, contentWidth));
      for (const index of layout.rowIndexes) {
        body.push(this.#renderRow(rows[index], index === selected, contentWidth, valueColumn));
      }
      while (body.length < bodyHeight) body.push("");
    }

    const withRail = body.slice(0, bodyHeight).map((line, offset) => {
      const cell = offset < SCROLLBAR_TOP_INSET
        ? " "
        : isThumbRow(geometry, offset - SCROLLBAR_TOP_INSET) ? "█" : geometry === null ? " " : "│";
      return `${padToWidth(line, contentWidth)} ${cell}`;
    });
    return [...withRail, ...footer];
  }

  onInput(data: string, host: AppHostServices): PaneInputResult {
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
        return { consumed: true };
      case "move-up":
        this.#select(rows, moveSelection(rows, selected, -1));
        return { consumed: true };
      case "move-down":
        this.#select(rows, moveSelection(rows, selected, 1));
        return { consumed: true };
      case "page-up":
        this.#select(rows, moveSelection(rows, selected, -8));
        return { consumed: true };
      case "page-down":
        this.#select(rows, moveSelection(rows, selected, 8));
        return { consumed: true };
      case "block-up":
      case "block-down": {
        const target = blockJumpTarget(rows, selected, action === "block-down" ? 1 : -1);
        if (target !== undefined) {
          this.#select(rows, target);
          this.#reveal = blockRowSpan(rows, target);
        }
        return { consumed: true };
      }
      case "first":
      case "last": {
        const target = action === "last" ? lastBlockTarget(rows) : selectableIndexes(rows)[0];
        if (target !== undefined) {
          this.#select(rows, target);
          this.#reveal = blockRowSpan(rows, target);
        }
        return { consumed: true };
      }
      case "previous-value":
      case "next-value":
        this.#change(rows, selected, action === "next-value" ? 1 : -1, host);
        return { consumed: true };
      default:
        return { consumed: false };
    }
  }

  #filterKey(data: string): PaneInputResult {
    const input = this.#filter;
    if (input === null) return { consumed: false };
    const outcome = handleLineInputKey(input, data);
    if (outcome.kind !== "editing") this.#filter = outcome.kind === "accepted" ? input : null;
    this.#scroll = 0;
    return { consumed: true };
  }

  #change(rows: readonly Row[], selected: number, delta: -1 | 1, host: AppHostServices): void {
    const row = rows[selected];
    if (row === undefined || row.kind !== "element") return;
    const entry = row.value;
    const choices = entry.choices;
    if (!entry.editable || choices === null || choices.length === 0) {
      this.#notice = `${entry.id} is not editable here`;
      return;
    }
    const current = entry.value === null ? -1 : choices.indexOf(entry.value);
    const next = choices[current < 0
      ? (delta > 0 ? 0 : choices.length - 1)
      : (current + delta + choices.length) % choices.length];
    if (next === undefined) return;

    void this.#session.change(entry.backend, entry.id, next).then(outcome => {
      this.#notice = outcome.failure !== null
        ? `Could not save ${entry.id}: ${outcome.failure}`
        : outcome.pendingRestart
          ? `${entry.id} applies on the next start`
          : null;
      host.requestRender();
    });
  }

  #select(rows: readonly Row[], index: number): void {
    if (index < 0) return;
    this.#selectedKey = rowKey(rows[index]);
    this.#notice = null;
  }

  #rows(): readonly Row[] {
    const needle = this.#filter?.value.trim().toLowerCase() ?? "";
    const rows: Row[] = [];
    for (const section of this.#session.sections()) {
      const entries = needle.length === 0
        ? section.entries
        : section.entries.filter(entry => entry.id.toLowerCase().includes(needle));
      if (needle.length > 0 && entries.length === 0) continue;
      if (rows.length > 0) rows.push({ kind: "spacer" });
      rows.push({ kind: "group", group: section.id, title: section.title });
      if (section.unavailableReason !== null) {
        rows.push({ kind: "note", group: section.id, text: section.unavailableReason });
        continue;
      }
      if (section.readOnlyReason !== null) {
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
    for (const row of rows) {
      if (row.kind === "element") widest = Math.max(widest, displayWidth(row.value.id));
    }
    return 2 + 2 + widest + 2;
  }

  #renderRow(row: Row | undefined, selected: boolean, width: number, valueColumn: number): string {
    if (row === undefined) return "";
    switch (row.kind) {
      case "spacer":
        return "";
      case "group":
        return header(row.title, width);
      case "note":
        return truncateToWidth(`    ${row.text}`, width);
      case "element": {
        const entry = row.value;
        const left = `${selected ? "→ " : "  "}  ${entry.id}`;
        const gap = Math.max(2, valueColumn - displayWidth(left));
        const value = entry.value === null ? describeRaw(entry.rawValue) : String(entry.value);
        const suffix = entry.origin === "default" ? "  (default)" : "";
        return truncateToWidth(`${left}${" ".repeat(gap)}${value}${suffix}`, width);
      }
    }
  }

  #footerLines(width: number): readonly string[] {
    const input = this.#filter;
    const hint = this.#notice
      ?? (input !== null
        ? "enter apply • esc cancel"
        : "/ search • ↑↓ move • shift+↑↓ section • ←→ change • esc close");
    const hintLine = padToWidth(truncateToWidth(hint, width), width);
    if (input === null) return [hintLine];
    const view = input.view(Math.max(0, width - 2));
    return [padToWidth(truncateToWidth(`> ${view.text}`, width), width), hintLine];
  }
}

function header(title: string, width: number): string {
  return truncateToWidth(title.toUpperCase(), width);
}

function centered(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - displayWidth(text)) / 2));
  return truncateToWidth(" ".repeat(pad) + text, width);
}

function describeRaw(value: unknown): string {
  if (value === null || value === undefined) return "unset";
  if (typeof value === "object") return Array.isArray(value) ? `${value.length} items` : "structured value";
  return String(value);
}
