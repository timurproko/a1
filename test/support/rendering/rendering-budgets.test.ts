import { describe, expect, it } from "vitest";
import { evaluateRenderingBudgets } from "./rendering-budgets.js";
import { runRenderingMatrix, type RenderingMatrixResult } from "./rendering-matrix.js";
import { STREAM_RENDERING_WORKLOADS } from "./streaming-workloads.js";

describe("rendering stability logical-damage gate", () => {
  it("accepts every deterministic workload and rejects undeclared damage", async () => {
    let captured: RenderingMatrixResult | undefined;
    for (const workload of STREAM_RENDERING_WORKLOADS) {
      const matrix = await runRenderingMatrix(workload.id);
      captured ??= matrix;
      const budget = evaluateRenderingBudgets(matrix);
      expect(budget.violations, workload.id).toEqual([]);
      expect(budget.passed).toBe(true);
    }

    const source = captured!;
    const producer = source.defaultMode[0]!;
    const checkpoint = producer.checkpoints.find(candidate => candidate.name !== "initial")!;
    const corrupted: RenderingMatrixResult = {
      ...source,
      defaultMode: source.defaultMode.map(entry => entry !== producer ? entry : {
        ...entry,
        checkpoints: entry.checkpoints.map(entryCheckpoint => entryCheckpoint !== checkpoint ? entryCheckpoint : {
          ...entryCheckpoint,
          paint: { ...entryCheckpoint.paint, fullScreenClears: 1 },
        }),
      }),
    };
    expect(evaluateRenderingBudgets(corrupted)).toMatchObject({ passed: false });
  }, 600_000);
});
