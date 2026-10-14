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

export const RESIDENT_TABS_MAX_CONCURRENT_STARTS = 2;
export const RESIDENT_TABS_MAX_CONCURRENT_STARTS_CAP = 8;
export const RESIDENT_TABS_PREWARM_COUNT = 1;
export const RESIDENT_TABS_PREWARM_CAP = 1;

export interface ResidentTabLaunchSettings {
  readonly tabsMax: number;
  readonly tabsAutoName: boolean;
  readonly maxConcurrentStarts: number;
  readonly prewarmCount: number;
  readonly unresponsiveRestartSeconds: number;
  readonly stallNoticeSeconds: number;
}

const DEFAULTS: ResidentTabLaunchSettings = Object.freeze({
  tabsMax: 10,
  tabsAutoName: true,
  maxConcurrentStarts: RESIDENT_TABS_MAX_CONCURRENT_STARTS,
  prewarmCount: RESIDENT_TABS_PREWARM_COUNT,
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

function resolveLaunchValues(
  document: OwnedUiSettingsDocument,
  migrations: typeof OWNED_UI_SETTINGS_MIGRATIONS,
): ResidentTabLaunchSettings {
  const resolution = resolveOwnedUiSettings({
    declarations: [
      OWNED_SETTING_DECLARATIONS.tabsMax,
      OWNED_SETTING_DECLARATIONS.tabsAutoName,
    ],
    migrations,
    document,
    currentVersion: OWNED_UI_SETTINGS_VERSION,
  });
  const tabsMax = (document as { values?: Record<string, unknown> }).values?.["tabsMax"] ?? settingValue(resolution, "tabsMax");
  return {
    tabsMax: typeof tabsMax === "number" && Number.isFinite(tabsMax) ? Math.max(1, Math.min(50, Math.trunc(tabsMax))) : DEFAULTS.tabsMax,
    tabsAutoName: settingValue(resolution, "tabsAutoName") === true,
    maxConcurrentStarts: RESIDENT_TABS_MAX_CONCURRENT_STARTS,
    prewarmCount: RESIDENT_TABS_PREWARM_COUNT,
    unresponsiveRestartSeconds: DEFAULTS.unresponsiveRestartSeconds,
    stallNoticeSeconds: DEFAULTS.stallNoticeSeconds,
  };
}
