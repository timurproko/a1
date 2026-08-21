import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { selectImpactFromChanges } from "../../scripts/validation-impact.mjs";

describe("trusted next candidate workflow", () => {
  it("accepts only an exact clean develop commit and ancestor range", async () => {
    const workflow = await readFile(".github/workflows/preview-candidate.yml", "utf8");
    expect(workflow).toContain("if: github.ref == 'refs/heads/develop'");
    expect(workflow).toContain("ref: ${{ inputs.source_commit }}");
    expect(workflow).toContain('test "$(git rev-parse origin/develop)" = "$SOURCE_COMMIT"');
    expect(workflow).toContain('git merge-base --is-ancestor "$BASE_COMMIT" "$SOURCE_COMMIT"');
    expect(workflow).toContain('test -z "$(git status --porcelain)"');
    expect(workflow).toContain('test "$CONFIRM_CANDIDATE" = "build-uncertified-next-candidate"');
  });

  it("installs, builds, and packs once before exact-package validation", async () => {
    const workflow = await readFile(".github/workflows/preview-candidate.yml", "utf8");
    expect(workflow.match(/run: npm ci/g)).toHaveLength(1);
    expect(workflow.match(/run: node scripts\/prepare-validation-package\.mjs/g)).toHaveLength(1);
    expect(workflow).toContain("--require package-smoke");
    expect(workflow).toContain('VALIDATION_BUILD_READY: "1"');
    expect(workflow).toContain("VALIDATION_CANDIDATE_TARBALL:");
    expect(workflow).toContain("node scripts/run-validation-tier.mjs --result artifacts/validation/outcomes.json");
    expect(workflow).not.toContain("npm run build");
  });

  it("binds and uploads digest-consistent candidate evidence without publication privilege", async () => {
    const workflow = await readFile(".github/workflows/preview-candidate.yml", "utf8");
    expect(workflow).toContain("node scripts/create-candidate-evidence.mjs");
    expect(workflow).toContain("artifacts/validation/package/candidate.tgz");
    expect(workflow).toContain("artifacts/validation/candidate-evidence.json");
    expect(workflow).toContain("retention-days: 14");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).not.toMatch(/id-token:\s*write|npm publish|environment:\s*npm-/);
  });

  it("keeps ordinary candidates focused and package-sensitive candidates widened", async () => {
    const ordinary = await selectImpactFromChanges([{ status: "M", path: "src/cli/dispatch.ts" }], { required: ["package-smoke"] });
    expect(ordinary.selected).toEqual(["invariants", "fast", "package-smoke"]);
    expect(ordinary.selected).not.toContain("package-install");

    const packaging = await selectImpactFromChanges([{ status: "M", path: "package.json" }], { required: ["package-smoke"] });
    expect(packaging.selected).toEqual(expect.arrayContaining(["package-smoke", "package-install", "dependency-policy"]));
  });
});
