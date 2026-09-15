import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

describe("impact-aware validation workflows", () => {
  it("computes one selection and runs modular pull-request jobs in parallel", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    expect(workflow.match(/select-validation-impact\.mjs/g)).toHaveLength(1);
    expect(workflow).toContain("rendering-tier: ${{ steps.selection.outputs.rendering_tier }}");
    expect(workflow).toContain("documentation-required: ${{ steps.selection.outputs.documentation_required }}");
    expect(workflow).toContain("name: Changed-file documentation validation");
    expect(workflow).toContain("name: Rendering validation");
    expect(workflow).toContain("needs: [changes, docs, naming, documentation, validate, startup, rendering, containment]");
    const required = workflow.slice(workflow.indexOf("\n  required:"));
    expect(required).toContain("ref: ${{ needs.changes.outputs.head-sha }}");
    expect(required).toContain("node scripts/release/require-development-validation.mjs");
    expect(workflow.match(/name: Development validation required/g)).toHaveLength(1);
  });

  it("keeps ordinary validation free of rendering and live documentation scopes", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    const ordinary = workflow.slice(workflow.indexOf("\n  validate:"), workflow.indexOf("\n  startup:"));
    expect(ordinary).toContain("'[\"typecheck\",\"architecture\",\"fast\",\"dist-integration\"]'");
    expect(ordinary).not.toMatch(/rendering-(?:smoke|stability)|check-code-documentation/);
    const rendering = workflow.slice(workflow.indexOf("\n  rendering:"), workflow.indexOf("\n  containment:"));
    expect(rendering).toContain("scope=rendering-stability");
    expect(rendering).toContain("scope=rendering-smoke");
  });

  it("requires the complete Node 22 startup lane on PRs and manual development runs", async () => {
    assertDevelopmentStartup(parse(await readFile(".github/workflows/ci.yml", "utf8")));
  });

  it.each(["extra runtime", "missing Node 22", "conditional runtime", "missing images", "missing history", "skipped startup", "missing dependency"])("rejects startup policy drift: %s", async mutation => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const startup = workflow.jobs.startup;
    if (mutation === "extra runtime") startup.strategy.matrix.node.push(24);
    if (mutation === "missing Node 22") startup.strategy.matrix.node = [24];
    if (mutation === "conditional runtime") startup.strategy.matrix.node = "${{ github.event_name == 'pull_request' && fromJSON('[22]') || fromJSON('[22,24]') }}";
    if (mutation === "missing images") startup.steps = startup.steps.filter((step: { name: string }) => step.name !== "Validate background and packaged image preparation");
    if (mutation === "missing history") startup.steps = startup.steps.filter((step: { name: string }) => step.name !== "Validate durable history on the selected Node runtime");
    if (mutation === "skipped startup") startup.if = "false";
    if (mutation === "missing dependency") workflow.jobs.required.needs = workflow.jobs.required.needs.filter((name: string) => name !== "startup");
    expect(() => assertDevelopmentStartup(workflow)).toThrow();
  });

  it("gates resume restoration and packaged launch evidence outside the fast remainder", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    const suites = JSON.parse(await readFile("config/validation-suites.json", "utf8"));
    const path = "test/foundation/release/session-resume.integration.test.ts";
    expect(suites.scopes["fast-remainder"].exclude).toContain(path);
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
    expect(containment).toContain("RUN_PROCESS_CONTAINMENT_INTEGRATION");
    expect(containment).toContain("test/foundation/process-containment");
    expect(containment).toContain("os: ubuntu-24.04");
    expect(containment).toContain("Validate packaged Unix supervision and containment");
    expect(containment).toContain("test/foundation/launch-context");
    expect(containment).not.toContain("if: matrix.os == 'macos-15'");
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

function assertDevelopmentStartup(workflow: ReturnType<typeof parse>) {
  expect(workflow.on.pull_request.branches).toEqual(["develop"]);
  expect(workflow.on.pull_request.types).toContain("ready_for_review");
  expect(workflow.on).toHaveProperty("workflow_dispatch");
  expect(workflow.jobs.changes.if).toBe("github.event_name != 'pull_request' || github.event.pull_request.draft == false");
  const startup = workflow.jobs.startup;
  expect(startup.name).toBe("Startup budget (windows-node${{ matrix.node }})");
  expect(startup.strategy.matrix).toEqual({ node: [22] });
  expect(startup.strategy["max-parallel"]).toBe(1);
  expect(startup.needs).toBe("changes");
  expect(startup.if).toBe("needs.changes.outputs.docs-only != 'true' && needs.changes.outputs.version-only != 'true'");
  expect(startup["runs-on"]).toBe("windows-2025");
  expect(startup["timeout-minutes"]).toBe(20);
  expect(startup.steps).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: "Check out validation head", with: expect.objectContaining({ ref: "${{ needs.changes.outputs.head-sha }}", "persist-credentials": false }) }),
    expect.objectContaining({ name: "Set up Node", with: expect.objectContaining({ "node-version": "${{ matrix.node }}" }) }),
    expect.objectContaining({ name: "Enable Defender real-time protection for startup acceptance", run: expect.stringContaining("Set-MpPreference -DisableRealtimeMonitoring $false") }),
    expect.objectContaining({ name: "Install exact dependencies and build", run: "npm ci" }),
    expect.objectContaining({ name: "Validate first-attempt exact-package startup budget", run: "node scripts/release/run-validation-tier.mjs package-install --result .artifacts/validation/startup-node${{ matrix.node }}.json", env: expect.objectContaining({ STARTUP_PERFORMANCE_RESULT: ".artifacts/validation/startup-node${{ matrix.node }}-performance.json" }) }),
    expect.objectContaining({ name: "Validate background and packaged image preparation", run: "npx vitest run test/integrations/pi/session-ui/image-preparation.test.ts test/integrations/pi/session-ui/image-worker-package.test.ts --maxWorkers=1 --minWorkers=1" }),
    expect.objectContaining({ name: "Validate durable history on the selected Node runtime", run: "npx vitest run test/features/prompt-history --maxWorkers=1 --minWorkers=1" }),
    expect.objectContaining({ name: "Upload startup budget evidence", if: "always()", with: expect.objectContaining({ path: ".artifacts/validation/startup-node${{ matrix.node }}*.json\n.artifacts/validation/phases/*.jsonl\n", "retention-days": 14 }) }),
  ]));
  for (const step of startup.steps) {
    if (step.name !== "Upload startup budget evidence") expect(step.if).toBeUndefined();
  }
  expect(JSON.stringify(startup)).not.toMatch(/retry|continue-on-error/);
  expect(workflow.jobs.required.needs).toContain("startup");
  expect(workflow.jobs.required.steps).toContainEqual(expect.objectContaining({
    run: "node scripts/release/require-development-validation.mjs",
    env: expect.objectContaining({ STARTUP_RESULT: "${{ needs.startup.result }}", EXPECTED_HEAD: "${{ github.event.pull_request.head.sha || github.sha }}" }),
  }));
}
