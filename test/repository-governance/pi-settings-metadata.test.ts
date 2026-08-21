import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractPiSettingsMetadata } from "../../scripts/pi-settings-metadata.mjs";
import { METADATA_PATH, renderMetadata } from "../../scripts/update-pi-settings-metadata.mjs";

describe("Pi settings presentation metadata", () => {
  it("matches what the pinned engine currently declares", () => {
    // Regenerating must be a no-op. When a Pi upgrade rewords, reorders, or adds
    // a setting, this fails until `npm run update:pi-settings-metadata` is rerun,
    // so what A1 shows cannot silently drift from what the engine shows.
    expect(readFileSync(METADATA_PATH, "utf8")).toBe(renderMetadata());
  });

  it("covers the engine's presented order rather than a sorted guess", () => {
    const metadata = extractPiSettingsMetadata();
    expect(metadata.order.length).toBeGreaterThan(20);
    expect(metadata.order[0]).toBe("autoCompact");
    expect(metadata.order.at(-1)).toBe("theme");
    expect([...metadata.order].sort()).not.toEqual(metadata.order);
  });

  it("declares the flags a dialog-backed setting offers, with their defaults", () => {
    const metadata = extractPiSettingsMetadata();
    // Taken from the declaration, not from a stored value: an unset flag still
    // has a row, which is why an untouched profile still shows something.
    expect(metadata.dialogs.warnings.length).toBeGreaterThan(0);
    for (const flag of metadata.dialogs.warnings) {
      expect(flag.key).not.toHaveLength(0);
      expect(flag.label).not.toHaveLength(0);
      expect(typeof flag.fallback).toBe("boolean");
    }
  });

  it("marks the settings the engine opens a dialog for", () => {
    const metadata = extractPiSettingsMetadata();
    expect(metadata.settings["warnings"]?.opensDialog).toBe(true);
    expect(metadata.settings["theme"]?.opensDialog).toBe(true);
    expect(metadata.settings["autoCompact"]?.opensDialog).toBe(false);
  });
});
