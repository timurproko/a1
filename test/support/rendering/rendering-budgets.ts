import type { RenderingMatrixCheckpoint, RenderingMatrixResult } from "./rendering-matrix.js";

export interface RenderingBudgetResult {
  readonly passed: boolean;
  readonly violations: readonly string[];
}

// Rationale: `streamed-code-block` and `link-bearing-prose` capture evidence but cannot be
// budgeted yet. Their content is link-resembling text, which the accepted hyperlink-cleanup
// contract still treats as movement-unsafe; relaxing that needs physical Windows Terminal
// acceptance, so only the link-free tall live tail asserts bounded movement here.
const BOUNDED_MOVEMENT_WORKLOADS = new Set(["tall-live-tail"]);

const LINK_BLOCKED_REASONS = new Set(["unsafe-terminal-content", "hyperlink-cleanup", "pending-hyperlink-cleanup"]);

// Rationale: these two workloads reproduce the reported code-block symptom. Their mid-stream
// full-screen clears are hyperlink-cleanup frames the accepted contract still requires, so they
// are recorded rather than asserted until that contract is revisited with physical acceptance.
const CLEANUP_CLEAR_EVIDENCE_WORKLOADS = new Set(["streamed-code-block", "link-bearing-prose"]);

/** Evaluates logical damage rather than a terminal- or color-specific byte threshold. */
export function evaluateRenderingBudgets(matrix: RenderingMatrixResult): RenderingBudgetResult {
  const violations: string[] = [];
  for (const mode of [matrix.defaultMode, matrix.fullscreenMode]) {
    for (const producer of mode) {
      let nextWriteIndex = 0;
      for (const checkpoint of producer.checkpoints) {
        const label = `${matrix.workloadId}/${producer.producer}/${producer.requestedMode}/${checkpoint.name}`;
        if (!checkpoint.paint.synchronizedUpdates.balanced) violations.push(`${label}: unbalanced synchronized output`);
        if (checkpoint.cellFrame.rows.length === 0) violations.push(`${label}: missing cell frame`);
        if (checkpoint.name !== "initial" && checkpoint.cellFrame.rows.every(row => row.length === 0)) {
          violations.push(`${label}: blank final cell frame`);
        }
        const structuralResize = checkpoint.name.includes("resize-structural");
        if (producer.producer === "bare-a1") {
          if (!hasCompleteWriteEvidence(checkpoint, nextWriteIndex)) {
            violations.push(`${label}: missing or inconsistent per-write paint evidence`);
          }
          for (const write of checkpoint.writePaints ?? []) {
            const writeLabel = `${label}/write-${write.writeIndex}`;
            const cleanupEvidence = CLEANUP_CLEAR_EVIDENCE_WORKLOADS.has(matrix.workloadId)
              && write.damageDecision?.reason === "hyperlink-cleanup";
            if (checkpoint.name !== "initial" && !structuralResize && !cleanupEvidence && write.paint.fullScreenClears > 0) {
              violations.push(`${writeLabel}: unexpected full-screen clear`);
            }
            if (write.damageDecision?.reason === "suppressed-redundant-clear" && write.paint.fullScreenClears > 0) {
              violations.push(`${writeLabel}: redundant clear was not suppressed`);
            }
            if (write.damageDecision?.reason === "transformed") {
              if (write.paint.scrollUpRows !== write.damageDecision.shiftRows) {
                violations.push(`${writeLabel}: transformed shift disagrees with terminal movement`);
              }
              if (write.paint.rowClears !== write.damageDecision.paintedRows.length) {
                violations.push(`${writeLabel}: transformed paint cleared undeclared rows`);
              }
              if (JSON.stringify(write.paint.addressedRowWrites) !== JSON.stringify(write.damageDecision.paintedRows)) {
                violations.push(`${writeLabel}: transformed paint addressed undeclared rows`);
              }
            }
          }
        }
        nextWriteIndex += checkpoint.paint.writes;
      }
      if (producer.producer !== "bare-a1"
        && producer.checkpoints.some(checkpoint => checkpoint.damageDecision !== undefined
          || checkpoint.writePaints?.some(write => write.damageDecision !== undefined))) {
        violations.push(`${matrix.workloadId}/${producer.producer}: comparison producer entered A1 damage path`);
      }
    }
  }
  if (!matrix.comparisonSemanticParity.regular || !matrix.comparisonSemanticParity.fullscreen) {
    violations.push(`${matrix.workloadId}: comparison semantic parity failed`);
  }
  if (BOUNDED_MOVEMENT_WORKLOADS.has(matrix.workloadId)) {
    const bare = matrix.fullscreenMode.find(producer => producer.producer === "bare-a1");
    if (bare === undefined || bare.checkpoints.length === 0) {
      violations.push(`${matrix.workloadId}: missing bare-A1 fullscreen checkpoints`);
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

function hasCompleteWriteEvidence(checkpoint: RenderingMatrixCheckpoint, firstWrite: number): boolean {
  const writes = checkpoint.writePaints;
  if (writes === undefined || writes.length !== checkpoint.paint.writes
    || writes.some((write, offset) => write.writeIndex !== firstWrite + offset || write.paint.writes !== 1)) return false;
  // Invariant: omissions or altered aggregate counts must fail, not hide an unclassified clear.
  const totals = ["bytes", "frames", "fullScreenClears", "rowClears", "scrollUpRows", "scrollDownRows"] as const;
  return totals.every(key => writes.reduce((sum, write) => sum + write.paint[key], 0) === checkpoint.paint[key])
    && ["begins", "ends"].every(key => {
      const field = key as "begins" | "ends";
      return writes.reduce((sum, write) => sum + write.paint.synchronizedUpdates[field], 0) === checkpoint.paint.synchronizedUpdates[field];
    })
    && JSON.stringify(writes.flatMap(write => write.paint.addressedRowWrites)) === JSON.stringify(checkpoint.paint.addressedRowWrites);
}

export function assertRenderingBudgets(matrix: RenderingMatrixResult): void {
  const result = evaluateRenderingBudgets(matrix);
  if (!result.passed) throw new Error(`rendering stability budget failed:\n${result.violations.join("\n")}`);
}
