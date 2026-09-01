import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const SETTINGS_APP = "src/features/owned-ui/settings-app.ts";
const PROVENANCE = "config/baselines/pi-session-shell-provenance.json";
const REFERENCE = "docs/architecture/ui-reference-provenance.md";

describe("owned settings interaction boundary", () => {
  it("composes explicit search from shared input and shortcut authorities", async () => {
    const source = await readFile(SETTINGS_APP, "utf8");
    expect(source).toContain("renderInputRow(input, width, { placeholder: SEARCH_PLACEHOLDER })");
    expect(source).toContain("SETTINGS_SHORTCUTS.hint(SCOPE)");
    expect(source).toContain('key: "/"');
    expect(source).not.toContain('key: "printable"');
    expect(source).not.toContain("renderPinnedSettingsSearch");
  });

  it("delegates wheel distance to the shared configured policy", async () => {
    const source = await readFile(SETTINGS_APP, "utf8");
    expect(source).toContain("scrollbarWheelRows(this.#scrollbarSpeed())");
    expect(source).not.toMatch(/wheel-down[^\n]+\?\s*[3698]\s*:/u);
  });

  it("declares the owned interaction in both provenance authorities", async () => {
    const [provenance, reference] = await Promise.all([
      readFile(PROVENANCE, "utf8"),
      readFile(REFERENCE, "utf8"),
    ]);
    for (const source of [provenance, reference]) {
      expect(source).toContain("explicit");
      expect(source).toContain("shortcut-derived");
      expect(source).toContain("scrollbar");
    }
  });
});
