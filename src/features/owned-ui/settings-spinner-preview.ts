import type { UiTheme } from "../../ui/components/index.js";
import type { ProgressSpinnerStyle } from "../../contracts/presentation/index.js";
import {
  isProgressSpinnerStyle,
  progressSpinnerFrame,
  PROGRESS_SPINNER_INTERVAL_MS,
} from "../../ui/components/index.js";
import type { OwnedUiSettingValue } from "../../ui/settings/index.js";

const LABELS: Readonly<Record<ProgressSpinnerStyle, string>> = {
  none: "None", current: "Current", circle: "Circle", diamond: "Diamond", square: "Rotating square",
};

/** Readable Settings labels retain the declared persisted identities. */
export function progressSpinnerLabel(style: ProgressSpinnerStyle): string { return LABELS[style]; }

/** One dropdown's focused spinner animation; unselected choices keep their representative frame. */
export class SettingsSpinnerPreview {
  readonly #requestRender: () => void;
  #phase = 0;
  #timer: ReturnType<typeof setInterval> | undefined;

  constructor(requestRender: () => void) {
    this.#requestRender = requestRender;
  }

  frames(choices: readonly OwnedUiSettingValue[], selected: number, theme: UiTheme): readonly string[] {
    const focused = choices[selected];
    const animated = isProgressSpinnerStyle(focused) && focused !== "none";
    if (animated && this.#timer === undefined) {
      this.#timer = setInterval(() => { this.#phase += 1; this.#requestRender(); }, PROGRESS_SPINNER_INTERVAL_MS);
      this.#timer.unref?.();
    } else if (!animated) this.dispose();
    return choices.map((choice, index) => {
      const frame = isProgressSpinnerStyle(choice) ? progressSpinnerFrame(choice, index === selected ? this.#phase : 0) : "";
      return frame === "" ? "" : theme.fg("accent", frame);
    });
  }

  dispose(): void {
    if (this.#timer !== undefined) clearInterval(this.#timer);
    this.#timer = undefined;
  }
}
