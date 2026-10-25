import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createIntegrationSelection } from "../../scripts/release/integration-selection.mjs";
import { requireModularValidation, selectModularEvidenceFiles, selectModularOutcomeFiles } from "../../scripts/release/require-modular-validation.mjs";
import { selectDevelopmentValidationMatrix } from "../../scripts/release/validation-matrix.mjs";

const head = "b".repeat(40), base = "a".repeat(40), runId = "123", selectionId = "d".repeat(64);
const registry = JSON.parse(await readFile("config/integration-owners.json", "utf8"));
const owners = registry.owners;
const ownership = { schema: "a1-integration-ownership-v2" as const, owners: owners.map(({ id, cadence, scopes, targets }: any) => ({ id, cadence, scopes, targets })) };

describe("attempt-aware modular development aggregate", () => {
  it("accepts only attempt-qualified evidence and known support directories", () => {
    const file = (name: string) => ({ name, isFile: () => true, isDirectory: () => false });
    const directory = (name: string) => ({ name, isFile: () => false, isDirectory: () => true });
    const entries = [file("outcome-core-win32-node24-attempt-1.json"), file("job-envelope-core-win32-node24-attempt-1.json"),
      file("startup-node22-performance.json"), directory("phases"), directory("package"), directory("receipts")];
    expect(selectModularEvidenceFiles(entries)).toEqual({ outcomes: ["outcome-core-win32-node24-attempt-1.json"], envelopes: ["job-envelope-core-win32-node24-attempt-1.json"] });
    expect(selectModularOutcomeFiles(entries)).toEqual(["outcome-core-win32-node24-attempt-1.json"]);
    expect(() => selectModularEvidenceFiles([file("outcome-core-win32-node24.json")])).toThrow("unknown file");
    expect(() => selectModularEvidenceFiles([directory("unknown")])).toThrow("unknown directory");
  });

  it("requires exact-head evidence for every conservative target", () => {
    const fixture = conservativeFixture();
    expect(requireModularValidation(fixture)).toMatchObject({ mode: "conservative", deferredOwners: ["update-performance", "update-predecessor"], evidenceCount: 3, reused: [] });
  });

  it("requires every terminal-host test partition beside its build job and keeps them distinct", () => {
    const missing = terminalHostFixture();
    missing.outcomes = missing.outcomes.filter((value: any) => value.authority.partition !== "2/3" || value.authority.platform !== "linux");
    missing.envelopes = missing.envelopes.filter((value: any) => value.partition !== "2/3" || value.platform !== "linux");
    expect(() => requireModularValidation(missing)).toThrow("required modular outcome missing: terminal-host/linux/node24/partition 2/3");

    const duplicated = terminalHostFixture();
    const partition = duplicated.outcomes.find((value: any) => value.authority.partition === "1/3" && value.authority.platform === "win32");
    duplicated.outcomes.push(structuredClone(partition));
    expect(() => requireModularValidation(duplicated)).toThrow("duplicate modular validation outcome authority");

    // Invariant: partition evidence never stands in for the build-and-probe job, and the build job never stands in for a partition.
    const withoutBuild = terminalHostFixture();
    withoutBuild.outcomes = withoutBuild.outcomes.filter((value: any) => !(value.authority.job === "terminal-host" && value.authority.platform === "darwin" && !value.authority.partition));
    withoutBuild.envelopes = withoutBuild.envelopes.filter((value: any) => !(value.job === "terminal-host" && value.platform === "darwin" && !value.partition));
    expect(() => requireModularValidation(withoutBuild)).toThrow("required modular outcome missing: terminal-host/darwin/node24");

    const malformed = terminalHostFixture();
    malformed.outcomes.find((value: any) => value.authority.partition === "3/3").authority.partition = "three";
    expect(() => requireModularValidation(malformed)).toThrow("validation outcome authority identity is invalid");
    const malformedEnvelope = terminalHostFixture();
    malformedEnvelope.envelopes.find((value: any) => value.partition === "3/3").partition = "3";
    expect(() => requireModularValidation(malformedEnvelope)).toThrow("modular validation envelope is malformed");
  });

  it("reuses successful prior-attempt jobs only within the same run/head/selection", () => {
    const fixture = conservativeFixture();
    fixture.runAttempt = 2;
    const pi = fixture.outcomes.find((value: any) => value.authority.job === "pi");
    const rerun = structuredClone(pi); rerun.authority.runAttempt = 2;
    fixture.outcomes.push(rerun);
    fixture.envelopes.push(envelope(rerun.authority, "success"));
    const result = requireModularValidation(fixture);
    expect(result.reused).toHaveLength(2);
    expect(result.reused).not.toContainEqual(expect.objectContaining({ job: "pi:win32:x64:24" }));
    expect(result.reused).toContainEqual(expect.objectContaining({ job: "resource:win32:x64:24" }));
    expect(result.reused.every(entry => entry.attempt === 1)).toBe(true);
  });

  it("retains a prior failed attempt while accepting its successful current rerun", () => {
    const fixture = conservativeFixture(); fixture.runAttempt = 2;
    const pi = fixture.outcomes.find((value: any) => value.authority.job === "pi");
    pi.passed = false; pi.outcomes[0].exitCode = 1;
    fixture.envelopes.find((value: any) => value.job === "pi").status = "failure";
    const rerun = structuredClone(pi); rerun.passed = true; rerun.outcomes[0].exitCode = 0; rerun.authority.runAttempt = 2;
    fixture.outcomes.push(rerun); fixture.envelopes.push(envelope(rerun.authority, "success"));
    expect(requireModularValidation(fixture)).toMatchObject({ evidenceCount: 3 });
  });

  it("uses only current outcomes when all jobs are rerun", () => {
    const fixture = conservativeFixture(); fixture.runAttempt = 2;
    const rerun = fixture.outcomes.map((value: any) => {
      const copy = structuredClone(value); copy.authority.runAttempt = 2; return copy;
    });
    fixture.outcomes.push(...rerun);
    fixture.envelopes.push(...rerun.map((value: any) => envelope(value.authority, "success")));
    expect(requireModularValidation(fixture)).toMatchObject({ evidenceCount: 3, reused: [] });
  });

  it("gives a current-attempt failure precedence over an older success", () => {
    const fixture = conservativeFixture(); fixture.runAttempt = 2;
    const authority = structuredClone(fixture.outcomes.find((value: any) => value.authority.job === "pi").authority);
    authority.runAttempt = 2;
    fixture.envelopes.push(envelope(authority, "failure"));
    expect(() => requireModularValidation(fixture)).toThrow("current-attempt modular job did not succeed");
  });

  it.each(["head", "runId", "selectionId"])("rejects stale reusable authority: %s", field => {
    const fixture = conservativeFixture(); fixture.runAttempt = 2;
    (fixture.outcomes[0].authority as any)[field] = field === "selectionId" ? "0".repeat(64) : field === "head" ? "0".repeat(40) : "999";
    expect(() => requireModularValidation(fixture)).toThrow("stale");
  });

  it("rejects missing envelopes, duplicate authority, cancellation, and missing outcomes", () => {
    const mutations = [
      (fixture: any) => fixture.envelopes.pop(),
      (fixture: any) => fixture.outcomes.push(structuredClone(fixture.outcomes[0])),
      (fixture: any) => { fixture.envelopes[0].status = "cancelled"; },
      (fixture: any) => fixture.outcomes.pop(),
    ];
    for (const mutate of mutations) {
      const fixture = conservativeFixture(); mutate(fixture);
      expect(() => requireModularValidation(fixture)).toThrow();
    }
  });

  it("rejects malformed per-scope timing evidence", () => {
    for (const mutate of [
      (gate: any) => { delete gate.scopes; },
      (gate: any) => { gate.scopes = ["bad scope"]; },
      (gate: any) => { gate.durationMs = -1; },
    ]) {
      const fixture = conservativeFixture();
      mutate(fixture.outcomes[0].outcomes[0]);
      expect(() => requireModularValidation(fixture)).toThrow("malformed gate");
    }
  });

  it("accepts bounded exclusions and rejects evidence from an excluded owner", () => {
    const decisions = directDecisions("startup", "src/foundation/startup/index.ts");
    const selection = createIntegrationSelection({ base, head, ownership, mode: "impact", decisions });
    const outcomes = [coreOutcome(1), outcome(selection.selectionId, "startup", "win32", 22, ["startup"], ["package-startup"], 1)];
    const fixture = impactFixture(selection, outcomes, 1, []);
    expect(requireModularValidation(fixture)).toMatchObject({ selectedOwners: ["startup"], evidenceCount: 2 });
    const unexpected = outcome(selection.selectionId, "pi", "win32", 24, ["pi-release-resume"], ["package-smoke"], 1);
    fixture.outcomes.push(unexpected); fixture.envelopes.push(envelope(unexpected.authority, "success"));
    expect(() => requireModularValidation(fixture)).toThrow("excluded owner produced unexpected evidence");
  });

  it("requires every scheduled matrix entry and tolerates only entries the selection left unscheduled", () => {
    const decisions = directDecisions("startup", "src/foundation/startup/index.ts");
    const selection = createIntegrationSelection({ base, head, ownership, mode: "impact", decisions });
    const fixture = impactFixture(selection, [coreOutcome(1), outcome(selection.selectionId, "startup", "win32", 22, ["startup"], ["package-startup"], 1)], 1, []);
    const matrix = selectDevelopmentValidationMatrix({ impact: fixture.impact, registry });
    expect(matrix.include.map(entry => `${entry.group}:${entry.platform}:${entry.node}`)).toEqual(["core:win32:24", "startup:win32:22"]);
    expect(matrix.inactive).toHaveLength(22);
    expect(requireModularValidation(fixture)).toMatchObject({ selectedOwners: ["startup"], evidenceCount: 2 });
    const unscheduled = fixture.envelopes.find((value: any) => value.job === "startup");
    fixture.outcomes = fixture.outcomes.filter((value: any) => value.authority.job !== "startup");
    fixture.envelopes = fixture.envelopes.filter((value: any) => value !== unscheduled);
    expect(() => requireModularValidation(fixture)).toThrow("required modular outcome missing: startup/win32/node22");
  });

  it("rejects exhaustive evidence as a substitute for cadence deferral", () => {
    const fixture = conservativeFixture();
    const unexpected = outcome(fixture.impact.integration.selection.selectionId, "promoted", "win32", 24,
      ["update-predecessor"], ["update-predecessor"], 1);
    fixture.outcomes.push(unexpected);
    fixture.envelopes.push(envelope(unexpected.authority, "success"));
    expect(() => requireModularValidation(fixture)).toThrow("excluded owner produced unexpected evidence");
  });
});

function conservativeFixture(): any {
  const selection = createIntegrationSelection({ base, head, ownership, mode: "conservative", decisions: owners.map((owner: any) => owner.cadence === "pull-request" ? ({
    owner: owner.id, selected: true, reasons: [{ code: "conservative-fallback", paths: [] }],
  }) : ({ owner: owner.id, selected: false, reasons: [{ code: owner.cadence === "direct-impact" ? "direct-impact-cadence" : "exhaustive-cadence", paths: [] }] })) });
  const outcomes = [
    coreOutcome(1), resourceOutcome(1),
    outcome(selection.selectionId, "pi", "win32", 24, ["pi-release-resume"], ["pi-engine-conformance", "package-smoke", "release-update"], 1),
  ];
  return impactFixture(selection, outcomes, 1, ["test/resource.test.ts"]);
}
function directDecisions(selectedOwner: string, path: string) {
  return owners.map((owner: any) => ({ owner: owner.id, selected: owner.id === selectedOwner,
    reasons: [{ code: owner.id === selectedOwner ? "shared-support" : owner.cadence === "direct-impact" ? "direct-impact-cadence" : owner.cadence === "exhaustive" ? "exhaustive-cadence" : "unrelated",
      paths: owner.id === selectedOwner ? [path] : [] }] }));
}
function terminalHostFixture(): any {
  const selection = createIntegrationSelection({ base, head, ownership, mode: "impact", decisions: directDecisions("terminal-host", "native/terminal-host/src/lib.rs") });
  const outcomes = [
    coreOutcome(1),
    ...["win32", "linux", "darwin"].flatMap(platform => [
      outcome(selection.selectionId, "terminal-host", platform, 24, ["terminal-host"], ["terminal-host"], 1),
      ...["1/3", "2/3", "3/3"].map(partition => outcome(selection.selectionId, "terminal-host", platform, 24, ["terminal-host"], ["terminal-host"], 1, partition)),
    ]),
  ];
  return impactFixture(selection, outcomes, 1, []);
}
function impactFixture(selection: any, outcomes: any[], runAttempt: number, resourceTests: string[]) {
  return { impact: { base, head, selectionId, prCore: { resourceTests }, integration: { selection } }, owners, outcomes,
    envelopes: outcomes.map(value => envelope(value.authority, "success")), modularResult: "success", head, runId, runAttempt };
}
function coreOutcome(attempt: number) { return outcome(selectionId, "core", "win32", 24, ["pr-core"], ["typecheck", "architecture", "pr-core-tests", "pr-selected-tests"], attempt); }
function resourceOutcome(attempt: number) { return outcome(selectionId, "resource", "win32", 24, ["pr-resource"], ["pr-selected-resource"], attempt); }
function outcome(_integrationSelectionId: string, job: string, platform: string, node: number, selectedOwners: string[], selected: string[], attempt: number, partition?: string) {
  return { passed: true, startedAt: 2, completedAt: 3, outcomes: [{ id: "gate", exitCode: 0, durationMs: 1, scopes: selected }], selected,
    authority: { schema: "a1-validation-outcome-authority-v1", head, runId, runAttempt: attempt, selectionId, job, platform,
      architecture: platform === "darwin" ? "arm64" : "x64", node, ...(partition ? { partition } : {}), owners: selectedOwners, requested: selected, selected, jobStartedAt: 1, cacheState: "test" } };
}
function envelope(authority: any, status: string) {
  return { schema: "a1-validation-job-envelope-v2", head, runId, runAttempt: authority.runAttempt, selectionId, job: authority.job,
    platform: authority.platform, architecture: authority.architecture, node: authority.node, ...(authority.partition ? { partition: authority.partition } : {}),
    startedAt: 1, completedAt: 3, status, active: "true" };
}
