import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// The check lives in bin/ (shipped, outside the Pi API boundary): it inspects
// dependency resolution, which src/ code must never touch.
// @ts-expect-error — plain shipped JS module without type declarations.
import { inspectPiTuiModuleIdentity } from "../../../bin/module-identity.js";

const roots: string[] = [];

interface Layout {
  /** Version of the copy at the installation's own node_modules root. */
  readonly root?: string;
  /** Version of the copy nested inside pinned Pi. */
  readonly nested?: string;
  /** Where the `#pi-tui` alias points, in order. */
  readonly alias?: readonly string[];
}

/**
 * Build a package root shaped like a real installation: A1's manifest declaring
 * the alias, pinned Pi with its own entry, and whichever pi-tui copies the
 * layout asks for.
 */
function packageRootWith(layout: Layout): string {
  const packageRoot = mkdtempSync(join(tmpdir(), "a1-pi-tui-identity-"));
  roots.push(packageRoot);
  const scope = join(packageRoot, "node_modules", "@earendil-works");

  writeFileSync(join(packageRoot, "package.json"), JSON.stringify({
    name: "@timurproko/a1",
    version: "0.0.0",
    type: "module",
    imports: {
      "#pi-tui": [...(layout.alias ?? [
        "./node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui/dist/index.js",
        "@earendil-works/pi-tui",
      ])],
    },
  }));

  const pi = join(scope, "pi-coding-agent");
  mkdirSync(pi, { recursive: true });
  writeFileSync(join(pi, "package.json"), JSON.stringify({
    name: "@earendil-works/pi-coding-agent",
    version: "0.0.0",
    type: "module",
    exports: { ".": { import: "./dist/index.js" } },
  }));
  mkdirSync(join(pi, "dist"), { recursive: true });
  writeFileSync(join(pi, "dist", "index.js"), "export default 1;\n");

  for (const [version, directory] of [
    [layout.root, join(scope, "pi-tui")],
    [layout.nested, join(pi, "node_modules", "@earendil-works", "pi-tui")],
  ] as const) {
    if (version === undefined) continue;
    mkdirSync(join(directory, "dist"), { recursive: true });
    writeFileSync(join(directory, "package.json"), JSON.stringify({ name: "@earendil-works/pi-tui", version, main: "dist/index.js" }));
    writeFileSync(join(directory, "dist", "index.js"), "export class Component {}\n");
  }
  return packageRoot;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("pi-tui module identity", () => {
  it("agrees with pinned Pi when both copies exist, without touching the tree", () => {
    const packageRoot = packageRootWith({ root: "0.84.2", nested: "0.84.2" });

    const outcome = inspectPiTuiModuleIdentity(packageRoot) as { kind: string; path: string };

    expect(outcome.kind).toBe("unified");
    expect(outcome.path).toContain(join("pi-coding-agent", "node_modules"));
    // The duplicate is left exactly where npm put it: nothing is linked, moved,
    // or deleted. Which copy A1 uses is decided by resolution alone.
    expect(() => rmSync(join(packageRoot, "node_modules", "@earendil-works", "pi-tui", "package.json"))).not.toThrow();
  });

  it("agrees when npm hoisted a single copy, because both sides then find it", () => {
    const packageRoot = packageRootWith({ root: "0.84.2" });

    const outcome = inspectPiTuiModuleIdentity(packageRoot) as { kind: string; path: string };

    expect(outcome.kind).toBe("unified");
    expect(outcome.path).not.toContain(join("pi-coding-agent", "node_modules"));
  });

  it("reports a split when the alias no longer names the copy pinned Pi uses", () => {
    const packageRoot = packageRootWith({ root: "0.84.2", nested: "0.84.2", alias: ["@earendil-works/pi-tui"] });

    const outcome = inspectPiTuiModuleIdentity(packageRoot) as { kind: string; own: string; pinned: string };

    expect(outcome.kind).toBe("split");
    expect(outcome.own).not.toBe(outcome.pinned);
    expect(outcome.pinned).toContain(join("pi-coding-agent", "node_modules"));
  });

  it("reports which side could not be resolved rather than throwing", () => {
    const packageRoot = packageRootWith({ alias: ["@earendil-works/pi-tui"] });

    const outcome = inspectPiTuiModuleIdentity(packageRoot) as { kind: string; side: string };

    expect(outcome.kind).toBe("unresolved");
    expect(outcome.side).toBe("a1");
  });

  it("still agrees when the tree carries a link left by an older A1", () => {
    const packageRoot = packageRootWith({ nested: "0.84.2" });
    const nested = join(packageRoot, "node_modules", "@earendil-works", "pi-coding-agent", "node_modules", "@earendil-works", "pi-tui");
    symlinkSync(nested, join(packageRoot, "node_modules", "@earendil-works", "pi-tui"), "junction");

    expect((inspectPiTuiModuleIdentity(packageRoot) as { kind: string }).kind).toBe("unified");
  });
});
