import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error — plain shipped JS module without type declarations.
import { inspectPiTuiModuleIdentity } from "../../../bin/module-identity.js";

/**
 * The installed tree, not a fixture: these tests hold the invariant that broke
 * twice — A1's renderer and pinned Pi's extensions sharing one pi-tui module.
 * The first break (two npm-materialized copies) was fixed by a launch-time
 * junction; its replacement, a `#pi-tui` alias naming the nested copy directly,
 * silently reintroduced the split because Node rejects package-imports targets
 * containing a node_modules segment and falls through to the hoisted copy.
 * Everything here measures what Node actually resolves and loads, never what
 * the manifest appears to say.
 */
const packageRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

function nodeResolvedOwn(): string {
  return createRequire(pathToFileURL(join(packageRoot, "package.json")).href).resolve("#pi-tui");
}

function nodeResolvedPinned(): string {
  const pi = join(packageRoot, "node_modules", "@earendil-works", "pi-coding-agent");
  return createRequire(pathToFileURL(join(pi, "package.json")).href).resolve("@earendil-works/pi-tui");
}

describe("pi-tui module identity in the installed tree", () => {
  it("reports one unified module for this checkout", () => {
    const outcome = inspectPiTuiModuleIdentity(packageRoot) as { kind: string; path?: string };
    expect(outcome).toMatchObject({ kind: "unified" });
  });

  it("resolves #pi-tui through the proxy to the copy pinned Pi resolves", () => {
    // Ask Node itself, then follow the proxy by loading both sides and
    // comparing class identity: prototype patches from Pi's extension realm
    // must land on the classes A1 constructs.
    expect(nodeResolvedOwn()).toBe(join(packageRoot, "bin", "pi-tui.js"));
  });

  it("hands A1 and pinned Pi the same TUI class objects", async () => {
    const own = await import(pathToFileURL(nodeResolvedOwn()).href);
    const pinned = await import(pathToFileURL(nodeResolvedPinned()).href);
    for (const name of ["TuiAltScreen", "TuiMainScreen", "ProcessTerminal", "Text", "Container"]) {
      expect(own[name], `${name} must be one class, not two copies`).toBe(pinned[name]);
    }
  });

  it("declares no package-imports target that Node would silently reject", () => {
    // Node treats a relative imports target containing a node_modules segment
    // as an Invalid Package Target and falls through to the next entry without
    // a word — the exact mechanism that reintroduced the split. Targets must
    // stay inside the package's own shipped files.
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
      imports?: Record<string, unknown>;
    };
    const targets = Object.values(manifest.imports ?? {}).flatMap(value => Array.isArray(value) ? value : [value]);
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      if (typeof target !== "string" || !target.startsWith("./")) continue;
      expect(target.split("/"), `imports target ${target} would be rejected by Node`).not.toContain("node_modules");
    }
  });
});
