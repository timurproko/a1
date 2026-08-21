import { describe, expect, it } from "vitest";
import { formatImpactSummary, parseNameStatus, selectGitImpact, selectImpactFromChanges } from "../../scripts/validation-impact.mjs";

describe("fail-closed validation impact selection", () => {
  it("never selects runtime or full validation for planning-only changes", async () => {
    for (const changes of [
      [{ status: "M", path: "openspec/changes/example/specs/example/spec.md" }],
      [{ status: "D", path: "openspec/changes/example/tasks.md" }],
      [{ status: "R", previousPath: "openspec/changes/old/spec.md", path: "openspec/changes/new/spec.md" }],
    ]) {
      const plan = await selectImpactFromChanges(changes, { full: true, required: ["package-smoke"] });
      expect(plan).toMatchObject({
        planningOnly: true,
        full: false,
        packageSensitive: false,
        selected: ["planning"],
        fallbacks: [],
      });
      expect(plan.selected).not.toEqual(expect.arrayContaining(["invariants", "fast", "full-release", "package-smoke"]));
    }
  });

  it("uses normal validation when planning and runtime paths are mixed", async () => {
    const plan = await selectImpactFromChanges([
      { status: "M", path: "openspec/changes/example/tasks.md" },
      { status: "M", path: "src/cli/dispatch.ts" },
    ]);
    expect(plan).toMatchObject({ planningOnly: false, selected: ["invariants", "fast"] });
  });

  it("keeps focused CLI changes on mandatory validation", async () => {
    const plan = await selectImpactFromChanges([{ status: "M", path: "src/cli/dispatch.ts" }]);
    expect(plan).toMatchObject({
      full: false,
      packageSensitive: false,
      selected: ["invariants", "fast"],
      owners: ["cli"],
      fallbacks: [],
    });
  });

  it("unions affected integration scopes and changed-test evidence", async () => {
    const plan = await selectImpactFromChanges([
      { status: "M", path: "src/features/launch/prepare-launch.ts" },
      { status: "M", path: "test/foundation/pi-engine-adapter/conformance.test.ts" },
    ]);
    expect(plan.full).toBe(false);
    expect(plan.selected).toEqual([
      "invariants",
      "fast",
      "launch-integration",
      "pi-engine-conformance",
    ]);
    expect(plan.changedTests).toEqual(["test/foundation/pi-engine-adapter/conformance.test.ts"]);
  });

  it("widens package and cross-cutting changes", async () => {
    const packagePlan = await selectImpactFromChanges([{ status: "M", path: "package.json" }]);
    expect(packagePlan.packageSensitive).toBe(true);
    expect(packagePlan.selected).toEqual(expect.arrayContaining(["package-smoke", "package-install", "dependency-policy"]));

    const fullPlan = await selectImpactFromChanges([{ status: "M", path: "vitest.config.ts" }]);
    expect(fullPlan).toMatchObject({ full: true, packageSensitive: true, selected: ["full-release"] });
  });

  it("allows only widening overrides and required candidate gates", async () => {
    const candidate = await selectImpactFromChanges([{ status: "M", path: "src/cli/dispatch.ts" }], { required: ["package-smoke"] });
    expect(candidate).toMatchObject({ full: false, selected: ["invariants", "fast", "package-smoke"] });
    const plan = await selectImpactFromChanges([{ status: "M", path: "src/cli/dispatch.ts" }], { full: true, required: ["package-smoke"] });
    expect(plan).toMatchObject({ full: true, selected: ["full-release"] });
  });

  it.each([
    [[{ status: "M", path: "unknown/new-owner.ts" }], "unmapped:unknown/new-owner.ts"],
    [[{ status: "D", path: "src/cli/removed.ts" }], "deleted:src/cli/removed.ts"],
    [[], "no-changed-paths"],
  ] as const)("fails closed for uncertain changes", async (changes, fallback) => {
    const plan = await selectImpactFromChanges([...changes]);
    expect(plan).toMatchObject({ full: true, selected: ["full-release"] });
    expect(plan.fallbacks).toContain(fallback);
  });

  it("accepts same-owner renames and rejects cross-owner renames", async () => {
    const safe = await selectImpactFromChanges([{ status: "R", previousPath: "src/cli/old.ts", path: "src/cli/new.ts" }]);
    expect(safe.full).toBe(false);
    const unsafe = await selectImpactFromChanges([{ status: "R", previousPath: "src/cli/old.ts", path: "src/features/launch/new.ts" }]);
    expect(unsafe.full).toBe(true);
    expect(unsafe.fallbacks[0]).toContain("unsafe-rename");
  });

  it("parses rename-aware null-delimited Git output", () => {
    expect(parseNameStatus("M\0src/cli/a.ts\0R100\0src/cli/old.ts\0src/cli/new.ts\0D\0docs/old.md\0")).toEqual([
      { status: "M", path: "src/cli/a.ts" },
      { status: "R", previousPath: "src/cli/old.ts", path: "src/cli/new.ts" },
      { status: "D", path: "docs/old.md" },
    ]);
  });

  it("fails closed when trusted Git endpoints are missing", async () => {
    const plan = await selectGitImpact({ base: "not-a-commit", head: "also-not-a-commit" });
    expect(plan).toMatchObject({ full: true, selected: ["full-release"], fallbacks: ["untrusted-base-or-head"] });
  });

  it("rejects a malformed in-memory manifest", async () => {
    await expect(selectImpactFromChanges([{ status: "M", path: "src/cli/dispatch.ts" }], {
      manifest: { schema: "a1-validation-impact-v1", mandatory: [], rules: null },
    })).rejects.toThrow();
  });

  it("renders reviewable human evidence", async () => {
    const plan = await selectImpactFromChanges([{ status: "M", path: "src/features/launch/prepare-launch.ts" }]);
    const summary = formatImpactSummary(plan);
    expect(summary).toContain("## Validation impact");
    expect(summary).toContain("`launch-integration`");
    expect(summary).toContain("launch-composition");
  });
});
