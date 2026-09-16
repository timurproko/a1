import { describe, expect, it } from "vitest";
import { classifyIntegrationImpact, selectIntegrationImpact, type IntegrationImpactOwner } from "../../scripts/release/integration-impact.mjs";
import type { ValidationOwnershipSelection } from "../../scripts/release/validation-ownership.mjs";

const baseId = "a".repeat(40), headId = "b".repeat(40);
const target = { platform: "win32", architecture: "x64", node: 22 } as const;
const owners: IntegrationImpactOwner[] = [
  { id: "startup", cadence: "pull-request", scopes: ["startup"], targets: [target],
    entries: ["test/startup.test.ts"], tests: ["test/startup.test.ts"], support: ["test/support/startup/"] },
  { id: "images", cadence: "pull-request", scopes: ["images"], targets: [target],
    entries: ["test/images.test.ts"], tests: ["test/images.test.ts"], support: ["test/support/images/"] },
  { id: "predecessor", cadence: "exhaustive", scopes: ["predecessor"], targets: [target],
    entries: ["test/predecessor.test.ts"], tests: ["test/predecessor.test.ts"], support: ["test/support/predecessor/"] },
];

function core(mode: "impact" | "conservative" | "exempt" = "impact", integrationOwners: string[] = []): ValidationOwnershipSelection {
  return {
    schema: "a1-pr-core-selection-v1", mode, exemption: mode === "exempt" ? "docs-only" : null, policyId: "c".repeat(64),
    mandatoryTests: [], tests: [], resourceTests: [], integrationOwners, invalidators: [], unknown: [],
    owners: [{ owner: "fixture", selected: mode !== "exempt", reasons: [{ code: mode === "impact" ? "owned-path" : mode === "exempt" ? "docs-only" : "invalidator", paths: mode === "exempt" ? [] : ["src/start.ts"] }], integrationOwners }],
  };
}
function classify(changes: { status: string; path: string; oldPath?: string }[], selection = core()) {
  return classifyIntegrationImpact({ baseId, headId, changes, owners: structuredClone(owners), coreSelection: selection });
}
function decision(result: ReturnType<typeof classify>, owner: string) {
  return result.selection.owners.find(candidate => candidate.owner === owner)!;
}

describe("coarse integration ownership", () => {
  it("selects integration owners linked by the reviewed coarse path owner", () => {
    const result = classify([{ status: "M", path: "src/start.ts" }], core("impact", ["startup"]));
    expect(decision(result, "startup")).toMatchObject({ selected: true, reasons: [expect.objectContaining({ code: "coarse-owner" })] });
    expect(decision(result, "images").selected).toBe(false);
  });

  it("defers a directly changed exhaustive test with its affected path", () => {
    const result = classify([{ status: "M", path: "test/predecessor.test.ts" }]);
    expect(decision(result, "predecessor")).toMatchObject({ selected: false, reasons: [{ code: "exhaustive-cadence", paths: ["test/predecessor.test.ts"] }] });
  });

  it.each([
    { status: "M", path: "test/support/startup/fixture.ts" },
    { status: "D", path: "test/support/startup/fixture.ts" },
    { status: "R", oldPath: "test/support/startup/fixture.ts", path: "test/support/startup/renamed.ts" },
    { status: "C", oldPath: "test/support/startup/fixture.ts", path: "test/support/startup/copied.ts" },
  ])("uses source and destination identities for $status support", change => {
    expect(decision(classify([change]), "startup").reasons).toEqual(expect.arrayContaining([expect.objectContaining({ code: "shared-support" })]));
  });

  it("selects every pull-request owner and defers exhaustive owners for conservative and manual comparisons", () => {
    const conservative = classify([{ status: "M", path: "config/validation-ownership.json" }], core("conservative"));
    expect(conservative.selection.owners.filter(owner => owner.cadence === "pull-request").every(owner => owner.selected)).toBe(true);
    expect(decision(conservative, "predecessor")).toMatchObject({ cadence: "exhaustive", selected: false, reasons: [{ code: "exhaustive-cadence", paths: [] }] });
    const manual = selectIntegrationImpact({ baseId, headId, owners: structuredClone(owners), coreSelection: core("conservative"), manualNoComparison: true });
    expect(manual).toMatchObject({ fallback: "manual-no-comparison", selection: { mode: "conservative" } });
    expect(decision(manual, "predecessor").selected).toBe(false);
  });

  it.each(["docs-only", "version-only"] as const)("explicitly excludes all owners for %s", exemption => {
    const result = selectIntegrationImpact({ baseId, headId, owners: structuredClone(owners), exemption });
    expect(result.selection).toMatchObject({ mode: "exempt", exemption });
    expect(result.selection.owners.every(owner => !owner.selected)).toBe(true);
  });

  it("blocks malformed commit and owner authority", () => {
    expect(() => selectIntegrationImpact({ baseId: "HEAD", headId, owners: structuredClone(owners), coreSelection: core("conservative") })).toThrow("authoritative commits");
    const invalid = structuredClone(owners); invalid[1]!.id = invalid[0]!.id;
    expect(() => selectIntegrationImpact({ baseId, headId, owners: invalid, coreSelection: core("conservative") })).toThrow("owner definition");
  });
});
