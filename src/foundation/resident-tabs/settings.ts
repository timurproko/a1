import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  OWNED_SETTING_DECLARATIONS,
  OWNED_UI_SETTINGS_MIGRATIONS,
  OWNED_UI_SETTINGS_VERSION,
  parseOwnedUiSettingsDocument,
  resolveOwnedUiSettings,
  settingValue,
} from "../../ui/settings/index.js";

const MAX_SETTINGS_BYTES = 256 * 1024;

export const RESIDENT_TABS_MAX_CONCURRENT_STARTS = 2;
export const RESIDENT_TABS_MAX_CONCURRENT_STARTS_CAP = 8;
export const RESIDENT_TABS_PREWARM_COUNT = 1;
export const RESIDENT_TABS_PREWARM_CAP = 1;

export interface ResidentTabLaunchSettings {
  readonly residentTabs: boolean;
  readonly tabsMax: number;
  readonly tabsAutoName: boolean;
  readonly maxConcurrentStarts: number;
  readonly prewarmCount: number;
  readonly unresponsiveRestartSeconds: number;
  readonly stallNoticeSeconds: number;
}

const DEFAULTS: ResidentTabLaunchSettings = Object.freeze({
  residentTabs: true,
  tabsMax: 10,
  tabsAutoName: true,
  maxConcurrentStarts: RESIDENT_TABS_MAX_CONCURRENT_STARTS,
  prewarmCount: RESIDENT_TABS_PREWARM_COUNT,
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
    if (document === null) return DEFAULTS;
    const resolution = resolveOwnedUiSettings({
      declarations: [
        OWNED_SETTING_DECLARATIONS.residentTabs,
        OWNED_SETTING_DECLARATIONS.tabsMax,
        OWNED_SETTING_DECLARATIONS.tabsAutoName,
      ],
      migrations: OWNED_UI_SETTINGS_MIGRATIONS,
      document,
      currentVersion: OWNED_UI_SETTINGS_VERSION,
    });
    const tabsMax = (document as { values?: Record<string, unknown> }).values?.["tabsMax"] ?? settingValue(resolution, "tabsMax");
    return {
      residentTabs: settingValue(resolution, "residentTabs") === true,
      tabsMax: typeof tabsMax === "number" && Number.isFinite(tabsMax) ? Math.max(1, Math.min(50, Math.trunc(tabsMax))) : DEFAULTS.tabsMax,
      tabsAutoName: settingValue(resolution, "tabsAutoName") === true,
      maxConcurrentStarts: RESIDENT_TABS_MAX_CONCURRENT_STARTS,
      prewarmCount: RESIDENT_TABS_PREWARM_COUNT,
      unresponsiveRestartSeconds: DEFAULTS.unresponsiveRestartSeconds,
      stallNoticeSeconds: DEFAULTS.stallNoticeSeconds,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function readResidentTabsSetting(configDir: string, profileId = "a1"): Promise<boolean> {
  return (await readResidentTabLaunchSettings(configDir, profileId)).residentTabs;
}
