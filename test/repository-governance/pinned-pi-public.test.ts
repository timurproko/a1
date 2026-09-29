import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { readPinnedPiIdentity } from "../../scripts/governance/pinned-pi-identity.mjs";
import {
  configurePinnedPiPublicPackageEntry,
  pinnedPiModuleUrl,
  resolvePinnedPiImport,
} from "../../bin/pinned-pi-public.js";

const original = process.env.PI_PACKAGE_DIR;
const helperUrl = pathToFileURL(resolve("bin", "pinned-pi-public.js")).href;
const publicEntry = pathToFileURL(resolve("node_modules", "@earendil-works", "pi-coding-agent", "dist", "index.js")).href;
function runIsolated(source: string) {
  return spawnSync(process.execPath, ["--input-type=module", "--eval", `const api = await import(${JSON.stringify(helperUrl)});\n${source}`], { encoding: "utf8" });
}
afterEach(() => {
  if (original === undefined) delete process.env.PI_PACKAGE_DIR;
  else process.env.PI_PACKAGE_DIR = original;
});

describe("generated startup artifact public Pi context", () => {
  it("preserves package metadata, module URLs, extension aliases, and the shared TUI package", async () => {
    const configured = configurePinnedPiPublicPackageEntry(publicEntry);
    expect(configured.version).toBe((await readPinnedPiIdentity(".")).version);
    expect(pinnedPiModuleUrl("config.js")).toMatch(/pi-coding-agent\/dist\/config\.js$/);
    expect(resolvePinnedPiImport("@earendil-works/pi-coding-agent")).toMatch(/pi-coding-agent\/dist\/index\.js$/);
    expect(resolvePinnedPiImport("@earendil-works/pi-agent-core")).toMatch(/pi-agent-core\/dist\/index\.js$/);
    expect(resolvePinnedPiImport("@earendil-works/pi-ai/compat")).toMatch(/pi-ai\/dist\/compat\.js$/);
    expect(resolvePinnedPiImport("@earendil-works/pi-tui")).toMatch(/pi-tui\/dist\/index\.js$/);
  });

  it("retains the validated root when the environment is deleted or redirected", () => {
    const configured = configurePinnedPiPublicPackageEntry(publicEntry);
    const moduleUrl = pinnedPiModuleUrl("config.js");
    const dependencyUrl = resolvePinnedPiImport("@earendil-works/pi-ai/compat");

    delete process.env.PI_PACKAGE_DIR;
    expect(pinnedPiModuleUrl("config.js")).toBe(moduleUrl);
    expect(resolvePinnedPiImport("@earendil-works/pi-ai/compat")).toBe(dependencyUrl);

    process.env.PI_PACKAGE_DIR = "";
    expect(pinnedPiModuleUrl("config.js")).toBe(moduleUrl);
    expect(resolvePinnedPiImport("@earendil-works/pi-ai/compat")).toBe(dependencyUrl);

    process.env.PI_PACKAGE_DIR = resolve("missing-pi-package");
    expect(pinnedPiModuleUrl("config.js")).toBe(moduleUrl);
    expect(resolvePinnedPiImport("@earendil-works/pi-ai/compat")).toBe(dependencyUrl);
    expect(configurePinnedPiPublicPackageEntry(publicEntry)).toEqual(configured);
    expect(process.env.PI_PACKAGE_DIR).toBe(configured.root);
  });

  it("rejects a different package root after configuration", () => {
    configurePinnedPiPublicPackageEntry(publicEntry);
    const root = mkdtempSync(join(tmpdir(), "a1-pinned-pi-"));
    mkdirSync(join(root, "dist"));
    const manifestPath = join(root, "package.json");
    writeFileSync(manifestPath, JSON.stringify({ name: "not-pi", version: "0.0.0-test" }));
    writeFileSync(join(root, "dist", "index.js"), "export {};\n");
    try {
      const alternateEntry = pathToFileURL(join(root, "dist", "index.js")).href;
      expect(() => configurePinnedPiPublicPackageEntry(alternateEntry)).toThrow("identity is invalid");
      writeFileSync(manifestPath, JSON.stringify({ name: "@earendil-works/pi-coding-agent", version: "0.0.0-test" }));
      expect(() => configurePinnedPiPublicPackageEntry(alternateEntry)).toThrow("identity cannot change after configuration");
      expect(pinnedPiModuleUrl("config.js")).toMatch(/pi-coding-agent\/dist\/config\.js$/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails distinctly without configuration or after the retained package disappears", () => {
    const unconfigured = runIsolated('api.pinnedPiModuleUrl("config.js");');
    expect(unconfigured.status).not.toBe(0);
    expect(unconfigured.stderr).toContain("public package directory is not configured");

    const root = mkdtempSync(join(tmpdir(), "a1-pinned-pi-unavailable-"));
    mkdirSync(join(root, "dist"));
    const manifestPath = join(root, "package.json");
    writeFileSync(manifestPath, JSON.stringify({ name: "@earendil-works/pi-coding-agent", version: "0.0.0-test" }));
    writeFileSync(join(root, "dist", "index.js"), "export {};\n");
    try {
      const entry = pathToFileURL(join(root, "dist", "index.js")).href;
      const unavailable = runIsolated([
        `api.configurePinnedPiPublicPackageEntry(${JSON.stringify(entry)});`,
        `const { rmSync } = await import("node:fs"); rmSync(${JSON.stringify(manifestPath)});`,
        'api.pinnedPiModuleUrl("config.js");',
      ].join("\n"));
      expect(unavailable.status).not.toBe(0);
      expect(unavailable.stderr).toContain("public package directory is unavailable");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects private path traversal and unavailable exports", () => {
    configurePinnedPiPublicPackageEntry(publicEntry);
    expect(() => pinnedPiModuleUrl("../private.js")).toThrow("module identity is invalid");
    expect(() => resolvePinnedPiImport("@earendil-works/pi-ai/private-file")).toThrow("export is unavailable");
  });
});
