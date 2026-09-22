import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOwnedRouteHost } from "../../src/composition/index.js";
import { applyPiTheme } from "../../src/integrations/pi/components/index.js";
import {
  OwnedSettingsManager,
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

describe("owned settings route opening", () => {
  it("renders blank rows until the settings module has loaded", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "a1-settings-open-"));
    roots.push(root);
    const session = new OwnedSettingsManager({
      configDir: root, profileId: "a1", declarations: DECLARATIONS, migrations: [],
      agent: null,
    });
    await session.load();

    const surface = createOwnedRouteHost(session).open("settings");
    expect(surface).not.toBeNull();
    // Invariant: the very first paint precedes the dynamic import, so it must carry no text.
    const first = surface!.render(48, 12);
    expect(first).toHaveLength(12);
    expect(first.every(line => line === "")).toBe(true);
    expect(surface!.render(48, 0)).toEqual([]);

    let loaded = surface!.render(48, 12);
    for (let attempt = 0; attempt < 200 && !loaded.some(line => line.replace(STYLE, "").includes("Mode")); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 10));
      loaded = surface!.render(48, 12);
    }
    expect(loaded.some(line => line.replace(STYLE, "").includes("Mode"))).toBe(true);
    expect(loaded.join("\n")).not.toContain("Loading settings");
    surface!.close();
  });
});

describe("owned settings route theme", () => {
  it("renders a dark floating panel and a lighter white-text active choice", async () => {
    applyPiTheme("dark", false, "truecolor");
    const root = mkdtempSync(path.join(tmpdir(), "a1-settings-menu-theme-"));
    roots.push(root);
    const session = new OwnedSettingsManager({
      configDir: root, profileId: "a1", declarations: DECLARATIONS, migrations: [],
      agent: null,
    });
    await session.load();

    const surface = createOwnedRouteHost(session).open("settings");
    expect(surface).not.toBeNull();
    let initial = surface!.render(48, 12);
    for (let attempt = 0; attempt < 200 && !initial.some(line => line.replace(STYLE, "").includes("Mode")); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 10));
      initial = surface!.render(48, 12);
    }
    expect(initial[0]).toContain(`${ESC}[38;2;95;135;255m`);
    expect(initial[0]?.replace(STYLE, "")).toBe("─".repeat(48));
    expect(initial[1]).toContain(`${ESC}[38;2;138;190;183mSettings`);
    expect(initial[1]?.replace(STYLE, "").trimEnd()).toBe(" Settings");
    expect(initial.some(line => line.includes(`${ESC}[38;2;240;198;116m`))).toBe(true);

    const row = initial.findIndex(line => line.replace(STYLE, "").includes("Mode"));
    const column = (initial[row] ?? "").replace(STYLE, "").indexOf("auto") + 1;
    surface!.handleMouse({ kind: "press", button: 0, row: row + 1, column });
    surface!.handleInput(DOWN);

    const menu = surface!.render(48, 12).join("\n");
    expect(menu).toContain(`${ESC}[48;2;55;55;55m${ESC}[38;2;138;190;183m✓`);
    expect(menu).toContain(`${ESC}[48;2;82;82;82m${ESC}[97m  always `);
    expect(menu).toContain(`${ESC}[39m${ESC}[49m`);
  });
});

const PLAIN = (line: string) => line.replace(STYLE, "");

async function settled(surface: { render(width: number, height: number): readonly string[] }, until: (lines: string[]) => boolean, width = 60, height = 8): Promise<string[]> {
  let lines = surface.render(width, height).map(PLAIN);
  for (let attempt = 0; attempt < 200 && !until(lines); attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 5));
    lines = surface.render(width, height).map(PLAIN);
  }
  return lines;
}

async function manager(): Promise<OwnedSettingsManager> {
  const root = mkdtempSync(path.join(tmpdir(), "a1-reference-route-"));
  roots.push(root);
  const session = new OwnedSettingsManager({ configDir: root, profileId: "a1", declarations: DECLARATIONS, migrations: [], agent: null });
  await session.load();
  return session;
}

describe("owned reference routes", () => {
  it("claims the reference routes only when their documents are supplied", async () => {
    const session = await manager();
    const withoutReferences = createOwnedRouteHost(session);
    expect(withoutReferences.claims("settings")).toBe(true);
    expect(withoutReferences.claims("changelog")).toBe(false);
    expect(withoutReferences.claims("hotkeys")).toBe(false);
    expect(withoutReferences.open("changelog")).toBeNull();

    const host = createOwnedRouteHost(session, {
      changelog: async () => ({ rows: () => ["log"] }),
      hotkeys: async () => ({ sections: () => [{ title: "Keys", rows: ["keys"] }] }),
    });
    expect(host.claims("settings")).toBe(true);
    expect(host.claims("changelog")).toBe(true);
    expect(host.claims("hotkeys")).toBe(true);
    expect(host.claims("unknown")).toBe(false);
    expect(host.open("unknown")).toBeNull();
  });

  it("opens the changelog with the complete document or the supplied one, and the hotkeys as gathered at open time", async () => {
    applyPiTheme("dark", false, "truecolor");
    const session = await manager();
    const changelog = vi.fn(async (input?: { document?: string }) => ({ rows: (width: number) => [`changelog ${input?.document ?? "complete"} at ${width}`] }));
    let shortcut = "first";
    const hotkeys = vi.fn(async () => {
      const captured = shortcut;
      return { sections: (width: number) => [{ title: `hotkeys ${captured}`, rows: [`table at ${width}`] }] };
    });
    const host = createOwnedRouteHost(session, { changelog, hotkeys });

    const complete = host.open("changelog")!;
    expect(complete.id).toBe("changelog");
    // Invariant: no loading notice: the screen is blank until the document is drawn.
    expect(complete.render(60, 8).map(PLAIN).every(line => line.trim() === "")).toBe(true);
    let lines = await settled(complete, current => current[1]?.includes("What's New") === true);
    expect(changelog).toHaveBeenCalledWith(undefined);
    // Compatibility: the v2 frame: a rule, the title leading the document, a rule, the hint.
    expect(lines[0]).toBe("─".repeat(60));
    expect(lines[1]?.startsWith(" What's New")).toBe(true);
    expect(lines[2]?.startsWith("changelog complete at 58")).toBe(true);
    expect(lines[6]).toBe("─".repeat(60));
    expect(lines.at(-1)?.startsWith("esc close • ↑↓ scroll")).toBe(true);
    complete.close();
    expect(complete.isClosed()).toBe(true);

    const supplied = host.open("changelog", { document: "0.85.2 notes" })!;
    lines = await settled(supplied, current => current[2]?.startsWith("changelog") === true);
    expect(changelog).toHaveBeenLastCalledWith({ document: "0.85.2 notes" });
    expect(lines[2]?.startsWith("changelog 0.85.2 notes at 58")).toBe(true);
    supplied.close();

    const keys = host.open("hotkeys")!;
    expect(keys.id).toBe("hotkeys");
    lines = await settled(keys, current => current[3]?.startsWith(" hotkeys") === true);
    expect(lines[1]?.startsWith(" Keyboard Shortcuts")).toBe(true);
    expect(lines[2]?.trim()).toBe("");
    expect(lines[3]?.trimEnd()).toBe(" hotkeys first");
    expect(lines[4]?.startsWith("table at 58")).toBe(true);
    keys.close();
    shortcut = "second";
    const reopened = host.open("hotkeys")!;
    lines = await settled(reopened, current => current[3]?.startsWith(" hotkeys") === true);
    expect(lines[2]?.trim()).toBe("");
    expect(lines[3]?.trimEnd()).toBe(" hotkeys second");
    expect(lines[4]?.startsWith("table at 58")).toBe(true);
    reopened.close();
  });

  it("forwards keys and pointer reports to the screen and propagates close and exit", async () => {
    const session = await manager();
    const rows = Array.from({ length: 30 }, (_row, index) => `row ${String(index + 1).padStart(2, "0")}`);
    const host = createOwnedRouteHost(session, {
      changelog: async () => ({ rows: () => rows }),
      hotkeys: async () => ({ sections: () => [{ title: "Keys", rows }] }),
    });
    const surface = host.open("changelog")!;
    let renders = 0;
    let exits = 0;
    surface.onRenderRequested(() => { renders += 1; });
    surface.onExitRequested(() => { exits += 1; });
    // Invariant: input before the module loads is retained and replayed to the screen.
    expect(surface.handleInput(DOWN)).toBe(true);
    let lines = await settled(surface, current => current[2]?.startsWith("row") === true);
    expect(lines[1]?.startsWith("row 01")).toBe(true);
    expect(renders).toBeGreaterThan(0);

    expect(surface.handleMouse({ kind: "wheel-down", button: 0, row: 4, column: 10 })).toBe(true);
    expect(surface.render(60, 8).map(PLAIN)[2]?.startsWith("row 05")).toBe(true);
    expect(surface.handleInput(`${ESC}[F`)).toBe(true);
    expect(surface.render(60, 8).map(PLAIN)[1]?.startsWith("row 26")).toBe(true);
    expect(surface.isClosed()).toBe(false);

    expect(surface.handleInput(ESC)).toBe(true);
    expect(surface.isClosed()).toBe(true);
    expect(exits).toBe(0);

    const chord = host.open("hotkeys")!;
    let chordExits = 0;
    chord.onExitRequested(() => { chordExits += 1; });
    await settled(chord, current => current[2]?.startsWith("row") === true);
    chord.handleInput("\u0003");
    expect(chord.isClosed()).toBe(false);
    chord.handleInput("\u0003");
    expect(chord.isClosed()).toBe(true);
    expect(chordExits).toBe(1);
  });

  it("reports a failing document provider as a loading failure", async () => {
    const session = await manager();
    const host = createOwnedRouteHost(session, {
      changelog: async () => { throw new Error("changelog unreadable"); },
      hotkeys: async () => ({ sections: () => [] }),
    });
    const surface = host.open("changelog")!;
    const lines = await settled(surface, current => current[0]?.startsWith("Could not") === true);
    expect(lines[0]).toBe("Could not load What's New: changelog unreadable");
    expect(surface.isClosed()).toBe(false);
    expect(surface.handleInput(ESC)).toBe(true);
    surface.close();
    expect(surface.isClosed()).toBe(true);
  });
});
