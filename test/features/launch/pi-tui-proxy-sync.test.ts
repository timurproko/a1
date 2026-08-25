import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// Shipped plain JS modules outside the Pi API boundary (see bin/*.js headers).
// @ts-expect-error — no type declarations.
import { inspectPiTuiModuleIdentity } from "../../../bin/module-identity.js";
// @ts-expect-error — no type declarations.
import { syncPiTuiProxy } from "../../../bin/sync-pi-tui-proxy.js";

const roots: string[] = [];

const NESTED_PROXY_SOURCE = 'export * from "../node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui/dist/index.js";\n';

interface Layout {
  /** Version of the copy at the installation's own node_modules root. */
  readonly root?: string;
  /** Version of the copy nested inside pinned Pi. */
  readonly nested?: string;
}

/** A package root shaped like a real installation, with the shipped proxy pair. */
function packageRootWith(layout: Layout): string {
  const packageRoot = mkdtempSync(join(tmpdir(), "a1-pi-tui-proxy-sync-"));
  roots.push(packageRoot);
  const scope = join(packageRoot, "node_modules", "@earendil-works");

  writeFileSync(join(packageRoot, "package.json"), JSON.stringify({
    name: "@timurproko/a1",
    version: "0.0.0",
    type: "module",
    imports: { "#pi-tui": "./bin/pi-tui.js" },
  }));
  mkdirSync(join(packageRoot, "bin"), { recursive: true });
  writeFileSync(join(packageRoot, "bin", "pi-tui.js"), NESTED_PROXY_SOURCE);
  writeFileSync(join(packageRoot, "bin", "pi-tui.d.ts"), NESTED_PROXY_SOURCE.replace(".js", ".d.ts"));

  const pi = join(scope, "pi-coding-agent");
  mkdirSync(join(pi, "dist"), { recursive: true });
  writeFileSync(join(pi, "package.json"), JSON.stringify({
    name: "@earendil-works/pi-coding-agent",
    version: "0.0.0",
    type: "module",
    exports: { ".": { import: "./dist/index.js" } },
  }));
  writeFileSync(join(pi, "dist", "index.js"), "export default 1;\n");

  for (const [version, directory] of [
    [layout.root, join(scope, "pi-tui")],
    [layout.nested, join(pi, "node_modules", "@earendil-works", "pi-tui")],
  ] as const) {
    if (version === undefined) continue;
    mkdirSync(join(directory, "dist"), { recursive: true });
    writeFileSync(join(directory, "package.json"), JSON.stringify({ name: "@earendil-works/pi-tui", version, main: "dist/index.js" }));
    writeFileSync(join(directory, "dist", "index.js"), "export class Component {}\n");
    writeFileSync(join(directory, "dist", "index.d.ts"), "export declare class Component {}\n");
  }
  return packageRoot;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("pi-tui proxy sync", () => {
  it("repoints the proxy at the hoisted copy when npm materialized no nested one", () => {
    // The global-install layout that broke `a1 sandbox`: pi-tui hoisted to the
    // root, pinned Pi's nested copy absent, the shipped proxy naming a file
    // that does not exist.
    const packageRoot = packageRootWith({ root: "0.84.2" });
    expect((inspectPiTuiModuleIdentity(packageRoot) as { kind: string }).kind).toBe("unresolved");

    const outcome = syncPiTuiProxy(packageRoot) as { kind: string; changed: string[] };

    expect(outcome.kind).toBe("synced");
    expect(outcome.changed).toEqual(["pi-tui.js", "pi-tui.d.ts"]);
    expect(readFileSync(join(packageRoot, "bin", "pi-tui.js"), "utf8"))
      .toContain('export * from "../node_modules/@earendil-works/pi-tui/dist/index.js";');
    expect(readFileSync(join(packageRoot, "bin", "pi-tui.d.ts"), "utf8"))
      .toContain('export * from "../node_modules/@earendil-works/pi-tui/dist/index.d.ts";');
    expect(inspectPiTuiModuleIdentity(packageRoot)).toMatchObject({ kind: "unified" });
  });

  it("leaves the dev-checkout proxy untouched when the nested copy is what Pi resolves", () => {
    const packageRoot = packageRootWith({ root: "0.84.2", nested: "0.84.2" });

    const outcome = syncPiTuiProxy(packageRoot) as { kind: string; changed: string[] };

    expect(outcome.kind).toBe("synced");
    expect(outcome.changed).toEqual([]);
    expect(readFileSync(join(packageRoot, "bin", "pi-tui.js"), "utf8")).toBe(NESTED_PROXY_SOURCE);
    expect(inspectPiTuiModuleIdentity(packageRoot)).toMatchObject({ kind: "unified" });
  });

  it("repairs a proxy that names the hoisted copy in a tree where Pi resolves the nested one", () => {
    const packageRoot = packageRootWith({ root: "0.84.2", nested: "0.84.2" });
    writeFileSync(join(packageRoot, "bin", "pi-tui.js"), 'export * from "../node_modules/@earendil-works/pi-tui/dist/index.js";\n');

    const outcome = syncPiTuiProxy(packageRoot) as { kind: string; changed: string[] };

    expect(outcome.kind).toBe("synced");
    expect(outcome.changed).toContain("pi-tui.js");
    expect(inspectPiTuiModuleIdentity(packageRoot)).toMatchObject({ kind: "unified" });
  });

  it("reports failure and touches nothing when pinned Pi is not installed", () => {
    const packageRoot = packageRootWith({ root: "0.84.2" });
    rmSync(join(packageRoot, "node_modules", "@earendil-works", "pi-coding-agent"), { recursive: true, force: true });
    const before = readFileSync(join(packageRoot, "bin", "pi-tui.js"), "utf8");

    const outcome = syncPiTuiProxy(packageRoot) as { kind: string; message: string };

    expect(outcome.kind).toBe("unresolved");
    expect(readFileSync(join(packageRoot, "bin", "pi-tui.js"), "utf8")).toBe(before);
  });
});
