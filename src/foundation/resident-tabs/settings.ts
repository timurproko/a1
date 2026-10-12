import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  OWNED_SETTING_DECLARATIONS,
  OWNED_UI_SETTINGS_VERSION,
  parseOwnedUiSettingsDocument,
  resolveOwnedUiSettings,
  settingValue,
} from "../../ui/settings/index.js";

const MAX_SETTINGS_BYTES = 256 * 1024;

export interface ResidentTabLaunchSettings {
  readonly residentTabs: boolean;
  readonly maxConcurrentStarts: number;
  readonly unresponsiveRestartSeconds: number;
  readonly stallNoticeSeconds: number;
}

const DEFAULTS: ResidentTabLaunchSettings = Object.freeze({
  residentTabs: false,
  maxConcurrentStarts: 2,
  unresponsiveRestartSeconds: 120,
  stallNoticeSeconds: 300,
});

/** Read only resident-launch values before any UI or extension module is loaded. */
export async function readResidentTabLaunchSettings(
  configDir: string,
  profileId = "a1",
): Promise<ResidentTabLaunchSettings> {
  const file = resolve(configDir, "settings", `${profileId}.json`);
  try {
    const raw = await readFile(file, "utf8");
    if (Buffer.byteLength(raw, "utf8") > MAX_SETTINGS_BYTES) {
      return DEFAULTS;
    }
    const document = parseOwnedUiSettingsDocument(raw);
    if (document === null || document.version !== OWNED_UI_SETTINGS_VERSION) {
      return DEFAULTS;
    }
    const resolution = resolveOwnedUiSettings({
      declarations: [
        OWNED_SETTING_DECLARATIONS.residentTabs,
        OWNED_SETTING_DECLARATIONS.tabsMaxConcurrentStarts,
        OWNED_SETTING_DECLARATIONS.tabsUnresponsiveRestartSeconds,
        OWNED_SETTING_DECLARATIONS.tabsStallNoticeSeconds,
      ],
      migrations: [],
      document,
      currentVersion: OWNED_UI_SETTINGS_VERSION,
    });
    const maximum = settingValue(resolution, "tabsMaxConcurrentStarts");
    const unresponsive = settingValue(resolution, "tabsUnresponsiveRestartSeconds");
    const stall = settingValue(resolution, "tabsStallNoticeSeconds");
    return {
      residentTabs: settingValue(resolution, "residentTabs") === true,
      maxConcurrentStarts: typeof maximum === "number" ? maximum : DEFAULTS.maxConcurrentStarts,
      unresponsiveRestartSeconds: typeof unresponsive === "number" ? unresponsive : DEFAULTS.unresponsiveRestartSeconds,
      stallNoticeSeconds: typeof stall === "number" ? stall : DEFAULTS.stallNoticeSeconds,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function readResidentTabsSetting(configDir: string, profileId = "a1"): Promise<boolean> {
  return (await readResidentTabLaunchSettings(configDir, profileId)).residentTabs;
}
