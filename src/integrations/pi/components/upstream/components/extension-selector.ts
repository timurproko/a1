/**
 * Provenance: @earendil-works/pi-coding-agent 0.87.1 (MIT), commit f07218c4d4bbc12bef056a7058c3dd49dfe41abe,
 * packages/coding-agent/src/modes/interactive/components/extension-selector.ts.
 * Modifications: Mechanical port: remap public imports, use ECMAScript private fields, and route the
 * bare-A1 instruction row and top chrome through the shared semantic shortcut and compact modal-header
 * components while preserving options, timeout, navigation, selection, cancellation, and disposal
 * behavior.
 * Deviations: owned-modal-shortcut-hints.
 */
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, getKeybindings, Spacer, Text, type TUI } from "@earendil-works/pi-tui";
import { addPiModalHeader } from "../../modal-frame.js";
import { piTheme, renderPiModalShortcutHints } from "../../theme.js";
import { CountdownTimer } from "./countdown-timer.js";

interface ExtensionSelectorOptions {
  readonly tui?: TUI;
  readonly timeout?: number;
  readonly description?: string;
  readonly onToggleToolsExpanded?: () => void;
}

/** Bare-A1 extension selector using the common modal shortcut row. */
export class ExtensionSelectorComponent extends Container {
  readonly #options: readonly string[];
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
    this.#onSelect = onSelect;
    this.#onCancel = onCancel;
    this.#baseTitle = title;
    this.#onToggleToolsExpanded = opts?.onToggleToolsExpanded;
    const theme = piTheme();
    this.#titleText = new Text(theme.fg("accent", theme.bold(title)), 1, 0);
    addPiModalHeader(this, new DynamicBorder(), this.#titleText);
    if (opts?.description) {
      this.addChild(new Spacer(1));
      this.addChild(new Text(theme.fg("text", opts.description), 1, 0));
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
      { key: keys.getKeys("tui.select.cancel").join("/"), action: "cancel" },
    ]), 1, 0));
    this.addChild(new Spacer(1));
    this.addChild(new DynamicBorder());
    this.#updateList();
  }

  #updateList(): void {
    this.#listContainer.clear();
    const theme = piTheme();
    for (let index = 0; index < this.#options.length; index += 1) {
      const option = this.#options[index]!;
      this.#listContainer.addChild(new Text(index === this.#selectedIndex
        ? theme.fg("accent", "→ ") + theme.fg("accent", option)
        : `  ${theme.fg("text", option)}`, 1, 0));
    }
  }

  handleInput(keyData: string): void {
    const keys = getKeybindings();
    if (keys.matches(keyData, "app.tools.expand")) this.#onToggleToolsExpanded?.();
    else if (keys.matches(keyData, "tui.select.up") || keyData === "k") {
      this.#selectedIndex = Math.max(0, this.#selectedIndex - 1);
      this.#updateList();
    } else if (keys.matches(keyData, "tui.select.down") || keyData === "j") {
      this.#selectedIndex = Math.min(this.#options.length - 1, this.#selectedIndex + 1);
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
