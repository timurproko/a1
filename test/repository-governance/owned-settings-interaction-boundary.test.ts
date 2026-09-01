import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const SETTINGS_APP = "src/features/owned-ui/settings-app.ts";
const SETTINGS_ROUTE_HOST = "src/composition/settings-route-host.ts";
const VALUE_MENU = "src/ui/components/value-menu.ts";
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

  it("keeps scalar contrast at the shared menu and owned theme boundaries", async () => {
    const [host, menu, app] = await Promise.all([
      readFile(SETTINGS_ROUTE_HOST, "utf8"),
      readFile(VALUE_MENU, "utf8"),
      readFile(SETTINGS_APP, "utf8"),
    ]);
    expect(host).toContain("48;2;55;55;55");
    expect(host).toContain("48;2;82;82;82");
    expect(menu).toContain('choice === state.current ? "✓ " : "  "');
    expect(app).not.toContain("48;2;");
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
      expect(source).toContain("floating");
      expect(source).toContain("check mark");
    }
  });
});
