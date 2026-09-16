import { describe, expect, it } from "vitest";
import {
  assertStartupPerformanceBudget,
  evaluateStartupPerformanceBudget,
  formatStartupBudgetViolation,
  resolveStartupBudgetMs,
} from "../../../src/foundation/startup/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

describe("release-gated startup budgets", () => {
  it("fails a regressed Windows budget with dominant phases", () => {
    const event = (phase: "command-invoked" | "ui-modules-loaded" | "first-input-ready-render", elapsedMs: number) => ({
      schema: PRODUCT_IDENTITY.evidence.startupTraceSchema,
      traceId: "trace",
      phase,
      elapsedMs,
      processId: 1,
      profileId: "a1",
      releaseId: "1.0.0-aaaaaaaaaaaaaaaaaaaa",
      dependencyLayerIds: [],
      nodeVersion: process.version,
      fileReadOperations: 0,
    });
    expect(() => assertStartupPerformanceBudget({
      profileId: "a1",
      launchKind: "post-update",
      events: [event("command-invoked", 0), event("ui-modules-loaded", 5_500), event("first-input-ready-render", 6_000)],
      moduleGraph: { loadedFiles: 42, evaluatedBytes: 12_345, groups: [{ group: "pi-public", files: 30, evaluatedBytes: 10_000 }] },
    })).toThrow(/ui-modules-loaded 5500ms.*module graph: 42 files, 12345 evaluated bytes.*pi-public 30\/10000/);
    expect(() => assertStartupPerformanceBudget({
      profileId: "a1",
      launchKind: "no-live-supervisor",
      events: [event("command-invoked", 0), event("ui-modules-loaded", 5_500), event("first-input-ready-render", 6_000)],
    })).toThrow(/no-live-supervisor/);
    expect(() => assertStartupPerformanceBudget({
      profileId: "pi", launchKind: "post-update", events: [event("first-input-ready-render", 2_000)],
    })).not.toThrow();
    expect(() => assertStartupPerformanceBudget({
      profileId: "pi", launchKind: "warm", events: [event("first-input-ready-render", 2_001)],
    })).toThrow(/2001ms exceeds 2000ms/);
    expect(() => assertStartupPerformanceBudget({
      profileId: "pi", launchKind: "no-live-supervisor", events: [event("first-input-ready-render", 2_501)],
    })).toThrow(/2501ms exceeds 2500ms/);
  });

  it("separates budget evaluation from enforcement without changing the reported message", () => {
    const event = (phase: "command-invoked" | "ui-modules-loaded" | "first-input-ready-render", elapsedMs: number) => ({
      schema: PRODUCT_IDENTITY.evidence.startupTraceSchema,
      traceId: "trace",
      phase,
      elapsedMs,
      processId: 1,
      profileId: "a1",
      releaseId: "1.0.0-aaaaaaaaaaaaaaaaaaaa",
      dependencyLayerIds: [],
      nodeVersion: process.version,
      fileReadOperations: 0,
    });
    const regressed = {
      profileId: "a1",
      launchKind: "post-update",
      events: [event("command-invoked", 0), event("ui-modules-loaded", 5_500), event("first-input-ready-render", 6_000)],
      moduleGraph: { loadedFiles: 42, evaluatedBytes: 12_345, groups: [{ group: "pi-public", files: 30, evaluatedBytes: 10_000 }] },
    } as const;
    const violation = evaluateStartupPerformanceBudget(regressed);
    expect(violation).toMatchObject({ profileId: "a1", launchKind: "post-update", elapsedMs: 6_000, budgetMs: 2_000 });
    expect(violation!.dominantPhases[0]).toEqual({ phase: "ui-modules-loaded", durationMs: 5_500 });
    expect(violation!.moduleGraph).toEqual(regressed.moduleGraph);
    expect(formatStartupBudgetViolation(violation!)).toBe(
      "startup budget failed for a1 post-update: 6000ms exceeds 2000ms; dominant phases: ui-modules-loaded 5500ms, first-input-ready-render 500ms,"
      + " command-invoked 0ms; module graph: 42 files, 12345 evaluated bytes (pi-public 30/10000)",
    );
    expect(() => assertStartupPerformanceBudget(regressed)).toThrow(formatStartupBudgetViolation(violation!));
    expect(evaluateStartupPerformanceBudget({
      profileId: "pi", launchKind: "post-update", events: [event("first-input-ready-render", 2_000)],
    })).toBeNull();
    expect(() => evaluateStartupPerformanceBudget({ profileId: "pi", launchKind: "warm", events: [event("command-invoked", 0)] }))
      .toThrow(/first input-ready render was not recorded/);
  });

  it("resolves the declared budget for every launch kind", () => {
    expect(resolveStartupBudgetMs("post-update")).toBe(2_000);
    expect(resolveStartupBudgetMs("no-live-supervisor")).toBe(2_500);
    expect(resolveStartupBudgetMs("warm")).toBe(2_000);
    expect(resolveStartupBudgetMs("warm", { postUpdateMs: 1, noSupervisorMs: 2, warmMs: 3 })).toBe(3);
  });
});
