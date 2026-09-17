import { describe, expect, it } from "vitest";
import { loadValidationOwnership, selectValidationOwnership } from "../../scripts/release/validation-ownership.mjs";

const authority = await loadValidationOwnership();
function select(paths: Array<string | { status: string; path: string; oldPath?: string }>, options = {}) {
  const changes = paths.map(value => typeof value === "string" ? { status: "M", path: value } : value);
  return selectValidationOwnership({ authority, changes, ...options });
}

describe("bounded PR-core ownership", () => {
  it("accounts for every retained test under one coarse owner and complete cadence", () => {
    expect(authority.tests.length).toBeGreaterThan(300);
    expect(authority.ledger).toHaveLength(authority.tests.length);
    expect(authority.ledger.filter((entry: any) => !entry.owner)).toEqual([]);
    expect(authority.ledger.filter((entry: any) => !entry.fastOwner && entry.completeOwners.length === 0)).toEqual([]);
    expect(authority.ledger.filter((entry: any) => entry.prCore).map((entry: any) => entry.test)).toEqual(authority.policy.mandatoryTests);
  });

  it.each([
    ["UI/rendering", "src/ui/components/transcript-viewport.ts", "ui-rendering"],
    ["launch/startup", "src/features/launch/runtime-selection.ts", "launch-startup"],
    ["release/package/update", "src/foundation/release/bootstrap.ts", "release-package-update"],
    ["Pi", "src/integrations/pi/engine/agent-engine.ts", "pi"],
    ["native containment", "native/process-guardian/src/main.rs", "native-containment"],
    ["image/history", "src/features/prompt-history/service.ts", "image-history"],
    ["governance", "scripts/governance/check-architecture.mjs", "governance"],
    ["shared product", "src/composition/workspace.ts", "shared-product"],
  ])("selects the %s coarse owner", (_label, path, owner) => {
    const result = select([path]);
    expect(result.mode).toBe("impact");
    expect(result.owners.find(decision => decision.owner === owner)).toMatchObject({ selected: true });
    expect(result.tests).toEqual(expect.arrayContaining(authority.ledger.filter((entry: any) => entry.owner === owner && entry.fastOwner === "fast-remainder").map((entry: any) => entry.test)));
  });

  it("selects filesystem-heavy release cleanup only in the resource partition", () => {
    const result = select(["src/foundation/release/bootstrap.ts"]);
    expect(result.resourceTests).toContain("test/foundation/release/release-gc.test.ts");
    expect(result.tests).not.toContain("test/foundation/release/release-gc.test.ts");
  });

  it("selects changed tests, shared support consumers, and both rename identities", () => {
    const changed = select(["test/cli/dispatch.test.ts"]);
    expect(changed.owners.find(owner => owner.owner === "shared-product")?.reasons).toEqual(expect.arrayContaining([expect.objectContaining({ code: "changed-test" })]));
    const shared = select(["test/support/session-resume-fixture.ts"]);
    expect(shared.owners.filter(owner => owner.selected).map(owner => owner.owner)).toEqual(["release-package-update", "pi"]);
    expect(shared.owners.find(owner => owner.owner === "pi")?.reasons).toEqual([{ code: "shared-support",
      paths: ["test/support/session-resume-fixture.ts", "test/integrations/pi/engine/runtime-integration.test.ts"] }]);
    const renamed = select([{ status: "R", oldPath: "src/ui/components/old.ts", path: "src/features/launch/new.ts" }]);
    expect(renamed.owners.filter(owner => owner.selected).map(owner => owner.owner)).toEqual(expect.arrayContaining(["ui-rendering", "launch-startup"]));
  });

  it.each(["config/validation-suites.json", ".github/workflows/ci.yml", "scripts/release/validation-impact.mjs"])("selects complete coverage for invalidator %s", path => {
    const result = select([path]);
    expect(result.mode).toBe("conservative");
    expect(result.owners.every(owner => owner.selected)).toBe(true);
  });

  it("attributes shared support through the test tree's import graph and falls back to the declared owners", () => {
    const graph = authority.supportGraph;
    expect(graph.files).toBeGreaterThan(authority.tests.length);
    const fixture = "test/fixtures/prompt-suggestion-conversations.ts";
    expect(graph.reachingTests(fixture)).toEqual([
      "test/integrations/pi/engine/adapter.test.ts",
      "test/integrations/pi/engine/prompt-suggestion-provider.integration.test.ts",
      "test/integrations/pi/session-ui/session-shell.test.ts",
    ]);
    const direct = select([fixture]);
    expect(direct.mode).toBe("impact");
    expect(direct.owners.filter(owner => owner.selected).map(owner => owner.owner)).toEqual(["pi"]);
    expect(direct.integrationOwners).toEqual(["history-compatibility", "image-compatibility", "pi-release-resume"]);

    const transitive = graph.reachingTests("test/support/rendering/rendering-matrix.ts");
    expect(transitive).toEqual(expect.arrayContaining(graph.reachingTests("test/support/rendering/rendering-budgets.ts")));
    expect(transitive).toEqual(expect.arrayContaining(graph.reachingTests("test/support/rendering/rendering-gate.ts")));
    expect(transitive.length).toBeGreaterThan(0);

    const declared = authority.policy.shared.find((rule: any) => rule.paths.includes("test/support/"));
    const unreferenced = select(["test/support/no-such-helper.ts"]);
    expect(unreferenced.mode).toBe("impact");
    expect(unreferenced.owners.filter(owner => owner.selected).map(owner => owner.owner)).toEqual(declared.owners);
    expect(unreferenced.owners[0]!.reasons).toEqual([{ code: "shared-support-declared", paths: ["test/support/no-such-helper.ts"] }]);

    const withoutGraph = selectValidationOwnership({ authority: { ...authority, supportGraph: null }, changes: [{ status: "M", path: fixture }] });
    expect(withoutGraph.owners.filter(owner => owner.selected).map(owner => owner.owner)).toEqual(declared.owners);
  });

  it("replays PR #455 to two owners instead of the complete pull-request suite", () => {
    const archive = "openspec/changes/archive/2026-09-17-prompt-suggestion-cache-parity/";
    const replay = select([
      "config/startup-graph-baseline.json", `${archive}.openspec.yaml`, `${archive}acceptance.md`, `${archive}design.md`,
      `${archive}implementation-evidence.md`, `${archive}proposal.md`, `${archive}specs/contextual-prompt-suggestions/spec.md`, `${archive}tasks.md`,
      "openspec/specs/contextual-prompt-suggestions/spec.md", "src/integrations/pi/engine/adapter.ts",
      "test/fixtures/prompt-suggestion-conversations.ts", "test/integrations/pi/engine/adapter.test.ts",
    ]);
    expect(replay.mode).toBe("impact");
    expect(replay.owners.filter(owner => owner.selected).map(owner => owner.owner)).toEqual(["release-package-update", "pi"]);
    expect(replay.tests.length).toBeLessThan(authority.ledger.filter((entry: any) => entry.fastOwner === "fast-remainder").length / 2);
    expect(replay.integrationOwners).not.toContain("unix-containment");
    expect(replay.integrationOwners).not.toContain("launch-integration");
  });

  it("fails closed for unknown operational paths and manual dispatch", () => {
    const unknown = select(["scripts/unknown-operation.mjs"]);
    expect(unknown).toMatchObject({ mode: "conservative", unknown: ["scripts/unknown-operation.mjs"] });
    expect(select(["src/cli/dispatch.ts"], { manualNoComparison: true }).mode).toBe("conservative");
  });

  it.each(["docs-only", "version-only"] as const)("enumerates an empty %s exemption", exemption => {
    const result = select(["docs/example.md"], { exemption });
    expect(result).toMatchObject({ mode: "exempt", exemption, tests: [], resourceTests: [], integrationOwners: [] });
    expect(result.owners.every(owner => !owner.selected)).toBe(true);
  });
});
