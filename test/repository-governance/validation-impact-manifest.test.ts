import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

interface ImpactRule {
  id: string;
  owner: string;
  patterns: string[];
  scopes: string[];
  full?: boolean;
  packageSensitive?: boolean;
  selectChangedTests?: boolean;
}

interface ImpactManifest {
  schema: string;
  mandatory: string[];
  planningOnly: { patterns: string[]; selected: string[] };
  rules: ImpactRule[];
}

function matches(pattern: string, path: string): boolean {
  const expression = pattern.split("/").map(segment => {
    if (segment === "**") return ".*";
    return segment.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^/]*");
  }).join("/");
  return new RegExp(`^${expression}$`).test(path);
}

function matchingRules(manifest: ImpactManifest, path: string): ImpactRule[] {
  return manifest.rules.filter(rule => rule.patterns.some(pattern => matches(pattern, path)));
}

describe("validation impact manifest", () => {
  it("maps representative repository owners to affected scopes", async () => {
    const manifest = JSON.parse(await readFile("config/validation-impact.json", "utf8")) as ImpactManifest;
    const representatives: Array<[string, string, string[]]> = [
      ["src/cli/dispatch.ts", "cli", []],
      ["src/features/launch/prepare-launch.ts", "launch", ["launch-integration"]],
      ["src/features/workspace/workspace.ts", "workspace", ["structured-runtime-integration"]],
      ["src/features/owned-ui/run.ts", "owned-ui", []],
      ["src/foundation/pi-engine-adapter/index.ts", "pi-engine-adapter", ["pi-engine-conformance"]],
      ["src/foundation/release/update.ts", "release-update", ["release-update"]],
      ["src/foundation/structured-agent-runtime/runtime.ts", "structured-agent-runtime", ["structured-runtime-integration"]],
      ["src/product-identity.ts", "package-release", ["package-smoke", "package-install", "dependency-policy"]],
    ];

    expect(manifest.schema).toBe("a1-validation-impact-v1");
    expect(manifest.mandatory).toEqual(["invariants", "fast"]);
    expect(manifest.planningOnly).toEqual({ patterns: ["openspec/**"], selected: ["planning"] });
    for (const [path, owner, scopes] of representatives) {
      const rule = matchingRules(manifest, path).find(candidate => candidate.owner === owner);
      expect(rule, path).toBeDefined();
      expect(rule?.scopes, path).toEqual(scopes);
    }
  });

  it("declares cross-cutting and package-sensitive widening", async () => {
    const manifest = JSON.parse(await readFile("config/validation-impact.json", "utf8")) as ImpactManifest;
    for (const path of ["package.json", "package-lock.json", "bin/a1.js", "src/product-identity.json"]) {
      expect(matchingRules(manifest, path).some(rule => rule.packageSensitive), path).toBe(true);
    }
    for (const path of ["vitest.config.ts", "tsconfig.json", ".github/workflows/publish-next.yml", "config/validation-suites.json"]) {
      expect(matchingRules(manifest, path).some(rule => rule.full && rule.packageSensitive), path).toBe(true);
    }
  });

  it("references only declared validation tiers and scopes and self-selects changed tests", async () => {
    const [impact, suites] = await Promise.all([
      readFile("config/validation-impact.json", "utf8").then(value => JSON.parse(value) as ImpactManifest),
      readFile("config/validation-suites.json", "utf8").then(value => JSON.parse(value) as { tiers: Record<string, unknown>; scopes: Record<string, unknown> }),
    ]);
    const declared = new Set([...Object.keys(suites.tiers), ...Object.keys(suites.scopes)]);
    const references = [...impact.mandatory, ...impact.planningOnly.selected, ...impact.rules.flatMap(rule => rule.scopes)];
    expect(references.filter(reference => !declared.has(reference))).toEqual([]);
    expect(impact.rules.filter(rule => rule.selectChangedTests)).toEqual([
      expect.objectContaining({ id: "test-self-selection", patterns: ["test/**/*.test.ts"] }),
    ]);
  });
});
