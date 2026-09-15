import { describe, expect, it } from "vitest";
import { classifyIntegrationImpact, selectIntegrationImpact, type IntegrationImpactOwner } from "../../scripts/release/integration-impact.mjs";
import type { IntegrationDependencyPolicy } from "../../scripts/release/integration-dependency-graph.mjs";
import type { RevisionDependencySnapshot } from "../../scripts/release/revision-dependencies.mjs";

const baseId = "a".repeat(40), headId = "b".repeat(40);
const target = { platform: "win32", architecture: "x64", node: 22 } as const;
const owners: IntegrationImpactOwner[] = [
  { id: "startup", scopes: ["startup"], targets: [target], development: true,
    entries: ["test/startup.test.ts"], tests: ["test/startup.test.ts"], support: ["test/support/startup/"] },
  { id: "images", scopes: ["images"], targets: [target], development: true,
    entries: ["test/images.test.ts"], tests: ["test/images.test.ts"], support: ["test/support/images/"] },
  { id: "predecessor", scopes: ["predecessor"], targets: [target], development: false,
    entries: ["test/predecessor.test.ts"], tests: ["test/predecessor.test.ts"], support: ["test/support/predecessor/"] },
];
const policy: IntegrationDependencyPolicy = {
  schema: "a1-integration-dependencies-v1", emittedRoot: "dist", sourceRoot: "src",
  invalidators: ["package.json", "config/", "native/"], unrelated: ["scripts/governance/"], generated: [], reviewed: [],
};
function snapshot(revision: string, extra: Record<string, string> = {}): RevisionDependencySnapshot {
  const source = {
    "package.json": "{}", "package-lock.json": "{}",
    "test/startup.test.ts": "import './support/startup/fixture.js'; import '../src/start.js';",
    "test/support/startup/fixture.ts": "export {};", "src/start.ts": "export * from './leaf.js';", "src/leaf.ts": "export {};",
    "test/images.test.ts": "import './support/images/fixture.js';", "test/support/images/fixture.ts": "export {};",
    "test/predecessor.test.ts": "import './support/predecessor/fixture.js';", "test/support/predecessor/fixture.ts": "export {};", ...extra,
  };
  return { revision, files: new Map(Object.entries(source).map(([path, value]) => [path, { mode: "100644", oid: "c".repeat(40), size: value.length, source: value }])) };
}
function classify(changes: { status: string; path: string; oldPath?: string }[], before = snapshot(baseId), after = snapshot(headId)) {
  return classifyIntegrationImpact({ base: before, head: after, changes, owners: structuredClone(owners), basePolicy: policy });
}
function decision(result: ReturnType<typeof classify>, owner: string) {
  return result.selection.owners.find(candidate => candidate.owner === owner)!;
}

describe("integration test and support ownership", () => {
  it("promotes a changed retained test even when its owner is normally outside PR validation", () => {
    const result = classify([{ status: "M", path: "test/predecessor.test.ts" }]);
    expect(decision(result, "predecessor")).toMatchObject({ selected: true, reasons: expect.arrayContaining([expect.objectContaining({ code: "changed-test" })]) });
    expect(decision(result, "startup").selected).toBe(false);
  });

  it.each([
    ["test/support/startup/fixture.ts", ["startup"]],
    ["test/support/images/fixture.ts", ["images"]],
    ["test/support/predecessor/fixture.ts", ["predecessor"]],
  ] as const)("selects exactly the owners of shared support %s", (path, expected) => {
    const result = classify([{ status: "M", path }]);
    expect(result.selection.owners.filter(owner => owner.selected).map(owner => owner.owner)).toEqual(expected);
    expect(result.selection.owners.find(owner => owner.selected)?.reasons).toEqual(expect.arrayContaining([expect.objectContaining({ code: "shared-support", paths: [path] })]));
  });

  it.each([
    { status: "D", path: "test/support/startup/fixture.ts" },
    { status: "R", oldPath: "test/support/startup/fixture.ts", path: "test/support/startup/renamed.ts" },
    { status: "C", oldPath: "test/support/startup/fixture.ts", path: "test/support/startup/copied.ts" },
  ])("uses base ownership for $status support", change => {
    expect(decision(classify([change]), "startup").selected).toBe(true);
  });

  it.each(["test/new.integration.test.ts", "test/deleted.test.ts", "test/renamed.test.ts"])("falls back globally for unknown retained test %s", path => {
    const result = classify([{ status: path.includes("deleted") ? "D" : "A", path }]);
    expect(result.fallback).toBe("unclassified-operational-input");
    expect(result.selection.owners.every(owner => owner.selected)).toBe(true);
  });

  it("falls back globally for unknown shared support but not reviewed unrelated governance tooling", () => {
    expect(classify([{ status: "A", path: "test/support/unknown/fixture.ts" }]).selection.owners.every(owner => owner.selected)).toBe(true);
    const unrelated = classify([{ status: "M", path: "scripts/governance/report.mjs" }]);
    expect(unrelated.fallback).toBeNull();
    expect(unrelated.selection.owners.every(owner => !owner.selected)).toBe(true);
  });

  it("uses transitive head and base graph reachability independently of explicit support declarations", () => {
    expect(decision(classify([{ status: "M", path: "src/leaf.ts" }]), "startup").reasons).toEqual(expect.arrayContaining([expect.objectContaining({ code: "reachable" })]));
    const after = snapshot(headId, { "test/startup.test.ts": "export {};", "src/start.ts": "export {};" });
    expect(decision(classify([{ status: "D", path: "src/leaf.ts" }], snapshot(baseId), after), "startup").selected).toBe(true);
  });

  it.each(["package.json", "config/validation-suites.json", "native/process-guardian/src/main.rs"])("selects every owner for invalidator %s", path => {
    const result = classify([{ status: "M", path }]);
    expect(result.selection.owners.every(owner => owner.selected && owner.reasons.some(reason => reason.code === "invalidator"))).toBe(true);
  });
});

describe("conservative integration fallback", () => {
  it("selects development owners when manual comparison history is unavailable", () => {
    const result = selectIntegrationImpact({ baseId, headId, owners: structuredClone(owners), manualNoComparison: true });
    expect(result.fallback).toBe("manual-no-comparison");
    expect(result.selection.mode).toBe("conservative");
    expect(result.selection.owners.map(owner => [owner.owner, owner.selected])).toEqual([["images", true], ["predecessor", false], ["startup", true]]);
  });

  it("selects development owners without leaking classifier exceptions", () => {
    const result = selectIntegrationImpact({ baseId, headId, owners: structuredClone(owners), base: {} as RevisionDependencySnapshot,
      head: snapshot(headId), changes: [], basePolicy: policy });
    expect(result.fallback).toBe("classifier-failure");
    expect(JSON.stringify(result)).not.toContain("invalid dependency snapshot");
    expect(result.selection.owners.filter(owner => owner.selected).map(owner => owner.owner)).toEqual(["images", "startup"]);
  });

  it("blocks when authoritative commit or ownership identity cannot be established", () => {
    expect(() => selectIntegrationImpact({ baseId: "HEAD", headId, owners: structuredClone(owners), manualNoComparison: true })).toThrow("authoritative commits");
    const invalid = structuredClone(owners);
    invalid[0]!.tests.push("test/not-an-entry.test.ts");
    expect(() => selectIntegrationImpact({ baseId, headId, owners: invalid, manualNoComparison: true })).toThrow("owner path");
  });

  it.each(["docs-only", "version-only"] as const)("explicitly excludes all owners only with the %s exemption", exemption => {
    const result = selectIntegrationImpact({ baseId, headId, owners: structuredClone(owners), exemption });
    expect(result.selection).toMatchObject({ mode: "exempt", exemption });
    expect(result.selection.owners.every(owner => !owner.selected && owner.reasons[0]?.code === exemption)).toBe(true);
  });

  it("treats same-commit comparison and unsupported changed operations conservatively", () => {
    const same = snapshot(baseId);
    expect(classifyIntegrationImpact({ base: same, head: same, changes: [], owners: structuredClone(owners), basePolicy: policy }).selection.owners.every(owner => owner.selected)).toBe(true);
    const unsupported = classify([{ status: "M", path: "src/start.ts" }], snapshot(baseId, { "src/start.ts": "import(variable);" }), snapshot(headId, { "src/start.ts": "import(variable);" }));
    expect(decision(unsupported, "startup").selected).toBe(true);
  });

  it("falls back globally for unknown operational code and remains bounded", () => {
    const result = classify([{ status: "A", path: "scripts/unknown-operation.mjs" }]);
    expect(result.selection.owners.every(owner => owner.selected)).toBe(true);
    expect(result.selection.owners.every(owner => owner.reasons.length <= 64)).toBe(true);
    expect(() => classify(Array.from({ length: 4097 }, (_, index) => ({ status: "A", path: `src/${index}.ts` })))).toThrow("population");
  });
});
