/**
 * Provenance: @earendil-works/pi-coding-agent 1.5.2 (MIT), commit b4afdddf44e059c67ccf5097e5317d913521b470,
 * packages/coding-agent/src/modes/interactive/components/extension-selector.ts.
 * Modifications: Mechanical port with public imports, private fields, shared shortcut rows and compact
 * framing; internal choices opt into normal labels over selected backgrounds and circular navigation
 * while preserving extension/comparison styling, timeout, cancellation, and disposal.
 * Deviations: owned-modal-shortcut-hints.
 */
import { wrapChoiceIndex } from "../../../../../contracts/presentation/index.js";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, getKeybindings, Spacer, Text, type TUI } from "@earendil-works/pi-tui";
import { addPiModalHeader, adoptPiModalFrame } from "../../modal-frame.js";
import { DIALOG_CLOSE_SHORTCUT_HINT, paintPiBorder, piTheme, renderPiModalShortcutHints, renderPiModalListRow } from "../../theme.js";
import { CountdownTimer } from "./countdown-timer.js";

interface ExtensionSelectorOptions {
  readonly tui?: TUI;
  readonly timeout?: number;
  readonly description?: string;
  readonly onToggleToolsExpanded?: () => void;
  readonly standardSelection?: boolean;
}

/** Bare-A1 extension selector using the common modal shortcut row. */
export class ExtensionSelectorComponent extends Container {
  readonly #options: readonly string[];
  readonly #standardSelection: boolean;
  #selectedIndex = 0;
  readonly #listContainer = new Container();
  readonly #onSelect: (value: string) => void;
  readonly #onCancel: () => void;
  readonly #titleText: Text;
  readonly #baseTitle: string;
  readonly #countdown: CountdownTimer | undefined;
  readonly #onToggleToolsExpanded: (() => void) | undefined;

  constructor(title: string, options: readonly string[], onSelect: (value: string) => void, onCancel: () => void, opts?: ExtensionSelectorOptions) {
    super();
    this.#options = options;
    this.#standardSelection = opts?.standardSelection === true;
    this.#onSelect = onSelect;
    this.#onCancel = onCancel;
    this.#baseTitle = title;
    this.#onToggleToolsExpanded = opts?.onToggleToolsExpanded;
    const theme = piTheme();
    this.#titleText = new Text(theme.fg("accent", theme.bold(title)), 0, 0);
    const header = addPiModalHeader(this, new DynamicBorder(paintPiBorder), this.#titleText);
    if (opts?.description) {
      this.addChild(new Spacer(1));
      this.addChild(new Text(theme.fg("text", opts.description), 0, 0));
    }
    this.addChild(new Spacer(1));
    this.#countdown = opts?.timeout !== undefined && opts.timeout > 0 && opts.tui !== undefined
      ? new CountdownTimer(opts.timeout, opts.tui, seconds => {
        const current = piTheme();
        this.#titleText.setText(current.fg("accent", current.bold(`${this.#baseTitle} (${seconds}s)`)));
      }, () => this.#onCancel())
      : undefined;
    this.addChild(this.#listContainer);
    this.addChild(new Spacer(1));
    const keys = getKeybindings();
    this.addChild(new Text(renderPiModalShortcutHints([
      { key: "↑↓", action: "navigate" },
      { key: keys.getKeys("tui.select.confirm").join("/"), action: "select" },
      DIALOG_CLOSE_SHORTCUT_HINT,
    ]), 0, 0));
    this.addChild(new DynamicBorder(paintPiBorder));
    adoptPiModalFrame(this, { topIndex: 0, bottomIndex: this.children.length - 1, header });
    this.#updateList();
  }

  #updateList(): void {
    this.#listContainer.clear();
    const theme = piTheme();
    const maxVisible = 10;
    // Center the window on the selection, then clamp it to the list boundaries.
    const startIndex = Math.max(0, Math.min(this.#selectedIndex - Math.floor(maxVisible / 2), this.#options.length - maxVisible));
    const endIndex = Math.min(startIndex + maxVisible, this.#options.length);
    for (let index = startIndex; index < endIndex; index += 1) {
      const option = this.#options[index]!;
      const selected = index === this.#selectedIndex;
      const content = selected
        ? theme.fg("accent", "→ ") + theme.fg(this.#standardSelection ? "text" : "accent", option)
        : `  ${theme.fg("text", option)}`;
      this.#listContainer.addChild(this.#standardSelection ? {
        render: width => {
          const current = piTheme();
          const arrow = selected ? current.fg("accent", "→ ") : "  ";
          return [renderPiModalListRow(`${arrow}${current.fg("text", option)}`, width, selected)];
        },
        invalidate: () => {},
      } : new Text(content, 0, 0));
    }
    if (startIndex > 0 || endIndex < this.#options.length) {
      this.#listContainer.addChild(new Text(theme.fg("muted", `  (${this.#selectedIndex + 1}/${this.#options.length})`), 0, 0));
    }
  }

  handleInput(keyData: string): void {
    const keys = getKeybindings();
    if (keys.matches(keyData, "app.tools.expand")) this.#onToggleToolsExpanded?.();
    else if (keys.matches(keyData, "tui.select.up") || keyData === "k") {
      this.#selectedIndex = this.#standardSelection ? wrapChoiceIndex(this.#selectedIndex, -1, this.#options.length) : Math.max(0, this.#selectedIndex - 1);
      this.#updateList();
    } else if (keys.matches(keyData, "tui.select.down") || keyData === "j") {
      this.#selectedIndex = this.#standardSelection ? wrapChoiceIndex(this.#selectedIndex, 1, this.#options.length) : Math.min(this.#options.length - 1, this.#selectedIndex + 1);
      this.#updateList();
    } else if (keys.matches(keyData, "tui.select.confirm") || keyData === "\n") {
      const selected = this.#options[this.#selectedIndex];
      if (selected !== undefined) this.#onSelect(selected);
    } else if (keys.matches(keyData, "tui.select.cancel")) this.#onCancel();
  }

  dispose(): void {
    this.#countdown?.dispose();
  }
}
