import type {
  AgentJsonValue,
  AgentSettingDescriptor,
  AgentSettingsPort,
} from "../foundation/agent-engine-contracts/index.js";
import { getAvailablePiThemes } from "../foundation/pi-component-adapter/index.js";

/**
 * The engine stores a theme as one string, but that string has two forms: a
 * theme name, or a `light/dark` pair meaning "follow the terminal". The settings
 * port describes it as a plain string, because neither the installed themes nor
 * that grammar are anything its source declares — the theme list is a runtime
 * read of the built-ins plus whatever theme files the reader has installed.
 *
 * This presents both forms as ordinary settings: the theme row offers the
 * installed themes plus `automatic`, and choosing `automatic` reveals the two
 * rows that say which theme each terminal appearance uses.
 */

/** Value the theme row carries while the engine is following the terminal. */
export const AUTOMATIC_THEME = "automatic";
export const LIGHT_THEME_KEY = "themeLight";
export const DARK_THEME_KEY = "themeDark";

const THEME_KEY = "theme";

interface AutomaticPair {
  readonly light: string;
  readonly dark: string;
}

/** A stored theme is automatic when it names one theme per terminal appearance. */
export function parseAutomaticTheme(stored: string): AutomaticPair | null {
  const at = stored.indexOf("/");
  if (at < 0 || stored.indexOf("/", at + 1) >= 0) return null;
  const light = stored.slice(0, at).trim();
  const dark = stored.slice(at + 1).trim();
  return light.length > 0 && dark.length > 0 ? { light, dark } : null;
}

function describe(key: string, label: string, description: string, choices: readonly string[], writable: boolean): AgentSettingDescriptor {
  return { key, valueType: "enum", writable, choices, label, description };
}

/**
 * Presents the installed themes, and the automatic pair behind them, through the
 * ordinary settings port so no surface needs to know the grammar.
 */
export function withInstalledThemes(port: AgentSettingsPort | null): AgentSettingsPort | null {
  if (port === null) return null;
  const write = port.writeSetting?.bind(port);
  const flush = port.flush?.bind(port);

  const stored = async (): Promise<string> => {
    const value = await port.readSetting(THEME_KEY);
    return typeof value === "string" ? value : "";
  };
  const pairOf = async (): Promise<AutomaticPair | null> => parseAutomaticTheme(await stored());

  const writeTheme = async (value: string): Promise<void> => {
    if (write === undefined) return;
    await write(THEME_KEY, value);
  };

  return {
    capabilities: port.capabilities,

    async listSettings(): Promise<readonly AgentSettingDescriptor[]> {
      const names = getAvailablePiThemes().map(theme => theme.name);
      const descriptors = await port.listSettings();
      if (names.length === 0) return descriptors;

      const theme = descriptors.find(descriptor => descriptor.key === THEME_KEY);
      const writable = theme?.writable === true;
      const listed = descriptors.map(descriptor =>
        descriptor.key === THEME_KEY ? { ...descriptor, valueType: "enum" as const, choices: [...names, AUTOMATIC_THEME] } : descriptor);

      // The pair only means anything while the theme is automatic, so those rows
      // appear with it rather than sitting unexplained under a single theme.
      if ((await pairOf()) === null) return listed;
      return [
        ...listed,
        describe(LIGHT_THEME_KEY, "Light theme", "Theme to use in automatic mode when the terminal is light", names, writable),
        describe(DARK_THEME_KEY, "Dark theme", "Theme to use in automatic mode when the terminal is dark", names, writable),
      ];
    },

    async readSetting(key: string): Promise<AgentJsonValue | undefined> {
      if (key !== THEME_KEY && key !== LIGHT_THEME_KEY && key !== DARK_THEME_KEY) return port.readSetting(key);
      const pair = parseAutomaticTheme(await stored());
      if (key === THEME_KEY) return pair === null ? port.readSetting(key) : AUTOMATIC_THEME;
      if (pair === null) return undefined;
      return key === LIGHT_THEME_KEY ? pair.light : pair.dark;
    },

    ...(write === undefined ? {} : {
      async writeSetting(key: string, value: AgentJsonValue): Promise<void> {
        if (typeof value !== "string" || (key !== THEME_KEY && key !== LIGHT_THEME_KEY && key !== DARK_THEME_KEY)) {
          await write(key, value);
          return;
        }
        const current = await stored();
        const pair = parseAutomaticTheme(current);
        if (key === THEME_KEY) {
          // Turning automatic on starts from the theme in use for both
          // appearances, which is where the engine's own editor starts too.
          if (value !== AUTOMATIC_THEME) await writeTheme(value);
          else if (pair === null) await writeTheme(`${current}/${current}`);
          return;
        }
        if (pair === null) return;
        await writeTheme(key === LIGHT_THEME_KEY ? `${value}/${pair.dark}` : `${pair.light}/${value}`);
      },
    }),

    ...(flush === undefined ? {} : { flush }),
  };
}
