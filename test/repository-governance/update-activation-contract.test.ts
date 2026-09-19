import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  UPDATE_ACTIVATION_CONTRACT,
  UPDATE_ACTIVATION_ENTRY,
  UPDATE_ACTIVATION_MANIFEST_FIELD,
} from "../../src/foundation/release/update-activation.js";

const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read = async (path: string) => await readFile(resolve(repository, path), "utf8");

/**
 * An update is driven by the code that is already installed against a tree that is newer
 * than it. The updater therefore may know only two paths inside that tree: its manifest and
 * the activation entry the manifest promises. Everything else about the tree's layout belongs
 * to the tree, which activates itself.
 */
describe("update activation contract", () => {
  it("is served by the package this repository builds", async () => {
    const manifest = JSON.parse(await read("package.json")) as Record<string, unknown>;
    expect(manifest[UPDATE_ACTIVATION_MANIFEST_FIELD]).toEqual([UPDATE_ACTIVATION_CONTRACT]);
    expect(manifest.files).toContain("bin");
  });

  it("keeps the updater ignorant of every path in the installed tree but the manifest and the entry", async () => {
    const orchestration = await read("src/foundation/release/update.ts");
    expect(orchestration).not.toMatch(/["'`]bin\//);
    expect(orchestration).not.toMatch(/resolveReleaseEntryPoint/);
    const contract = await read("src/foundation/release/update-activation.ts");
    const namedPaths = [...contract.matchAll(/["'`](bin\/[^"'`]+)["'`]/g)].map(match => match[1]);
    expect(namedPaths).toEqual([UPDATE_ACTIVATION_ENTRY]);
  });

  it("ships an entry that activates its own tree and loads nothing else", async () => {
    const entry = await read(UPDATE_ACTIVATION_ENTRY);
    expect(entry).toContain('import("../dist/foundation/release/update-activation.js")');
    expect(entry).toContain("runActivationEntry(process.argv.slice(2), import.meta.url)");
    expect([...entry.matchAll(/import\(/g)]).toHaveLength(1);
  });
});
