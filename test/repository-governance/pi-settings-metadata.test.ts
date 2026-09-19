import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractPiSettingsMetadata } from "../../scripts/pi/pi-settings-metadata.mjs";
import { METADATA_FILE, renderMetadata } from "../../scripts/pi/build-pi-settings-metadata.mjs";
import { assertPiSettingsMetadata, loadPiSettingsMetadata } from "../../src/integrations/pi/engine/index.js";

describe("Pi settings presentation metadata", () => {
  it("is generated from the pinned engine rather than committed", () => {
    // Invariant: the source tree carries no metadata of its own; the test setup and the build
    // write it from the engine, so a Pi upgrade cannot leave stale wording or order behind.
    const tracked = readFileSync(".gitignore", "utf8").split(/\r?\n/u);
    expect(tracked).toContain(`/src/${METADATA_FILE}`);
    expect(loadPiSettingsMetadata()).toEqual(assertPiSettingsMetadata(JSON.parse(renderMetadata())));
  });

  it("ships the same metadata in the built tree when one exists", () => {
    const built = `dist/${METADATA_FILE}`;
    if (!existsSync(built)) return;
    expect(readFileSync(built, "utf8")).toBe(renderMetadata());
  });

  it("rejects metadata that lost a table", () => {
    const metadata = extractPiSettingsMetadata();
    expect(() => assertPiSettingsMetadata({ ...metadata, dialogs: [] })).toThrow(/tables are invalid/u);
    expect(() => assertPiSettingsMetadata({ ...metadata, presented: "theme" })).toThrow(/lists are invalid/u);
    expect(() => assertPiSettingsMetadata({ ...metadata, settings: { theme: { label: "Theme" } } })).toThrow(/presentation is invalid: theme/u);
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
    // Invariant: taken from the declaration, not from a stored value: an unset flag still
    // has a row, which is why an untouched profile still shows something.
    const warnings = metadata.dialogs["warnings"] ?? [];
    expect(warnings.length).toBeGreaterThan(0);
    for (const flag of warnings) {
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
