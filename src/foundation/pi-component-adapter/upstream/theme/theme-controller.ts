// Adapted from Pi 0.84.1; upstream 0.84.2 re-synchronization is tracked by task 7.4.
// Upstream: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts
// License: MIT. Modifications: public APIs and A1-owned runtime/settings ports.

import type { Theme } from "@earendil-works/pi-coding-agent";
import {
  applyPiTheme,
  applyPiThemeInstance,
  detectPiTerminalBackgroundFromEnv,
  detectPiTerminalBackgroundTheme,
  detectPiTerminalThemeForAuto,
  parsePiAutoThemeSetting,
  resolvePiThemeSetting,
  type PiTerminalTheme,
  type PiTerminalThemeDetector,
  type PiThemeResult,
} from "./theme.js";

export interface PiThemeRuntimePort extends PiTerminalThemeDetector {
  invalidate(): void;
  requestRender(force?: boolean): void;
  setTerminalColorSchemeNotifications(enabled: boolean): void;
  onTerminalColorSchemeChange(listener: (theme: PiTerminalTheme) => void): () => void;
}

export interface PiThemeSettingsPort {
  getThemeSetting(): string | undefined;
  setTheme(theme: string): void;
  flush(): Promise<void>;
}

export class OwnedPiThemeController {
  readonly #ui: PiThemeRuntimePort;
  readonly #settings: PiThemeSettingsPort;
  readonly #showError: (message: string) => void;
  readonly #onChanged: () => void;
  #terminalTheme: PiTerminalTheme = detectPiTerminalBackgroundFromEnv().theme;
  #activeThemeName: string | undefined;
  #autoSyncEnabled = false;
  #terminalColorSchemeUnsubscribe: (() => void) | undefined;

  constructor(
    ui: PiThemeRuntimePort,
    settings: PiThemeSettingsPort,
    showError: (message: string) => void,
    onChanged: () => void,
  ) {
    this.#ui = ui;
    this.#settings = settings;
    this.#showError = showError;
    this.#onChanged = onChanged;
    this.#activeThemeName = resolvePiThemeSetting(this.#settings.getThemeSetting(), this.#terminalTheme);
    applyPiTheme(this.#activeThemeName ?? this.#terminalTheme, true);
    this.#bindTerminalColorSchemeListener();
  }

  rebindTui(): void {
    this.#terminalColorSchemeUnsubscribe?.();
    this.#bindTerminalColorSchemeListener();
    this.#ui.setTerminalColorSchemeNotifications(this.#autoSyncEnabled);
  }

  async applyFromSettings(): Promise<void> {
    const themeSetting = this.#settings.getThemeSetting();
    const autoTheme = parsePiAutoThemeSetting(themeSetting);
    if (autoTheme) {
      this.#terminalTheme = await detectPiTerminalThemeForAuto(this.#ui, 100);
      this.#setAutoSync(true);
      this.#applyThemeName(this.#terminalTheme === "light" ? autoTheme.lightTheme : autoTheme.darkTheme, true);
      return;
    }

    this.#setAutoSync(false);
    if (themeSetting !== undefined) {
      this.#applyThemeName(themeSetting, true);
      return;
    }

    const detection = await detectPiTerminalBackgroundTheme(this.#ui, 100);
    this.#terminalTheme = detection.theme;
    if (!this.#applyThemeName(detection.theme).success) return;
    if (detection.confidence === "high") {
      this.#settings.setTheme(detection.theme);
      await this.#settings.flush();
    }
  }

  setThemeName(themeName: string, showError = false): PiThemeResult {
    this.#setAutoSync(false);
    return this.#applyThemeName(themeName, showError);
  }

  setThemeInstance(theme: Theme): PiThemeResult {
    this.#setAutoSync(false);
    const result = applyPiThemeInstance(theme);
    this.#activeThemeName = result.name;
    this.#notifyChanged();
    return result;
  }

  preview(themeSettingOrName: string): void {
    const themeName = resolvePiThemeSetting(themeSettingOrName, this.#terminalTheme) ?? this.#activeThemeName;
    if (!themeName) return;
    if (applyPiTheme(themeName, true).success) {
      this.#ui.invalidate();
      this.#ui.requestRender();
    }
  }

  disableAutoSync(): void {
    this.#setAutoSync(false);
  }

  getTerminalTheme(): PiTerminalTheme {
    return this.#terminalTheme;
  }

  dispose(): void {
    this.#terminalColorSchemeUnsubscribe?.();
    this.#terminalColorSchemeUnsubscribe = undefined;
    this.#setAutoSync(false);
  }

  #applyThemeName(themeName: string, showError = false): PiThemeResult {
    const result = applyPiTheme(themeName, true);
    this.#activeThemeName = result.name;
    this.#notifyChanged();
    if (!result.success && showError) {
      this.#showError(`Failed to load theme "${themeName}": ${result.error}\nFell back to dark theme.`);
    }
    return result;
  }

  #notifyChanged(): void {
    this.#ui.invalidate();
    this.#onChanged();
  }

  #setAutoSync(enabled: boolean): void {
    if (this.#autoSyncEnabled === enabled) return;
    this.#autoSyncEnabled = enabled;
    this.#ui.setTerminalColorSchemeNotifications(enabled);
  }

  #bindTerminalColorSchemeListener(): void {
    this.#terminalColorSchemeUnsubscribe = this.#ui.onTerminalColorSchemeChange(theme => this.#applyTerminalTheme(theme));
  }

  #applyTerminalTheme(terminalTheme: PiTerminalTheme): void {
    if (!this.#autoSyncEnabled) return;
    this.#terminalTheme = terminalTheme;
    const autoTheme = parsePiAutoThemeSetting(this.#settings.getThemeSetting());
    if (!autoTheme) {
      this.#setAutoSync(false);
      return;
    }
    const themeName = terminalTheme === "light" ? autoTheme.lightTheme : autoTheme.darkTheme;
    if (themeName !== this.#activeThemeName) this.#applyThemeName(themeName);
  }
}
