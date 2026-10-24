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
  it("propagates live scope changes to running solo processes in both directions", async () => {
    const settingsTab = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const soloOne = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const soloTwo = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const scopes: [string[], string[]] = [[], []];
    soloOne.onChange(current => scopes[0].push(current.value("promptHistoryScope")));
    soloTwo.onChange(current => scopes[1].push(current.value("promptHistoryScope")));
    const stopOne = watchSharedSettings(soloOne);
    const stopTwo = watchSharedSettings(soloTwo);
    try {
      await settingsTab.change("a1", "promptHistoryScope", "shared");
      await vi.waitFor(() => expect(scopes).toEqual([["shared"], ["shared"]]), { timeout: 5_000, interval: 50 });
      await settingsTab.change("a1", "promptHistoryScope", "unique");
      await vi.waitFor(() => expect(scopes).toEqual([["shared", "unique"], ["shared", "unique"]]), { timeout: 5_000, interval: 50 });
    } finally { stopOne(); stopTwo(); }
  });

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
