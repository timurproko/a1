import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectWorkflowSource } from "../../scripts/governance/github-repository-governance.mjs";
import { main } from "../../scripts/governance/reconcile-openspec-archive.mjs";
import { OPENSPEC_VERSION } from "../../scripts/governance/openspec-archive-staging.mjs";
import { ARCHIVE_TASKS } from "../../scripts/governance/openspec-archive-policy.mjs";

describe("trusted archive workflow wiring", () => {
  it("uses the reviewed default branch, least-privilege reads, App publication, and bounded resumable triggers", async () => {
    const source = await readFile(".github/workflows/openspec-archive.yml", "utf8");
    expect(inspectWorkflowSource(".github/workflows/openspec-archive.yml", source)).toMatchObject({
      triggers: ["pull_request_target", "schedule", "workflow_dispatch"],
      permissions: ["actions: read", "contents: read", "pull-requests: read"],
      trustedSource: "default-branch", concurrency: "openspec-archive", artifactRetentionDays: [14],
      authority: ["archive-read-only-audit", "openspec-archive-app-publication"],
    });
    expect(source).toContain("cancel-in-progress: false");
    expect(source).toContain("timeout-minutes: 10");
    expect(source).toContain("github.event.pull_request.merged == true");
    expect(source).toContain("startsWith(github.event.pull_request.head.ref, 'docs/accept-')");
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
    expect(source).toContain("--validate-acceptance --pr");
    const acceptanceJob = source.match(/\n  acceptance:[\s\S]*?(?=\n  [\w-]+:|$)/)?.[0] ?? "";
    expect(acceptanceJob).toContain("Check out trusted base policy only");
    expect(acceptanceJob).toContain("github.event.pull_request.base.sha");
    expect(acceptanceJob).not.toMatch(/npm ci|npm run build|vitest|: write/);
    expect(acceptanceJob).toContain("Acceptance policy is not deployed on this trusted base");
    expect(source).toContain("Install pinned archive validation tooling");
    const docsJob = source.match(/\n  docs:[\s\S]*?(?=\n  [\w-]+:|$)/)?.[0] ?? "";
    expect(docsJob).not.toMatch(/npm ci|npm run build|vitest/);
    expect(docsJob).toContain('npm install --prefix "$RUNNER_TEMP/openspec-archive-tools"');
    expect(docsJob).toContain(`--ignore-scripts --no-audit --no-fund @fission-ai/openspec@${OPENSPEC_VERSION}`);
    expect(docsJob).toContain('--tool-root "$RUNNER_TEMP/openspec-archive-tools/node_modules/@fission-ai/openspec"');
    expect(source).not.toContain("OPENSPEC_ARCHIVE_APP_PRIVATE_KEY");
    expect(docsJob).toContain("pull-requests: read");
    expect(docsJob).toContain("actions: read");
    expect(docsJob).not.toContain(": write");
    expect(inspectWorkflowSource(".github/workflows/ci.yml", source)).toMatchObject({
      permissions: ["actions: read", "contents: read", "pull-requests: read"],
      authority: ["Development validation required", "acceptance-record-validation", "archive-merge-result-validation"],
    });
    const mergeOwner = await readFile(".github/workflows/documentation-auto-merge.yml", "utf8");
    expect(mergeOwner).toContain("actions: read");
  });

  it("restricts the isolated tool override to candidate validation", async () => {
    await expect(main(["--dry-run", "--tool-root", "unused"])).rejects.toThrow("tool-root-mode");
    await expect(main(["--validate-candidate", "--pr", "1", "--tool-root", ""])).rejects.toThrow("tool-root-mode");
  });

  it("uses the explicit tool root rather than falling back to checkout dependencies", async () => {
    const root = await mkdtemp(join(tmpdir(), "archive-validation-tool-"));
    try {
      await expect(main(["--validate-candidate", "--pr", "1", "--tool-root", root])).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await rm(root, { recursive: true, force: true }); }
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
