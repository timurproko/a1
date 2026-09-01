import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("impact-aware validation workflows", () => {
  it("computes one selection and runs modular pull-request jobs in parallel", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    expect(workflow.match(/select-validation-impact\.mjs/g)).toHaveLength(1);
    expect(workflow).toContain("rendering-tier: ${{ steps.selection.outputs.rendering_tier }}");
    expect(workflow).toContain("documentation-required: ${{ steps.selection.outputs.documentation_required }}");
    expect(workflow).toContain("name: Changed-file documentation validation");
    expect(workflow).toContain("name: Rendering validation");
    expect(workflow).toContain("needs: [changes, docs, documentation, validate, rendering, containment]");
    expect(workflow).toContain("node scripts/release/require-development-validation.mjs");
    expect(workflow.match(/name: Development validation required/g)).toHaveLength(1);
  });

  it("keeps ordinary validation free of rendering and live documentation scopes", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    const ordinary = workflow.slice(workflow.indexOf("\n  validate:"), workflow.indexOf("\n  rendering:"));
    expect(ordinary).toContain("'[\"typecheck\",\"architecture\",\"fast\",\"dist-integration\"]'");
    expect(ordinary).not.toMatch(/rendering-(?:smoke|stability)|check-code-documentation/);
    const rendering = workflow.slice(workflow.indexOf("\n  rendering:"), workflow.indexOf("\n  containment:"));
    expect(rendering).toContain("scope=rendering-stability");
    expect(rendering).toContain("scope=rendering-smoke");
  });

  it("runs one full documentation review outside release platform matrices", async () => {
    const [release, regression] = await Promise.all([
      readFile(".github/workflows/release.yml", "utf8"),
      readFile(".github/workflows/full-regression.yml", "utf8"),
    ]);
    const releaseReview = release.slice(release.indexOf("\n  documentation:"), release.indexOf("\n  guardians:"));
    const releaseMatrix = release.slice(release.indexOf("\n  validate:"), release.indexOf("\n  publish:"));
    expect(releaseReview.match(/check-code-documentation\.mjs --mode full/g)).toHaveLength(1);
    expect(releaseReview).toContain("needs.plan.outputs.mode == 'nightly'");
    expect(releaseMatrix).not.toContain("check-code-documentation.mjs");
    expect(releaseMatrix).toContain("VALIDATION_DOCUMENTATION_FULL_READY:");
    expect(regression.match(/check-code-documentation\.mjs --mode full/g)).toHaveLength(1);
    expect(regression).toContain('VALIDATION_DOCUMENTATION_FULL_READY: "1"');
  });
});
