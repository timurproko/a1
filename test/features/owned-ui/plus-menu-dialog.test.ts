import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PLUS_MENU_SETTING_ID, PlusMenuDialog } from "../../../src/features/owned-ui/plus-menu-dialog.js";
import { PLAIN_THEME } from "../../../src/ui/components/index.js";
import { OwnedSettingsManager, findOwnedUiSettingsEntry } from "../../../src/ui/settings/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

const KINDS = [
  { key: "agent", label: "Agent" },
  { key: "settings", label: "Settings" },
  { key: "changelog", label: "Changelog" },
];

const roots: string[] = [];
afterEach(() => { while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true }); });

describe("plus-menu dialog", () => {
  it("marks enabled kinds, toggles the selected one with Space, and filters by typed text", () => {
    const dialog = new PlusMenuDialog(KINDS);
    const record: Record<string, boolean> = { agent: true, settings: false, changelog: false };
    const toggle = (key: string) => { record[key] = !record[key]; };
    const rows = () => dialog.lines(record, 40, PLAIN_THEME).map(line => line.trimEnd());
    expect(rows()).toContain("  → ● Agent");
    expect(rows()).toContain("    ○ Settings");
    expect(rows().join("\n")).toContain("Type search");
    expect(rows().join("\n")).toContain("Esc close");
    expect(rows().join("\n")).not.toContain(" · ");
    expect(dialog.handle("down", "\u001b[B", toggle)).toBe("handled");
    dialog.handle("space", " ", toggle);
    expect(record.settings).toBe(true);
    expect(rows()).toContain("  → ● Settings");
    for (const character of "chan") dialog.handle(character, character, toggle);
    expect(dialog.shown().map(kind => kind.key)).toEqual(["changelog"]);
    dialog.handle("space", " ", toggle);
    expect(record.changelog).toBe(true);
    expect(dialog.handle("escape", "\u001b", toggle)).toBe("close");
  });

  it("names nothing when the filter matches no kind", () => {
    const dialog = new PlusMenuDialog(KINDS);
    for (const character of "zzz") dialog.handle(character, character, () => undefined);
    expect(dialog.lines({}, 40, PLAIN_THEME).map(line => line.trim())).toContain("No tabs match");
  });
});

describe("plus-menu setting", () => {
  it("defaults to Agent alone and stores toggles as kinds in order", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "a1-plus-menu-"));
    roots.push(root);
    const manager = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    await manager.load();
    expect(manager.value("tabBarPlusMenu")).toBe("agent");
    const entry = findOwnedUiSettingsEntry(manager.sections(), PLUS_MENU_SETTING_ID, "a1");
    expect(entry?.structured).toBe(true);
    expect(entry?.rawValue).toEqual({ agent: true, settings: false, changelog: false });
    const outcome = await manager.changeStructured("a1", PLUS_MENU_SETTING_ID, { changelog: true, agent: true, settings: false });
    expect(outcome).toMatchObject({ status: "applied", storedValue: "agent,changelog" });
    expect(manager.value("tabBarPlusMenu")).toBe("agent,changelog");
    const document = JSON.parse(readFileSync(path.join(root, "settings.json"), "utf8")) as Record<string, Record<string, unknown>>;
    expect(document[PRODUCT_IDENTITY.commandName]?.["tabBarPlusMenu"]).toBe("agent,changelog");
  });
});
