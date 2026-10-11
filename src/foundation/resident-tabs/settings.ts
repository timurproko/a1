import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseOwnedUiSettingsDocument, resolveResidentTabsSetting } from "../../ui/settings/index.js";

const MAX_SETTINGS_BYTES = 256 * 1024;

/** Read only the routing flag before any UI or extension module is loaded. */
export async function readResidentTabsSetting(configDir: string, profileId = "a1"): Promise<boolean> {
  const file = resolve(configDir, "settings", `${profileId}.json`);
  try {
    const raw = await readFile(file, "utf8");
    if (Buffer.byteLength(raw, "utf8") > MAX_SETTINGS_BYTES) return false;
    return resolveResidentTabsSetting(parseOwnedUiSettingsDocument(raw));
  } catch {
    return false;
  }
}
