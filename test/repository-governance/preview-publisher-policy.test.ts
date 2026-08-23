import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("exact next artifact publisher", () => {
  it("accepts only a successful trusted candidate run for the current clean develop commit", async () => {
    const workflow = await readFile(".github/workflows/npm-publish.yml", "utf8");
    expect(workflow).toContain("candidate_run_id:");
    expect(workflow).not.toMatch(/^\s+(version|source_commit|integrity|shasum):$/m);
    expect(workflow).toContain("run.conclusion !== \"success\"");
    expect(workflow).toContain('run.path !== ".github/workflows/preview-candidate.yml"');
    expect(workflow).toContain('run.head_branch !== "develop" || run.head_sha !== process.env.GITHUB_SHA');
    expect(workflow).toContain("run.head_repository?.full_name !== process.env.GITHUB_REPOSITORY");
    expect(workflow).toContain('test "$CONFIRM_UNCERTIFIED" = "publish-uncertified-next"');
  });

  it("downloads and verifies exact evidence-bound bytes", async () => {
    const workflow = await readFile(".github/workflows/npm-publish.yml", "utf8");
    expect(workflow).toContain("uses: actions/download-artifact@018cc2cf5baa6db3ef3c5f8a56943fffe632ef53 # v6");
    expect(workflow).toContain("run-id: ${{ inputs.candidate_run_id }}");
    expect(workflow).toContain("pattern: npm-next-candidate-*");
    expect(workflow).toContain("evidence.source?.commit !== process.env.candidate_source_commit");
    expect(workflow).toContain("evidence.package?.integrity !== integrity || evidence.package?.shasum !== shasum");
    expect(workflow).toContain("evidence.certification?.stableEligible !== false");
    expect(workflow).toContain("candidate evidence is expired or future-dated");
    expect(workflow).toContain("packed manifest differs from evidence");
  });

  it("contains no source checkout, dependency install, build, or test execution", async () => {
    const workflow = await readFile(".github/workflows/npm-publish.yml", "utf8");
    expect(workflow).not.toMatch(/actions\/checkout|npm ci|npm install|npm run build|prepare-validation-package|vitest|test:release|run-validation-tier/);
    expect(workflow).toContain("npm publish \"${{ env.candidate_tarball }}\"");
  });

  it("is idempotent only for matching registry bytes and rejects substitution", async () => {
    const workflow = await readFile(".github/workflows/npm-publish.yml", "utf8");
    expect(workflow).toContain("if (response.status === 404)");
    expect(workflow).toContain("existing registry bytes differ from candidate");
    expect(workflow).toContain("if: steps.registry.outputs.exists != 'true'");
    expect(workflow).toContain("registry bytes differ from candidate");
    expect(workflow).toContain("metadata[\"dist-tags\"]?.next !== process.env.version");
  });
});
