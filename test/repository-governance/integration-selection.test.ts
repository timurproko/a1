import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assertIntegrationSelection, createIntegrationSelection, type IntegrationOwnership, type IntegrationDecision } from "../../scripts/release/integration-selection.mjs";

const base = "a".repeat(40);
const head = "b".repeat(40);
const windows = { platform: "win32", architecture: "x64", node: 22 } as const;

function fixture() {
  const ownership: IntegrationOwnership = {
    schema: "a1-integration-ownership-v2",
    owners: [
      { id: "startup", cadence: "pull-request", scopes: ["fixture-startup"], targets: [windows] },
      { id: "package", cadence: "pull-request", scopes: ["fixture-package"], targets: [windows, { ...windows, platform: "linux", node: 24 }] },
      { id: "predecessor", cadence: "exhaustive", scopes: ["fixture-predecessor"], targets: [windows] },
    ],
  };
  return { base, head, ownership };
}

function impactDecisions(): IntegrationDecision[] {
  return [
    { owner: "startup", selected: false, reasons: [{ code: "unrelated", paths: [] }] },
    { owner: "package", selected: true, reasons: [{ code: "coarse-owner", paths: ["bin/cli.js", "src/foundation/fixture.ts"] }] },
    { owner: "predecessor", selected: false, reasons: [{ code: "exhaustive-cadence", paths: ["test/fixture.test.ts"] }] },
  ];
}

// Invariant: malformed documents must fail even with a recomputed content digest.
function reseal(value: any) {
  const { selectionId: _ignored, ...payload } = value;
  const canonical = (input: any): string => Array.isArray(input) ? `[${input.map(canonical).join(",")}]`
    : input !== null && typeof input === "object" ? `{${Object.keys(input).sort().map(key => `${JSON.stringify(key)}:${canonical(input[key])}`).join(",")}}`
      : JSON.stringify(input);
  value.selectionId = createHash("sha256").update(canonical(payload)).digest("hex");
  return value;
}

describe("versioned integration selection contract", () => {
  it("defaults conservatively and explicitly accounts for every owner and target", () => {
    const authority = fixture();
    const selection = createIntegrationSelection(authority);
    expect(selection.mode).toBe("conservative");
    expect(selection.owners.map((owner: any) => [owner.owner, owner.selected])).toEqual([
      ["package", true], ["predecessor", false], ["startup", true],
    ]);
    expect(selection.owners[0]!.targets).toHaveLength(2);
    expect(selection.selectionId).toMatch(/^[a-f0-9]{64}$/);
    expect(assertIntegrationSelection(JSON.parse(JSON.stringify(selection)), authority)).toEqual(selection);
  });

  it("normalizes reviewed ownership order without changing identity", () => {
    const authority = fixture();
    const first = createIntegrationSelection(authority);
    authority.ownership.owners.reverse();
    authority.ownership.owners.forEach(owner => owner.targets.reverse());
    expect(createIntegrationSelection(authority)).toEqual(first);
  });

  it("retains justified exclusions and explicit exhaustive cadence deferrals", () => {
    const authority = fixture();
    const selection = createIntegrationSelection({ ...authority, mode: "impact", decisions: impactDecisions() });
    expect(selection.owners.find((owner: any) => owner.owner === "predecessor")).toMatchObject({ cadence: "exhaustive", selected: false, reasons: [{ code: "exhaustive-cadence", paths: ["test/fixture.test.ts"] }] });
    expect(selection.owners.find((owner: any) => owner.owner === "startup")).toMatchObject({ cadence: "pull-request", selected: false, reasons: [{ code: "unrelated", paths: [] }] });
    expect(assertIntegrationSelection(selection, authority)).toBe(selection);
    expect(() => createIntegrationSelection({ ...authority, mode: "impact" })).toThrow("explicit decisions");
  });

  it.each(["docs-only", "version-only"] as const)("requires independent authority for the %s exemption", exemption => {
    const authority = { ...fixture(), exemption };
    const selection = createIntegrationSelection({ ...authority, mode: "exempt" });
    expect(selection.owners.every((owner: any) => owner.selected === false)).toBe(true);
    expect(() => assertIntegrationSelection(selection, fixture())).toThrow("lacks authority");
    expect(assertIntegrationSelection(selection, authority)).toBe(selection);
  });

  it("allows deliberate cross-runtime executions but rejects duplicate scope/target ownership", () => {
    const authority = fixture();
    authority.ownership.owners[0]!.targets.push({ ...windows, node: 24 });
    expect(createIntegrationSelection(authority).owners).toHaveLength(3);
    authority.ownership.owners.push({ ...authority.ownership.owners[0]!, id: "duplicate" });
    expect(() => createIntegrationSelection(authority)).toThrow("duplicate integration scope");
  });

  it.each([
    ["schema", (v: any) => { v.schema = "unsupported"; }],
    ["head", (v: any) => { v.head = "c".repeat(40); }],
    ["base", (v: any) => { v.base = "c".repeat(40); }],
    ["missing owner", (v: any) => { v.owners.pop(); }],
    ["duplicate owner", (v: any) => { v.owners[1] = v.owners[0]; }],
    ["unknown owner", (v: any) => { v.owners[0].owner = "unknown"; }],
    ["changed runtime", (v: any) => { v.owners[0].targets[0].node = 24; v.owners[0].targets[1].node = 22; }],
    ["missing platform", (v: any) => { v.owners[0].targets.pop(); }],
    ["missing scope", (v: any) => { v.owners[0].scopes = []; }],
    ["string boolean", (v: any) => { v.owners[0].selected = "false"; }],
    ["missing boolean", (v: any) => { delete v.owners[0].selected; }],
    ["missing reasons", (v: any) => { v.owners[0].reasons = []; }],
    ["too many reasons", (v: any) => { v.owners[0].reasons = Array(65).fill({ code: "conservative-fallback", paths: [] }); }],
    ["contradictory reason", (v: any) => { v.owners[0].reasons = [{ code: "unrelated", paths: [] }]; }],
    ["silent conservative skip", (v: any) => { v.owners[0].selected = false; v.owners[0].reasons = [{ code: "unrelated", paths: [] }]; }],
    ["false exhaustive declaration", (v: any) => { v.owners[0].selected = false; v.owners[0].reasons = [{ code: "exhaustive-cadence", paths: [] }]; }],
    ["selected exhaustive owner", (v: any) => { const owner = v.owners.find((entry: any) => entry.owner === "predecessor"); owner.selected = true; owner.reasons = [{ code: "conservative-fallback", paths: [] }]; }],
    ["pathless impact", (v: any) => { v.owners[0].reasons = [{ code: "coarse-owner", paths: [] }]; }],
    ["raw diagnostic field", (v: any) => { v.owners[0].reasons[0].error = "must not be accepted"; }],
    ["traversal path", (v: any) => { v.owners[0].reasons[0].paths = ["test/../private"]; }],
    ["absolute path", (v: any) => { v.owners[0].reasons[0].paths = ["C:/private"]; }],
    ["unbounded path", (v: any) => { v.owners[0].reasons[0].paths = ["x".repeat(1025)]; }],
    ["invalid mode", (v: any) => { v.mode = "skip"; }],
    ["unknown field", (v: any) => { v.fallback = false; }],
    ["forged exemption", (v: any) => { v.exemption = "docs-only"; }],
  ] as [string, (v: any) => void][])("rejects %s even if the document is rehashed", (_name, mutate) => {
    const authority = fixture();
    const value = JSON.parse(JSON.stringify(createIntegrationSelection(authority)));
    mutate(value);
    expect(() => assertIntegrationSelection(reseal(value), authority)).toThrow();
  });

  it.each([
    ["schema", (v: any) => { v.schema = "unsupported"; }],
    ["empty owners", (v: any) => { v.owners = []; }],
    ["too many owners", (v: any) => { v.owners = Array(65).fill(v.owners[0]); }],
    ["duplicate owner", (v: any) => { v.owners[1].id = v.owners[0].id; }],
    ["missing cadence", (v: any) => { delete v.owners[0].cadence; }],
    ["unknown cadence", (v: any) => { v.owners[0].cadence = "sometimes"; }],
    ["unknown owner field", (v: any) => { v.owners[0].allowSkip = true; }],
    ["empty scopes", (v: any) => { v.owners[0].scopes = []; }],
    ["duplicate scope", (v: any) => { v.owners[0].scopes.push(v.owners[0].scopes[0]); }],
    ["missing targets", (v: any) => { v.owners[0].targets = []; }],
    ["unsupported runtime", (v: any) => { v.owners[0].targets[0].node = 20; }],
    ["unsupported platform", (v: any) => { v.owners[0].targets[0].platform = "unknown"; }],
    ["unsupported architecture", (v: any) => { v.owners[0].targets[0].architecture = "unknown"; }],
    ["duplicate target", (v: any) => { v.owners[0].targets.push(v.owners[0].targets[0]); }],
  ] as [string, (v: any) => void][])("rejects invalid ownership: %s", (_name, mutate) => {
    const authority = structuredClone(fixture());
    mutate(authority.ownership);
    expect(() => createIntegrationSelection(authority)).toThrow();
  });

  it("binds the original complete ownership and decision bytes", () => {
    const authority = fixture();
    const selection = createIntegrationSelection({ ...authority, mode: "impact", decisions: impactDecisions() });
    const changed = JSON.parse(JSON.stringify(selection));
    changed.owners[0].reasons[0].paths = ["test/other.test.ts"];
    expect(() => assertIntegrationSelection(changed, authority)).toThrow("selection identity mismatch");
    authority.ownership.owners[0]!.cadence = "exhaustive";
    expect(() => assertIntegrationSelection(selection, authority)).toThrow("ownership identity mismatch");
  });

  it("rejects unavailable authority and incomplete decision input", () => {
    const authority = fixture();
    const selection = createIntegrationSelection(authority);
    expect(() => assertIntegrationSelection(selection, { ...authority, head: "HEAD" })).toThrow("authority");
    expect(() => createIntegrationSelection({ ...authority, mode: "impact", decisions: [] })).toThrow("incomplete");
    const duplicate = impactDecisions();
    duplicate[1] = duplicate[0]!;
    expect(() => createIntegrationSelection({ ...authority, mode: "impact", decisions: duplicate })).toThrow("duplicate");
  });
});
