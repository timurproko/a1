import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("complete regression automation", () => {
  it("remains available on explicit demand while nightly ownership lives with publication", async () => {
    const [regression, release] = await Promise.all([
      readFile(".github/workflows/full-regression.yml", "utf8"),
      readFile(".github/workflows/release.yml", "utf8"),
    ]);
    expect(regression).toContain("workflow_dispatch:");
    expect(regression).not.toContain("schedule:");
    expect(release).toContain('cron: "17 3 * * *"');
    expect(release).toContain('selected=\'["full-release"]\'');
  });

  it("builds and packs once before the complete deduplicated suite", async () => {
    const workflow = await readFile(".github/workflows/full-regression.yml", "utf8");
    expect(workflow.match(/run: npm ci/g)).toHaveLength(1);
    expect(workflow.match(/run: node scripts\/release\/prepare-validation-package\.mjs/g)).toHaveLength(1);
    expect(workflow).toContain("VALIDATION_SELECTION_JSON: '[\"full-release\"]'");
    expect(workflow).toContain('VALIDATION_BUILD_READY: "1"');
    expect(workflow).toContain("VALIDATION_CANDIDATE_TARBALL:");
    expect(workflow).toContain("node scripts/release/run-validation-tier.mjs --result .artifacts/validation/full-regression.json");
  });

  it("reports owned failures and timings without publication authority", async () => {
    const workflow = await readFile(".github/workflows/full-regression.yml", "utf8");
    expect(workflow).toContain("Report gate ownership and timing");
    expect(workflow).toContain("Owned gate");
    expect(workflow).toContain("outcome.exitCode");
    expect(workflow).toContain("full-regression-${{ github.sha }}-${{ github.run_id }}-${{ github.run_attempt }}");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).not.toMatch(/id-token:\s*write|npm publish|environment:\s*npm-/);
  });
});
