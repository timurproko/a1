import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { changedPaths, readCurrentPull, requireFullRegressionSelection, selectFullRegression, type RegressionPull } from "../../scripts/release/pr-full-regression.mjs";
import { bindFullLane, fullContext, FULL_LANES, requireFullLanes, type FullTierResult } from "../../scripts/release/full-regression-evidence.mjs";
import { triageDecision } from "../../scripts/release/regression-triage-report.mjs";

const head = "a".repeat(40);
const base = "b".repeat(40);
const pull = (patch: Partial<RegressionPull> = {}): RegressionPull => ({ number: 543, state: "open", draft: false, body: "", labels: [],
  head: { sha: head, ref: "feature/ordinary-ui" }, base: { sha: base, ref: "develop", repo: { full_name: "timurproko/a1" } }, ...patch });
const select = (paths: string[], patch: Partial<RegressionPull> = {}, options = {}) => selectFullRegression({ pull: pull(patch), paths, mergeBase: base, ...options });
const repairLink = '```openspec-implementation\n{"version":3,"change":"fix-nightly-regression-2026-09-22"}\n```';

// Rationale: these test seams verify orchestration envelopes, not complete validation on hosted lanes.
function result(): FullTierResult {
  const selected = ["update-predecessor", "update-performance", "package-startup", "package-contracts", "typecheck", "architecture", "fast-remainder", "fast-resource-sensitive"];
  return { schema: "a1-validation-outcomes-v1", passed: true, requested: ["full-release"], selected,
    outcomes: selected.map(scope => ({ id: scope, scopes: [scope], exitCode: 0 })) };
}
const context = () => fullContext({ FULL_SOURCE: head, FULL_BASE: base, FULL_PR: "543", FULL_SELECTION: "c".repeat(64), GITHUB_RUN_ID: "1234", GITHUB_RUN_ATTEMPT: "1" });

describe("trusted complete-regression selection", () => {
  it.each([".github/workflows/release.yml", ".github/workflows/ci.yml", ".github/workflows/full-regression.yml", ".github/workflows/full-regression-shared.yml",
    "scripts/release/require-development-validation.mjs", "src/foundation/release/update.ts", "test/foundation/release/update-predecessor.integration.test.ts",
    "scripts/development/environment-probe.mjs", "scripts/development/prepare-ci-rust.sh", "package.json", "package-lock.json", "bin/cli.js", "native/process-guardian/Cargo.lock",
    "config/integration-owners.json", "config/validation-ownership.json", "config/validation-suites.json", "tsconfig.build.json", "vitest.config.ts",
    "src/cli/dispatch.ts", "src/cli/version-stats.ts", "test/cli/update-cli.test.ts", "test/support/release-command-fixture.ts", "test/fixtures/package.ts"])("selects reviewed release impact: %s", path => {
    expect(select([path])).toMatchObject({ selected: true, reasons: ["release-impact"] });
  });

  it("preserves ordinary cadence and independent docs/version exemptions", () => {
    expect(select(["src/features/example.ts", "test/features/example.test.ts"])).toMatchObject({ selected: false, reasons: ["ordinary-cadence"] });
    expect(select(["README.md", "docs/validation.md", "openspec/specs/a1-shell/spec.md"])).toMatchObject({ selected: false, reasons: ["docs-only"] });
    expect(select(["package.json", "package-lock.json"], {}, { versionOnly: true })).toMatchObject({ selected: false, reasons: ["version-only"] });
  });

  it("keeps planning drafts lightweight but validates implementation drafts without granting integration authority", () => {
    const draft = { draft: true, body: repairLink, labels: [{ name: "ci:full-regression" }] };
    expect(select(["openspec/changes/fix-nightly-regression-2026-09-22/design.md"], draft)).toMatchObject({ selected: false, reasons: ["planning-only-draft"] });
    expect(select(["src/features/example.ts"], draft)).toMatchObject({ selected: true, reasons: ["nightly-repair", "maintainer-opt-in"] });
    expect(select(["scripts/release/build.mjs"], { draft: true }).selected).toBe(true);
  });

  it("recognizes generated, linked, archived, moved, and erased repair associations", () => {
    expect(select(["src/features/example.ts"], { head: { sha: head, ref: "fix/nightly-regression-2026-09-22" } }).reasons).toContain("nightly-repair");
    expect(select(["docs/fix.md"], { body: repairLink }).selected).toBe(true);
    const archived = repairLink.replace('"change":"fix-nightly-regression-2026-09-22"', '"change":"fix-nightly-regression-2026-09-22","archive":"openspec/changes/archive/2026-09-22-fix-nightly-regression-2026-09-22/","acceptanceManifest":"openspec/changes/archive/2026-09-22-fix-nightly-regression-2026-09-22/acceptance.md"');
    expect(select(["docs/fix.md"], { body: archived }).selected).toBe(true);
    for (const path of ["openspec/changes/fix-nightly-regression-2026-09-22/tasks.md", "openspec/changes/archive/2026-09-22-fix-nightly-regression-2026-09-22/tasks.md"]) {
      expect(select(["src/features/example.ts"], {}, { historyPaths: [path] }).reasons).toContain("nightly-repair");
    }
  });

  it("treats opt-in as additive and invalidates label/body/head/base/ready transitions", () => {
    const paths = ["src/features/example.ts"];
    const initial = select(paths);
    const opted = select(paths, { labels: [{ name: "ci:full-regression" }] });
    expect(opted.selected).toBe(true);
    expect(select(["scripts/release/build.mjs"], { labels: [] }).selected).toBe(true);
    for (const fresh of [opted, select(paths, { body: "new acceptance list" }), select(paths, { head: { sha: "d".repeat(40), ref: "feature/ordinary-ui" } }),
      select(paths, { base: { sha: "e".repeat(40), ref: "develop" } }), select(paths, { draft: true })]) {
      expect(() => requireFullRegressionSelection(initial, fresh, "success")).toThrow(/stale/);
    }
    expect(requireFullRegressionSelection(initial, select(paths), "skipped").selected).toBe(false);
    expect(() => requireFullRegressionSelection(opted, initial, "skipped")).toThrow(/stale/);
  });

  it("preserves renamed-from and deleted support, and rejects malformed or truncated comparison", () => {
    const paths = changedPaths("R100\0test/support/release-fixture.ts\0docs/moved.md\0D\0scripts/release/old.mjs\0");
    expect(paths).toContain("test/support/release-fixture.ts");
    expect(select(paths).selected).toBe(true);
    for (const invalid of ["M\0missing-final-nul", "R100\0only-one-path\0", "M\0../unsafe\0", "M\0a\\b\0", "?\0file\0"]) expect(() => changedPaths(invalid)).toThrow();
    expect(() => changedPaths(Array.from({ length: 8193 }, (_, i) => `M\0test/${i}\0`).join(""))).toThrow(/bound/);
  });

  it("blocks malformed lifecycle and metadata instead of granting an ordinary skip", () => {
    for (const body of [repairLink + "\n" + repairLink, "```openspec-implementation\n{}", repairLink.replace('"version":3', '"version":9'),
      repairLink.replace('"version":3', '"version":3,"version":3'), repairLink.replace('"version":3', '"version":3,"unexpected":true')]) expect(() => select(["docs/a.md"], { body })).toThrow();
    for (const patch of [{ state: "closed" }, { head: { sha: "short", ref: "feature/a" } }, { base: { sha: base, ref: "master" } }]) expect(() => select(["src/features/example.ts"], patch)).toThrow();
    expect(() => select([])).toThrow(/incomplete/);
    expect(select(["new-build-input.yaml"]).reasons).toContain("unknown-operational-input");
    expect(select(["scripts/unknown-owner.mjs"]).selected).toBe(true);
  });

  it("blocks unavailable API metadata including fork-approval errors without retry or writes", async () => {
    const request = vi.fn(async () => new Response("unavailable", { status: 403 })) as unknown as typeof fetch;
    await expect(readCurrentPull("timurproko/a1", 543, "read-token", request)).rejects.toThrow(/unavailable/);
    expect(request).toHaveBeenCalledTimes(1);
    await expect(readCurrentPull("invalid", 543, "token", request)).rejects.toThrow(/identity/);
    const oversized = vi.fn(async () => new Response("x".repeat(1024 * 1024 + 1))) as unknown as typeof fetch;
    await expect(readCurrentPull("timurproko/a1", 543, "token", oversized)).rejects.toThrow(/bound/);
    const malformed = vi.fn(async () => new Response("not JSON")) as unknown as typeof fetch;
    await expect(readCurrentPull("timurproko/a1", 543, "token", malformed)).rejects.toThrow();
  });

  it.each(["failure", "cancelled", "timed_out", "skipped", undefined])("rejects selected result %s", status => {
    const selected = select(["scripts/release/build.mjs"]);
    expect(() => requireFullRegressionSelection(selected, selected, status)).toThrow();
  });
});

describe("complete-regression native lane evidence", () => {
  it("requires exactly all four successful lane envelopes", () => {
    const identity = context();
    const records = FULL_LANES.map(lane => bindFullLane(identity, lane, result()));
    expect(requireFullLanes(identity, records, "success")).toMatchObject({ passed: true, head, base, pr: 543 });
    for (const status of ["failure", "cancelled", "timed_out", "skipped", ""]) expect(() => requireFullLanes(identity, records, status)).toThrow();
    expect(() => requireFullLanes(identity, records.slice(1), "success")).toThrow();
    expect(() => requireFullLanes(identity, [records[0]!, records[0]!, ...records.slice(2)], "success")).toThrow(/duplicate/);
  });

  it.each(["head", "base", "pr", "selectionId", "runId", "runAttempt"] as const)("rejects mismatched %s including standalone or prior-attempt evidence", key => {
    const identity = context();
    const records = FULL_LANES.map(lane => bindFullLane(identity, lane, result()));
    Object.assign(records[0]!, { [key]: typeof identity[key] === "number" ? 0 : "stale" });
    expect(() => requireFullLanes(identity, records, "success")).toThrow(/stale/);
  });

  it("rejects empty, partial, failed, or substituted suites", () => {
    const identity = context();
    for (const invalid of [{ ...result(), passed: false }, { ...result(), requested: ["pr-core"] }, { ...result(), outcomes: [] },
      { ...result(), selected: ["typecheck"] }, { ...result(), outcomes: [{ scopes: ["update-predecessor"], exitCode: 1 }] },
      { ...result(), outcomes: result().outcomes.slice(1) }]) expect(() => bindFullLane(identity, FULL_LANES[0]!, invalid)).toThrow();
    expect(() => fullContext({ FULL_SOURCE: "develop" })).toThrow();
    expect(fullContext({ FULL_SOURCE: head, GITHUB_RUN_ID: "12", GITHUB_RUN_ATTEMPT: "1" }).pr).toBe(0);
  });
});

describe("PR-native caller, security, and lifecycle contracts", () => {
  it("attaches the unchanged complete matrix to the PR run and stable aggregate", async () => {
    const ci = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const shared = parse(await readFile(".github/workflows/full-regression-shared.yml", "utf8"));
    const wrapper = parse(await readFile(".github/workflows/full-regression.yml", "utf8"));
    expect(ci.jobs["full-regression"].uses).toBe(wrapper.jobs.complete.uses);
    expect(shared.on.workflow_call.inputs.source).toMatchObject({ required: true, type: "string" });
    expect(ci.jobs["full-selection"].if).toBe("github.event_name == 'pull_request'");
    expect(ci.jobs["full-regression"].with).toEqual({ source: "${{ needs.full-selection.outputs.head }}", base: "${{ needs.full-selection.outputs.base }}", selection: "${{ needs.full-selection.outputs.selection-id }}", pr: "${{ github.event.pull_request.number }}" });
    expect(ci.jobs.required.needs).toEqual(expect.arrayContaining(["full-selection", "full-regression", "delivery", "modular"]));
    expect(ci.jobs.required.if).toContain("github.event.pull_request.draft == false");
    expect(ci.on.pull_request.types).toEqual(expect.arrayContaining(["edited", "synchronize", "ready_for_review", "converted_to_draft", "labeled", "unlabeled"]));
    expect(shared.jobs["full-regression"].strategy.matrix.include.map((lane: any) => `${lane.os}-node${lane.node}`).sort()).toEqual([...FULL_LANES].sort());
    expect(shared.jobs.required.if).toBe("always()");
    expect(shared.jobs.required.needs).toEqual(["documentation", "full-regression"]);
    expect(shared.jobs["full-regression"]["timeout-minutes"]).toBe(40);
    expect(shared.jobs["full-regression"].strategy["fail-fast"]).toBe(false);
    expect(shared.concurrency).toBeUndefined();
    expect(wrapper.concurrency["cancel-in-progress"]).toBe(false);
    expect(ci.concurrency["cancel-in-progress"]).toBe(true);
  });

  it("executes trusted selection on a separate exact-base checkout, with identical bootstrap recomputation", async () => {
    const ci = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const selection = ci.jobs["full-selection"].steps.find((s: any) => s.id === "selection");
    const verify = ci.jobs.required.steps.find((s: any) => s.name === "Require current PR full-regression selection and result");
    expect(selection.run).toBe(verify.run);
    expect(selection.env.SELECTION_MODE).toBe("--select");
    expect(verify.env).toMatchObject({ SELECTION_MODE: "--verify", FULL_REGRESSION_RESULT: "${{ needs.full-regression.result }}" });
    expect(selection.run).toContain(".artifacts/full-regression-policy/scripts/release/pr-full-regression.mjs");
    expect(selection.run).toContain("base-policy-bootstrap");
    expect(selection.run).not.toMatch(/npm|import\(['"]\.\//);
    for (const job of [ci.jobs["full-selection"], ci.jobs.required]) {
      expect(job.steps.some((s: any) => s.with?.ref === "${{ github.event.pull_request.base.sha }}" && s.with?.path === ".artifacts/full-regression-policy")).toBe(true);
    }
    for (const path of ["ci.yml", "full-regression.yml", "full-regression-shared.yml"]) {
      const text = await readFile(`.github/workflows/${path}`, "utf8");
      expect(text).not.toMatch(/pull_request_target|id-token:|contents: write|secrets: inherit|npm publish/);
      const workflow = parse(text);
      for (const job of Object.values(workflow.jobs) as any[]) for (const step of job.steps ?? []) {
        if (step.uses?.startsWith("actions/checkout@")) expect(step.with["persist-credentials"]).toBe(false);
      }
    }
  });

  it("retains standalone triage while refusing PR and candidate recursion", () => {
    expect(triageDecision({ id: 1, workflowName: "Development validation", conclusion: "failure", event: "pull_request", headBranch: "develop" }).triage).toBe(false);
    expect(triageDecision({ id: 1, workflowName: "Full regression", conclusion: "failure", event: "workflow_dispatch", headBranch: "feature/pr-full-regression" }).triage).toBe(false);
    expect(triageDecision({ id: 1, workflowName: "Full regression", conclusion: "failure", event: "schedule", headBranch: "develop" }).triage).toBe(true);
  });
});
