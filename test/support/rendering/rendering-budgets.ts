import type { RenderingMatrixResult } from "./rendering-matrix.js";

export interface RenderingBudgetResult {
  readonly passed: boolean;
  readonly violations: readonly string[];
}

// Invariant: candidate text has no authority to disable a proven source-row shift.
// Physical host-hover acceptance remains separate from these deterministic paint budgets.
const BOUNDED_MOVEMENT_WORKLOADS = new Set(["streamed-code-block", "link-bearing-prose", "tall-live-tail"]);

const LINK_BLOCKED_REASONS = new Set(["unsafe-terminal-content", "hyperlink-cleanup", "pending-hyperlink-cleanup"]);
const FINAL_VISIBLE_MARKERS: Readonly<Record<string, string>> = {
  "streamed-code-block": "config.json once.",
  "link-bearing-prose": "wrapped row.",
  "tall-live-tail": "step six",
};

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
  if (BOUNDED_MOVEMENT_WORKLOADS.has(matrix.workloadId)) {
    if (matrix.synchronizedReplayParity !== true) {
      violations.push(`${matrix.workloadId}: missing or divergent synchronized/unsynchronized replay`);
    }
    const bare = matrix.fullscreenMode.find(producer => producer.producer === "bare-a1");
    if (bare === undefined || bare.checkpoints.length === 0) {
      violations.push(`${matrix.workloadId}: missing bare-A1 fullscreen checkpoints`);
    }
    const final = bare?.checkpoints.at(-1);
    if (final === undefined || !final.name.endsWith("-settled")
      || !final.cellFrame.rows.join(" ").replace(/\s+/gu, " ").includes(FINAL_VISIBLE_MARKERS[matrix.workloadId]!)) {
      violations.push(`${matrix.workloadId}: stale or missing settled content`);
    }
    for (const checkpoint of bare?.checkpoints ?? []) {
      const label = `${matrix.workloadId}/${checkpoint.name}`;
      const decision = checkpoint.damageDecision;
      if (decision !== undefined && LINK_BLOCKED_REASONS.has(decision.reason)) {
        violations.push(`${label}: link-resembling text blocked bounded painting (${decision.reason})`);
      }
      if (checkpoint.viewport?.safeVerticalShift !== true) continue;
      if (decision?.reason !== "transformed") {
        violations.push(`${label}: proven safe shift did not use bounded movement (${decision?.reason ?? "none"})`);
        continue;
      }
      const region = checkpoint.viewport.transcript;
      if (region === null || region === undefined) {
        violations.push(`${label}: transformed frame is missing its transcript region`);
        continue;
      }
      const transcriptPaints = decision.paintedRows
        .filter(row => row >= region.rowStart && row <= region.rowEnd).length;
      const allowed = decision.shiftRows + Math.max(1, checkpoint.viewport.liveTailRows ?? 1) + 1;
      if (transcriptPaints > allowed) {
        violations.push(`${label}: painted ${transcriptPaints} transcript rows beyond the live-tail allowance of ${allowed}`);
      }
      // Invariant: a generous live-tail count does not authorize repaint of settled rows.
      // Exposed rows, the live/transient suffix, and the sticky first row are separate damage.
      const suffix = Math.max(decision.shiftRows,
        (checkpoint.viewport.liveTailRows ?? 0) + checkpoint.viewport.transientTailRows);
      if (decision.paintedRows.some(row => row > region.rowStart && row <= region.rowEnd - suffix)) {
        violations.push(`${label}: repainted a stable settled row outside the live tail`);
      }
    }
  }
  if (matrix.workloadId === "long-transcript-follow") {
    const bare = matrix.fullscreenMode.find(producer => producer.producer === "bare-a1");
    const chunks = bare?.checkpoints.filter(checkpoint => checkpoint.name.includes("long-tail-chunk")) ?? [];
    if (chunks.length === 0) {
      violations.push(`${matrix.workloadId}: missing followed stream checkpoints`);
    }
    for (const checkpoint of chunks) {
      // Rationale: non-selectable transient rows (pending Steering, fitting alignment, and
      // live status) occupy the scroll region. Spinner frames and streamed block boundaries
      // legitimately change cells during a followed shift, so transient-active frames may use
      // the differential fallback confined to that region. Tail-free frames still require
      // bounded regional movement.
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
