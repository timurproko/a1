import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

describe("impact-aware validation workflows", () => {
  it("computes one trusted selection and fans out independent matrix cells", async () => {
    const source = await readFile(".github/workflows/ci.yml", "utf8");
    const workflow = parse(source);
    expect(source.match(/select-validation-impact\.mjs/g)).toHaveLength(1);
    expect(workflow.jobs.modular.needs).toBe("changes");
    expect(workflow.jobs.rendering.needs).toBe("changes");
    expect(workflow.jobs.modular.strategy["fail-fast"]).toBe(false);
    expect(workflow.jobs.modular.strategy).not.toHaveProperty("max-parallel");
    expect(workflow.jobs.required.needs).toEqual(["changes", "acceptance", "docs", "naming", "documentation", "modular", "rendering"]);
    expect(source.match(/name: Development validation required/g)).toHaveLength(1);
  });

  it("skips every generic lane only behind trusted acceptance validation", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const changes = workflow.jobs.changes;
    expect(changes.permissions).toEqual({ contents: "read", "pull-requests": "read" });
    for (const name of ["Check out head", "Set up Node", "Install exact analysis dependencies",
      "Select validation from the complete impact", "Upload exact impact selection"]) {
      expect(changes.steps.find((step: { name: string }) => step.name === name)?.if)
        .toBe("steps.route.outputs.acceptance_only != 'true'");
    }
    for (const name of ["docs", "naming", "documentation", "modular", "rendering"]) {
      expect(workflow.jobs[name].if).toContain("needs.changes.outputs.acceptance-only != 'true'");
    }
    expect(workflow.jobs.acceptance.outputs["acceptance-candidate"])
      .toBe("${{ steps.validation.outputs.acceptance_candidate || 'false' }}");
    expect(workflow.jobs.acceptance.outputs["delivery-candidate"])
      .toBe("${{ steps.validation.outputs.delivery_candidate || 'false' }}");
    const aggregate = workflow.jobs.required.steps.find((step: { name: string }) => step.name === "Require current impact-selected validation");
    expect(aggregate.env).toMatchObject({
      ACCEPTANCE_ONLY: "${{ needs.changes.outputs.acceptance-only }}",
      ACCEPTANCE_CANDIDATE: "${{ needs.acceptance.outputs.acceptance-candidate }}",
      ACCEPTANCE_RESULT: "${{ needs.acceptance.result }}",
    });
    for (const name of ["Download exact impact selection", "Download all modular outcomes", "Require exact selected owner outcomes", "Upload aggregate evidence"]) {
      expect(workflow.jobs.required.steps.find((step: { name: string }) => step.name === name)?.if)
        .toContain("needs.changes.outputs.acceptance-only != 'true'");
    }
  });

  it("keeps the bounded PR core and selected resource-sensitive work isolated", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const entries = workflow.jobs.modular.strategy.matrix.include as any[];
    expect(entries.find(entry => entry.group === "core")).toMatchObject({ os: "windows-2025", node: 24, build: true, guardian: true });
    expect(entries.find(entry => entry.group === "resource")).toMatchObject({ os: "windows-2025", node: 24, build: false, guardian: false });
    expect(entries.filter(entry => ["core", "resource"].includes(entry.group))).toHaveLength(2);
    const resolver = workflow.jobs.modular.steps.find((step: any) => step.id === "job-selection");
    expect(resolver.run).toContain("resolve-validation-job.mjs");
    const run = workflow.jobs.modular.steps.find((step: any) => step.name === "Run exact selected scopes");
    const envelope = workflow.jobs.modular.steps.find((step: any) => step.name === "Complete content-free job envelope");
    expect(envelope.if).toBe("always()");
    expect(envelope.run).toContain("mkdirSync");
    expect(envelope.run).toContain("attempt-${process.env.GITHUB_RUN_ATTEMPT}");
    expect(envelope.run).not.toContain("readFileSync");
    expect(run.env.VALIDATION_SELECTION_JSON).toBe("${{ steps.job-selection.outputs.scopes_json }}");
    expect(run.env.VALIDATION_TESTS_JSON).toBe("${{ steps.job-selection.outputs.tests_json }}");
    expect(run.env).toMatchObject({ VALIDATION_HEAD: "${{ steps.job-selection.outputs.head }}", VALIDATION_SELECTION_ID: "${{ steps.job-selection.outputs.selection_id }}" });
  });

  it("retains Node 22 Defender startup and all declared platform/runtime owner targets", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const entries = workflow.jobs.modular.strategy.matrix.include as any[];
    expect(entries.find(entry => entry.group === "startup")).toMatchObject({ os: "windows-2025", platform: "win32", node: 22, defender: true });
    expect(entries.filter(entry => entry.group === "containment").map(entry => `${entry.platform}:${entry.node}`).sort()).toEqual(["darwin:24", "linux:24"]);
    expect(entries.some(entry => entry.group === "startup" && entry.node === 24)).toBe(false);
    const defender = workflow.jobs.modular.steps.find((step: any) => step.name === "Enable Defender real-time protection for startup acceptance");
    expect(defender.if).toContain("matrix.defender");
    expect(defender.run).toContain("Set-MpPreference -DisableRealtimeMonitoring $false");
    expect(defender.run).toContain("Windows Defender real-time protection could not be enabled");
  });

  it("binds aggregate evidence and fails closed over missing modular artifacts", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const required = workflow.jobs.required;
    expect(required.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Download all modular outcomes", with: expect.objectContaining({ pattern: "development-validation-outcome-*", "merge-multiple": true }) }),
      expect.objectContaining({ name: "Require exact selected owner outcomes", run: "node scripts/release/require-modular-validation.mjs", env: expect.objectContaining({ VALIDATION_MODULAR_RESULT: "${{ needs.modular.result }}" }) }),
      expect.objectContaining({ name: "Upload aggregate evidence", with: expect.objectContaining({ "if-no-files-found": "error" }) }),
    ]));
    expect(required.steps.find((step: any) => step.name === "Require current impact-selected validation").env).toMatchObject({ MODULAR_RESULT: "${{ needs.modular.result }}", EXPECTED_HEAD: "${{ github.event.pull_request.head.sha || github.sha }}" });
    const upload = workflow.jobs.modular.steps.find((step: any) => step.name === "Upload modular outcome and fixture phases");
    expect(upload.with.name).toContain("attempt-${{ github.run_attempt }}");
    expect(JSON.stringify(workflow.jobs.modular)).not.toMatch(/retry|rerun-failed|attempts?:\s*[2-9]/iu);
  });

  it("preserves documentation, version, draft, manual fallback, rendering, and naming controls", async () => {
    const source = await readFile(".github/workflows/ci.yml", "utf8");
    const workflow = parse(source);
    expect(workflow.on.pull_request.branches).toEqual(["develop"]);
    expect(workflow.on.pull_request.types).toEqual(expect.arrayContaining(["edited", "ready_for_review", "synchronize"]));
    expect(workflow.on).toHaveProperty("workflow_dispatch");
    expect(workflow.jobs.changes.if).toBe("github.event_name != 'pull_request' || github.event.pull_request.draft == false");
    expect(source).toContain("manual_args=(--manual-no-comparison)");
    expect(source).toContain("implementation_args=(--implementation-bound)");
    expect(workflow.jobs.changes.outputs["implementation-bound"]).toContain("implementation_bound");
    expect(workflow.jobs.docs.if).toContain("docs-only");
    expect(workflow.jobs.modular.if).toContain("version-only");
    expect(workflow.jobs.rendering.if).toContain("rendering-tier");
    expect(workflow.jobs.naming.if).toContain("naming-required");
  });

  it("runs one full documentation review outside release platform matrices", async () => {
    const [release, regression] = await Promise.all([readFile(".github/workflows/release.yml", "utf8"), readFile(".github/workflows/full-regression.yml", "utf8")]);
    expect(release.slice(release.indexOf("\n  documentation:"), release.indexOf("\n  guardians:")).match(/check-code-documentation\.mjs --mode full/g)).toHaveLength(1);
    expect(release.slice(release.indexOf("\n  validate:"), release.indexOf("\n  publish:"))).not.toContain("check-code-documentation.mjs");
    expect(regression.match(/check-code-documentation\.mjs --mode full/g)).toHaveLength(1);
  });
});
