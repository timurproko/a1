/**
 * Provenance: @earendil-works/pi-coding-agent 0.85.1 (MIT), commit d981de1229ef899957bbe968bc8dcda02a21f477,
 * packages/coding-agent/src/modes/interactive/theme/theme-controller.ts.
 * Modifications: Source-synchronized controller port: renamed owner class, injected dependency-free
 * settings/runtime ports, remapped private theme helpers to the public-backed A1 theme adapter, and
 * added explicit disposal.
 * Deviations: theme-controller-owned-boundaries, theme-controller-explicit-disposal.
 */
import type { Theme } from "@earendil-works/pi-coding-agent";
import {
<<<<<<< a1
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
||||||| pi 0.84.2
	detectTerminalBackgroundFromEnv,
	detectTerminalBackgroundTheme,
	detectTerminalThemeForAuto,
	initTheme,
	parseAutoThemeSetting,
	resolveThemeSetting,
	setTheme,
	setThemeInstance,
	type TerminalTheme,
	type Theme,
} from "./theme.ts";

type ThemeResult = { success: boolean; error?: string };

export class InteractiveThemeController {
	private readonly ui: TUI;
	private readonly getSettingsManager: () => SettingsManager;
	private readonly showError: (message: string) => void;
	private readonly onChanged: () => void;
	private currentThemeSetting: string | undefined;
	private terminalTheme: TerminalTheme = detectTerminalBackgroundFromEnv().theme;
	private activeThemeName: string | undefined;
	private autoSyncEnabled = false;
	private terminalColorSchemeUnsubscribe: (() => void) | undefined;

	constructor(
		ui: TUI,
		options: {
			getSettingsManager: () => SettingsManager;
			showError: (message: string) => void;
			onChanged: () => void;
			initialThemeSetting?: string;
		},
	) {
		this.ui = ui;
		this.getSettingsManager = options.getSettingsManager;
		this.showError = options.showError;
		this.onChanged = options.onChanged;
		this.currentThemeSetting = options.initialThemeSetting;
		this.activeThemeName = resolveThemeSetting(
			this.currentThemeSetting ?? this.getSettingsManager().getThemeSetting(),
			this.terminalTheme,
		);
		initTheme(this.activeThemeName, true);
		this.bindTerminalColorSchemeListener();
	}

	rebindTui(): void {
		this.terminalColorSchemeUnsubscribe?.();
		this.bindTerminalColorSchemeListener();
		this.ui.setTerminalColorSchemeNotifications(this.autoSyncEnabled);
	}

	async applyFromSettings(): Promise<void> {
		const settingsManager = this.getSettingsManager();
		const themeSetting = this.currentThemeSetting ?? settingsManager.getThemeSetting();
		const autoTheme = parseAutoThemeSetting(themeSetting);
		if (autoTheme) {
			this.terminalTheme = await detectTerminalThemeForAuto({ ui: this.ui, timeoutMs: 100 });
			this.setAutoSync(true);
			this.applyThemeName(this.terminalTheme === "light" ? autoTheme.lightTheme : autoTheme.darkTheme, true);
			return;
		}

		this.setAutoSync(false);
		if (themeSetting !== undefined) {
			this.applyThemeName(themeSetting, true);
			return;
		}

		const detection = await detectTerminalBackgroundTheme({ ui: this.ui, timeoutMs: 100 });
		this.terminalTheme = detection.theme;
		if (!this.applyThemeName(detection.theme).success) return;
		if (detection.confidence === "high") {
			settingsManager.setTheme(detection.theme);
			await settingsManager.flush();
		}
	}

	getThemeSelection(): string | undefined {
		return this.currentThemeSetting ?? this.getSettingsManager().getThemeSetting() ?? this.activeThemeName;
	}

	setThemeName(themeName: string, showError = false): ThemeResult {
		this.setAutoSync(false);
		const result = this.applyThemeName(themeName, showError);
		if (result.success) {
			this.currentThemeSetting = themeName;
		}
		return result;
	}

	async setThemeSetting(themeSetting: string): Promise<void> {
		this.currentThemeSetting = themeSetting;
		await this.applyFromSettings();
	}

	setThemeInstance(themeInstance: Theme): ThemeResult {
		this.setAutoSync(false);
		setThemeInstance(themeInstance);
		this.activeThemeName = "<in-memory>";
		this.notifyChanged();
		return { success: true };
	}

	preview(themeSettingOrName: string): void {
		const themeName = resolveThemeSetting(themeSettingOrName, this.terminalTheme) ?? this.activeThemeName;
		if (!themeName) return;
		if (setTheme(themeName, true).success) {
			this.ui.invalidate();
			this.ui.requestRender();
		}
	}

	disableAutoSync(): void {
		this.setAutoSync(false);
	}

	getTerminalTheme(): TerminalTheme {
		return this.terminalTheme;
	}

	private applyThemeName(themeName: string, showError = false): ThemeResult {
		const result = setTheme(themeName, true);
		this.activeThemeName = result.success ? themeName : "dark";
		this.notifyChanged();
		if (!result.success && showError) {
			this.showError(`Failed to load theme "${themeName}": ${result.error}\nFell back to dark theme.`);
		}
		return result;
	}

	private notifyChanged(): void {
		this.ui.invalidate();
		this.onChanged();
	}

	private setAutoSync(enabled: boolean): void {
		if (this.autoSyncEnabled === enabled) return;
		this.autoSyncEnabled = enabled;
		this.ui.setTerminalColorSchemeNotifications(enabled);
	}

	private bindTerminalColorSchemeListener(): void {
		this.terminalColorSchemeUnsubscribe = this.ui.onTerminalColorSchemeChange((terminalTheme) =>
			this.applyTerminalTheme(terminalTheme),
		);
	}

	private applyTerminalTheme(terminalTheme: TerminalTheme): void {
		if (!this.autoSyncEnabled) return;
		this.terminalTheme = terminalTheme;
		const autoTheme = parseAutoThemeSetting(this.currentThemeSetting ?? this.getSettingsManager().getThemeSetting());
		if (!autoTheme) {
			this.setAutoSync(false);
			return;
		}
		const themeName = terminalTheme === "light" ? autoTheme.lightTheme : autoTheme.darkTheme;
		if (themeName !== this.activeThemeName) {
			this.applyThemeName(themeName);
		}
	}
=======
	detectTerminalBackgroundFromEnv,
	detectTerminalBackgroundTheme,
	detectTerminalThemeForAuto,
	initTheme,
	parseAutoThemeSetting,
	resolveThemeSetting,
	setTheme,
	setThemeInstance,
	type TerminalTheme,
	type Theme,
} from "./theme.ts";

type ThemeResult = { success: boolean; error?: string };

export class InteractiveThemeController {
	private readonly ui: TUI;
	private readonly getSettingsManager: () => SettingsManager;
	private readonly showError: (message: string) => void;
	private readonly onChanged: () => void;
	private currentThemeSetting: string | undefined;
	private terminalTheme: TerminalTheme = detectTerminalBackgroundFromEnv().theme;
	private activeThemeName: string | undefined;
	private autoSyncEnabled = false;
	private terminalColorSchemeUnsubscribe: (() => void) | undefined;

	constructor(
		ui: TUI,
		options: {
			getSettingsManager: () => SettingsManager;
			showError: (message: string) => void;
			onChanged: () => void;
			initialThemeSetting?: string;
		},
	) {
		this.ui = ui;
		this.getSettingsManager = options.getSettingsManager;
		this.showError = options.showError;
		this.onChanged = options.onChanged;
		this.currentThemeSetting = options.initialThemeSetting;
		this.activeThemeName = resolveThemeSetting(
			this.currentThemeSetting ?? this.getSettingsManager().getThemeSetting(),
			this.terminalTheme,
		);
		initTheme(this.activeThemeName, true);
		this.bindTerminalColorSchemeListener();
	}

	rebindTui(): void {
		this.terminalColorSchemeUnsubscribe?.();
		this.bindTerminalColorSchemeListener();
		this.ui.setTerminalColorSchemeNotifications(this.autoSyncEnabled);
	}

	async applyFromSettings(): Promise<void> {
		const settingsManager = this.getSettingsManager();
		const themeSetting = this.currentThemeSetting ?? settingsManager.getThemeSetting();
		const autoTheme = parseAutoThemeSetting(themeSetting);
		if (autoTheme) {
			this.terminalTheme = await detectTerminalThemeForAuto({ ui: this.ui, timeoutMs: 100 });
			this.setAutoSync(true);
			this.applyThemeName(this.terminalTheme === "light" ? autoTheme.lightTheme : autoTheme.darkTheme, true);
			return;
		}

		this.setAutoSync(false);
		if (themeSetting !== undefined) {
			this.applyThemeName(themeSetting, true);
			return;
		}

		const detection = await detectTerminalBackgroundTheme({ ui: this.ui, timeoutMs: 100 });
		this.terminalTheme = detection.theme;
		if (!this.applyThemeName(detection.theme).success) return;
		if (detection.confidence === "high") {
			settingsManager.setTheme(detection.theme);
			await settingsManager.flush();
		}
	}

	getThemeSelection(): string | undefined {
		return this.currentThemeSetting ?? this.getSettingsManager().getThemeSetting() ?? this.activeThemeName;
	}

	setThemeName(themeName: string, showError = false): ThemeResult {
		this.setAutoSync(false);
		const result = this.applyThemeName(themeName, showError);
		if (result.success) {
			this.currentThemeSetting = themeName;
		}
		return result;
	}

	async setThemeSetting(themeSetting: string): Promise<void> {
		this.currentThemeSetting = themeSetting;
		await this.applyFromSettings();
	}

	setThemeInstance(themeInstance: Theme): ThemeResult {
		this.setAutoSync(false);
		setThemeInstance(themeInstance);
		this.activeThemeName = "<in-memory>";
		this.notifyChanged();
		return { success: true };
	}

	preview(themeSettingOrName: string): void {
		const themeName = resolveThemeSetting(themeSettingOrName, this.terminalTheme) ?? this.activeThemeName;
		if (!themeName) return;
		if (setTheme(themeName, true).success) {
			this.ui.invalidate();
			this.ui.requestRender();
		}
	}

	disableAutoSync(): void {
		this.setAutoSync(false);
	}

	dispose(): void {
		this.setAutoSync(false);
		this.terminalColorSchemeUnsubscribe?.();
		this.terminalColorSchemeUnsubscribe = undefined;
	}

	getTerminalTheme(): TerminalTheme {
		return this.terminalTheme;
	}

	private applyThemeName(themeName: string, showError = false): ThemeResult {
		const result = setTheme(themeName, true);
		this.activeThemeName = result.success ? themeName : "dark";
		this.notifyChanged();
		if (!result.success && showError) {
			this.showError(`Failed to load theme "${themeName}": ${result.error}\nFell back to dark theme.`);
		}
		return result;
	}

	private notifyChanged(): void {
		this.ui.invalidate();
		this.onChanged();
	}

	private setAutoSync(enabled: boolean): void {
		if (this.autoSyncEnabled === enabled) return;
		this.autoSyncEnabled = enabled;
		this.ui.setTerminalColorSchemeNotifications(enabled);
	}

	private bindTerminalColorSchemeListener(): void {
		this.terminalColorSchemeUnsubscribe = this.ui.onTerminalColorSchemeChange((terminalTheme) =>
			this.applyTerminalTheme(terminalTheme),
		);
	}

	private applyTerminalTheme(terminalTheme: TerminalTheme): void {
		if (!this.autoSyncEnabled) return;
		this.terminalTheme = terminalTheme;
		const autoTheme = parseAutoThemeSetting(this.currentThemeSetting ?? this.getSettingsManager().getThemeSetting());
		if (!autoTheme) {
			this.setAutoSync(false);
			return;
		}
		const themeName = terminalTheme === "light" ? autoTheme.lightTheme : autoTheme.darkTheme;
		if (themeName !== this.activeThemeName) {
			this.applyThemeName(themeName);
		}
	}
>>>>>>> pi 0.85.1
}
