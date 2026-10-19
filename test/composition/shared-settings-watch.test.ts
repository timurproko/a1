import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchSharedSettings } from "../../src/composition/owned-ui.js";
import { OwnedSettingsManager } from "../../src/ui/settings/index.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "a1-shared-settings-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("shared settings watch", () => {
  it("applies a setting saved by another tab to every running tab", async () => {
    const settingsTab = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const agentTab = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const accents: string[] = [];
    agentTab.onChange(current => accents.push(current.value("accentColor")));
    const stop = watchSharedSettings(agentTab);
    try {
      await settingsTab.change("a1", "accentColor", "cyan");
      await vi.waitFor(() => expect(accents).toEqual(["cyan"]), { timeout: 5_000, interval: 50 });
    } finally {
      stop();
    }
  });
});
