import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createIntegrationSelection } from "../../scripts/release/integration-selection.mjs";
import { requireModularValidation, selectModularOutcomeFiles } from "../../scripts/release/require-modular-validation.mjs";

const head = "b".repeat(40), base = "a".repeat(40), runId = "123", runAttempt = 1;
const registry = JSON.parse(await readFile("config/integration-owners.json", "utf8"));
const owners = registry.owners;
const ownership = { schema: "a1-integration-ownership-v1" as const, owners: owners.map(({ id, scopes, targets, development }: any) => ({ id, scopes, targets, development })) };

describe("modular development aggregate", () => {
  it("accepts only known merged-artifact files and support directories", () => {
    const file = (name: string) => ({ name, isFile: () => true, isDirectory: () => false });
    const directory = (name: string) => ({ name, isFile: () => false, isDirectory: () => true });
    expect(selectModularOutcomeFiles([file("outcome-fast-win32-node24.json"), file("job-envelope-fast-win32-node24.json"), file("startup-node22-performance.json"), directory("phases"), directory("package"), directory("receipts")])).toEqual(["outcome-fast-win32-node24.json"]);
    expect(() => selectModularOutcomeFiles([file("unknown.json")])).toThrow("unknown file");
    expect(() => selectModularOutcomeFiles([directory("unknown")])).toThrow("unknown directory");
  });

  it("requires exact-head evidence for every conservative owner target", () => {
    const fixture = conservativeFixture();
    expect(requireModularValidation(fixture)).toMatchObject({ mode: "conservative", evidenceCount: 9 });
  });

  it.each(["failure", "cancelled", "skipped", "missing"])("rejects a failed, cancelled, or skipped modular matrix: %s", result => {
    const fixture = conservativeFixture();
    fixture.modularResult = result;
    expect(() => requireModularValidation(fixture)).toThrow("modular validation must be success");
  });

  it.each(["head", "runId", "runAttempt", "selectionId"])("rejects stale outcome authority: %s", field => {
    const fixture = conservativeFixture();
    (fixture.outcomes[0].authority as any)[field] = field === "runAttempt" ? 2 : field === "selectionId" ? "0".repeat(64) : field === "head" ? "0".repeat(40) : "999";
    expect(() => requireModularValidation(fixture)).toThrow(/stale|identity/);
  });

  it("rejects missing, malformed, failed, and duplicate evidence", () => {
    for (const mutate of [
      (fixture: any) => fixture.outcomes.pop(),
      (fixture: any) => { fixture.outcomes[0].authority = null; },
      (fixture: any) => { fixture.outcomes[0].passed = false; },
      (fixture: any) => fixture.outcomes.push(fixture.outcomes[0]),
    ]) {
      const fixture = conservativeFixture(); mutate(fixture);
      expect(() => requireModularValidation(fixture)).toThrow();
    }
  });

  it("accepts authorized skips and rejects unexpected evidence for an excluded owner", () => {
    const decisions = owners.map((owner: any) => ({ owner: owner.id, selected: owner.id === "startup",
      reasons: [{ code: owner.id === "startup" ? "reachable" : "unrelated", paths: owner.id === "startup" ? ["src/foundation/startup/index.ts"] : [] }] }));
    const selection = createIntegrationSelection({ base, head, ownership, mode: "impact", decisions });
    const outcomes = [outcome(selection.selectionId, "fast", "win32", 24, ["fast-remainder"], ["typecheck", "architecture", "fast-remainder", "dist-integration"]),
      outcome(selection.selectionId, "resource", "win32", 24, ["fast-resource-sensitive"], ["fast-resource-sensitive"]),
      outcome(selection.selectionId, "startup", "win32", 22, ["startup"], ["package-startup"])];
    const fixture = { impact: { base, head, integration: { selection } }, owners, outcomes, modularResult: "success", head, runId, runAttempt };
    expect(requireModularValidation(fixture)).toMatchObject({ selectedOwners: ["startup"], evidenceCount: 3 });
    outcomes.push(outcome(selection.selectionId, "pi", "win32", 24, ["pi-release-resume"], ["package-smoke"]));
    expect(() => requireModularValidation(fixture)).toThrow("excluded owner produced unexpected evidence");
  });

  it.each(["docs-only", "version-only"] as const)("accepts only complete authorized %s exemption", exemption => {
    const selection = createIntegrationSelection({ base, head, ownership, mode: "exempt", exemption });
    const fixture = { impact: { base, head, integration: { selection } }, owners, outcomes: [], modularResult: "skipped", head, runId, runAttempt };
    expect(requireModularValidation(fixture)).toMatchObject({ mode: "exempt", evidenceCount: 0 });
  });
});

function conservativeFixture(): any {
  const selection = createIntegrationSelection({ base, head, ownership, mode: "conservative", decisions: owners.map((owner: any) => ({
    owner: owner.id, selected: true, reasons: [{ code: "conservative-fallback", paths: [] }],
  })) });
  const outcomes = [
    outcome(selection.selectionId, "fast", "win32", 24, ["fast-remainder"], ["typecheck", "architecture", "fast-remainder", "dist-integration"]),
    outcome(selection.selectionId, "resource", "win32", 24, ["fast-resource-sensitive"], ["fast-resource-sensitive"]),
    outcome(selection.selectionId, "pi", "win32", 24, ["pi-release-resume"], ["pi-engine-conformance", "package-smoke", "release-update"]),
    outcome(selection.selectionId, "promoted", "win32", 24, ["launch-integration", "update-performance", "structured-runtime", "update-predecessor"],
      ["launch-integration", "update-performance", "structured-runtime-integration", "update-predecessor"]),
    outcome(selection.selectionId, "package", "win32", 22, ["package-contracts"], ["package-contracts"]),
    outcome(selection.selectionId, "startup", "win32", 22, ["startup"], ["package-startup"]),
    outcome(selection.selectionId, "compatibility", "win32", 22, ["image-compatibility", "history-compatibility"], ["image-compatibility", "history-compatibility"]),
    outcome(selection.selectionId, "containment", "linux", 24, ["image-compatibility", "history-compatibility", "unix-containment"], ["image-compatibility", "history-compatibility", "unix-containment", "package-smoke"]),
    outcome(selection.selectionId, "containment", "darwin", 24, ["image-compatibility", "history-compatibility", "unix-containment"], ["image-compatibility", "history-compatibility", "unix-containment", "package-smoke"]),
  ];
  return { impact: { base, head, integration: { selection } }, owners, outcomes, modularResult: "success", head, runId, runAttempt };
}
function outcome(selectionId: string, job: string, platform: string, node: number, selectedOwners: string[], selected: string[]) {
  return { passed: true, outcomes: [{ id: "gate", exitCode: 0 }], selected, authority: { schema: "a1-validation-outcome-authority-v1", head, runId, runAttempt,
    selectionId, job, platform, architecture: platform === "darwin" ? "arm64" : "x64", node, owners: selectedOwners, requested: selected, selected, jobStartedAt: 1, cacheState: "test" } };
}
