import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  OWNED_SETTING_DECLARATIONS,
  OWNED_UI_SETTINGS_MIGRATIONS,
  OWNED_UI_SETTINGS_VERSION,
  normalizeOwnedUiSettingsValues,
  parseOwnedUiSettingsDocument,
  readProfileSettingsNamespace,
  repairProfileSettingsDocument,
  resolveOwnedUiSettings,
  settingValue,
  type OwnedUiSettingsDocument,
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
  profileDir: string,
  namespace = "a1",
  legacyConfigDir?: string,
  profileId = namespace,
): Promise<ResidentTabLaunchSettings> {
  const sharedFile = resolve(profileDir, "settings.json");
  try { repairProfileSettingsDocument(sharedFile); } catch {
    // Compatibility: recovery is opportunistic; resident launch falls back when bytes stay invalid.
  }
  const shared = readProfileSettingsNamespace(sharedFile, namespace);
  if (shared.status === "invalid") return DEFAULTS;
  if (shared.status === "available") {
    const compatibility = normalizeOwnedUiSettingsValues(shared.value);
    return compatibility.values === null
      ? DEFAULTS
      : resolveLaunchValues({ version: OWNED_UI_SETTINGS_VERSION, values: compatibility.values }, []);
  }
  const file = resolve(legacyConfigDir ?? profileDir, "settings", `${profileId}.json`);
  try {
    const raw = await readFile(file, "utf8");
    if (Buffer.byteLength(raw, "utf8") > MAX_SETTINGS_BYTES) return DEFAULTS;
    const document = parseOwnedUiSettingsDocument(raw);
    return document === null ? DEFAULTS : resolveLaunchValues(document, OWNED_UI_SETTINGS_MIGRATIONS);
  } catch {
    return DEFAULTS;
  }
}

export async function readResidentTabsSetting(
  profileDir: string,
  namespace = "a1",
  legacyConfigDir?: string,
  profileId = namespace,
): Promise<boolean> {
  return (await readResidentTabLaunchSettings(profileDir, namespace, legacyConfigDir, profileId)).residentTabs;
}

function resolveLaunchValues(
  document: OwnedUiSettingsDocument,
  migrations: typeof OWNED_UI_SETTINGS_MIGRATIONS,
): ResidentTabLaunchSettings {
  const resolution = resolveOwnedUiSettings({
    declarations: [
      OWNED_SETTING_DECLARATIONS.residentTabs,
      OWNED_SETTING_DECLARATIONS.tabsMaxConcurrentStarts,
      OWNED_SETTING_DECLARATIONS.tabsUnresponsiveRestartSeconds,
      OWNED_SETTING_DECLARATIONS.tabsStallNoticeSeconds,
    ],
    migrations,
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
}
