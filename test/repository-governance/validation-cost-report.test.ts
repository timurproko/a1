import { describe, expect, it } from "vitest";
import { createValidationCostReport } from "../../scripts/release/validation-cost-report.mjs";

const sourceHead = "a".repeat(40);
const ledger = [
  { test: "test/ui/first.test.ts", owner: "ui-rendering", fastOwner: "fast-remainder" },
  { test: "test/ui/second.test.ts", owner: "ui-rendering", fastOwner: "fast-resource-sensitive" },
];
const at = (seconds: number) => new Date(Date.UTC(2026, 9, 24, 0, 0, seconds)).toISOString();

describe("observational validation costs", () => {
  it("counts retained files independently of old-run evidence and never invents queue or critical-path authority", () => {
    const report = createValidationCostReport({ sourceHead, ledger, run: { headSha: "b".repeat(40), jobs: [
      { name: "core", conclusion: "success", startedAt: at(10), completedAt: at(30), steps: [{ name: "install", startedAt: at(10), completedAt: at(15) }] },
      { name: "rendering", conclusion: "success", startedAt: at(20), completedAt: at(50) },
      { name: "unused", conclusion: "skipped" },
    ], createdAt: at(0), updatedAt: at(55) } });
    expect(report).toMatchObject({ authority: "observational-only", sourceHead,
      inventory: { files: 2, owners: { "ui-rendering": { files: 2, ordinary: 1, resourceSensitive: 1, integration: 0 } } },
      observation: { sameSource: false, runnerSumMs: 50_000, runnerSpanMs: 40_000, longestJobMs: 30_000,
        workflowElapsedMs: 55_000, queueMs: null, criticalPathMs: null } });
    expect(report.observation.jobs[0].steps).toEqual([{ name: "install", durationMs: 5000 }]);
  });

  it("parses ANSI and escaped ANSI timings without retaining log payloads or collapsing repeated observations", () => {
    const report = createValidationCostReport({ sourceHead, ledger, log:
      "secret environment ignored\n\u001b[32m ✓ test/ui/first.test.ts (2 tests) 1200ms\u001b[0m\n"
      + "^[[32m ✓ test/ui/first.test.ts (2 tests) 2.5s^[[0m\n" });
    expect(report.fileTimings).toEqual([{ file: ledger[0]!.test, durationMs: 2500 }, { file: ledger[0]!.test, durationMs: 1200 }]);
    expect(JSON.stringify(report)).not.toContain("secret environment");
    expect(report.observation).toBeNull();
  });

  it("reports missing or inverted timing as unavailable rather than a zero-duration success", () => {
    const report = createValidationCostReport({ sourceHead, ledger, run: { headSha: sourceHead,
      jobs: [{ name: "pending", startedAt: at(20), completedAt: at(10), steps: [{}] }] } });
    expect(report.observation).toMatchObject({ runnerSumMs: null, longestJobMs: null, workflowElapsedMs: null, runnerSpanMs: null });
    expect(report.observation.jobs[0].steps[0]).toEqual({ name: "unavailable", durationMs: null });
  });

  it("rejects duplicate inventory, unsafe paths, malformed source identity, and unbounded evidence", () => {
    expect(() => createValidationCostReport({ sourceHead, ledger: [...ledger, ledger[0]!] })).toThrow();
    expect(() => createValidationCostReport({ sourceHead, ledger: [{ ...ledger[0]!, test: "test/../private.test.ts" }] })).toThrow();
    expect(() => createValidationCostReport({ sourceHead: "unknown", ledger })).toThrow();
    expect(() => createValidationCostReport({ sourceHead, ledger, run: { headSha: sourceHead, jobs: [{ steps: Array(257).fill({}) }] } })).toThrow();
    expect(createValidationCostReport({ sourceHead, ledger: [{ ...ledger[0]!, owner: "constructor" }] }).inventory.owners.constructor.files).toBe(1);
    expect(() => createValidationCostReport({ sourceHead, ledger, run: { headSha: sourceHead, jobs: Array(513).fill({}) } })).toThrow();
  });
});
