import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("development validation diagnostic baseline", () => {
  it("keeps wall-clock diagnostics separate from structural acceptance", async () => {
    const baseline = JSON.parse(await readFile("test/fixtures/validation/development-validation-baseline.json", "utf8"));
    expect(baseline).toMatchObject({
      schema: "a1-development-validation-baseline-v1",
      classification: "diagnostic-wall-time-and-structural-counts",
      samples: {
        pr201: {
          workflowRun: 33536370678,
          renderingProducerLaunches: { budgetMatrices: 48, repeatedAssertionMatrices: 24, producerProtocol: 11, total: 83 },
        },
        preRenderingRepresentative: { workflowRun: 33197019593 },
      },
      acceptance: { wallClockIsDiagnostic: true },
    });
    expect(baseline.acceptance.structuralGates).toEqual([
      "selected scopes",
      "matrix captures",
      "producer launches",
      "documentation files",
      "full repository scans",
    ]);
    expect(baseline.samples.pr201.renderingSeconds).toBeGreaterThan(baseline.samples.pr201.ordinaryVitestSeconds);
  });
});
