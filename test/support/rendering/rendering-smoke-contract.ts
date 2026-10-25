import { expect } from "vitest";
import { evaluateRenderingBudgets } from "./rendering-budgets.js";
import type { RenderingMatrixResult } from "./rendering-matrix.js";

export const RENDERING_SMOKE_WORKLOADS = ["streamed-prose", "long-transcript-follow"] as const;

/** Both tiers consume the same assertions; full validation must not recapture the smoke matrix. */
export function assertRenderingSmokeContracts(matrices: ReadonlyMap<string, RenderingMatrixResult>): void {
  for (const workloadId of RENDERING_SMOKE_WORKLOADS) {
    const matrix = matrices.get(workloadId)!;
    expect(matrix, `missing smoke workload ${workloadId}`).toBeDefined();
    expect(matrix.comparisonSemanticParity).toEqual({ regular: true, fullscreen: true });
    expect(matrix.defaultMode.map(result => result.producer)).toEqual(["bare-a1", "a1-pi", "pinned-pi"]);
    expect(matrix.fullscreenMode.map(result => result.effectiveMode)).toEqual(["fullscreen", "fullscreen", "fullscreen"]);
    expect(matrix.defaultMode.flatMap(result => result.checkpoints).some(checkpoint => checkpoint.name === "initial")).toBe(true);
    expect(matrix.defaultMode.flatMap(result => result.checkpoints).every(checkpoint => checkpoint.paint.synchronizedUpdates.balanced)).toBe(true);
    expect(evaluateRenderingBudgets(matrix)).toEqual({ passed: true, violations: [] });
  }
}
