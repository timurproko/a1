import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("stable candidate platform coordination", () => {
  it("packs one final-version artifact and fans its digest to three platforms", async () => {
    const workflow = await readFile(".github/workflows/stable-candidate.yml", "utf8");
    expect(workflow.match(/run: node scripts\/prepare-validation-package\.mjs/g)).toHaveLength(1);
    expect(workflow).toContain("platform: win32");
    expect(workflow).toContain("os: windows-2025");
    expect(workflow).toContain("platform: linux");
    expect(workflow).toContain("os: ubuntu-24.04");
    expect(workflow).toContain("platform: darwin");
    expect(workflow).toContain("os: macos-15");
    expect(workflow).toContain("stable package digest changed across platform fan-out");
    expect(workflow).toContain('VALIDATION_CANDIDATE_TARBALL="$tarball" STABLE_PACK_RESULT="$pack_result" node');
  });

  it("runs static analysis once and every runtime suite with clean installation on every platform", async () => {
    const workflow = await readFile(".github/workflows/stable-candidate.yml", "utf8");
    expect(workflow).toContain("VALIDATION_SELECTION_JSON: '[\"typecheck\",\"architecture\",\"dependency-policy\"]'");
    expect(workflow).toContain(
      "VALIDATION_SELECTION_JSON: '[\"fast\",\"dist-integration\",\"launch-integration\",\"pi-engine-conformance\",\"release-update\",\"update-performance\",\"structured-runtime-integration\",\"package-smoke\",\"package-install\"]'",
    );
    expect(workflow).toContain("node scripts/run-validation-tier.mjs --result artifacts/validation/stable-static.json");
    expect(workflow).toContain("node scripts/run-validation-tier.mjs --result artifacts/validation/stable-${{ matrix.platform }}.json");
    expect(workflow).toContain("node scripts/create-platform-verdict.mjs");
    expect(workflow).toContain("fail-fast: false");
  });

  it("fails closed unless the complete automated matrix is present", async () => {
    const [workflow, verifier] = await Promise.all([
      readFile(".github/workflows/stable-candidate.yml", "utf8"),
      readFile("scripts/verify-automated-stable.mjs", "utf8"),
    ]);
    expect(workflow).toContain("name: Stable automated candidate");
    expect(workflow).toContain('test "$PLATFORM_RESULT" = "success"');
    expect(workflow).toContain("node scripts/verify-automated-stable.mjs");
    expect(workflow).toContain("stable-automated-candidate-");
    expect(verifier).toContain("return matches[0]");
  });

  it("permits three-platform dry runs but prevents them entering stable certification", async () => {
    const [candidate, aggregate] = await Promise.all([
      readFile(".github/workflows/stable-candidate.yml", "utf8"),
      readFile(".github/workflows/certify-stable.yml", "utf8"),
    ]);
    expect(candidate).toContain("dry_run:");
    expect(candidate).toContain('test "$GITHUB_REF" != "refs/heads/develop"');
    expect(candidate).toContain('test "$CONFIRM_CANDIDATE" = "build-stable-dry-run"');
    expect(aggregate).toContain('automated.head_branch !== "develop"');
  });

  it("requires isolated physical workers and a separate exact-evidence aggregation", async () => {
    const [physical, aggregate] = await Promise.all([
      readFile(".github/workflows/stable-physical-certification.yml", "utf8"),
      readFile(".github/workflows/certify-stable.yml", "utf8"),
    ]);
    for (const label of ["a1-physical-windows", "a1-physical-linux", "a1-physical-macos"]) expect(physical).toContain(label);
    expect(physical).toContain('test "${PHYSICAL_WORKER_ISOLATED:-}" = "true"');
    expect(physical).toContain("npm run test:terminal-host");
    expect(physical).toContain("node scripts/create-physical-verdict.mjs");
    expect(aggregate).toContain('physical.path !== ".github/workflows/stable-physical-certification.yml"');
    expect(aggregate).toContain("node scripts/aggregate-stable-evidence.mjs");
    expect(aggregate).toContain("name: Stable candidate required");
    expect(aggregate).toContain("evidence.certification?.stableEligible !== true");
  });
});
