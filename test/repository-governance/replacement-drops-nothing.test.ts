import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SettingsManager } from "@earendil-works/pi-coding-agent";
import { PiSettingsIntegration } from "../../src/integrations/pi/engine/index.js";
import { OwnedUiSettingsSession, OwnedUiSettingsStore } from "../../src/ui/settings/index.js";
import { SETTINGS_ROUTE, SettingsApp } from "../../src/features/owned-ui/index.js";
import type { AppHostServices } from "../../src/ui/apps/index.js";

/**
 * A surface that replaces a pinned route promises to keep everything that route
 * could do. For the settings screen that means every setting the engine reports
 * is reachable from it. This is checked directly rather than through the parity
 * comparison, which no longer sees A1's own surfaces at all.
 */
const HOST: AppHostServices = {
  getSize: () => ({ width: 200, height: 200 }),
  requestRender: () => {},
  close: () => {},
  returnToPrevious: () => {},
  exit: () => {},
  interruptArmed: false,
  closeOnInterrupt: true,
};

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "a1-replacement-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe(`the ${SETTINGS_ROUTE} screen, which supersedes the pinned selector`, () => {
  it("reaches every setting the engine reports", async () => {
    const engine = new PiSettingsIntegration(SettingsManager.inMemory({}), {
      themes: () => ["dark", "light"],
      thinkingLevels: () => ["low", "high"],
    });
    const reported = (await engine.listSettings()).map(descriptor => descriptor.key);

    const store = new OwnedUiSettingsStore({ configDir: root, profileId: "parity", declarations: [], migrations: [] });
    const session = new OwnedUiSettingsSession({ store, agent: engine });
    await session.load();

    const reachable = new Set(
      session.sections().flatMap(section => section.entries.filter(entry => entry.backend === "agent").map(entry => entry.id)),
    );
    const missing = reported.filter(key => !reachable.has(key));
    expect(missing, `the settings screen cannot reach: ${missing.join(", ")}`).toEqual([]);
  });

  it("shows each of them on screen, not merely in its model", async () => {
    const engine = new PiSettingsIntegration(SettingsManager.inMemory({}), {
      themes: () => ["dark", "light"],
      thinkingLevels: () => ["low", "high"],
    });
    const store = new OwnedUiSettingsStore({ configDir: root, profileId: "parity", declarations: [], migrations: [] });
    const session = new OwnedUiSettingsSession({ store, agent: engine });
    await session.load();

    const screen = new SettingsApp(session)
      .render({ width: 200, height: 200 }, HOST)
      .map(line => line.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), ""))
      .join("\n");

    for (const descriptor of await engine.listSettings()) {
      const shown = descriptor.label ?? descriptor.key;
      expect(screen, `${descriptor.key} is reported by the engine but not drawn`).toContain(shown);
    }
  });
});
