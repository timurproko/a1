import { writePiSettingsMetadata } from "../../scripts/pi/build-pi-settings-metadata.mjs";

/**
 * Vitest reads `src/`, where the generated Pi settings metadata is not committed; write it
 * beside the source module from the pinned engine before any suite loads the bridge.
 */
export default function setup(): void {
  writePiSettingsMetadata("src");
}
