import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { classifyDocumentationAutoMerge, type PullRequestChangedFile } from "../../scripts/governance/documentation-auto-merge.mjs";

function files(...paths: string[]): PullRequestChangedFile[] {
  return paths.map(filename => ({ filename, status: "modified" }));
}

describe("documentation auto-merge path policy", () => {
  it("allows only OpenSpec paths and the root README", () => {
    expect(classifyDocumentationAutoMerge(files("openspec/changes/example/proposal.md")).eligible).toBe(true);
    expect(classifyDocumentationAutoMerge(files("openspec/specs/example/spec.md", "README.md")).eligible).toBe(true);
    expect(classifyDocumentationAutoMerge(files("README.md")).eligible).toBe(true);
  });

  it.each([
    ["ordinary docs", ["docs/ci-release-runbook.md"]],
    ["nested readme", ["docs/README.md"]],
    ["source", ["src/index.ts"]],
    ["tests", ["test/example.test.ts"]],
    ["scripts", ["scripts/example.mjs"]],
    ["configuration", ["config/validation-suites.json"]],
    ["workflow", [".github/workflows/ci.yml"]],
    ["generated baseline", ["config/baselines/example.json"]],
    ["mixed spec and code", ["openspec/changes/example/proposal.md", "src/index.ts"]],
  ])("rejects %s changes", (_label, paths) => {
    const result = classifyDocumentationAutoMerge(files(...paths));
    expect(result.eligible).toBe(false);
    expect(result.disallowedPaths.length).toBeGreaterThan(0);
  });

  it("fails closed for empty or malformed metadata", () => {
    expect(classifyDocumentationAutoMerge([]).eligible).toBe(false);
    expect(classifyDocumentationAutoMerge([{ filename: "", status: "modified" }]).eligible).toBe(false);
    expect(classifyDocumentationAutoMerge([{ filename: "openspec/new.md", status: "renamed" }]).eligible).toBe(false);
  });

  it("examines both sides of a rename", () => {
    expect(classifyDocumentationAutoMerge([{
      filename: "openspec/changes/example/proposal.md",
      previous_filename: "src/unsafe.ts",
      status: "renamed",
    }])).toMatchObject({ eligible: false, disallowedPaths: ["src/unsafe.ts"] });
    expect(classifyDocumentationAutoMerge([{
      filename: "openspec/specs/new/spec.md",
      previous_filename: "openspec/specs/old/spec.md",
      status: "renamed",
    }]).eligible).toBe(true);
  });
});

describe("documentation auto-merge workflow", () => {
  it("runs trusted policy after validation and when auto-merge state can become unsafe", async () => {
    const workflow = await readFile(".github/workflows/documentation-auto-merge.yml", "utf8");
    expect(workflow).toContain("workflow_run:");
    expect(workflow).toContain("workflows: [Development validation]");
    expect(workflow).toContain("pull_request_target:");
    expect(workflow).toContain("auto_merge_enabled");
    expect(workflow).toContain("ref: ${{ github.event.repository.default_branch }}");
    expect(workflow).toContain("contents: write");
    expect(workflow).toContain("pull-requests: write");
    expect(workflow).toContain("manage-documentation-auto-merge.mjs");
    expect(workflow).not.toContain("github.event.pull_request.head.sha");
  });

  it("arms only successful trusted documentation PRs and disables ineligible auto-merge", async () => {
    const manager = await readFile("scripts/governance/manage-documentation-auto-merge.mjs", "utf8");
    expect(manager).toContain('event.workflow_run.conclusion === "success"');
    expect(manager).toContain('pull.head?.repo?.full_name === repositoryName');
    expect(manager).toContain('pull.base?.ref === "develop"');
    expect(manager).toContain("enablePullRequestAutoMerge");
    expect(manager).toContain("mergeMethod: SQUASH");
    expect(manager).toContain("disablePullRequestAutoMerge");
    expect(manager).toContain("await disableIfArmed(pull, `classification failed:");
  });
});
