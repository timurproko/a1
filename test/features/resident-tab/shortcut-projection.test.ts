import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readShortcutBindingsFile } from "../../../src/features/resident-tab/shortcut-bindings-file.js";
import {
  projectResidentTabShortcuts,
  RESIDENT_TAB_GLOBAL_SHORTCUTS,
  type ShortcutBindings,
} from "../../../src/features/resident-tab/shortcut-projection.js";
import cases from "../../fixtures/resident-tab-shortcuts/projection-cases.json" with { type: "json" };

interface ProjectionCase {
  readonly name: string;
  readonly configured: ShortcutBindings;
  readonly reserved: ShortcutBindings;
  readonly assignments: Readonly<Record<string, string | null>>;
}

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { while (cleanups.length) await cleanups.pop()!(); });

describe("resident tab shortcut projection", () => {
  it("covers every global declaration in declaration order", () => {
    expect(RESIDENT_TAB_GLOBAL_SHORTCUTS.map(shortcut => shortcut.id)).toEqual([
      "tabs.new", "tabs.close", "tabs.rename", "tabs.settings", "tabs.changelog", "tabs.commands",
      ...Array.from({ length: 10 }, (_, index) => `tabs.jump${index + 1}`),
      "tabs.next", "tabs.previous", "tabs.moveRight", "tabs.moveLeft",
    ]);
    expect(Object.keys(projectResidentTabShortcuts().assignments)).toEqual(RESIDENT_TAB_GLOBAL_SHORTCUTS.map(shortcut => shortcut.id));
  });

  // Invariant: the native resolver replays the same cases, so both sides dispatch one contract.
  it.each((cases as { cases: ProjectionCase[] }).cases.map(entry => [entry.name, entry] as const))("%s", (_name, entry) => {
    expect(projectResidentTabShortcuts({ configured: entry.configured, reserved: entry.reserved }).assignments).toEqual(entry.assignments);
  });

  it("names why a key was refused", () => {
    const projection = projectResidentTabShortcuts({
      configured: { "tabs.rename": "alt+a", "tabs.close": "ctrl+x" },
      reserved: { "app.message.copy": "ctrl+x" },
    });
    expect(projection.conflicts).toEqual([
      { id: "tabs.close", key: "ctrl+x", reason: "reserved" },
      { id: "tabs.rename", key: "alt+a", reason: "duplicate" },
    ]);
  });

  it("reads the user's bindings file tolerantly and keeps explicit unbinds", async () => {
    const root = await mkdtemp(join(tmpdir(), "resident-shortcuts-"));
    cleanups.push(() => rm(root, { recursive: true, force: true }));
    expect(readShortcutBindingsFile(root)).toEqual({});
    await writeFile(join(root, "keybindings.json"), "﻿" + JSON.stringify({
      $schema: "ignored",
      "tabs.next": "alt+]",
      "tabs.jump2": null,
      "tabs.close": ["alt+x", 7, "alt+w"],
      "app.clear": "ctrl+q",
      "tabs.rename": { unexpected: true },
    }));
    expect(readShortcutBindingsFile(root)).toEqual({
      "tabs.next": "alt+]",
      "tabs.jump2": null,
      "tabs.close": ["alt+x", "alt+w"],
      "app.clear": "ctrl+q",
    });
    await writeFile(join(root, "keybindings.json"), "{not json");
    expect(readShortcutBindingsFile(root)).toEqual({});
  });
});
