import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { writeLegacyIdentityInventory, type LegacyIdentityOccurrence } from "../../scripts/product-identity-inventory.mjs";

const roots: string[] = [];
const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const script = resolve(repository, "scripts/check-package-identity.mjs");
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("inventory-driven product identity governance", () => {
  it("accepts the exact reviewed repository inventory and allowlist", () => {
    const result = run(repository);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Product identity governance OK");
  });

  it("rejects an occurrence that was not in the reviewed inventory", async () => {
    const root = await fixture();
    await writeText(root, "src/feature.ts", `export const legacy = '${["Add", "One"].join("")}';`);
    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("legacy identity inventory is stale");
    expect(result.stderr).toContain("unapproved legacy identity occurrence");
  });
});

async function fixture(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-identity-governance-"));
  roots.push(root);
  const identity = await readFile(resolve(repository, "src/product-identity.json"), "utf8");
  await writeText(root, "src/product-identity.json", identity);
  await writeText(root, "package.json", JSON.stringify({ name: "@example/fixture", bin: {} }));
  await writeText(root, "package-lock.json", JSON.stringify({ name: "@example/fixture", packages: { "": { name: "@example/fixture", bin: {} } } }));
  const inventory = await writeLegacyIdentityInventory(root);
  const allowlist = {
    schema: "a1-legacy-identity-allowlist-v1",
    inventorySchema: inventory.schema,
    occurrences: inventory.occurrences.map(occurrence => ({
      id: occurrence.id,
      value: occurrence.value,
      fingerprint: fingerprint(occurrence),
      reason: "reviewed fixture occurrence",
    })),
  };
  await writeText(root, "config/product-identity-legacy-allowlist.json", `${JSON.stringify(allowlist, null, 2)}\n`);
  return root;
}

function fingerprint(occurrence: LegacyIdentityOccurrence): string {
  return createHash("sha256").update(JSON.stringify({
    path: occurrence.path,
    locationKind: occurrence.locationKind,
    line: occurrence.line,
    column: occurrence.column,
    value: occurrence.value,
    context: occurrence.context,
    classes: occurrence.classes,
  })).digest("hex");
}

async function writeText(root: string, path: string, value: string): Promise<void> {
  const absolute = resolve(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, value, "utf8");
}

function run(root: string) {
  return spawnSync(process.execPath, [script, "--root", root], { encoding: "utf8" });
}
