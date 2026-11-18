import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  compareRepositoryGovernance,
  inspectLocalWorkflows,
  inspectWorkflowSource,
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
    labels: structuredClone(value.labels),
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
    // Invariant: rulesets are declared by the shared delivery workflow, never in this definition.
    expect(value).not.toHaveProperty("rulesets");
    expect(value).not.toHaveProperty("protectedRefs");
    expect(value.labels).toEqual([
      expect.objectContaining({ name: "pi-upgrade-skipped", color: expect.stringMatching(/^[0-9a-f]{6}$/) }),
    ]);
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
    drift.workflows[0]!.permissions.push("issues: write");
    drift.labels = [];
    const report = compareRepositoryGovernance(value, drift);
    expect(report.matches).toBe(false);
    expect(report.differences.map(item => item.path)).toEqual(expect.arrayContaining([
      "repositorySettings.delete_branch_on_merge",
      "labels[0].color",
      expect.stringContaining("workflows"),
    ]));
    expect(report.mutationPerformed).toBe(false);
  });

  it("inventories trusted refs, permissions, triggers, environments, and retention from every workflow", async () => {
    const value = await definition();
    const inspected = await inspectLocalWorkflows(value);
    const report = compareRepositoryGovernance(value, await matchingLive(value));
    expect(report.matches).toBe(true);
    expect(inspected.find(workflow => workflow.name === "Development validation")).toMatchObject({
      artifactRetentionDays: [7, 14],
    });
    expect(inspected.find(workflow => workflow.name === "Delivery")).toMatchObject({
      triggers: ["pull_request_target", "pull_request_target:edited", "workflow_dispatch", "workflow_run"],
      trustedSource: "shared-delivery-workflow", permissions: ["contents: write", "pull-requests: read"], authority: ["shared-delivery"],
    });
    expect(inspected.find(workflow => workflow.name === "Nightly regression triage")).toMatchObject({
      triggers: ["workflow_dispatch", "workflow_run"], trustedSource: "default-branch", permissions: ["actions: read", "contents: write", "pull-requests: write"], authority: ["nightly-regression-triage"], artifactRetentionDays: [30],
    });
    expect(inspected.find(workflow => workflow.name === "Stable candidate validation")).toMatchObject({
      triggers: ["workflow_dispatch"], trustedSource: "default-branch", authority: ["stable-release-candidate-validation"],
    });
    expect(inspected.find(workflow => workflow.name === "Publish stable release")).toMatchObject({
      triggers: ["release:published"], trustedSource: "published-release-tag",
      authority: ["release-reopening-proposal", "stable-release-publication", "unconsumed-release-tag-rollback"], artifactRetentionDays: [],
    });
    expect(inspected.find(workflow => workflow.name === "Development publication")).toMatchObject({
      triggers: ["workflow_dispatch"], trustedSource: "default-branch", authority: ["npm-next"],
    });
    expect(inspected.find(workflow => workflow.name === "Publish")).toMatchObject({
      triggers: ["schedule", "workflow_call"], trustedSource: "authoritative-develop", environments: ["npm-publish"], artifactRetentionDays: [30],
      authority: expect.arrayContaining(["master-fast-forward", "npm-latest"]),
    });
  });

  it("trusts the shared delivery caller only while it forwards events without running steps of its own", async () => {
    const path = ".github/workflows/delivery.yml";
    const source = await readFile(path, "utf8");
    expect(inspectWorkflowSource(path, source)).toMatchObject({ trustedSource: "shared-delivery-workflow", authority: ["shared-delivery"] });
    expect(inspectWorkflowSource(path, source.replace("@main", "@feature")).trustedSource).toBe("unknown");
    expect(inspectWorkflowSource(path, `${source}  extra:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: echo hi\n`).trustedSource).toBe("unknown");
  });

  it("reports drift when a workflow adds a diagnostic retention period", async () => {
    const value = await definition();
    const stale = structuredClone(value);
    const index = stale.workflows.findIndex(workflow => workflow.path === ".github/workflows/ci.yml");
    stale.workflows[index] = { ...stale.workflows[index]!, artifactRetentionDays: [14] };
    // Invariant: the report addresses workflows in name order, not declaration order.
    const sorted = [...stale.workflows].sort((left, right) => left.name.localeCompare(right.name)).findIndex(workflow => workflow.path === ".github/workflows/ci.yml");
    const report = compareRepositoryGovernance(stale, await matchingLive(value));
    expect(report.matches).toBe(false);
    expect(report.differences).toEqual([
      { path: `workflows[${sorted}].artifactRetentionDays[0]`, expected: 14, actual: 7, reason: "value" },
      { path: `workflows[${sorted}].artifactRetentionDays[1]`, expected: undefined, actual: 14, reason: "unknown" },
    ]);
    expect(report.mutationPerformed).toBe(false);
  });

  it("recognizes tag rollback only through a contents-scoped App token", async () => {
    const source = await readFile(".github/workflows/release.yml", "utf8");
    expect(inspectWorkflowSource(".github/workflows/release.yml", source).authority).toContain("unconsumed-release-tag-rollback");
    const unscoped = inspectWorkflowSource(".github/workflows/release.yml", source.replace(/^\s+permission-contents: write\n/m, ""));
    expect(unscoped.authority).toContain("unscoped-release-tag-rollback");
    expect(unscoped.authority).not.toContain("unconsumed-release-tag-rollback");
  });

  it("reports a registry-token publisher as authority the reviewed definition does not list", async () => {
    const source = await readFile(".github/workflows/publish.yml", "utf8");
    const path = ".github/workflows/publish.yml";
    expect(inspectWorkflowSource(path, source).authority).not.toContain("npm-token-publication");
    for (const drifted of [
      `${source}\n      - run: npm publish\n        env:\n          NODE_AUTH_TOKEN: \${{ secrets.REGISTRY }}\n`,
      `${source}\n      - run: echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc\n`,
    ]) {
      expect(inspectWorkflowSource(path, drifted).authority).toContain("npm-token-publication");
    }
  });

  it("requires every third-party action reference to use an immutable commit", async () => {
    for (const name of await readdir(".github/workflows")) {
      const source = await readFile(`.github/workflows/${name}`, "utf8");
      for (const match of source.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
        const reference = match[1]!;
        if (reference.startsWith("./") || reference.startsWith("docker://")
          || reference === "timurproko/a1/.github/workflows/publish.yml@develop"
          || reference === "timurproko/MyGitWorkflows/.github/workflows/delivery.yml@main") continue;
        expect(reference, `${name}: ${reference}`).toMatch(/@[0-9a-f]{40}$/);
      }
    }
  });
});
