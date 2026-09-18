import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
// Rationale: the resolver and its check live in bin/ (shipped, outside the Pi API boundary):
// they inspect dependency resolution, which src/ code must never touch.
// @ts-expect-error — plain shipped JS module without type declarations.
import { inspectPiTuiModuleIdentity } from "../../../bin/module-identity.js";
// @ts-expect-error — plain shipped JS module without type declarations.
import { pinnedPiTuiLayout, redirectToPinned } from "../../../bin/module-resolver.js";

const roots: string[] = [];

interface Layout {
  /** Version of the copy at the installation's own node_modules root. */
  readonly root?: string;
  /** Version of the copy nested inside pinned Pi. */
  readonly nested?: string;
}

/**
 * Build a package root shaped like a real installation: A1's manifest, pinned Pi with its own
 * entry, and whichever pi-tui copies the layout asks for. These trees sit outside the hook's
 * installation scope, so they show what resolution looks like without it.
 */
function packageRootWith(layout: Layout): string {
  const packageRoot = realpathSync.native(mkdtempSync(join(tmpdir(), "a1-pi-tui-identity-")));
  roots.push(packageRoot);
  const scope = join(packageRoot, "node_modules", "@earendil-works");
  writeFileSync(join(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: "0.0.0", type: "module" }));
  const pi = join(scope, "pi-coding-agent");
  mkdirSync(join(pi, "dist"), { recursive: true });
  writeFileSync(join(pi, "package.json"), JSON.stringify({ name: "@earendil-works/pi-coding-agent", version: "0.0.0", type: "module", exports: { ".": { import: "./dist/index.js" } } }));
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

describe("pinned pi-tui layout", () => {
  it("names the nested copy when npm materialized two and the installation root above them", () => {
    const packageRoot = packageRootWith({ root: "0.84.2", nested: "0.84.2" });
    const layout = pinnedPiTuiLayout(packageRoot) as { installationRoot: string; pinnedRoot: string };
    expect(layout.pinnedRoot).toBe(join(packageRoot, "node_modules", "@earendil-works", "pi-coding-agent", "node_modules", "@earendil-works", "pi-tui"));
    expect(layout.installationRoot).toBe(packageRoot);
  });

  it("names the hoisted copy when npm materialized only one", () => {
    const packageRoot = packageRootWith({ root: "0.84.2" });
    const layout = pinnedPiTuiLayout(packageRoot) as { pinnedRoot: string };
    expect(layout.pinnedRoot).toBe(join(packageRoot, "node_modules", "@earendil-works", "pi-tui"));
  });

  it("fails loudly when pinned Pi cannot resolve its terminal package", () => {
    const packageRoot = packageRootWith({});
    expect(() => pinnedPiTuiLayout(packageRoot)).toThrow(/Cannot find (?:module|package) '@earendil-works\/pi-tui'/);
  });
});

describe("pi-tui URL redirection", () => {
  it("rewrites the hoisted copy and any subpath to the pinned copy, including through a short-name alias of the root", () => {
    const packageRoot = packageRootWith({ root: "0.84.2", nested: "0.84.2" });
    const layout = pinnedPiTuiLayout(packageRoot) as { installationRoot: string; pinnedRoot: string };
    const pinnedUrl = pathToFileURL(layout.pinnedRoot).href.replace(/\/$/, "");
    const hoisted = join(packageRoot, "node_modules", "@earendil-works", "pi-tui");
    expect(redirectToPinned(pathToFileURL(join(hoisted, "dist", "index.js")).href, layout)).toBe(`${pinnedUrl}/dist/index.js`);
    expect(redirectToPinned(pathToFileURL(join(hoisted, "dist", "keys.js")).href, layout)).toBe(`${pinnedUrl}/dist/keys.js`);
    // Platform: the same file reached by a differently spelled path (case, or an 8.3 short name on
    // Windows) is still inside the installation and still redirected.
    const respelled = pathToFileURL(join(hoisted, "dist", "index.js")).href.replace(/^file:\/\/\/([A-Za-z]):/, (_match, drive: string) => `file:///${drive === drive.toLowerCase() ? drive.toUpperCase() : drive.toLowerCase()}:`);
    expect(redirectToPinned(respelled, layout)).toBe(`${pinnedUrl}/dist/index.js`);
  });

  it("leaves the pinned copy, other packages, other installations, and non-file URLs alone", () => {
    const packageRoot = packageRootWith({ root: "0.84.2", nested: "0.84.2" });
    const other = packageRootWith({ root: "0.84.2" });
    const layout = pinnedPiTuiLayout(packageRoot) as { installationRoot: string; pinnedRoot: string };
    const pinnedEntry = pathToFileURL(join(layout.pinnedRoot, "dist", "index.js")).href;
    const piEntry = pathToFileURL(join(packageRoot, "node_modules", "@earendil-works", "pi-coding-agent", "dist", "index.js")).href;
    const foreign = pathToFileURL(join(other, "node_modules", "@earendil-works", "pi-tui", "dist", "index.js")).href;
    expect(redirectToPinned(pinnedEntry, layout)).toBe(pinnedEntry);
    expect(redirectToPinned(piEntry, layout)).toBe(piEntry);
    expect(redirectToPinned(foreign, layout)).toBe(foreign);
    expect(redirectToPinned("node:fs", layout)).toBe("node:fs");
  });
});

describe("pi-tui module identity without the hook", () => {
  it("reports the split two npm-materialized copies cause when nothing redirects them", () => {
    const packageRoot = packageRootWith({ root: "0.84.2", nested: "0.84.2" });
    const outcome = inspectPiTuiModuleIdentity(packageRoot) as { kind: string; own: string; pinned: string };
    expect(outcome.kind).toBe("split");
    expect(outcome.own).not.toContain(join("pi-coding-agent", "node_modules"));
    expect(outcome.pinned).toContain(join("pi-coding-agent", "node_modules"));
  });

  it("reports one module when npm hoisted a single copy", () => {
    const packageRoot = packageRootWith({ root: "0.84.2" });
    const outcome = inspectPiTuiModuleIdentity(packageRoot) as { kind: string; path: string };
    expect(outcome.kind).toBe("unified");
    // Platform: Windows real paths may differ from the fixture path in drive-letter case only.
    expect(outcome.path.toLowerCase()).toBe(join(packageRoot, "node_modules", "@earendil-works", "pi-tui", "dist", "index.js").toLowerCase());
  });

  it("reports which side could not be resolved rather than throwing", () => {
    const packageRoot = packageRootWith({ nested: "0.84.2" });
    const outcome = inspectPiTuiModuleIdentity(packageRoot) as { kind: string; side: string };
    expect(outcome.kind).toBe("unresolved");
    expect(outcome.side).toBe("a1");
  });
});
