import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  configurePinnedPiPublicPackageEntry,
  pinnedPiModuleUrl,
  resolvePinnedPiImport,
} from "../../bin/pinned-pi-public.js";

const original = process.env.PI_PACKAGE_DIR;
const publicEntry = pathToFileURL(resolve("node_modules", "@earendil-works", "pi-coding-agent", "dist", "index.js")).href;
afterEach(() => {
  if (original === undefined) delete process.env.PI_PACKAGE_DIR;
  else process.env.PI_PACKAGE_DIR = original;
});

describe("generated startup artifact public Pi context", () => {
  it("preserves package metadata, module URLs, extension aliases, and the shared TUI package", () => {
    const configured = configurePinnedPiPublicPackageEntry(publicEntry);
    expect(configured.version).toBe("0.84.2");
    expect(pinnedPiModuleUrl("config.js")).toMatch(/pi-coding-agent\/dist\/config\.js$/);
    expect(resolvePinnedPiImport("@earendil-works/pi-coding-agent")).toMatch(/pi-coding-agent\/dist\/index\.js$/);
    expect(resolvePinnedPiImport("@earendil-works/pi-agent-core")).toMatch(/pi-agent-core\/dist\/index\.js$/);
    expect(resolvePinnedPiImport("@earendil-works/pi-ai/compat")).toMatch(/pi-ai\/dist\/compat\.js$/);
    expect(resolvePinnedPiImport("@earendil-works/pi-tui")).toMatch(/pi-tui\/dist\/index\.js$/);
  });

  it("rejects private path traversal and unavailable exports", () => {
    configurePinnedPiPublicPackageEntry(publicEntry);
    expect(() => pinnedPiModuleUrl("../private.js")).toThrow("module identity is invalid");
    expect(() => resolvePinnedPiImport("@earendil-works/pi-ai/private-file")).toThrow("export is unavailable");
  });
});
