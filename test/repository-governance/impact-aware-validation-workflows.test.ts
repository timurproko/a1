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
    const required = workflow.slice(workflow.indexOf("\n  required:"));
    expect(required).toContain("ref: ${{ needs.changes.outputs.head-sha }}");
    expect(required).toContain("node scripts/release/require-development-validation.mjs");
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

  it("gates resume restoration and packaged launch evidence outside the fast remainder", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    const suites = JSON.parse(await readFile("config/validation-suites.json", "utf8"));
    const path = "test/foundation/release/session-resume.integration.test.ts";
    expect(suites.tiers.fast.exclude).toContain(path);
    expect(suites.scopes["package-smoke"]).toMatchObject({ requiresBuild: true, consumesPackage: true });
    expect(suites.scopes["package-smoke"].tests).toContain(path);
    const ordinary = workflow.slice(workflow.indexOf("\n  validate:"), workflow.indexOf("\n  rendering:"));
    expect(ordinary).toContain("run-validation-tier.mjs pi-engine-conformance package-smoke");
    expect(ordinary).toContain('VALIDATION_BUILD_READY: "1"');
    expect(ordinary).not.toContain("continue-on-error");
  });

  it("requires macOS native containment and packaged startup evidence", async () => {
    const [workflow, guardian, build, launch, startupTest] = await Promise.all([
      readFile(".github/workflows/ci.yml", "utf8"),
      readFile("native/process-guardian/src/darwin.rs", "utf8"),
      readFile("scripts/development/build-process-guardian.mjs", "utf8"),
      readFile("src/foundation/launch-guardian/main.ts", "utf8"),
      readFile("test/foundation/release/supervisor-startup.test.ts", "utf8"),
    ]);
    const containment = workflow.slice(workflow.indexOf("\n  containment:"), workflow.indexOf("\n  required:"));
    expect(containment).toContain("os: macos-15");
    expect(containment).toContain("A1_RUN_PROCESS_CONTAINMENT_INTEGRATION");
    expect(containment).toContain("test/foundation/process-containment");
    expect(containment).toContain("if: matrix.os == 'macos-15'");
    expect(containment).toContain("run-validation-tier.mjs package-smoke");
    expect(guardian).toContain("darwin-process-group");
    expect(guardian).toContain("proc_pidinfo");
    expect(build).toContain('capability: "supported"');
    expect(launch).toContain("DarwinNativeProcessInspector");
    expect(startupTest).toContain("surfaces a matching startup failure before the endpoint timeout");
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
