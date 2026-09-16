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
    expect(shared.owners.every(owner => owner.selected)).toBe(true);
    const renamed = select([{ status: "R", oldPath: "src/ui/components/old.ts", path: "src/features/launch/new.ts" }]);
    expect(renamed.owners.filter(owner => owner.selected).map(owner => owner.owner)).toEqual(expect.arrayContaining(["ui-rendering", "launch-startup"]));
  });

  it.each(["config/validation-suites.json", ".github/workflows/ci.yml", "scripts/release/validation-impact.mjs"])("selects complete coverage for invalidator %s", path => {
    const result = select([path]);
    expect(result.mode).toBe("conservative");
    expect(result.owners.every(owner => owner.selected)).toBe(true);
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
