import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { planRulesetChanges, validateRulesetDefinition, type GithubRulesetDefinition } from "../../scripts/governance/github-rulesets.mjs";

async function definition(): Promise<GithubRulesetDefinition> {
  return JSON.parse(await readFile("config/github-repository-governance.json", "utf8"));
}

describe("reviewable GitHub rulesets", () => {
  it("gates develop, forward-only-protects master, and freezes release tags", async () => {
    const value = validateRulesetDefinition(await definition());
    expect(value.rulesets.map(ruleset => ruleset.conditions.ref_name.include[0])).toEqual(["refs/heads/develop", "refs/heads/master", "refs/tags/v*"]);
    expect(value.rulesets.map(ruleset => ruleset.target)).toEqual(["branch", "branch", "tag"]);
    expect(value.rulesets.map(ruleset => ruleset.bypass_actors)).toEqual([[], [], []]);
    for (const ruleset of value.rulesets) {
      expect(ruleset.rules.map(rule => rule.type)).toEqual(expect.arrayContaining(["deletion", "non_fast_forward"]));
    }

    const [develop, master, tag] = value.rulesets;
    expect(develop!.rules.map(rule => rule.type)).toEqual(expect.arrayContaining(["pull_request", "required_status_checks"]));
    const pullRequest = develop!.rules.find(rule => rule.type === "pull_request")!;
    expect(pullRequest.parameters).toMatchObject({ required_approving_review_count: 0, require_last_push_approval: false, required_review_thread_resolution: true });
    // Security: master only ever fast-forwards to a commit the release already published, and
    // a tag is cut from an already-validated commit. Neither carries a check; what
    // matters is that neither can be rewritten.
    for (const ruleset of [master, tag]) {
      expect(ruleset!.rules.map(rule => rule.type)).not.toContain("required_status_checks");
      expect(ruleset!.rules.map(rule => rule.type)).not.toContain("pull_request");
    }
    expect(JSON.stringify(value)).toContain("Development validation required");
  });

  it("rejects a definition that drops or over-gates a protection", async () => {
    const branchOnly = await definition();
    branchOnly.rulesets = [branchOnly.rulesets[0]!, branchOnly.rulesets[1]!, structuredClone(branchOnly.rulesets[0]!)];
    expect(() => validateRulesetDefinition(branchOnly)).toThrow(/unique|two branch rulesets and one tag ruleset/);

    const unprotectedTag = await definition();
    unprotectedTag.rulesets[2]!.rules = unprotectedTag.rulesets[2]!.rules.filter(rule => rule.type !== "deletion");
    expect(() => validateRulesetDefinition(unprotectedTag)).toThrow(/missing deletion/);

    const gatedMaster = await definition();
    gatedMaster.rulesets[1]!.rules = [...gatedMaster.rulesets[1]!.rules, structuredClone(gatedMaster.rulesets[0]!.rules.find(rule => rule.type === "pull_request")!)];
    expect(() => validateRulesetDefinition(gatedMaster)).toThrow(/must not gate a ref only the release writes/);

    const unknownField = await definition();
    const pullParameters = unknownField.rulesets[0]!.rules.find(rule => rule.type === "pull_request")!.parameters!;
    pullParameters.undocumented_github_field = true;
    expect(() => validateRulesetDefinition(unknownField)).toThrow(/unknown=undocumented_github_field/);
  });

  it("plans creates, updates, and unchanged rulesets without mutation", async () => {
    const value = await definition();
    const missing = planRulesetChanges(value, []);
    expect(missing).toMatchObject({ mode: "dry-run", mutationPerformed: false, summary: { create: 3, update: 0, undeclared: 0, unchanged: 0 } });

    const exact = planRulesetChanges(value, value.rulesets.map((ruleset, index) => ({ ...ruleset, id: index + 1 })));
    expect(exact.summary).toEqual({ create: 0, update: 0, undeclared: 0, unchanged: 3 });

    const drifted = structuredClone(value.rulesets);
    drifted[0]!.enforcement = "disabled";
    const drift = planRulesetChanges(value, drifted);
    expect(drift.summary).toEqual({ create: 0, update: 1, undeclared: 0, unchanged: 2 });
    expect(drift.mutationPerformed).toBe(false);
  });

  it("keeps API inspection read-only unless an exact apply confirmation is supplied", async () => {
    const source = await readFile("scripts/governance/check-github-repository-governance.mjs", "utf8");
    expect(source).toContain('process.argv.includes("--apply")');
    expect(source).toContain('valueAfter("--confirm") !== "apply-a1-github-governance"');
    expect(source).toContain("compareRepositoryGovernance(definition, live)");
    expect(source).toContain('mutationPerformed: mutations.length > 0');
  });
});
