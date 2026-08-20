import { describe, expect, it } from "vitest";
import {
  NATIVE_SPIKE_ACCEPTANCE_LIMITS,
  NATIVE_SPIKE_EVIDENCE_SCHEMA,
  NATIVE_SPIKE_WORKLOADS,
  evaluateNativeSpikeGate,
  type NativeSpikeEvidence,
} from "../../../src/foundation/native-host-protocol/index.js";

function metric(p95: number) {
  return { minimum: 1, p50: 4, p95, maximum: Math.max(p95, 20), samples: 120 };
}

function evidence(overrides: Partial<NativeSpikeEvidence> = {}): NativeSpikeEvidence {
  return {
    schema: NATIVE_SPIKE_EVIDENCE_SCHEMA,
    artifact: { path: "artifacts/native/a1-host.exe", sha256: "a".repeat(64), sizeBytes: 10_000_000 },
    source: {
      a1Commit: "b".repeat(40),
      libghosttyVtCommit: "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3",
      portablePtyVersion: "0.9.0",
      crosstermVersion: "0.29.0",
    },
    environment: { platform: "windows", architecture: "x64", osRelease: "10.0.26200", zig: "0.15.2", isolatedWorker: true },
    workloads: NATIVE_SPIKE_WORKLOADS.map(id => ({ id, status: "passed", durationMs: 100, details: {} })),
    latency: { inputToProcessMs: metric(8), outputToPresentMs: metric(16) },
    paint: { requestedFrames: 240, presentedFrames: 240, coalescedFrames: 12, missedFrames: 0, resizePaintGaps: 0 },
    resources: { cpuPercentMaximum: 45, residentMemoryBytesMaximum: 512_000_000, gpuMemoryBytesMaximum: 128_000_000 },
    physical: { method: "manual", activeWorkstationAutomation: false, verdict: "accepted", evidenceReference: "manual-proof.md" },
    summary: { technical: "passed", overall: "accepted" },
    ...overrides,
  };
}

describe("native 2x2 stop/go proof gate", () => {
  it("permits integration only after technical and physical acceptance within thresholds", () => {
    expect(evaluateNativeSpikeGate(evidence())).toEqual({
      decision: "go",
      integrationAllowed: true,
      reasons: ["technical and physical proof accepted"],
    });
    expect(NATIVE_SPIKE_ACCEPTANCE_LIMITS).toEqual({ inputToProcessP95Ms: 16, outputToPresentP95Ms: 33, missedFrames: 0, resizePaintGaps: 0 });
  });

  it("stops while physical acceptance is pending", () => {
    const result = evaluateNativeSpikeGate(evidence({
      physical: { method: "not-run", activeWorkstationAutomation: false, verdict: "pending", evidenceReference: null },
      summary: { technical: "passed", overall: "pending" },
    }));
    expect(result.decision).toBe("stop");
    expect(result.integrationAllowed).toBe(false);
    expect(result.reasons).toContain("physical verdict is pending");
  });

  it("stops on failed workloads even when a record tries to request acceptance", () => {
    const failed = evidence({
      workloads: NATIVE_SPIKE_WORKLOADS.map(id => ({ id, status: id === "four-concurrent-sessions" ? "failed" as const : "passed" as const, durationMs: 100, details: {} })),
      summary: { technical: "failed", overall: "rejected" },
    });
    const result = evaluateNativeSpikeGate(failed);
    expect(result.decision).toBe("stop");
    expect(result.reasons).toContain("technical proof is failed");
  });

  it("stops on latency, missed-frame, or resize paint-gap thresholds", () => {
    const latency = evaluateNativeSpikeGate(evidence({ latency: { inputToProcessMs: metric(17), outputToPresentMs: metric(16) } }));
    expect(latency.decision).toBe("stop");
    expect(latency.reasons).toContain("input p95 exceeds 16 ms");
    const paint = evaluateNativeSpikeGate(evidence({ paint: { requestedFrames: 240, presentedFrames: 239, coalescedFrames: 12, missedFrames: 1, resizePaintGaps: 1 } }));
    expect(paint.decision).toBe("stop");
    expect(paint.reasons).toContain("missed frames are present");
    expect(paint.reasons).toContain("resize paint gaps are present");
  });

  it("rejects active-workstation automation instead of converting it to a waiver", () => {
    expect(() => evaluateNativeSpikeGate(evidence({
      physical: { method: "manual", activeWorkstationAutomation: true as false, verdict: "accepted", evidenceReference: "invalid.md" },
    }))).toThrow(/active-workstation automation/);
  });
});
