import { describe, expect, it } from "vitest";
import { evaluateDevelopmentValidationTiming } from "../../scripts/release/development-validation-timing.mjs";

describe("development validation latency evidence", () => {
  it("evaluates runner critical path and per-scope targets without queue time", () => {
    const result = evaluateDevelopmentValidationTiming({
      aggregateProcessingMs: 2_000,
      jobs: [
        { job: "core", runnerMs: 220_000, scopeDurations: [{ id: "vitest-core", scope: "pr-core-tests", durationMs: 180_000 }] },
        { job: "startup", runnerMs: 398_000, scopeDurations: [{ id: "vitest-startup", scope: "package-startup", durationMs: 274_000 }] },
      ],
    });
    expect(result).toMatchObject({
      criticalPathMs: 400_000,
      runnerMs: 618_000,
      maxScopeMs: 274_000,
      targets: { criticalPathLimitMs: 480_000, scopeLimitMs: 300_000, criticalPathMet: true, scopeMet: true },
    });
    expect(result).not.toHaveProperty("queueMs");
  });

  it("reports over-target evidence without changing or retrying the workload", () => {
    const result = evaluateDevelopmentValidationTiming({
      aggregateProcessingMs: 1_000,
      jobs: [{ job: "promoted", runnerMs: 900_000, scopeDurations: [{ id: "vitest-predecessor", scope: "update-predecessor", durationMs: 834_568 }] }],
    });
    expect(result.targets).toMatchObject({ criticalPathMet: false, scopeMet: false });
    expect(result.scopes).toEqual([{ job: "promoted", id: "vitest-predecessor", scope: "update-predecessor", durationMs: 834_568 }]);
  });

  it.each([
    { jobs: [] },
    { jobs: [{ job: "bad job", runnerMs: 1, scopeDurations: [] }] },
    { jobs: [{ job: "core", runnerMs: -1, scopeDurations: [] }] },
    { jobs: [{ job: "core", runnerMs: 1, scopeDurations: [{ id: "gate", scope: "invalid scope", durationMs: 1 }] }] },
    { jobs: [{ job: "core", runnerMs: 1, scopeDurations: [{ id: "gate", scope: "pr-core-tests", durationMs: -1 }] }] },
  ])("rejects malformed timing evidence %#", value => {
    expect(() => evaluateDevelopmentValidationTiming(value as any)).toThrow();
  });
});
