import { describe, expect, it } from "vitest";
import {
  NATIVE_SPIKE_EVIDENCE_SCHEMA,
  NATIVE_SPIKE_WORKLOADS,
  assertNativeSpikeEvidence,
  type NativeSpikeEvidence,
  type NativeSpikeMetricSummary,
} from "../../../src/foundation/native-host-protocol/index.js";

function metric(): NativeSpikeMetricSummary {
  return { minimum: 1, p50: 4, p95: 12, maximum: 18, samples: 120 };
}

function evidence(overrides: Partial<NativeSpikeEvidence> = {}): NativeSpikeEvidence {
  return {
    schema: NATIVE_SPIKE_EVIDENCE_SCHEMA,
    artifact: { path: "artifacts/native/addone-host.exe", sha256: "a".repeat(64), sizeBytes: 10_000_000 },
    source: {
      addoneCommit: "b".repeat(40),
      libghosttyVtCommit: "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3",
      portablePtyVersion: "0.9.0",
      crosstermVersion: "0.29.0",
    },
    environment: {
      platform: "windows",
      architecture: "x64",
      osRelease: "10.0.26200",
      zig: "0.15.2",
      isolatedWorker: true,
    },
    workloads: NATIVE_SPIKE_WORKLOADS.map(id => ({ id, status: "passed", durationMs: 1_000, details: { workload: id } })),
    latency: { inputToProcessMs: metric(), outputToPresentMs: metric() },
    paint: { requestedFrames: 240, presentedFrames: 240, coalescedFrames: 12, missedFrames: 0, resizePaintGaps: 0 },
    resources: { cpuPercentMaximum: 45, residentMemoryBytesMaximum: 512_000_000, gpuMemoryBytesMaximum: 128_000_000 },
    physical: { method: "not-run", activeWorkstationAutomation: false, verdict: "pending", evidenceReference: null },
    summary: { technical: "passed", overall: "pending" },
    ...overrides,
  };
}

describe("native 2x2 spike evidence schema", () => {
  it("accepts a complete technically passing pending-physical proof record", () => {
    expect(() => assertNativeSpikeEvidence(evidence())).not.toThrow();
    expect(NATIVE_SPIKE_WORKLOADS).toContain("four-concurrent-sessions");
    expect(NATIVE_SPIKE_WORKLOADS).toContain("ime");
    expect(NATIVE_SPIKE_WORKLOADS).toContain("host-cleanup");
  });

  it("rejects incomplete and duplicate workload sets", () => {
    const missing = evidence();
    (missing.workloads as NativeSpikeEvidence["workloads"][number][]).pop();
    expect(() => assertNativeSpikeEvidence({ ...missing, summary: { technical: "incomplete", overall: "pending" } })).toThrow(/missing one or more/);
    (missing.workloads[0] as { id: string }).id = missing.workloads[1]!.id;
    expect(() => assertNativeSpikeEvidence({ ...missing, summary: { technical: "incomplete", overall: "pending" } })).toThrow(/duplicate native spike workload/);
  });

  it("rejects contradictory technical and physical summaries", () => {
    const failedWorkloads = NATIVE_SPIKE_WORKLOADS.map(id => ({ id, status: id === "ime" ? "failed" as const : "passed" as const, durationMs: 1, details: {} }));
    expect(() => assertNativeSpikeEvidence(evidence({ workloads: failedWorkloads, summary: { technical: "passed", overall: "pending" } }))).toThrow(/technical summary must be failed/);
    expect(() => assertNativeSpikeEvidence(evidence({ summary: { technical: "passed", overall: "accepted" } }))).toThrow(/overall native spike acceptance/);
    expect(() => assertNativeSpikeEvidence(evidence({ physical: { method: "not-run", activeWorkstationAutomation: false, verdict: "accepted", evidenceReference: "proof.md" } }))).toThrow(/physical acceptance/);
  });

  it("rejects active-workstation automation and non-isolated evidence", () => {
    expect(() => assertNativeSpikeEvidence(evidence({ physical: { method: "manual", activeWorkstationAutomation: true as false, verdict: "accepted", evidenceReference: "proof.md" }, summary: { technical: "passed", overall: "accepted" } }))).toThrow(/active-workstation automation/);
    expect(() => assertNativeSpikeEvidence(evidence({ environment: { ...evidence().environment, isolatedWorker: false } }))).toThrow(/isolated worker/);
  });

  it("rejects wrong source pins, malformed hashes, invalid toolchains, and unordered latency metrics", () => {
    expect(() => assertNativeSpikeEvidence(evidence({ artifact: { ...evidence().artifact, sha256: "not-a-hash" } }))).toThrow(/SHA-256/);
    expect(() => assertNativeSpikeEvidence(evidence({ source: { ...evidence().source, libghosttyVtCommit: "c".repeat(40) } }))).toThrow(/pinned provenance/);
    expect(() => assertNativeSpikeEvidence(evidence({ environment: { ...evidence().environment, zig: "0.15.1" } }))).toThrow(/0\.15\.2/);
    expect(() => assertNativeSpikeEvidence(evidence({ latency: { inputToProcessMs: { minimum: 10, p50: 4, p95: 3, maximum: 2, samples: 10 }, outputToPresentMs: metric() } }))).toThrow(/ordered/);
  });

  it("rejects impossible paint diagnostics and hot-path payload fields", () => {
    expect(() => assertNativeSpikeEvidence(evidence({ paint: { requestedFrames: 10, presentedFrames: 11, coalescedFrames: 0, missedFrames: 0, resizePaintGaps: 0 } }))).toThrow(/presented frames/);
    const withPayload = evidence();
    (withPayload.workloads[0]!.details as Record<string, unknown>)["terminal" + "Bytes"] = "forbidden";
    expect(() => assertNativeSpikeEvidence(withPayload)).toThrow(/hot-path payload field/);
  });
});
