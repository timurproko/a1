import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  compareRepositoryGovernance,
  inspectLocalWorkflows,
  validateRepositoryGovernanceDefinition,
  type RepositoryGovernanceDefinition,
} from "../../scripts/governance/github-repository-governance.mjs";

async function definition(): Promise<RepositoryGovernanceDefinition> {
  return JSON.parse(await readFile("config/github-repository-governance.json", "utf8"));
}

async function matchingLive(value: RepositoryGovernanceDefinition) {
  return {
    repositorySettings: structuredClone(value.repositorySettings),
    actions: structuredClone(value.actions),
    securityCapabilities: structuredClone(value.securityCapabilities),
    environments: structuredClone(value.environments),
    protectedRefs: structuredClone(value.protectedRefs),
    rulesets: value.rulesets.map((ruleset, index) => ({ ...structuredClone(ruleset), id: index + 1 })),
    workflows: await inspectLocalWorkflows(value),
  };
}

describe("declarative GitHub repository governance", () => {
  it("contains one complete reviewed policy surface", async () => {
    const value = validateRepositoryGovernanceDefinition(await definition());
    expect(value.repositorySettings).toMatchObject({ default_branch: "develop", allow_auto_merge: true, delete_branch_on_merge: true });
    expect(value.actions).toMatchObject({ allowed_actions: "all", sha_pinning_required: false, default_workflow_permissions: "read" });
    expect(value.securityCapabilities).toMatchObject({ secret_scanning: "enabled", dependabot_alerts: "disabled" });
    expect(value.environments).toEqual([expect.objectContaining({ name: "npm-publish", protection_rules: [] })]);
    expect(value.protectedRefs).toEqual(["refs/heads/develop", "refs/heads/master", "refs/tags/v*"]);
    expect(value.workflows.map(workflow => workflow.path).sort()).toEqual((await readdir(".github/workflows")).map(name => `.github/workflows/${name}`).sort());
  });

  it("rejects omitted, unknown, and duplicate governance fields", async () => {
    const omitted = structuredClone(await definition()) as unknown as Record<string, unknown>;
    delete omitted.actions;
    expect(() => validateRepositoryGovernanceDefinition(omitted as unknown as RepositoryGovernanceDefinition)).toThrow(/omitted=actions/);

    const unknown = { ...(await definition()), accidentalAuthority: true };
    expect(() => validateRepositoryGovernanceDefinition(unknown as RepositoryGovernanceDefinition)).toThrow(/unknown=accidentalAuthority/);

    const duplicate = structuredClone(await definition());
    duplicate.workflows.push(structuredClone(duplicate.workflows[0]!));
    expect(() => validateRepositoryGovernanceDefinition(duplicate)).toThrow(/unique/);
  });

  it("reports exact paths for additive and value drift without mutation", async () => {
    const value = await definition();
    const live = await matchingLive(value);
    expect(compareRepositoryGovernance(value, live)).toMatchObject({ matches: true, mode: "read-only", mutationPerformed: false, differences: [] });

    const drift = structuredClone(live);
    drift.repositorySettings.delete_branch_on_merge = false;
    (drift.rulesets[0]!.rules.find(rule => rule.type === "pull_request")!.parameters as Record<string, unknown>).new_github_field = true;
    drift.workflows[0]!.permissions.push("issues: write");
    const report = compareRepositoryGovernance(value, drift);
    expect(report.matches).toBe(false);
    expect(report.differences.map(item => item.path)).toEqual(expect.arrayContaining([
      "repositorySettings.delete_branch_on_merge",
      expect.stringContaining("workflows"),
      "rulesets.a1-protect-develop",
    ]));
    expect(report.mutationPerformed).toBe(false);
  });

  it("inventories trusted refs, permissions, triggers, environments, and retention from every workflow", async () => {
    const value = await definition();
    const inspected = await inspectLocalWorkflows(value);
    const report = compareRepositoryGovernance(value, await matchingLive(value));
    expect(report.matches).toBe(true);
    expect(inspected.find(workflow => workflow.name === "Merged branch cleanup")).toMatchObject({
      triggers: ["pull_request_target:closed"], trustedSource: "default-branch", permissions: ["contents: write"],
    });
    expect(inspected.find(workflow => workflow.name === "Release")).toMatchObject({
      triggers: ["schedule", "workflow_dispatch"], trustedSource: "authoritative-develop", environments: ["npm-publish"], artifactRetentionDays: [1, 30],
    });
  });

  it("requires every third-party action reference to use an immutable commit", async () => {
    for (const name of await readdir(".github/workflows")) {
      const source = await readFile(`.github/workflows/${name}`, "utf8");
      for (const match of source.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
        const reference = match[1]!;
        if (reference.startsWith("./") || reference.startsWith("docker://")) continue;
        expect(reference, `${name}: ${reference}`).toMatch(/@[0-9a-f]{40}$/);
      }
    }
  });
});
