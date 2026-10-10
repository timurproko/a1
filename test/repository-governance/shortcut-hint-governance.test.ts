import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : entry.isFile() && path.endsWith(".ts") ? [path.replaceAll("\\", "/")] : [];
  });
}

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

  it("routes semantic hints through the owned or pinned central adapter", () => {
    const directConsumers = sourceFiles("src")
      .filter(path => path !== "src/contracts/presentation/index.ts")
      .filter(path => readFileSync(path, "utf8").includes("renderSemanticShortcutHints"));
    expect(directConsumers.sort()).toEqual([
      "src/integrations/pi/components/theme.ts",
      "src/ui/components/shortcut-hints.ts",
    ]);
  });

  it("declares no key twice within one screen", () => {
    for (const screen of SCREENS) {
      const duplicates = assembleShortcuts([...screen.registry.list()]).conflicts.filter(one => one.kind === "duplicate");
      expect(duplicates, `${screen.scope} declares a key twice`).toEqual([]);
    }
  });
});
