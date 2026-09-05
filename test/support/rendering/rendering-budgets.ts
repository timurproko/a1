import type { RenderingMatrixResult } from "./rendering-matrix.js";

export interface RenderingBudgetResult {
  readonly passed: boolean;
  readonly violations: readonly string[];
}

/** Evaluates logical damage rather than a terminal- or color-specific byte threshold. */
export function evaluateRenderingBudgets(matrix: RenderingMatrixResult): RenderingBudgetResult {
  const violations: string[] = [];
  for (const mode of [matrix.defaultMode, matrix.fullscreenMode]) {
    for (const producer of mode) {
      for (const checkpoint of producer.checkpoints) {
        const label = `${matrix.workloadId}/${producer.producer}/${producer.requestedMode}/${checkpoint.name}`;
        if (!checkpoint.paint.synchronizedUpdates.balanced) violations.push(`${label}: unbalanced synchronized output`);
        if (checkpoint.cellFrame.rows.length === 0) violations.push(`${label}: missing cell frame`);
        if (checkpoint.name !== "initial" && checkpoint.cellFrame.rows.every(row => row.length === 0)) {
          violations.push(`${label}: blank final cell frame`);
        }
        const structuralResize = checkpoint.name.includes("resize-structural");
        if (producer.producer === "bare-a1" && checkpoint.name !== "initial"
          && !structuralResize && checkpoint.paint.fullScreenClears > 0) {
          violations.push(`${label}: unexpected full-screen clear`);
        }
        if (checkpoint.damageDecision?.reason === "suppressed-redundant-clear" && checkpoint.paint.fullScreenClears > 0) {
          violations.push(`${label}: redundant clear was not suppressed`);
        }
        if (checkpoint.damageDecision?.reason === "transformed") {
          if (checkpoint.paint.scrollUpRows !== checkpoint.damageDecision.shiftRows) {
            violations.push(`${label}: transformed shift disagrees with terminal movement`);
          }
          if (checkpoint.paint.rowClears !== checkpoint.damageDecision.paintedRows.length) {
            violations.push(`${label}: transformed paint cleared undeclared rows`);
          }
          if (JSON.stringify(checkpoint.paint.addressedRowWrites) !== JSON.stringify(checkpoint.damageDecision.paintedRows)) {
            violations.push(`${label}: transformed paint addressed undeclared rows`);
          }
        }
      }
      if (producer.producer !== "bare-a1"
        && producer.checkpoints.some(checkpoint => checkpoint.damageDecision !== undefined)) {
        violations.push(`${matrix.workloadId}/${producer.producer}: comparison producer entered A1 damage path`);
      }
    }
  }
  if (!matrix.comparisonSemanticParity.regular || !matrix.comparisonSemanticParity.fullscreen) {
    violations.push(`${matrix.workloadId}: comparison semantic parity failed`);
  }
  if (matrix.workloadId === "long-transcript-follow") {
    const bare = matrix.fullscreenMode.find(producer => producer.producer === "bare-a1");
    const chunks = bare?.checkpoints.filter(checkpoint => checkpoint.name.includes("long-tail-chunk")) ?? [];
    if (chunks.length === 0) {
      violations.push(`${matrix.workloadId}: missing followed stream checkpoints`);
    }
    for (const checkpoint of chunks) {
      // Rationale: a live transient tail owns rows inside the scroll region. Its spinner frame
      // and the streamed block's boundary markers legitimately change cells during a followed
      // shift, so tail-active frames may use the differential fallback, confined to the
      // transcript region. Tail-free frames must still use bounded regional movement.
      const tailRows = checkpoint.viewport?.transientTailRows ?? 0;
      if (tailRows === 0) {
        if (checkpoint.damageDecision?.reason !== "transformed") {
          violations.push(`${matrix.workloadId}/${checkpoint.name}: tail-free followed prose did not use bounded movement`);
        }
        if (checkpoint.paint.rowClears > 3) {
          violations.push(`${matrix.workloadId}/${checkpoint.name}: tail-free followed prose exceeded three damaged rows`);
        }
        continue;
      }
      const region = checkpoint.viewport?.transcript;
      if (region === null || region === undefined) {
        violations.push(`${matrix.workloadId}/${checkpoint.name}: tail-active frame is missing its transcript region`);
        continue;
      }
      const regionHeight = region.rowEnd - region.rowStart + 1;
      if (checkpoint.paint.rowClears > regionHeight) {
        violations.push(`${matrix.workloadId}/${checkpoint.name}: tail-active fallback cleared more rows than the transcript region`);
      }
      if (checkpoint.paint.addressedRowWrites.some(row => row < region.rowStart || row > region.rowEnd)) {
        violations.push(`${matrix.workloadId}/${checkpoint.name}: tail-active fallback painted outside the transcript region`);
      }
    }
  }
  return { passed: violations.length === 0, violations };
}

export function assertRenderingBudgets(matrix: RenderingMatrixResult): void {
  const result = evaluateRenderingBudgets(matrix);
  if (!result.passed) throw new Error(`rendering stability budget failed:\n${result.violations.join("\n")}`);
}
