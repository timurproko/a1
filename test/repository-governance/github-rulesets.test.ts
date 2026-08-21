import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { planRulesetChanges, validateRulesetDefinition, type GithubRulesetDefinition } from "../../scripts/github-rulesets.mjs";

async function definition(): Promise<GithubRulesetDefinition> {
  return JSON.parse(await readFile("config/github-rulesets.json", "utf8"));
}

describe("reviewable GitHub branch rulesets", () => {
  it("protects develop and master with PRs, stable checks, deletion, and force-push restrictions", async () => {
    const value = validateRulesetDefinition(await definition());
    expect(value.rulesets.map(ruleset => ruleset.conditions.ref_name.include[0])).toEqual(["refs/heads/develop", "refs/heads/master"]);
    expect(value.rulesets.map(ruleset => ruleset.bypass_actors)).toEqual([[], []]);
    for (const ruleset of value.rulesets) {
      expect(ruleset.rules.map(rule => rule.type)).toEqual(expect.arrayContaining(["deletion", "non_fast_forward", "pull_request", "required_status_checks"]));
    }
    expect(JSON.stringify(value)).toContain("Development validation required");
    expect(JSON.stringify(value)).toContain("Stable candidate required");
  });

  it("plans creates, updates, and unchanged rulesets without mutation", async () => {
    const value = await definition();
    const missing = planRulesetChanges(value, []);
    expect(missing).toMatchObject({ mode: "dry-run", mutationPerformed: false, summary: { create: 2, update: 0, unchanged: 0 } });

    const exact = planRulesetChanges(value, value.rulesets.map((ruleset, index) => ({ ...ruleset, id: index + 1 })));
    expect(exact.summary).toEqual({ create: 0, update: 0, unchanged: 2 });

    const drifted = structuredClone(value.rulesets);
    drifted[0]!.enforcement = "disabled";
    const drift = planRulesetChanges(value, drifted);
    expect(drift.summary).toEqual({ create: 0, update: 1, unchanged: 1 });
    expect(drift.mutationPerformed).toBe(false);
  });

  it("keeps API inspection read-only unless an exact apply confirmation is supplied", async () => {
    const source = await readFile("scripts/check-github-rulesets.mjs", "utf8");
    expect(source).toContain('process.argv.includes("--apply")');
    expect(source).toContain('valueAfter("--confirm") !== "apply-a1-ci-rulesets"');
    expect(source).toContain('report = planRulesetChanges(definition, live)');
    expect(source).toContain('mutationPerformed: mutations.length > 0');
  });
});
