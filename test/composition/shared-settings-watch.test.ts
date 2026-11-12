import { pbkdf2 } from "node:crypto";
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
  it("propagates live scope changes between running processes in both directions", async () => {
    const settingsTab = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const firstProcess = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const secondProcess = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const scopes: [string[], string[]] = [[], []];
    firstProcess.onChange(current => scopes[0].push(current.value("promptHistoryScope")));
    secondProcess.onChange(current => scopes[1].push(current.value("promptHistoryScope")));
    const stopOne = watchSharedSettings(firstProcess);
    const stopTwo = watchSharedSettings(secondProcess);
    try {
      await settingsTab.change("a1", "promptHistoryScope", "shared");
      await vi.waitFor(() => expect(scopes).toEqual([["shared"], ["shared"]]), { timeout: 5_000, interval: 50 });
      await settingsTab.change("a1", "promptHistoryScope", "unique");
      await vi.waitFor(() => expect(scopes).toEqual([["shared", "unique"], ["shared", "unique"]]), { timeout: 5_000, interval: 50 });
    } finally { stopOne(); stopTwo(); }
  });

  it("shares the startup preference without recoloring running sessions", async () => {
    const settingsTab = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const agentTab = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const accents: string[] = [];
    agentTab.onChange(current => accents.push(current.value("accentColor")));
    const stop = watchSharedSettings(agentTab);
    try {
      await settingsTab.change("a1", "accentColor", "pink");
      await settingsTab.change("a1", "defaultAccentColor", "cyan");
      await vi.waitFor(() => expect(agentTab.pendingValue("defaultAccentColor")).toBe("cyan"), { timeout: 5_000, interval: 50 });
      expect(accents).toEqual(["blue"]);
      expect(settingsTab.value("accentColor")).toBe("pink");
      agentTab.startSession();
      expect(agentTab.value("accentColor")).toBe("cyan");
    } finally {
      stop();
    }
  });

  it("reports a peer save made right after watching starts while the thread pool is saturated", async () => {
    const saturation = Array.from({ length: 8 }, () => new Promise(done => pbkdf2("a1", "watch", 200_000, 64, "sha512", () => done(undefined))));
    const settingsTab = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const agentTab = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const accents: string[] = [];
    agentTab.onChange(current => accents.push(current.value("accentColor")));
    const stop = watchSharedSettings(agentTab);
    try {
      await settingsTab.change("a1", "defaultAccentColor", "cyan");
      await Promise.all(saturation);
      await vi.waitFor(() => expect(accents).toEqual(["blue"]), { timeout: 5_000, interval: 50 });
    } finally {
      stop();
    }
  });
});
