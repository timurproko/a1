import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { planRulesetChanges, validateRulesetDefinition, type GithubRulesetDefinition } from "../../scripts/github-rulesets.mjs";

async function definition(): Promise<GithubRulesetDefinition> {
  return JSON.parse(await readFile("config/github-rulesets.json", "utf8"));
}

describe("reviewable GitHub rulesets", () => {
  it("protects develop with pull requests and its check, and release tags from deletion and movement", async () => {
    const value = validateRulesetDefinition(await definition());
    expect(value.rulesets.map(ruleset => ruleset.conditions.ref_name.include[0])).toEqual(["refs/heads/develop", "refs/tags/v*"]);
    expect(value.rulesets.map(ruleset => ruleset.target)).toEqual(["branch", "tag"]);
    expect(value.rulesets.map(ruleset => ruleset.bypass_actors)).toEqual([[], []]);
    for (const ruleset of value.rulesets) {
      expect(ruleset.rules.map(rule => rule.type)).toEqual(expect.arrayContaining(["deletion", "non_fast_forward"]));
    }

    const [branch, tag] = value.rulesets;
    expect(branch!.rules.map(rule => rule.type)).toEqual(expect.arrayContaining(["pull_request", "required_status_checks"]));
    const pullRequest = branch!.rules.find(rule => rule.type === "pull_request")!;
    expect(pullRequest.parameters).toMatchObject({ required_approving_review_count: 0, require_last_push_approval: false, required_review_thread_resolution: true });
    // A tag is cut from an already-validated commit, so it carries no check of its
    // own; what matters is that it can never be moved afterwards.
    expect(tag!.rules.map(rule => rule.type)).not.toContain("required_status_checks");
    expect(JSON.stringify(value)).toContain("Development validation required");
    expect(JSON.stringify(value)).not.toContain("refs/heads/master");
  });

  it("rejects a definition that drops either protection", async () => {
    const branchOnly = await definition();
    branchOnly.rulesets = [branchOnly.rulesets[0]!, structuredClone(branchOnly.rulesets[0]!)];
    expect(() => validateRulesetDefinition(branchOnly)).toThrow(/one branch ruleset and one tag ruleset/);

    const unprotectedTag = await definition();
    unprotectedTag.rulesets[1]!.rules = unprotectedTag.rulesets[1]!.rules.filter(rule => rule.type !== "deletion");
    expect(() => validateRulesetDefinition(unprotectedTag)).toThrow(/missing deletion/);
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
