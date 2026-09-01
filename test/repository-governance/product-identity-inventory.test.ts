import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  LEGACY_IDENTITY_CLASSES,
  scanLegacyIdentity,
  type LegacyIdentityInventory,
} from "../../scripts/governance/product-identity-inventory.mjs";

const INVENTORY_PATH = resolve("config/product-identity-legacy-inventory.json");
const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("legacy product identity inventory", () => {
  it("exactly covers every current case-insensitive content and path occurrence", async () => {
    const recorded = JSON.parse(await readFile(INVENTORY_PATH, "utf8")) as LegacyIdentityInventory & { generatedAt: string };
    const { generatedAt: _generatedAt, ...expected } = recorded;
    const actual = await scanLegacyIdentity(resolve("."));

    expect(actual).toEqual(expected);
    expect(actual.summary.total).toBe(actual.occurrences.length);
    expect(actual.summary.byLocationKind.content).toBeGreaterThan(0);
    expect(actual.summary.byLocationKind.path).toBe(0);
    for (const category of LEGACY_IDENTITY_CLASSES) expect(actual.summary.byClass[category]).toBeGreaterThan(0);
    expect(actual.occurrences.every(occurrence => !occurrence.path.startsWith("openspec/changes/archive/"))).toBe(true);
    expect(actual.occurrences.every(occurrence => !/(^|\/)(node_modules|dist|target|vendor)(\/|$)/.test(occurrence.path))).toBe(true);
  }, 30_000);

  it("finds title, lower, and upper forms while excluding archives and generated dependencies", async () => {
    const root = await fixture({
      "src/AddOne-path.ts": "const display = 'AddOne'; const slug = 'addone'; const key = 'ADDONE_DATA_DIR';",
      "openspec/changes/live/evidence/history.md": "Historical AddOne record.",
      "openspec/changes/archive/old/spec.md": "Archived addone record.",
      "node_modules/fixture/index.js": "const generated = 'ADDONE';",
      "native/terminal-host/target/output.txt": "addone",
    });
    const inventory = await scanLegacyIdentity(root);

    expect(inventory.occurrences.map(occurrence => occurrence.value)).toEqual([
      "AddOne",
      "AddOne",
      "AddOne",
      "addone",
      "ADDONE",
    ]);
    expect(inventory.occurrences.some(occurrence => occurrence.classes.includes("environment-keys"))).toBe(true);
    expect(inventory.occurrences.some(occurrence => occurrence.classes.includes("historical-records"))).toBe(true);
  });
});

async function fixture(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-identity-inventory-"));
  roots.push(root);
  for (const [path, source] of Object.entries(files)) {
    const absolute = resolve(root, path);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, source, "utf8");
  }
  return root;
}
