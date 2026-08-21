import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

interface SuiteDefinition {
  kind: string;
  includes?: string[];
  commands?: string[];
  exclude?: string[];
  includeRoot?: string;
}

interface SuiteManifest {
  schema: string;
  tiers: Record<string, SuiteDefinition>;
  scopes: Record<string, SuiteDefinition & { tests?: string[] }>;
  releaseContracts: Record<string, string>;
}

async function discoverTests(directory: string): Promise<string[]> {
  const discovered: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) discovered.push(...await discoverTests(path));
    else if (entry.name.endsWith(".test.ts")) discovered.push(relative(resolve("."), path).split(sep).join("/"));
  }
  return discovered.sort();
}

describe("validation suite ownership", () => {
  it("assigns every retained test to exactly one executable owner", async () => {
    const suites = JSON.parse(await readFile("config/validation-suites.json", "utf8")) as SuiteManifest;
    const tests = await discoverTests(resolve("test"));
    const explicitOwners = new Map<string, string[]>();
    for (const [scope, definition] of Object.entries(suites.scopes)) {
      for (const test of definition.tests ?? []) {
        const owners = explicitOwners.get(test) ?? [];
        owners.push(scope);
        explicitOwners.set(test, owners);
      }
    }

    const exclusions = new Set(suites.tiers["fast"]!.exclude ?? []);
    const ownership = tests.map(test => ({
      test,
      owners: [
        ...(!exclusions.has(test) ? ["fast"] : []),
        ...(explicitOwners.get(test) ?? []),
      ],
    }));

    expect(ownership.filter(entry => entry.owners.length !== 1)).toEqual([]);
    expect([...explicitOwners.keys()].filter(test => !tests.includes(test))).toEqual([]);
  });

  it("maps every mandatory release contract to one declared tier or scope", async () => {
    const suites = JSON.parse(await readFile("config/validation-suites.json", "utf8")) as SuiteManifest;
    const releaseSource = await readFile("scripts/run-release-gates.mjs", "utf8");
    const releaseIds = [...releaseSource.matchAll(/\{ id: "([^"]+)"/g)].map(match => match[1]).sort();
    const declaredOwners = new Set([...Object.keys(suites.tiers), ...Object.keys(suites.scopes)]);

    expect(Object.keys(suites.releaseContracts).sort()).toEqual(releaseIds);
    expect(Object.values(suites.releaseContracts).filter(owner => !declaredOwners.has(owner))).toEqual([]);
    expect(suites.tiers["full-release"]!.includes).toEqual(expect.arrayContaining(Object.keys(suites.scopes)));
  });

  it("keeps invariant commands separate from test owners", async () => {
    const suites = JSON.parse(await readFile("config/validation-suites.json", "utf8")) as SuiteManifest;
    expect(suites.schema).toBe("a1-validation-suites-v1");
    expect(suites.tiers["invariants"]!.commands).toEqual([
      "npm run typecheck",
      "npm run check:architecture",
      "npm run check:customization-ready",
    ]);
    expect(suites.scopes["package-install"]!.tests).toEqual([
      "test/foundation/release/package-surface.integration.test.ts",
    ]);
  });
});
