import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { DEVELOPMENT_VALIDATION_MATRIX } from "../../scripts/release/validation-matrix.mjs";

describe("impact-aware validation workflows", () => {
  it("computes one trusted selection and fans out independent matrix cells", async () => {
    const source = await readFile(".github/workflows/ci.yml", "utf8");
    const workflow = parse(source);
    expect(source.match(/select-validation-impact\.mjs/g)).toHaveLength(1);
    expect(workflow.jobs.modular.needs).toBe("changes");
    expect(workflow.jobs.rendering.needs).toBe("changes");
    expect(workflow.jobs.modular.strategy["fail-fast"]).toBe(true);
    expect(workflow.jobs.modular.strategy).not.toHaveProperty("max-parallel");
    expect(workflow.jobs.modular.strategy.matrix).toBe("${{ fromJSON(needs.changes.outputs.modular-matrix) }}");
    expect(workflow.jobs.changes.outputs["modular-matrix"]).toContain("steps.matrix.outputs.modular_matrix");
    const matrixStep = workflow.jobs.changes.steps.find((step: { id?: string }) => step.id === "matrix");
    expect(matrixStep.run).toContain("validation-matrix.mjs --impact .artifacts/validation/impact.json");
    expect(matrixStep.run).not.toContain("--manual-no-comparison");
    expect(workflow.jobs.required.needs).toEqual(["readiness", "changes", "acceptance", "delivery", "docs", "naming", "documentation", "modular", "rendering", "full-selection", "full-regression"]);
    expect(workflow.on.pull_request.types).toContain("edited");
    expect(workflow.jobs.required.name).toBe("${{ github.event_name == 'pull_request' && 'Development validation required' || 'Development validation diagnostic' }}");
    expect(workflow.jobs.required.name).not.toContain("Implementation validation complete");
  });

  it("validates finalized Implementation and product evidence in one protected workflow run", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const changes = workflow.jobs.changes;
    expect(changes.permissions).toEqual({ contents: "read", "pull-requests": "read" });
    expect(changes.outputs).not.toHaveProperty("acceptance-phase");
    for (const name of ["Check out head", "Set up Node", "Install exact analysis dependencies",
      "Select validation from the complete impact", "Select modular jobs from the trusted selection", "Upload exact impact selection"]) {
      expect(changes.steps.find((step: { name: string }) => step.name === name)?.if)
        .toBe("steps.route.outputs.acceptance_only != 'true' && needs.readiness.outputs.release-reopening != 'true'");
    }
    for (const name of ["docs", "naming", "documentation", "modular", "rendering"]) {
      expect(workflow.jobs[name].if).toContain("needs.changes.outputs.acceptance-only != 'true'");
      expect(workflow.jobs[name].if).not.toContain("acceptance-phase");
    }
    expect(workflow.jobs.acceptance.name).toBe("Acceptance record validation");
    expect(workflow.jobs.acceptance.if).toContain("needs.changes.outputs.acceptance-only == 'true'");
    expect(workflow.jobs.delivery.name).toBe("Finalized delivery validation");
    expect(workflow.jobs.delivery.if).toContain("needs.changes.outputs.implementation-bound == 'true'");
    expect(workflow.jobs.delivery.steps.find((step: { name: string }) => step.name === "Check out trusted base delivery policy").with.ref)
      .toBe("${{ github.event.pull_request.base.sha }}");
    const detector = workflow.jobs.delivery.steps.find((step: { name: string }) => step.name === "Detect deployed finalized-delivery policy");
    expect(detector.run).toContain("PHASE_FREE_VERSION3_BODY_POLICY = true");
    expect(detector.run).toContain("scripts/governance/openspec-acceptance-checklist.mjs");
    expect(detector.run).toContain("ACTIVE_TO_ARCHIVE_RENAME_POLICY = true");
    expect(detector.run).toContain("ASSOCIATION_REPAIR_POLICY = true");
    expect(detector.run).toContain("scripts/governance/openspec-archive-github.mjs");
    const bootstrap = workflow.jobs.delivery.steps.find((step: { name: string }) => step.name === "Check out exact implementation policy for bootstrap");
    expect(bootstrap.if).toBe("steps.version.outputs.version == '3' && steps.policy.outputs.installed != 'true'");
    expect(bootstrap.with.ref).toBe("${{ needs.changes.outputs.head-sha }}");
    expect(workflow.jobs.delivery.steps.filter((step: { with?: { ref?: string } }) => step.with?.ref === "${{ needs.changes.outputs.head-sha }}"))
      .toHaveLength(1);
    expect(workflow.jobs.delivery.outputs["delivery-candidate"])
      .toBe("${{ steps.validation.outputs.delivery_candidate || steps.legacy.outputs.delivery_candidate || 'false' }}");
    const deliveryValidation = workflow.jobs.delivery.steps.find((step: { name: string }) => step.name === "Validate finalized version-3 delivery record");
    expect(deliveryValidation.if).toBe("steps.version.outputs.version == '3'");
    expect(deliveryValidation.run).toContain('value.disposition === "ready-for-maintainer-integration"');
    expect(deliveryValidation.run).not.toContain("ready-for-manual-merge");
    expect(workflow.jobs.delivery.steps.find((step: { name: string }) => step.name === "Preserve legacy implementation validation route").if)
      .toContain("version == '2'");
    const deliveryGate = workflow.jobs.required.steps.find((step: { name: string }) => step.name === "Require finalized delivery policy for implementation candidates");
    expect(deliveryGate.if).toBe("needs.changes.outputs.implementation-bound == 'true'");
    const aggregate = workflow.jobs.required.steps.find((step: { name: string }) => step.name === "Require current impact-selected validation");
    expect(aggregate.env).toMatchObject({
      ACCEPTANCE_ONLY: "${{ needs.changes.outputs.acceptance-only }}",
      IMPLEMENTATION_BOUND: "${{ needs.changes.outputs.implementation-bound }}",
      ACCEPTANCE_CANDIDATE: "${{ needs.acceptance.outputs.acceptance-candidate }}",
      DELIVERY_CANDIDATE: "${{ needs.delivery.outputs.delivery-candidate }}",
      ACCEPTANCE_RESULT: "${{ needs.acceptance.result }}",
      DELIVERY_RESULT: "${{ needs.delivery.result }}",
    });
    expect(workflow.jobs.required.steps.some((step: { name: string }) => step.name === "Require prior exact-head Implementation validation")).toBe(false);
    for (const name of ["Download exact impact selection", "Download all modular outcomes", "Require exact selected owner outcomes", "Upload aggregate evidence"]) {
      const condition = workflow.jobs.required.steps.find((step: { name: string }) => step.name === name)?.if;
      expect(condition).toContain("needs.changes.outputs.acceptance-only != 'true'");
      expect(condition).toContain("needs.changes.outputs.release-reopening != 'true'");
      expect(condition).not.toContain("acceptance-phase");
    }
  });

  it("routes verified release reopenings without generic analysis or product lanes", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    expect(workflow.jobs.readiness.outputs["release-reopening"]).toContain("release_reopening");
    const changes = workflow.jobs.changes;
    expect(changes.outputs["release-reopening"]).toBe("${{ needs.readiness.outputs.release-reopening || 'false' }}");
    const reopening = changes.steps.find((step: { id?: string }) => step.id === "reopening");
    expect(reopening.if).toBe("needs.readiness.outputs.release-reopening == 'true'");
    expect(reopening.run).toContain("implementation_bound=false");
    expect(reopening.run).toContain("modular_matrix={\"include\":[]}");
    expect(reopening.run).toContain("head_sha=$EXPECTED_HEAD");
    expect(changes.steps.find((step: { id?: string }) => step.id === "route").if).toContain("release-reopening != 'true'");
    for (const name of ["Check out head", "Set up Node", "Install exact analysis dependencies", "Select validation from the complete impact",
      "Select modular jobs from the trusted selection", "Upload exact impact selection"]) {
      expect(changes.steps.find((step: { name: string }) => step.name === name).if).toContain("release-reopening != 'true'");
    }
    expect(workflow.jobs.modular.if).toContain("release-reopening != 'true'");
    expect(workflow.jobs.rendering.if).toContain("release-reopening != 'true'");
    const aggregate = workflow.jobs.required.steps.find((step: { name: string }) => step.name === "Require current impact-selected validation");
    expect(aggregate.env.RELEASE_REOPENING).toBe("${{ needs.changes.outputs.release-reopening }}");
  });

  it("keeps the bounded PR core and selected resource-sensitive work isolated", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const entries = DEVELOPMENT_VALIDATION_MATRIX as any[];
    expect(entries.find(entry => entry.group === "core")).toMatchObject({ os: "windows-2025", node: 24, build: true, guardian: true, addon: "process-guardian.node" });
    expect(entries.find(entry => entry.group === "resource")).toMatchObject({ os: "windows-2025", node: 24, build: true, guardian: false, addon: "process-guardian.node" });
    // Invariant: every job builds the workspace except the terminal-host test partitions, which run only Cargo.
    expect(entries.every(entry => entry.build || (entry.partition && entry.group === "terminal-host"))).toBe(true);
    expect(workflow.jobs.modular.steps.some((step: any) => step.name === "Install exact analysis dependencies")).toBe(false);
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

  it("runs terminal-host test partitions as their own evidence-bearing jobs", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const modular = workflow.jobs.modular;
    expect(modular["timeout-minutes"]).toBe("${{ matrix.partition && 25 || (matrix.terminalHost || matrix.chaos) && 45 || 35 }}");
    const install = modular.steps.find((step: any) => step.name === "Install dependencies for the test partition");
    expect(install).toMatchObject({ if: "steps.job-selection.outputs.active == 'true' && matrix.partition", run: "npm ci --ignore-scripts" });
    for (const name of ["Prepare terminal host Rust toolchain", "Set up Zig for terminal host", "Cache terminal host build"]) {
      expect(modular.steps.find((step: any) => step.name === name).if, name).toBe("steps.job-selection.outputs.active == 'true' && (matrix.terminalHost || matrix.chaos || matrix.partition)");
    }
    const run = modular.steps.find((step: any) => step.name === "Run exact selected scopes");
    expect(run.env.VALIDATION_PARTITION).toBe("${{ matrix.partition || '' }}");
    expect(run.env.TERMINAL_HOST_PARTITION).toBe("${{ matrix.partition || (matrix.terminalHost && 'none') || '' }}");
    const suffix = "${{ matrix.partitionSlug && format('-{0}', matrix.partitionSlug) || '' }}-attempt-${{ github.run_attempt }}";
    expect(run.run).toContain(`node${"${{ matrix.node }}"}${suffix}.json`);
    expect(modular.steps.find((step: any) => step.name === "Upload modular outcome and fixture phases").with.name).toContain(suffix);
    const envelope = modular.steps.find((step: any) => step.name === "Complete content-free job envelope");
    expect(envelope.env).toMatchObject({ PARTITION: "${{ matrix.partition || '' }}", PARTITION_SLUG: "${{ matrix.partitionSlug || '' }}" });
    expect(envelope.run).toContain("...(process.env.PARTITION?{partition:process.env.PARTITION}:{})");
    expect(envelope.run).toContain("${process.env.PARTITION_SLUG?`-${process.env.PARTITION_SLUG}`:\"\"}-attempt-");
    const summary = modular.steps.find((step: any) => step.name === "Add modular timing summary");
    expect(summary.env.PARTITION_SLUG).toBe("${{ matrix.partitionSlug || '' }}");
    expect(summary.run).toContain("${process.env.PARTITION_SLUG ? `-${process.env.PARTITION_SLUG}` : \"\"}-attempt-");
    // Invariant: certification, fuzzing, and host uploads stay with the build-and-probe job.
    for (const name of ["Run vendored Ghostty VT tests", "Certify terminal fidelity and resident latency", "Run bounded terminal-host decoder fuzzing", "Upload terminal host contract artifacts", "Upload linked terminal library"]) {
      expect(modular.steps.find((step: any) => step.name === name).if, name).toContain("matrix.terminalHost");
    }
    // Rationale: the role suite warmed every resident launch path before certification; one unmeasured pass
    // now does, and the measured pass keeps its budgets and runs exactly once.
    const certify = modular.steps.find((step: any) => step.name === "Certify terminal fidelity and resident latency").run as string;
    expect(certify).toContain('host=".artifacts/terminal-host/performance/${{ matrix.terminalHostAddon }}"');
    const hostArtifacts = modular.steps.find((step: any) => step.name === "Upload terminal host contract artifacts").with.path;
    expect(hostArtifacts).toContain(".artifacts/terminal-host/${{ matrix.terminalHostAddon }}");
    expect(hostArtifacts).toContain(".artifacts/terminal-host/performance/${{ matrix.terminalHostAddon }}");
    const measured = 'node scripts/development/measure-resident-tabs.mjs --host "$host" --direct-startup-budget-ms 2500 > ".artifacts/terminal-host/performance-${{ matrix.platform }}-${{ matrix.architecture }}.json"';
    const warmUp = 'node scripts/development/measure-resident-tabs.mjs --host "$host" --direct-startup-budget-ms 2500 > ".artifacts/terminal-host/performance-warm-up-${{ matrix.platform }}-${{ matrix.architecture }}.json" || echo';
    expect(certify.indexOf("verify-terminal-fidelity.mjs")).toBeLessThan(certify.indexOf(warmUp));
    // Invariant: interaction parity runs on the same built host before the latency passes, so the
    // warm-up's process cleanup and the measured pass stay last.
    const parity = certify.indexOf("verify-interaction-parity.mjs");
    expect(parity).toBeGreaterThan(certify.indexOf("verify-terminal-fidelity.mjs"));
    expect(parity).toBeLessThan(certify.indexOf(warmUp));
    const parallel = certify.indexOf("verify-resident-parallel-progress.mjs");
    expect(parallel).toBeGreaterThan(parity);
    expect(parallel).toBeLessThan(certify.indexOf(warmUp));
    expect(certify.indexOf(warmUp)).toBeLessThan(certify.indexOf(measured));
    expect(certify.split("measure-resident-tabs.mjs")).toHaveLength(3);
    // Invariant: the warm-up's leftover host processes are stopped before the measured pass starts.
    const cleanup = certify.indexOf('Get-CimInstance Win32_Process');
    expect(cleanup).toBeGreaterThan(certify.indexOf(warmUp));
    expect(cleanup).toBeLessThan(certify.indexOf(measured));
    expect(certify).toContain('CommandLine.Contains("host-entry.js")');
    expect(certify).not.toContain("taskkill //IM");
    expect(certify).not.toContain("pkill -f");
    expect(certify).toContain('pgrep -f "a1-resident-measure-"');
    expect(certify).toContain('ps -p "$pid" -o comm=');
    expect(certify).toContain('kill -TERM "$pid"');
    expect(certify.endsWith(`${measured}\n`) || certify.endsWith(measured)).toBe(true);
    const upload = modular.steps.find((step: any) => step.name === "Upload terminal host contract artifacts");
    expect(upload.with.path).toContain(".artifacts/terminal-host/${{ matrix.terminalHostAddon }}");
    expect(upload.with.path).toContain("parallel-progress-${{ matrix.platform }}-${{ matrix.architecture }}.json");
    expect(upload.with.path).not.toContain("a1_session_lock.node");
  });

  it("shortens the resident chaos budget on pull requests only and leaves the script default elsewhere", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const run = workflow.jobs.modular.steps.find((step: any) => step.name === "Run exact selected scopes");
    expect(run.env.RESIDENT_CHAOS_SECONDS).toBe("${{ github.event_name == 'pull_request' && '300' || '600' }}");
    const chaos = await readFile("scripts/development/run-resident-chaos.mjs", "utf8");
    expect(chaos).toContain("const DEFAULT_SECONDS = 600;");
    expect(chaos).toContain('process.env.RESIDENT_CHAOS_SECONDS ?? String(DEFAULT_SECONDS)');
    expect(chaos).toContain("seconds: planned === null ? seconds : null,");
    for (const file of ["full-regression-shared.yml", "publish.yml"]) expect(await readFile(`.github/workflows/${file}`, "utf8")).not.toContain("RESIDENT_CHAOS_SECONDS");
  });

  it("pins npm only on Node 22 lanes, because packing needs npm 11 and Node 24 ships it", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const pin = workflow.jobs.modular.steps.find((step: any) => step.name === "Use the pinned npm for packing");
    expect(pin.if).toBe("matrix.node == 22");
    expect(pin.run).toContain('npm install -g "npm@$pinned"');
  });

  it("keeps one bounded Zig cache per workflow instead of one per run", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const zig = workflow.jobs.modular.steps.filter((step: any) => step.uses?.startsWith("mlugg/setup-zig@"));
    expect(zig).toHaveLength(2);
    for (const step of zig) expect(step.with).toEqual({ version: "0.15.2", "cache-key": "development-validation", "cache-size-limit": 512 });
  });

  it("retains Node 22 Defender startup and all declared platform/runtime owner targets", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const entries = DEVELOPMENT_VALIDATION_MATRIX as any[];
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
    const report = required.steps.find((step: any) => step.name === "Report aggregate timing and cadence");
    expect(report.run).toContain("report.deferredOwners");
    expect(report.run).toContain("report.maxScopeMs");
    expect(report.run).toContain("criticalPathMet");
    expect(report.run).toContain("scopeMet");
    const modularSummary = workflow.jobs.modular.steps.find((step: any) => step.name === "Add modular timing summary");
    expect(modularSummary.run).toContain("outcome.scopes.join");
    expect(modularSummary.run).toContain("outcome.durationMs");
    const upload = workflow.jobs.modular.steps.find((step: any) => step.name === "Upload modular outcome and fixture phases");
    expect(upload.with.name).toContain("attempt-${{ github.run_attempt }}");
    expect(JSON.stringify(workflow.jobs.modular)).not.toMatch(/retry|rerun-failed|attempts?:\s*[2-9]/iu);
  });

  it("defers drafts and active delivery heads before preserving manual, rendering, and naming controls", async () => {
    const source = await readFile(".github/workflows/ci.yml", "utf8");
    const workflow = parse(source);
    expect(workflow.on.pull_request.branches).toEqual(["develop"]);
    expect(workflow.on.pull_request.types).toEqual(expect.arrayContaining(["edited", "ready_for_review", "synchronize", "converted_to_draft"]));
    expect(workflow.on).toHaveProperty("workflow_dispatch");
    expect(workflow.jobs.readiness.if).toBe("github.event_name != 'pull_request' || github.event.pull_request.draft == false");
    expect(workflow.jobs.readiness.permissions).toEqual({ contents: "read", "pull-requests": "read" });
    expect(workflow.jobs.readiness.steps.find((step: any) => step.name === "Check out trusted readiness policy").with.ref)
      .toBe("${{ github.event.pull_request.base.sha || github.sha }}");
    const classifier = workflow.jobs.readiness.steps.find((step: any) => step.id === "readiness");
    expect(classifier.run).toContain("scripts/release/development-validation-readiness.mjs");
    expect(classifier.run).toContain("reason=policy-bootstrap");
    expect(classifier.env).toMatchObject({ PULL_NUMBER: "${{ github.event.pull_request.number || '' }}", EXPECTED_HEAD: "${{ github.event.pull_request.head.sha || '' }}", EXPECTED_BASE: "${{ github.event.pull_request.base.sha || '' }}", GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" });
    expect(workflow.jobs.readiness.outputs["release-reopening"]).toBe("${{ steps.readiness.outputs.release_reopening || 'false' }}");
    expect(JSON.stringify(workflow.jobs.readiness)).not.toMatch(/npm ci|npm install|pull_request_target|contents: write/);
    expect(workflow.jobs.changes.needs).toBe("readiness");
    expect(workflow.jobs.changes.if).toBe("needs.readiness.outputs.validate == 'true'");
    expect(workflow.jobs["full-selection"].needs).toBe("readiness");
    expect(workflow.jobs["full-selection"].if).toContain("needs.readiness.outputs.validate == 'true'");
    expect(workflow.jobs.required.if).toBe("always() && needs.readiness.result == 'success' && needs.readiness.outputs.validate == 'true'");
    expect(workflow.jobs.required.name).toBe("${{ github.event_name == 'pull_request' && 'Development validation required' || 'Development validation diagnostic' }}");
    expect(source).toContain("manual_args=(--manual-no-comparison)");
    expect(source).toContain("implementation_args=(--implementation-bound)");
    expect(workflow.jobs.changes.outputs["implementation-bound"]).toContain("implementation_bound");
    expect(workflow.jobs.docs.if).toContain("docs-only");
    expect(workflow.jobs.modular.if).toContain("version-only");
    expect(workflow.jobs.rendering.if).toContain("rendering-tier");
    expect(workflow.jobs.naming.if).toContain("naming-required");
  });

  it("runs one full documentation review outside release platform matrices", async () => {
    const [release, regression] = await Promise.all([readFile(".github/workflows/publish.yml", "utf8"), readFile(".github/workflows/full-regression-shared.yml", "utf8")]);
    expect(release.slice(release.indexOf("\n  documentation:"), release.indexOf("\n  guardians:")).match(/check-code-documentation\.mjs --mode full/g)).toHaveLength(1);
    expect(release.slice(release.indexOf("\n  validate:"), release.indexOf("\n  publish:"))).not.toContain("check-code-documentation.mjs");
    expect(regression.match(/check-code-documentation\.mjs --mode full/g)).toHaveLength(1);
  });
});
