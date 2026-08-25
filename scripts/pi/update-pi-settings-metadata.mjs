import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extractPiSettingsMetadata } from "./pi-settings-metadata.mjs";

/**
 * Regenerates the settings presentation A1 ships from the pinned engine's own
 * source. Run after a Pi bump; a governance test fails until it is rerun, so the
 * wording, order, and dialog contents cannot silently drift from the engine.
 */

export const METADATA_PATH = "src/integrations/pi/engine/pi-settings-metadata.json";

export function renderMetadata() {
  return `${JSON.stringify(extractPiSettingsMetadata(), null, 2)}\n`;
}

const target = fileURLToPath(new URL(`../../${METADATA_PATH}`, import.meta.url));
writeFileSync(target, renderMetadata(), "utf8");
console.log(`Pi settings metadata written: ${METADATA_PATH}`);
