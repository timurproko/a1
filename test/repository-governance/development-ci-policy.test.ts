import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("automatic development validation workflow", () => {
  it("runs for pull requests and develop pushes with stale-run cancellation", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("branches: [develop]");
    expect(workflow).toContain("push:");
    expect(workflow).toContain("development-validation-${{ github.event.pull_request.number || github.ref }}");
    expect(workflow).toContain("cancel-in-progress: true");
    expect(workflow).not.toContain("pull_request_target:");
  });

  it("uses trusted merge-base and push ranges for explainable selection", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("github.event.pull_request.base.sha || github.event.before");
    expect(workflow).toContain("github.event.pull_request.head.sha || github.sha");
    expect(workflow).toContain('git merge-base "$EVENT_BASE_SHA" "$head_sha"');
    expect(workflow).toContain("scripts/select-validation-impact.mjs");
    expect(workflow).toContain("--github-output \"$GITHUB_OUTPUT\"");
    expect(workflow).toContain("artifacts/validation/impact.json");
  });

  it("gives untrusted validation read-only permissions and no release environment", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).not.toMatch(/id-token:\s*write|environment:\s*npm-/);
    expect(workflow).toContain("persist-credentials: false");
  });

  it("installs once, executes selected tiers, and preserves timing evidence", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("VALIDATION_SELECTION_JSON: ${{ needs.impact.outputs.selected }}");
    expect(workflow.match(/run: npm ci/g)).toHaveLength(1);
    expect(workflow).toContain('VALIDATION_BUILD_READY: "1"');
    expect(workflow).toContain("node scripts/run-validation-tier.mjs --result artifacts/validation/outcomes.json");
    expect(workflow).toContain("## Validation timing");
    expect(workflow).toContain("validation-outcomes-${{ github.run_id }}-${{ github.run_attempt }}");
  });
});
