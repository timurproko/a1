export const NATIVE_SPIKE_EVIDENCE_SCHEMA = "addone-native-host-spike-evidence-v1" as const;
export const NATIVE_SPIKE_WORKLOADS = [
  "four-concurrent-sessions",
  "input-routing",
  "unicode-cursor-modes",
  "alternate-screen",
  "paste",
  "mouse",
  "ime",
  "live-resize",
  "dpi",
  "high-rate-output",
  "pane-abnormal-exit",
  "host-cleanup",
] as const;
export type NativeSpikeWorkloadId = typeof NATIVE_SPIKE_WORKLOADS[number];

export interface NativeSpikeMetricSummary {
  readonly minimum: number;
  readonly p50: number;
  readonly p95: number;
  readonly maximum: number;
  readonly samples: number;
}

export interface NativeSpikePaintDiagnostics {
  readonly requestedFrames: number;
  readonly presentedFrames: number;
  readonly coalescedFrames: number;
  readonly missedFrames: number;
  readonly resizePaintGaps: number;
}

export interface NativeSpikeResourceObservation {
  readonly cpuPercentMaximum: number;
  readonly residentMemoryBytesMaximum: number;
  readonly gpuMemoryBytesMaximum: number | null;
}

export interface NativeSpikeWorkloadResult {
  readonly id: NativeSpikeWorkloadId;
  readonly status: "passed" | "failed" | "not-run";
  readonly durationMs: number;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface NativeSpikeEvidence {
  readonly schema: typeof NATIVE_SPIKE_EVIDENCE_SCHEMA;
  readonly artifact: {
    readonly path: string;
    readonly sha256: string;
    readonly sizeBytes: number;
  };
  readonly source: {
    readonly addoneCommit: string;
    readonly libghosttyVtCommit: string;
    readonly portablePtyVersion: string;
    readonly crosstermVersion: string;
  };
  readonly environment: {
    readonly platform: "windows";
    readonly architecture: "x64" | "arm64";
    readonly osRelease: string;
    readonly zig: string;
    readonly isolatedWorker: boolean;
  };
  readonly workloads: readonly NativeSpikeWorkloadResult[];
  readonly latency: {
    readonly inputToProcessMs: NativeSpikeMetricSummary;
    readonly outputToPresentMs: NativeSpikeMetricSummary;
  };
  readonly paint: NativeSpikePaintDiagnostics;
  readonly resources: NativeSpikeResourceObservation;
  readonly physical: {
    readonly method: "not-run" | "manual" | "isolated-worker";
    readonly activeWorkstationAutomation: false;
    readonly verdict: "pending" | "accepted" | "rejected";
    readonly evidenceReference: string | null;
  };
  readonly summary: {
    readonly technical: "passed" | "failed" | "incomplete";
    readonly overall: "pending" | "accepted" | "rejected";
  };
}

const EXPECTED_LIBGHOSTTY_VT = "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3";
const EXPECTED_PORTABLE_PTY = "0.9.0";
const EXPECTED_CROSSTERM = "0.29.0";
const FORBIDDEN_EVIDENCE_KEYS = new Set([
  "pty" + "Bytes",
  "terminal" + "Bytes",
  "terminal" + "Output",
  "input" + "Bytes",
  "rendered" + "Cells",
  "cell" + "Grid",
  "screen" + "Buffer",
  "ansi" + "Stream",
  "raw" + "Terminal",
]);

export function assertNativeSpikeEvidence(value: NativeSpikeEvidence): void {
  if (value.schema !== NATIVE_SPIKE_EVIDENCE_SCHEMA) throw new TypeError("native spike evidence schema is invalid");
  if (!/^[a-f0-9]{64}$/.test(value.artifact.sha256)) throw new TypeError("native spike artifact hash must be SHA-256");
  if (!Number.isSafeInteger(value.artifact.sizeBytes) || value.artifact.sizeBytes <= 0) throw new RangeError("native spike artifact size is invalid");
  if (!/^[a-f0-9]{40}$/.test(value.source.addoneCommit)) throw new TypeError("native spike AddOne commit is invalid");
  if (value.source.libghosttyVtCommit !== EXPECTED_LIBGHOSTTY_VT ||
      value.source.portablePtyVersion !== EXPECTED_PORTABLE_PTY ||
      value.source.crosstermVersion !== EXPECTED_CROSSTERM) {
    throw new TypeError("native spike terminal-core sources do not match the pinned provenance");
  }
  if (value.environment.platform !== "windows") throw new TypeError("native spike evidence must identify Windows");
  if (!["x64", "arm64"].includes(value.environment.architecture)) throw new TypeError("native spike architecture is invalid");
  if (!/^0\.15\.(?:[2-9]|[1-9][0-9])$/.test(value.environment.zig)) throw new TypeError("native spike Zig version must be 0.15.2 or newer");
  if (value.environment.isolatedWorker !== true) throw new TypeError("native spike evidence requires an isolated worker");

  const expected = new Set<string>(NATIVE_SPIKE_WORKLOADS);
  const seen = new Set<string>();
  for (const workload of value.workloads) {
    if (!expected.has(workload.id)) throw new TypeError(`unknown native spike workload: ${String(workload.id)}`);
    if (seen.has(workload.id)) throw new TypeError(`duplicate native spike workload: ${workload.id}`);
    seen.add(workload.id);
    if (!["passed", "failed", "not-run"].includes(workload.status)) throw new TypeError("native spike workload status is invalid");
    assertNonNegative(workload.durationMs, "native spike workload duration");
    assertJsonObject(workload.details, "native spike workload details");
  }
  if (seen.size !== expected.size) throw new TypeError("native spike evidence is missing one or more mandatory workloads");

  assertMetric(value.latency.inputToProcessMs, "input-to-process latency");
  assertMetric(value.latency.outputToPresentMs, "output-to-present latency");
  assertNonNegative(value.paint.requestedFrames, "requested frames");
  assertNonNegative(value.paint.presentedFrames, "presented frames");
  assertNonNegative(value.paint.coalescedFrames, "coalesced frames");
  assertNonNegative(value.paint.missedFrames, "missed frames");
  assertNonNegative(value.paint.resizePaintGaps, "resize paint gaps");
  if (value.paint.presentedFrames > value.paint.requestedFrames) throw new RangeError("presented frames cannot exceed requested frames");
  if (value.paint.missedFrames > value.paint.requestedFrames) throw new RangeError("missed frames cannot exceed requested frames");
  assertNonNegative(value.resources.cpuPercentMaximum, "maximum CPU observation");
  assertNonNegative(value.resources.residentMemoryBytesMaximum, "maximum resident memory observation");
  if (value.resources.gpuMemoryBytesMaximum !== null) assertNonNegative(value.resources.gpuMemoryBytesMaximum, "maximum GPU memory observation");

  if (value.physical.activeWorkstationAutomation !== false) throw new TypeError("active-workstation automation is forbidden");
  if (!["not-run", "manual", "isolated-worker"].includes(value.physical.method)) throw new TypeError("native spike physical method is invalid");
  if (!["pending", "accepted", "rejected"].includes(value.physical.verdict)) throw new TypeError("native spike physical verdict is invalid");
  if (value.physical.verdict === "accepted" && value.physical.method === "not-run") throw new TypeError("physical acceptance requires manual or isolated-worker evidence");
  if (value.physical.verdict !== "pending" && !value.physical.evidenceReference) throw new TypeError("non-pending physical verdict requires evidence reference");

  const failed = value.workloads.some(workload => workload.status === "failed");
  const incomplete = value.workloads.some(workload => workload.status === "not-run");
  const expectedTechnical = failed ? "failed" : incomplete ? "incomplete" : "passed";
  if (value.summary.technical !== expectedTechnical) throw new TypeError(`native spike technical summary must be ${expectedTechnical}`);
  if (value.summary.overall === "accepted" && (expectedTechnical !== "passed" || value.physical.verdict !== "accepted")) {
    throw new TypeError("overall native spike acceptance requires technical and physical acceptance");
  }
  if (value.summary.overall === "rejected" && !failed && value.physical.verdict !== "rejected") {
    throw new TypeError("overall native spike rejection requires a failed workload or physical rejection");
  }
  assertNoForbiddenEvidenceKeys(value);
}

function assertMetric(metric: NativeSpikeMetricSummary, name: string): void {
  assertNonNegative(metric.minimum, `${name} minimum`);
  assertNonNegative(metric.p50, `${name} p50`);
  assertNonNegative(metric.p95, `${name} p95`);
  assertNonNegative(metric.maximum, `${name} maximum`);
  if (!Number.isSafeInteger(metric.samples) || metric.samples <= 0) throw new RangeError(`${name} sample count is invalid`);
  if (!(metric.minimum <= metric.p50 && metric.p50 <= metric.p95 && metric.p95 <= metric.maximum)) {
    throw new RangeError(`${name} measurements must be ordered`);
  }
}

function assertNoForbiddenEvidenceKeys(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) assertNoForbiddenEvidenceKeys(item);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_EVIDENCE_KEYS.has(key)) throw new TypeError(`native spike evidence may not contain hot-path payload field ${key}`);
    assertNoForbiddenEvidenceKeys(item);
  }
}

function assertNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a non-negative finite number`);
}

function assertJsonObject(value: Readonly<Record<string, unknown>>, name: string): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  const encoded = JSON.stringify(value);
  if (!encoded || encoded.length > 64_000) throw new RangeError(`${name} exceeds the bounded evidence detail limit`);
}
