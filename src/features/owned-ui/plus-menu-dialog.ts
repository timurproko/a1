import {
  LineInput,
  handleLineInputKey,
  padToWidth,
  renderInputRow,
  renderShortcutHintsWithClose,
  truncateToWidth,
  type ShortcutHintEntry,
} from "../../ui/components/index.js";
import type { UiTheme } from "../../ui/components/index.js";

/** The A1 setting holding the tab kinds the strip's `+` offers. */
export const PLUS_MENU_SETTING_ID = "tabBarPlusMenu";

/** One tab kind the plus menu can offer. */
export interface PlusMenuKind {
  readonly key: string;
  readonly label: string;
}

const PLUS_MENU_PRESENTATION = Object.freeze({
  title: "Plus Menu",
  description: "Choose what the + button in the tab bar can add.",
  empty: "No tabs match",
});
const HINTS: readonly ShortcutHintEntry[] = [
  { key: "Type", action: "search" },
  { key: "↑↓", action: "navigate" },
  { key: "Space", action: "toggle" },
  { key: "esc", action: "close" },
];
const PADDING_X = 2;

/** Presentation copy for a searchable ordered flag multi-select dialog. */
export interface FlagToggleDialogPresentation {
  readonly title: string;
  readonly description: string;
  readonly empty: string;
}

/** Owns only filtering and selection; the Settings screen owns enabled state and persistence. */
export class FlagToggleDialog {
  readonly #kinds: readonly PlusMenuKind[];
  readonly #presentation: FlagToggleDialogPresentation;
  readonly #filter = new LineInput("");
  #index = 0;

  constructor(kinds: readonly PlusMenuKind[], presentation: FlagToggleDialogPresentation) {
    this.#kinds = kinds;
    this.#presentation = presentation;
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
    const frameWidth = Math.max(0, width);
    const left = Math.min(PADDING_X, frameWidth);
    const right = Math.min(PADDING_X, frameWidth - left);
    const contentWidth = Math.max(0, frameWidth - left - right);
    const blank = " ".repeat(frameWidth);
    const row = (painted: string, selected = false): string => {
      const content = padToWidth(truncateToWidth(painted, contentWidth), contentWidth);
      const rightPadding = " ".repeat(right);
      return `${" ".repeat(left)}${selected ? theme.highlight(content) : content}${
        selected ? theme.panel(rightPadding) : rightPadding
      }`;
    };
    const shown = this.shown();
    const index = Math.min(this.#index, Math.max(0, shown.length - 1));
    const rows = shown.length === 0
      ? [row(theme.fg("dim", this.#presentation.empty))]
      : shown.map((kind, position) => {
        const selected = position === index;
        const cursor = selected ? "→ " : "  ";
        const marker = enabled[kind.key] === true ? "●" : "○";
        const content = `${selected ? theme.fg("accent", cursor) : cursor}${theme.fg("text", marker)} ${theme.fg("text", kind.label)}`;
        return row(content, selected);
      });
    return [
      blank,
      row(theme.bold(theme.fg("accent", this.#presentation.title))),
      row(theme.fg("dim", this.#presentation.description)),
      blank,
      ...renderInputRow(this.#filter, contentWidth, { ruled: false, promptGlyph: "> ", theme }).lines.map(line => row(line)),
      blank,
      ...rows,
      blank,
      row(renderShortcutHintsWithClose(HINTS, theme, contentWidth)),
      blank,
    ];
  }
}

/** The tab bar's specialized flag dialog, retained as the public Plus Menu surface. */
export class PlusMenuDialog extends FlagToggleDialog {
  constructor(kinds: readonly PlusMenuKind[]) { super(kinds, PLUS_MENU_PRESENTATION); }
}
