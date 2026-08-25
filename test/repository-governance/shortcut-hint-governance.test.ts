import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SETTINGS_APP_ID, SETTINGS_SHORTCUTS } from "../../src/features/owned-ui/index.js";
import { assembleShortcuts } from "../../src/ui/components/index.js";

/**
 * A screen says what its keys do in one place. What it tells the reader and what
 * it dispatches are the same declarations, so neither can drift from the other.
 */
const SCREENS = [
  { scope: SETTINGS_APP_ID, source: "src/features/owned-ui/settings-app.ts", registry: SETTINGS_SHORTCUTS },
] as const;

describe("what a screen says about its keys", () => {
  it("describes only keys it binds", () => {
    for (const screen of SCREENS) {
      const bound = new Set(screen.registry.list(screen.scope).map(entry => entry.hint?.keys).filter(Boolean));
      const described = screen.registry.hint(screen.scope).split(" · ").map(part => part.split(" ")[0]);
      for (const keys of described) {
        expect(bound.has(keys), `${screen.scope} describes ${keys}, which nothing binds`).toBe(true);
      }
    }
  });

  it("keeps no written copy of its hint beside the declarations", () => {
    for (const screen of SCREENS) {
      const source = readFileSync(screen.source, "utf8");
      const written = source.match(/"[^"]*·[^"]*"/g) ?? [];
      expect(written, `${screen.source} writes a hint line out instead of deriving it`).toEqual([]);
    }
  });

  it("declares no key twice within one screen", () => {
    for (const screen of SCREENS) {
      const duplicates = assembleShortcuts([...screen.registry.list()]).conflicts.filter(one => one.kind === "duplicate");
      expect(duplicates, `${screen.scope} declares a key twice`).toEqual([]);
    }
  });
});
