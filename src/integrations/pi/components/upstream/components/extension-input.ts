/**
 * Provenance: @earendil-works/pi-coding-agent 0.87.0 (MIT), commit 16787ad5b2dc748047f314ca1bfe7708f30f54f3,
 * packages/coding-agent/src/modes/interactive/components/extension-input.ts.
 * Modifications: Mechanical port: remap public imports, use ECMAScript private fields, and route the
 * bare-A1 instruction row through the shared semantic shortcut renderer while preserving input,
 * timeout, focus, submission, cancellation, and disposal behavior.
 * Deviations: owned-modal-shortcut-hints.
 */
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, getKeybindings, Input, Spacer, Text, type TUI } from "@earendil-works/pi-tui";
import { piTheme, renderPiModalShortcutHints } from "../../theme.js";
import { CountdownTimer } from "./countdown-timer.js";

interface ExtensionInputOptions {
  readonly tui?: TUI;
  readonly timeout?: number;
  readonly description?: string;
  readonly initialValue?: string;
}

/** Bare-A1 extension text input using the common modal shortcut row. */
export class ExtensionInputComponent extends Container {
  readonly #input = new Input();
  readonly #onSubmit: (value: string) => void;
  readonly #onCancel: () => void;
  readonly #titleText: Text;
  readonly #baseTitle: string;
  readonly #countdown: CountdownTimer | undefined;
  #focused = false;

  get focused(): boolean { return this.#focused; }
  set focused(value: boolean) {
    this.#focused = value;
    this.#input.focused = value;
  }

  constructor(title: string, _placeholder: string | undefined, onSubmit: (value: string) => void, onCancel: () => void, opts?: ExtensionInputOptions) {
    super();
    this.#onSubmit = onSubmit;
    this.#onCancel = onCancel;
    this.#baseTitle = title;
    const theme = piTheme();
    this.addChild(new DynamicBorder());
    this.addChild(new Spacer(1));
    this.#titleText = new Text(theme.fg("accent", title), 1, 0);
    this.addChild(this.#titleText);
    if (opts?.description) {
      this.addChild(new Spacer(1));
      this.addChild(new Text(theme.fg("text", opts.description), 1, 0));
    }
    this.addChild(new Spacer(1));
    this.#countdown = opts?.timeout !== undefined && opts.timeout > 0 && opts.tui !== undefined
      ? new CountdownTimer(opts.timeout, opts.tui, seconds => {
        const current = piTheme();
        this.#titleText.setText(current.fg("accent", `${this.#baseTitle} (${seconds}s)`));
      }, () => this.#onCancel())
      : undefined;
    if (opts?.initialValue !== undefined) this.#input.setValue(opts.initialValue);
    this.addChild(this.#input);
    this.addChild(new Spacer(1));
    const keys = getKeybindings();
    this.addChild(new Text(renderPiModalShortcutHints([
      { key: keys.getKeys("tui.select.confirm").join("/"), action: "submit" },
      { key: keys.getKeys("tui.select.cancel").join("/"), action: "cancel" },
    ]), 1, 0));
    this.addChild(new Spacer(1));
    this.addChild(new DynamicBorder());
  }

  handleInput(keyData: string): void {
    const keys = getKeybindings();
    if (keys.matches(keyData, "tui.select.confirm") || keyData === "\n") this.#onSubmit(this.#input.getValue());
    else if (keys.matches(keyData, "tui.select.cancel")) this.#onCancel();
    else this.#input.handleInput(keyData);
  }

  dispose(): void {
    this.#countdown?.dispose();
  }
}
