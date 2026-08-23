import { mkdtempSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// The repair lives in bin/ (shipped, outside the Pi API boundary): its whole
// job is fixing the node_modules layout, which src/ code must never touch.
// @ts-expect-error — plain shipped JS module without type declarations.
import { ensureSinglePiTuiModule } from "../../../bin/module-identity.js";

const roots: string[] = [];

function packageRootWith(layout: { root?: string; nested?: string }): string {
  const packageRoot = mkdtempSync(join(tmpdir(), "a1-pi-tui-identity-"));
  roots.push(packageRoot);
  const scope = join(packageRoot, "node_modules", "@earendil-works");
  if (layout.root !== undefined) {
    const rootCopy = join(scope, "pi-tui");
    mkdirSync(rootCopy, { recursive: true });
    writeFileSync(join(rootCopy, "package.json"), JSON.stringify({ name: "@earendil-works/pi-tui", version: layout.root }));
    writeFileSync(join(rootCopy, "marker.txt"), "root");
  }
  if (layout.nested !== undefined) {
    const nestedCopy = join(scope, "pi-coding-agent", "node_modules", "@earendil-works", "pi-tui");
    mkdirSync(nestedCopy, { recursive: true });
    writeFileSync(join(nestedCopy, "package.json"), JSON.stringify({ name: "@earendil-works/pi-tui", version: layout.nested }));
    writeFileSync(join(nestedCopy, "marker.txt"), "nested");
  }
  return packageRoot;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("pi-tui module identity repair", () => {
  it("leaves a hoisted single-copy tree untouched", () => {
    const packageRoot = packageRootWith({ root: "0.84.2" });
    expect(ensureSinglePiTuiModule(packageRoot)).toEqual({ kind: "single-copy" });
    expect(lstatSync(join(packageRoot, "node_modules", "@earendil-works", "pi-tui")).isSymbolicLink()).toBe(false);
  });

  it("links a same-version duplicate onto pinned Pi's nested copy", () => {
    const packageRoot = packageRootWith({ root: "0.84.2", nested: "0.84.2" });
    expect(ensureSinglePiTuiModule(packageRoot)).toEqual({ kind: "linked" });
    const rootCopy = join(packageRoot, "node_modules", "@earendil-works", "pi-tui");
    expect(lstatSync(rootCopy).isSymbolicLink()).toBe(true);
    expect(readFileSync(join(rootCopy, "marker.txt"), "utf8")).toBe("nested");
    expect(realpathSync(rootCopy)).toBe(realpathSync(join(
      packageRoot, "node_modules", "@earendil-works", "pi-coding-agent", "node_modules", "@earendil-works", "pi-tui",
    )));
  });

  it("is idempotent on the second launch", () => {
    const packageRoot = packageRootWith({ root: "0.84.2", nested: "0.84.2" });
    expect(ensureSinglePiTuiModule(packageRoot)).toEqual({ kind: "linked" });
    expect(ensureSinglePiTuiModule(packageRoot)).toEqual({ kind: "already-linked" });
  });

  it("creates the link even when npm materialized only the nested copy", () => {
    const packageRoot = packageRootWith({ nested: "0.84.2" });
    expect(ensureSinglePiTuiModule(packageRoot)).toEqual({ kind: "linked" });
    expect(readFileSync(join(packageRoot, "node_modules", "@earendil-works", "pi-tui", "marker.txt"), "utf8")).toBe("nested");
  });

  it("refuses to link across different versions and reports both", () => {
    const packageRoot = packageRootWith({ root: "0.84.2", nested: "0.85.0" });
    expect(ensureSinglePiTuiModule(packageRoot)).toEqual({ kind: "version-mismatch", rootVersion: "0.84.2", nestedVersion: "0.85.0" });
    expect(lstatSync(join(packageRoot, "node_modules", "@earendil-works", "pi-tui")).isSymbolicLink()).toBe(false);
    expect(readFileSync(join(packageRoot, "node_modules", "@earendil-works", "pi-tui", "marker.txt"), "utf8")).toBe("root");
  });
});
