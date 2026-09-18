import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import { readFileSync, realpathSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error — plain shipped JS module without type declarations.
import { inspectPiTuiModuleIdentity } from "../../../bin/module-identity.js";
// @ts-expect-error — plain shipped JS module without type declarations.
import { pinnedPiTuiPackageRoot } from "../../../bin/module-resolver.js";

/**
 * The installed tree, not a fixture: these tests hold the invariant that broke
 * four times — A1's renderer and pinned Pi's extensions sharing one pi-tui module.
 * Earlier repairs (a launch-time junction, a package-imports alias, a proxy file
 * rewritten by postinstall) each depended on npm's physical layout and each
 * silently reintroduced the split. The resolver hook decides identity at the
 * loader instead, so everything here measures what Node actually resolves and
 * loads with the hook installed, never what a manifest appears to say.
 */
const packageRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

function nodeResolvedOwn(): string {
  return realpathSync(createRequire(pathToFileURL(join(packageRoot, "package.json")).href).resolve("@earendil-works/pi-tui"));
}

function nodeResolvedPinned(): string {
  const pi = join(packageRoot, "node_modules", "@earendil-works", "pi-coding-agent");
  return realpathSync(createRequire(pathToFileURL(join(pi, "package.json")).href).resolve("@earendil-works/pi-tui"));
}

describe("pi-tui module identity in the installed tree", () => {
  it("reports one unified module for this checkout", () => {
    const outcome = inspectPiTuiModuleIdentity(packageRoot) as { kind: string; path?: string };
    expect(outcome).toMatchObject({ kind: "unified", path: nodeResolvedPinned() });
  });

  it("resolves the package specifier to the copy pinned Pi resolves", () => {
    // Invariant: with the hook installed, asking Node from A1's own root answers with pinned
    // Pi's copy, whatever layout npm materialized.
    expect(nodeResolvedOwn()).toBe(nodeResolvedPinned());
    expect(nodeResolvedOwn().startsWith(pinnedPiTuiPackageRoot(packageRoot))).toBe(true);
  });

  it("hands A1, pinned Pi, and the hoisted path the same TUI class objects", async () => {
    const own = await import("@earendil-works/pi-tui");
    const pinned = await import(pathToFileURL(nodeResolvedPinned()).href);
    const hoisted = await import(pathToFileURL(join(packageRoot, "node_modules", "@earendil-works", "pi-tui", "dist", "index.js")).href);
    for (const name of ["TuiAltScreen", "TuiMainScreen", "ProcessTerminal", "Text", "Container"] as const) {
      expect(own[name], `${name} must be one class, not two copies`).toBe(pinned[name]);
      expect(hoisted[name], `${name} reached by the hoisted path must be the pinned class`).toBe(pinned[name]);
    }
  });

  it("declares no package-imports alias and no install script for pi-tui", () => {
    // Compatibility: a package-imports target containing a node_modules segment is an Invalid
    // Package Target that Node skips without a word, and npm 12 blocks install scripts by
    // default; neither mechanism may carry module identity again.
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
      imports?: Record<string, unknown>;
      scripts?: Record<string, string>;
    };
    expect(manifest.imports).toBeUndefined();
    expect(manifest.scripts?.postinstall).toBeUndefined();
  });
});
