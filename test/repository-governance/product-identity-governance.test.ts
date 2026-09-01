import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { writeLegacyIdentityInventory, type LegacyIdentityOccurrence } from "../../scripts/governance/product-identity-inventory.mjs";

const roots: string[] = [];
const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const script = resolve(repository, "scripts/governance/check-package-identity.mjs");
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("inventory-driven product identity governance", () => {
  it("accepts the exact reviewed repository inventory and allowlist", () => {
    const result = run(repository);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Product identity governance OK");
  }, 30_000);

  it("has no temporary migration approvals after closure", async () => {
    const allowlist = JSON.parse(await readFile(resolve(repository, "config/product-identity-legacy-allowlist.json"), "utf8")) as {
      occurrences: Array<{ reason: string }>;
    };
    const reasons = new Set(allowlist.occurrences.map(occurrence => occurrence.reason));

    expect(reasons).not.toContain("migration baseline pending final closure");
    expect(reasons).toEqual(new Set([
      "documented hard-cut or deprecation assertion",
      "explicit obsolete-package rejection or deprecation fixture",
      "exact historical evidence record",
      "obsolete-package rejection requirement",
      "explicit legacy rejection fixture",
    ]));
  });

  it.each([
    ["display name", "src/display.ts", `export const display = '${["Add", "One"].join("")}';`],
    ["lowercase identifier", "src/slug.ts", `export const slug = '${["add", "one"].join("")}';`],
    ["environment prefix", "src/environment.ts", `export const key = '${["ADD", "ONE_CONFIG_DIR"].join("")}';`],
    ["obsolete package", "src/package.ts", `export const packageName = '@timurproko/${["add", "one"].join("")}';`],
    ["state path", "src/path.ts", `export const statePath = '/var/lib/${["add", "one"].join("")}';`],
    ["schema identifier", "src/schema.ts", `export const schema = '${["add", "one-control-v1"].join("")}';`],
    ["protocol identifier", "src/protocol.ts", `export const envelope = '${["add", "one-control-envelope"].join("")}';`],
    ["bin artifact", `bin/${["add", "one-supervisor.js"].join("")}`, "#!/usr/bin/env node\n"],
    ["native artifact", `native/terminal-host/${["add", "one-terminal-host.exe"].join("")}.txt`, "fixture"],
  ])("rejects an unreviewed %s mutation", async (_name, path, source) => {
    const root = await fixture();
    await writeText(root, path, source);
    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("legacy identity inventory is stale");
    expect(result.stderr).toContain("unapproved legacy identity occurrence");
  });

  it.each([
    ["display", `export const PRODUCT_DISPLAY_NAME = "A1";`],
    ["package", `export const productPackage = "@timurproko/a1";`],
  ])("rejects a duplicate current %s literal in executable source", async (_name, source) => {
    const root = await fixture();
    await writeText(root, "src/duplicate.ts", source);
    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/duplicates (?:current identity|the authoritative package name)/);
  });

  it.each([
    ["historical evidence", "openspec/changes/live/evidence/history.md", `Historical ${["Add", "One"].join("")} record.`],
    ["rejection fixture", "test/legacy-rejection.test.ts", `expect(value).not.toBe('${["add", "one"].join("")}');`],
  ])("does not let an exact %s approval broaden silently", async (_name, path, approvedSource) => {
    const root = await fixture({ [path]: approvedSource });
    await writeText(root, path, `${approvedSource}\n${approvedSource}`);
    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("legacy identity inventory is stale");
    expect(result.stderr).toMatch(/unapproved legacy identity occurrence|approval differs from the exact inventoried occurrence/);
  });
});

async function fixture(initialFiles: Readonly<Record<string, string>> = {}): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-identity-governance-"));
  roots.push(root);
  const identity = await readFile(resolve(repository, "src/product-identity.json"), "utf8");
  await writeText(root, "src/product-identity.json", identity);
  await writeText(root, "package.json", JSON.stringify({ name: "@example/fixture", bin: {} }));
  await writeText(root, "package-lock.json", JSON.stringify({ name: "@example/fixture", packages: { "": { name: "@example/fixture", bin: {} } } }));
  for (const [path, source] of Object.entries(initialFiles)) await writeText(root, path, source);
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
