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
}

/** Read only resident-launch values before any UI or extension module is loaded. */
export async function readResidentTabLaunchSettings(
  configDir: string,
  profileId = "a1",
): Promise<ResidentTabLaunchSettings> {
  const file = resolve(configDir, "settings", `${profileId}.json`);
  try {
    const raw = await readFile(file, "utf8");
    if (Buffer.byteLength(raw, "utf8") > MAX_SETTINGS_BYTES) {
      return { residentTabs: false, maxConcurrentStarts: 2 };
    }
    const document = parseOwnedUiSettingsDocument(raw);
    if (document === null || document.version !== OWNED_UI_SETTINGS_VERSION) {
      return { residentTabs: false, maxConcurrentStarts: 2 };
    }
    const resolution = resolveOwnedUiSettings({
      declarations: [
        OWNED_SETTING_DECLARATIONS.residentTabs,
        OWNED_SETTING_DECLARATIONS.tabsMaxConcurrentStarts,
      ],
      migrations: [],
      document,
      currentVersion: OWNED_UI_SETTINGS_VERSION,
    });
    const maximum = settingValue(resolution, "tabsMaxConcurrentStarts");
    return {
      residentTabs: settingValue(resolution, "residentTabs") === true,
      maxConcurrentStarts: typeof maximum === "number" ? maximum : 2,
    };
  } catch {
    return { residentTabs: false, maxConcurrentStarts: 2 };
  }
}

export async function readResidentTabsSetting(configDir: string, profileId = "a1"): Promise<boolean> {
  return (await readResidentTabLaunchSettings(configDir, profileId)).residentTabs;
}
