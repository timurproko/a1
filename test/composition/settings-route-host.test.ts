import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createOwnedRouteHost } from "../../src/composition/index.js";
import { applyPiTheme } from "../../src/integrations/pi/components/index.js";
import {
  OwnedUiSettingsSession,
  OwnedUiSettingsStore,
  type OwnedUiSettingDeclaration,
} from "../../src/ui/settings/index.js";

const ESC = "\u001b";
const STYLE = new RegExp(`${ESC}\\[[0-9;]*m`, "gu");
const DOWN = `${ESC}[B`;
const DECLARATIONS: readonly OwnedUiSettingDeclaration[] = [{
  id: "mode",
  description: "Menu contrast fixture.",
  application: "live",
  defaultValue: "auto",
  allowedValues: ["auto", "always", "hidden"],
}];
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("owned settings route theme", () => {
  it("renders a dark floating panel and a lighter white-text active choice", async () => {
    applyPiTheme("dark", false, "truecolor");
    const root = mkdtempSync(path.join(tmpdir(), "a1-settings-menu-theme-"));
    roots.push(root);
    const session = new OwnedUiSettingsSession({
      store: new OwnedUiSettingsStore({ configDir: root, profileId: "a1", declarations: DECLARATIONS, migrations: [] }),
      agent: null,
    });
    await session.load();

    const surface = createOwnedRouteHost(session).open("settings");
    expect(surface).not.toBeNull();
    await Promise.resolve();
    const initial = surface!.render(48, 12);
    const row = initial.findIndex(line => line.replace(STYLE, "").includes("Mode"));
    const column = (initial[row] ?? "").replace(STYLE, "").indexOf("auto") + 1;
    surface!.handleMouse({ kind: "press", button: 0, row: row + 1, column });
    surface!.handleInput(DOWN);

    const menu = surface!.render(48, 12).join("\n");
    expect(menu).toContain(`${ESC}[48;2;55;55;55m✓ auto `);
    expect(menu).toContain(`${ESC}[48;2;82;82;82m${ESC}[97m  always `);
    expect(menu).toContain(`${ESC}[39m${ESC}[49m`);
  });
});
