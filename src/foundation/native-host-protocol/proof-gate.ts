import { assertNativeSpikeEvidence, type NativeSpikeEvidence } from "./evidence.js";

export const NATIVE_SPIKE_ACCEPTANCE_LIMITS = Object.freeze({
  inputToProcessP95Ms: 16,
  outputToPresentP95Ms: 33,
  missedFrames: 0,
  resizePaintGaps: 0,
});

export interface NativeSpikeGateDecision {
  readonly decision: "go" | "stop";
  readonly integrationAllowed: boolean;
  readonly reasons: readonly string[];
}

export function evaluateNativeSpikeGate(evidence: NativeSpikeEvidence): NativeSpikeGateDecision {
  assertNativeSpikeEvidence(evidence);
  const reasons: string[] = [];
  if (evidence.summary.technical !== "passed") reasons.push(`technical proof is ${evidence.summary.technical}`);
  if (evidence.physical.verdict !== "accepted") reasons.push(`physical verdict is ${evidence.physical.verdict}`);
  if (evidence.physical.method === "not-run") reasons.push("manual or isolated-worker physical evidence has not run");
  if (evidence.summary.overall !== "accepted") reasons.push(`overall proof summary is ${evidence.summary.overall}`);
  if (evidence.latency.inputToProcessMs.p95 > NATIVE_SPIKE_ACCEPTANCE_LIMITS.inputToProcessP95Ms) {
    reasons.push(`input p95 exceeds ${NATIVE_SPIKE_ACCEPTANCE_LIMITS.inputToProcessP95Ms} ms`);
  }
  if (evidence.latency.outputToPresentMs.p95 > NATIVE_SPIKE_ACCEPTANCE_LIMITS.outputToPresentP95Ms) {
    reasons.push(`output presentation p95 exceeds ${NATIVE_SPIKE_ACCEPTANCE_LIMITS.outputToPresentP95Ms} ms`);
  }
  if (evidence.paint.missedFrames > NATIVE_SPIKE_ACCEPTANCE_LIMITS.missedFrames) reasons.push("missed frames are present");
  if (evidence.paint.resizePaintGaps > NATIVE_SPIKE_ACCEPTANCE_LIMITS.resizePaintGaps) reasons.push("resize paint gaps are present");
  if (reasons.length > 0) {
    return Object.freeze({ decision: "stop", integrationAllowed: false, reasons: Object.freeze(reasons) });
  }
  return Object.freeze({ decision: "go", integrationAllowed: true, reasons: Object.freeze(["technical and physical proof accepted"]) });
}
