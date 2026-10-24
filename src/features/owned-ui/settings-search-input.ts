import type { UiTheme } from "../../ui/components/index.js";

export interface SettingsSearchPointerEvent {
  readonly kind: "press" | "motion" | "release";
  readonly button: number;
  readonly column: number;
  /** One-based row relative to the search input's top rule. */
  readonly row: number;
}

/** The shared interactive input as consumed by the Settings surface. */
export interface SettingsSearchInput {
  render(width: number): readonly string[];
  handleInput(data: string): void;
  handlePointer(event: SettingsSearchPointerEvent): boolean;
  getText(): string;
  hasSelection(): boolean;
  ownsPointer(): boolean;
  setFocused(focused: boolean): void;
}

export interface SettingsSearchInputOptions {
  readonly theme: UiTheme;
  readonly getRows: () => number;
  readonly requestRender: () => void;
  readonly copyText: (text: string) => void;
}

/** Composition supplies the same configurable editor component used by the agent prompt. */
export interface SettingsSearchInputFactory {
  create(options: SettingsSearchInputOptions): SettingsSearchInput;
  isTextInput(data: string): boolean;
}
