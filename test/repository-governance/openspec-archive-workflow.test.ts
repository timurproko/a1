import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { inspectWorkflowSource } from "../../scripts/governance/github-repository-governance.mjs";
import { ARCHIVE_TASKS } from "../../scripts/governance/openspec-archive-policy.mjs";

describe("trusted archive workflow wiring", () => {
  it("uses the reviewed default branch, least-privilege reads, App publication, and bounded resumable triggers", async () => {
    const source = await readFile(".github/workflows/openspec-archive.yml", "utf8");
    expect(inspectWorkflowSource(".github/workflows/openspec-archive.yml", source)).toMatchObject({
      triggers: ["pull_request_target:closed", "schedule", "workflow_dispatch"],
      permissions: ["actions: read", "contents: read", "pull-requests: read"],
      trustedSource: "default-branch", concurrency: "openspec-archive", artifactRetentionDays: [14],
      authority: ["archive-read-only-audit", "openspec-archive-app-publication"],
    });
    expect(source).toContain("cancel-in-progress: false");
    expect(source).toContain("timeout-minutes: 10");
    expect(source).toContain("github.event.pull_request.merged == true");
    expect(source).toContain("npm ci --ignore-scripts");
    expect(source).toContain("OPENSPEC_ARCHIVE_APP_PRIVATE_KEY:");
    expect(source).toContain("--discover-checkpoint");
    expect(source).toContain("checkpoint_run");
    expect(source).not.toContain("github.event.pull_request.head.sha");
    expect(source).not.toContain("contents: write");
    for (const match of source.matchAll(/uses: ([^\s]+)@([^\s]+)/g)) expect(match[2]).toMatch(/^[a-f0-9]{40}$/);
  });

  it("puts archive merge-result verification in ordinary read-only documentation CI", async () => {
    const source = await readFile(".github/workflows/ci.yml", "utf8");
    expect(source).toContain("--validate-candidate --pr");
    expect(source).toContain("Install pinned archive validation tooling");
    expect(source).not.toContain("OPENSPEC_ARCHIVE_APP_PRIVATE_KEY");
    expect(inspectWorkflowSource(".github/workflows/ci.yml", source).authority).toContain("archive-merge-result-validation");
  });

  it("documents the actual metadata and mechanical task contract without implying code auto-merge", async () => {
    const docs = await readFile("docs/openspec-archive-automation.md", "utf8");
    const config = await readFile("openspec/config.yaml", "utf8");
    expect(config).toContain("docs/openspec-archive-automation.md");
    expect(docs).toContain("openspec-implementation");
    expect(docs).toContain("openspec-acceptance");
    for (const description of Object.values(ARCHIVE_TASKS)) expect(docs).toContain(description);
    expect(docs).toContain("explicit manual merge authorization");
    expect(docs).toContain("Missing App setup blocks mutation");
    expect(docs).toContain("--dry-run --pr 123");
  });
});
