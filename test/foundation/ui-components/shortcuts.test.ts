import { describe, expect, it } from "vitest";
import {
  GLOBAL_SCOPE,
  ShortcutRegistry,
  assembleShortcuts,
  assertNoShortcutConflicts,
} from "../../../src/foundation/ui-components/index.js";

const SCREEN = "settings";

function registry(): ShortcutRegistry<"move-up" | "close" | "search"> {
  const target = new ShortcutRegistry<"move-up" | "close" | "search">();
  target.declare({ key: "up", scope: SCREEN, description: "Previous setting", section: "Navigate" }, "move-up");
  target.declare({ key: "/", scope: SCREEN, description: "Search settings", section: "Change" }, "search");
  target.declare({ key: "escape", scope: GLOBAL_SCOPE, description: "Close", section: "Screen" }, "close");
  return target;
}

describe("dispatching a declared shortcut", () => {
  it("invokes what the screen declared", () => {
    expect(registry().resolve("up", SCREEN)).toBe("move-up");
  });

  it("falls through to a global from any screen", () => {
    expect(registry().resolve("escape", SCREEN)).toBe("close");
    expect(registry().resolve("escape", "another-screen")).toBe("close");
  });

  it("passes on a key declared for another screen", () => {
    expect(registry().resolve("up", "another-screen")).toBeNull();
  });

  it("passes on a key nobody declared", () => {
    expect(registry().resolve("f7", SCREEN)).toBeNull();
  });

  it("prefers the screen's own binding over a global one", () => {
    const target = new ShortcutRegistry<"screen" | "global">();
    target.declare({ key: "escape", scope: GLOBAL_SCOPE, description: "Close" }, "global");
    target.declare({ key: "escape", scope: SCREEN, description: "Cancel the edit" }, "screen");
    expect(target.resolve("escape", SCREEN)).toBe("screen");
    expect(target.resolve("escape", "elsewhere")).toBe("global");
  });
});

describe("conflicting declarations", () => {
  it("names both when one scope claims a key twice", () => {
    const result = assembleShortcuts([
      { key: "up", scope: SCREEN, description: "Previous setting" },
      { key: "up", scope: SCREEN, description: "Previous section" },
    ]);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.kind).toBe("duplicate");
    expect(result.conflicts[0]?.descriptions).toEqual(["Previous setting", "Previous section"]);
    expect(() => assertNoShortcutConflicts(result))
      .toThrow(/up is declared twice in scope settings: "Previous setting" and "Previous section"/);
  });

  it("reports a screen shadowing a global rather than resolving it quietly", () => {
    const result = assembleShortcuts([
      { key: "escape", scope: GLOBAL_SCOPE, description: "Close" },
      { key: "escape", scope: SCREEN, description: "Cancel the edit" },
    ]);
    expect(result.conflicts[0]?.kind).toBe("shadowed");
    expect(result.conflicts[0]?.scopes).toEqual([GLOBAL_SCOPE, SCREEN]);
    // Shadowing is declared intent, so it is reported without failing.
    expect(() => assertNoShortcutConflicts(result)).not.toThrow();
  });

  it("leaves the same key in two unrelated screens alone", () => {
    const result = assembleShortcuts([
      { key: "up", scope: SCREEN, description: "Previous setting" },
      { key: "up", scope: "sessions", description: "Previous session" },
    ]);
    expect(result.conflicts).toEqual([]);
  });
});

describe("the listing", () => {
  it("is derived from the declarations dispatch reads", () => {
    const target = registry();
    const listed = target.list(SCREEN);
    // Grouped by section, then by key: Change, Navigate, Screen.
    expect(listed.map(entry => entry.key)).toEqual(["/", "up", "escape"]);
    for (const entry of listed) {
      expect(target.resolve(entry.key, SCREEN), `${entry.key} is listed but dispatches nothing`).not.toBeNull();
    }
  });

  it("includes a newly declared shortcut without a second edit", () => {
    const target = registry();
    expect(target.list(SCREEN).some(entry => entry.key === "end")).toBe(false);
    target.declare({ key: "end", scope: SCREEN, description: "Last setting", section: "Navigate" }, "move-up");
    expect(target.list(SCREEN).some(entry => entry.key === "end")).toBe(true);
  });

  it("leaves another screen's shortcuts out", () => {
    const target = registry();
    target.declare({ key: "n", scope: "sessions", description: "New session" }, "search");
    expect(target.list(SCREEN).some(entry => entry.key === "n")).toBe(false);
    expect(target.list().some(entry => entry.key === "n")).toBe(true);
  });
});
