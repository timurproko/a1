import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";
import { OwnedSettingsManager } from "../../../src/ui/settings/index.js";

let root: string;
const manager = () => new OwnedSettingsManager({ configDir: root, profileId: "a1" });
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "session-colors-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

describe("default and current session colors", () => {
  it("retains invocation initialization across live changes, peer reloads, and replacements without persistence", async () => {
    const saved = manager();
    await saved.change("a1", "defaultAccentColor", "pink");
    const bytes = readFileSync(saved.file, "utf8");
    const session = new OwnedSettingsManager({ configDir: root, profileId: "a1", sessionColor: "green" });
    expect(session.value("accentColor")).toBe("green");
    expect(readFileSync(saved.file, "utf8")).toBe(bytes);
    await session.change("a1", "accentColor", "orange");
    await saved.change("a1", "defaultAccentColor", "cyan");
    session.refresh(); await session.load();
    expect(session.value("accentColor")).toBe("orange");
    for (const _workflow of ["new", "resume", "fork", "import"]) {
      session.startSession();
      expect(session.value("accentColor")).toBe("green");
      await session.change("a1", "accentColor", "grey");
    }
    expect(manager().value("accentColor")).toBe("cyan");
    expect(JSON.parse(readFileSync(saved.file, "utf8"))[PRODUCT_IDENTITY.commandName]).toEqual({ defaultAccentColor: "cyan" });
  });
  it("ignores legacy accents while retaining them on unrelated writes", async () => {
    const file = join(root, "settings.json");
    writeFileSync(file, JSON.stringify({ [PRODUCT_IDENTITY.commandName]: { accentColor: "purple", future: { keep: true } } }));
    const session = manager();
    expect(session.value("accentColor")).toBe("blue");
    await session.change("a1", "accentColor", "grey");
    await session.change("a1", "scrollbarSpeed", "fast");
    expect(JSON.parse(readFileSync(file, "utf8"))[PRODUCT_IDENTITY.commandName]).toEqual({ accentColor: "purple", future: { keep: true }, scrollbarSpeed: "fast" });
    await session.load();
    expect(session.value("accentColor")).toBe("grey");
  });

  it("persists the default without changing either live session, then starts from the latest default", async () => {
    const one = manager(), two = manager();
    await one.change("a1", "accentColor", "pink");
    await two.change("a1", "accentColor", "orange");
    expect(await one.change("a1", "defaultAccentColor", "green")).toMatchObject({ status: "deferred", application: "next-start", storedValue: "green", effectiveValue: "blue" });
    two.refresh();
    expect([one.value("accentColor"), two.value("accentColor")]).toEqual(["pink", "orange"]);
    expect(manager().value("accentColor")).toBe("green");
    await two.change("a1", "defaultAccentColor", "cyan");
    one.startSession();
    expect(one.value("accentColor")).toBe("cyan");
    expect(one.pendingValue("defaultAccentColor")).toBeNull();
    expect(two.value("accentColor")).toBe("orange");
    expect(JSON.parse(readFileSync(one.file, "utf8"))[PRODUCT_IDENTITY.commandName]).toEqual({ defaultAccentColor: "cyan" });
  });

  it("validates both menus and keeps session writes independent of profile write failures", async () => {
    const session = manager();
    writeFileSync(session.file, "invalid JSON");
    expect(await session.change("a1", "accentColor", "grey")).toMatchObject({ applied: true });
    expect(await session.change("a1", "defaultAccentColor", "green")).toMatchObject({ status: "failed" });
    expect(await session.change("a1", "accentColor", "automatic")).toMatchObject({ status: "failed" });
    expect(session.value("accentColor")).toBe("grey");
    session.startSession();
    expect(session.value("accentColor")).toBe("blue");
  });

  it("keeps saved and current values separate and supports undo at each scope", async () => {
    const session = manager();
    await session.change("a1", "accentColor", "pink");
    await session.change("a1", "defaultAccentColor", "grey");
    const entries = session.sections().find(group => group.id === "appearance")!.entries;
    expect(entries.slice(0, 2)).toMatchObject([
      { id: "defaultAccentColor", label: "Default color", value: "grey", effectiveValue: "blue", application: "next-start" },
      { id: "accentColor", label: "Current color", value: "pink", effectiveValue: "pink", application: "live" },
    ]);
    expect(entries[0]!.choices).toEqual(entries[1]!.choices);
    await session.change("a1", "defaultAccentColor", "blue");
    expect(session.value("accentColor")).toBe("pink");
    await session.change("a1", "accentColor", "blue");
    expect(session.value("accentColor")).toBe("blue");
    expect(manager().value("accentColor")).toBe("blue");
  });
});
