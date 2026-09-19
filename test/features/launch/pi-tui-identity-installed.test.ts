import { spawnSync } from "node:child_process";
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

// Compatibility: CommonJS resolution consults synchronous loader hooks from Node 23.5, so on
// Node 22 an in-process `require.resolve` measures the unhooked layout, and the test transformer
// offers no `import.meta.resolve`. The product resolves through the ESM loader from its bin/
// entries, so the launch-equivalent measurement is a real Node process with the hook installed.
const commonJsResolutionHooked = Number(process.versions.node.split(".")[0]) >= 24;

function measuredAtLaunch(): { own: string; identity: { kind: string; path?: string } } {
  const url = (name: string) => JSON.stringify(pathToFileURL(join(packageRoot, "bin", name)).href);
  const script = [
    `import { installPinnedPiTuiResolver } from ${url("module-resolver.js")};`,
    `import { inspectPiTuiModuleIdentity } from ${url("module-identity.js")};`,
    'import { realpathSync } from "node:fs";',
    'import { fileURLToPath } from "node:url";',
    `installPinnedPiTuiResolver(${JSON.stringify(packageRoot)});`,
    `const own = realpathSync(fileURLToPath(import.meta.resolve("@earendil-works/pi-tui")));`,
    `process.stdout.write(JSON.stringify({ own, identity: inspectPiTuiModuleIdentity(${JSON.stringify(packageRoot)}) }));`,
  ].join("\n");
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], { cwd: packageRoot, encoding: "utf8", windowsHide: true, timeout: 30000 });
  if (result.status !== 0) throw new Error(`launch-equivalent identity measurement failed: ${result.stderr}`);
  return JSON.parse(result.stdout) as { own: string; identity: { kind: string; path?: string } };
}

describe("pi-tui module identity in the installed tree", () => {
  it("reports one unified module for this checkout", () => {
    expect(measuredAtLaunch().identity).toMatchObject({ kind: "unified", path: nodeResolvedPinned() });
    if (commonJsResolutionHooked) {
      const outcome = inspectPiTuiModuleIdentity(packageRoot) as { kind: string; path?: string };
      expect(outcome).toMatchObject({ kind: "unified", path: nodeResolvedPinned() });
    }
  });

  it("resolves the package specifier to the copy pinned Pi resolves", () => {
    // Invariant: with the hook installed, asking Node from A1's own root answers with pinned
    // Pi's copy, whatever layout npm materialized.
    const own = measuredAtLaunch().own;
    expect(own).toBe(nodeResolvedPinned());
    expect(own.startsWith(pinnedPiTuiPackageRoot(packageRoot))).toBe(true);
    if (commonJsResolutionHooked) expect(nodeResolvedOwn()).toBe(nodeResolvedPinned());
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
