import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

interface ValidationCommand {
  id: string;
  executable: string;
  arguments: string[];
}

interface SuiteDefinition {
  kind: string;
  includes?: string[];
  commands?: ValidationCommand[];
  exclude?: string[];
  includeRoot?: string;
  resourceSensitiveTests?: string[];
  requiresBuild?: boolean;
}

interface SuiteManifest {
  schema: string;
  tiers: Record<string, SuiteDefinition>;
  scopes: Record<string, SuiteDefinition & { tests?: string[] }>;
  fullReleaseSupersedes: Record<string, string[]>;
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
  it("assigns every retained test one primary owner plus only reviewed cross-runtime owners", async () => {
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

    const exclusions = new Set([
      ...suites.scopes["fast-remainder"]!.exclude ?? [],
      ...suites.scopes["fast-resource-sensitive"]!.tests ?? [],
    ]);
    const ownership = tests.map(test => ({
      test,
      owners: [
        ...(!exclusions.has(test) ? ["fast-remainder"] : []),
        ...(explicitOwners.get(test) ?? []),
      ],
    }));

    const crossRuntime = new Set(["image-compatibility", "history-compatibility", "unix-containment"]);
    expect(ownership.filter(entry => entry.owners.filter(owner => !crossRuntime.has(owner)).length !== 1)).toEqual([]);
    expect(ownership.flatMap(entry => entry.owners.slice(1).filter(owner => !crossRuntime.has(owner)).map(owner => ({ test: entry.test, owner })))).toEqual([]);
    expect([...explicitOwners.keys()].filter(test => !tests.includes(test))).toEqual([]);
  });

  it("maps every mandatory release contract to one declared tier or scope", async () => {
    const suites = JSON.parse(await readFile("config/validation-suites.json", "utf8")) as SuiteManifest;
    const releaseSource = await readFile("scripts/release/run-release-gates.mjs", "utf8");
    const declaredOwners = new Set([...Object.keys(suites.tiers), ...Object.keys(suites.scopes)]);

    expect(Object.keys(suites.releaseContracts)).toHaveLength(11);
    expect(Object.values(suites.releaseContracts).filter(owner => !declaredOwners.has(owner))).toEqual([]);
    expect(releaseSource).toContain("Object.entries(suites.releaseContracts)");
    const included = new Set<string>();
    const addComposition = (owner: string) => {
      included.add(owner);
      const definition = suites.tiers[owner] ?? suites.scopes[owner];
      for (const child of definition?.includes ?? []) addComposition(child);
    };
    for (const owner of suites.tiers["full-release"]!.includes ?? []) addComposition(owner);
    const superseded = new Set(Object.entries(suites.fullReleaseSupersedes).flatMap(([owner, values]) => {
      expect(included.has(owner)).toBe(true);
      return values;
    }));
    expect(Object.keys(suites.scopes).filter(scope => !included.has(scope) && !superseded.has(scope))).toEqual([]);
  });

  it("keeps planning and invariant commands separate from test owners", async () => {
    const suites = JSON.parse(await readFile("config/validation-suites.json", "utf8")) as SuiteManifest;
    expect(suites.schema).toBe("a1-validation-suites-v1");
    expect(suites.tiers["planning"]).toEqual({
      kind: "commands",
      commands: [{
        id: "openspec-strict",
        executable: "npx",
        arguments: ["--yes", "@fission-ai/openspec@1.8.0", "validate", "--all", "--strict", "--no-interactive"],
      }],
    });
    expect(suites.tiers["fast"]).toEqual({ kind: "composition", includes: ["fast-remainder", "fast-resource-sensitive"] });
    expect(suites.scopes["fast-resource-sensitive"]!.requiresBuild).toBe(true);
    expect(suites.scopes["fast-resource-sensitive"]!.tests).toEqual([
      "test/repository-governance/validation-impact.test.ts",
      "test/repository-governance/naming-selection.test.ts",
      "test/foundation/launch-context/cutover.test.ts",
      "test/repository-governance/code-documentation.test.ts",
      "test/foundation/storage/storage.test.ts",
      "test/foundation/release/cohort-state.test.ts",
      "test/foundation/release/update-live-cohort.test.ts",
      "test/features/workspace/reconciliation.test.ts",
      "test/features/prompt-history/store.test.ts",
      "test/integrations/pi/session-ui/command-message-parity.test.ts",
      "test/integrations/pi/session-ui/command-outcome-parity.test.ts",
      "test/integrations/pi/session-ui/session-shell.test.ts",
      "test/integrations/pi/session-ui/paste-executor.test.ts",
      "test/integrations/pi/session-ui/clipboard-executor-lifecycle.test.ts",
      "test/integrations/pi/session-ui/clipboard-packaged.test.ts",
      "test/integrations/pi/components/editor-text-paste.test.ts",
      "test/integrations/pi/session-ui/prompt-history-controller.test.ts",
      "test/foundation/release/update-activation.test.ts",
    ]);
    expect(Object.keys(suites.tiers["fast"]!).filter(key => key.toLowerCase().includes("timeout"))).toEqual([]);
    expect(suites.scopes["fast-remainder"]!.exclude).toContain("test/repository-governance/release-command.test.ts");
    expect(suites.scopes["release-update"]!.tests).toContain("test/repository-governance/release-command.test.ts");
    expect(suites.scopes["typecheck"]!.commands?.map(command => command.id)).toEqual(["typecheck"]);
    expect(suites.scopes["architecture"]!.commands?.map(command => command.id)).toEqual(["architecture"]);
    expect(suites.scopes["package-smoke"]!.tests).toEqual([
      "test/foundation/release/package-surface.test.ts",
      "test/foundation/release/session-resume.integration.test.ts",
    ]);
    expect(suites.scopes["package-install"]).toEqual({ kind: "composition", includes: ["package-contracts", "package-startup"] });
    expect(suites.scopes["package-contracts"]!.tests).toEqual(["test/foundation/release/package-install.integration.test.ts"]);
    expect(suites.scopes["package-startup"]!.tests).toEqual(["test/foundation/release/package-startup.integration.test.ts"]);
  });
});
