import {
  LineInput,
  displayWidth,
  handleLineInputKey,
  renderInputRow,
  truncateToWidth,
} from "../../ui/components/index.js";
import type { UiTheme } from "../../ui/components/index.js";

/** The A1 setting holding the tab kinds the strip's `+` offers. */
export const PLUS_MENU_SETTING_ID = "tabBarPlusMenu";

/** One tab kind the plus menu can offer. */
export interface PlusMenuKind {
  readonly key: string;
  readonly label: string;
}

const TITLE = "Plus menu";
const DESCRIPTION = "Choose the tabs + offers";
const HINT = "Type search · ↑↓ navigate · Space toggle · Esc close";

/**
 * The plus-menu dialog: every tab kind with `●` when `+` offers it and `○` when not, filtered by typed
 * text. It owns only its filter and the row in hand; the enabled record and its saving stay with the
 * Settings screen that opened it.
 */
export class PlusMenuDialog {
  readonly #kinds: readonly PlusMenuKind[];
  readonly #filter = new LineInput("");
  #index = 0;

  constructor(kinds: readonly PlusMenuKind[]) {
    this.#kinds = kinds;
  }

  /** The kinds the filter keeps, in kind order. */
  shown(): readonly PlusMenuKind[] {
    const needle = this.#filter.value.trim().toLowerCase();
    return this.#kinds.filter(kind => needle.length === 0 || kind.label.toLowerCase().includes(needle));
  }

  /** Handles one key by its resolved name; `toggle` flips a kind. Returns whether the dialog closed. */
  handle(name: string, data: string, toggle: (key: string) => void): "close" | "handled" {
    const shown = this.shown();
    if (name === "escape") return "close";
    if (name === "up" || name === "down") {
      this.#index = Math.min(Math.max(0, shown.length - 1), Math.max(0, this.#index + (name === "down" ? 1 : -1)));
      return "handled";
    }
    if (name === "space") {
      const kind = shown[this.#index];
      if (kind !== undefined) toggle(kind.key);
      return "handled";
    }
    handleLineInputKey(this.#filter, data);
    this.#index = 0;
    return "handled";
  }

  lines(enabled: Readonly<Record<string, boolean | string>>, width: number, theme: UiTheme): readonly string[] {
    const rule = theme.fg("border", "─".repeat(Math.max(0, width)));
    const inset = width > 0 ? " " : "";
    const contentWidth = Math.max(0, width - inset.length);
    const row = (painted: string, raw: string): string => {
      const clipped = truncateToWidth(painted, contentWidth);
      return `${inset}${clipped}${" ".repeat(Math.max(0, contentWidth - displayWidth(raw)))}`;
    };
    const shown = this.shown();
    const index = Math.min(this.#index, Math.max(0, shown.length - 1));
    const rows = shown.length === 0
      ? [row(theme.fg("dim", "No tabs match"), "No tabs match")]
      : shown.map((kind, position) => {
        const selected = position === index;
        const cursor = selected ? "→ " : "  ";
        const marker = enabled[kind.key] === true ? "●" : "○";
        const raw = `${cursor}${marker} ${kind.label}`;
        const content = `${selected ? theme.fg("accent", cursor) : cursor}${theme.fg("text", marker)} ${theme.fg("text", kind.label)}`;
        return row(selected ? theme.highlight(content) : content, raw);
      });
    return [
      rule,
      row(theme.bold(theme.fg("accent", TITLE)), TITLE),
      row(theme.fg("dim", DESCRIPTION), DESCRIPTION),
      "",
      ...renderInputRow(this.#filter, width, { ruled: false, promptGlyph: "> ", theme }).lines,
      "",
      ...rows,
      "",
      row(theme.fg("dim", HINT), HINT),
      rule,
    ];
  }
}
