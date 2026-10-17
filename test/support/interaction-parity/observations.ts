import { createHash } from "node:crypto";
import { type InteractionCase, LATENCY_BUDGETS_MS, type ObservationKind, type ResidentDifference } from "./matrix.js";

export type Candidate = "direct" | "resident";

/**
 * One content-free semantic observation. Content travels only as a digest and a length; the
 * detail map carries identities and coordinates, never prompt, transcript, or clipboard text.
 */
export interface Observation {
  readonly caseId: string;
  readonly candidate: Candidate;
  readonly platform: string;
  readonly kind: ObservationKind;
  /** Position within the case's observations of this kind, starting at 1. */
  readonly seq: number;
  /** When the causing input was sent, in milliseconds on the recorder's monotonic clock. */
  readonly sentAt: number;
  /** When the effect was observed on the same clock. */
  readonly observedAt: number;
  readonly digest: string;
  readonly length: number;
  readonly detail?: Readonly<Record<string, string | number | boolean>>;
}

export type FaultReason = "duplicate" | "stale" | "negative" | "missing" | "completion-only" | "non-normalizable" | "content";

export interface ObservationFault {
  readonly caseId: string;
  readonly candidate?: Candidate;
  readonly kind?: ObservationKind;
  readonly seq?: number;
  readonly reason: FaultReason;
}

const CONTENT_FIELDS = new Set(["text", "prompt", "clipboard", "payload", "content", "transcript", "selectionText"]);

/** The digest observations carry instead of content. */
export function digestContent(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Resident coordinates lose exactly the strip row; anything on row 0 belongs to the host and cannot normalize. */
export function normalizeResident(observation: Observation): Observation | null {
  if (observation.candidate !== "resident" || observation.detail === undefined) return observation;
  const row = observation.detail["row"];
  if (typeof row !== "number") return observation;
  if (row < 1) return null;
  return { ...observation, detail: { ...observation.detail, row: row - 1 } };
}

/**
 * Rejects observation sets that could hide a divergence: duplicates, effects observed before their
 * input, out-of-order sends, kinds a case expects but never saw, streams that report only a final
 * sample, resident coordinates that cannot drop the strip row, and any detail that smuggles content.
 */
export function validateObservations(observations: readonly Observation[], cases: readonly InteractionCase[]): ObservationFault[] {
  const faults: ObservationFault[] = [];
  const seen = new Set<string>();
  const lastSent = new Map<string, number>();
  for (const observation of observations) {
    const key = `${observation.caseId}\u0000${observation.candidate}\u0000${observation.kind}\u0000${observation.seq}`;
    const fault = (reason: FaultReason) => faults.push({ caseId: observation.caseId, candidate: observation.candidate, kind: observation.kind, seq: observation.seq, reason });
    if (seen.has(key)) fault("duplicate");
    seen.add(key);
    if (observation.observedAt < observation.sentAt) fault("stale");
    const order = `${observation.caseId}\u0000${observation.candidate}\u0000${observation.kind}`;
    const previous = lastSent.get(order);
    if (previous !== undefined && observation.sentAt < previous) fault("negative");
    lastSent.set(order, observation.sentAt);
    if (observation.candidate === "resident" && normalizeResident(observation) === null) fault("non-normalizable");
    if (observation.detail && Object.keys(observation.detail).some(field => CONTENT_FIELDS.has(field))) fault("content");
    if (!/^[0-9a-f]{64}$/u.test(observation.digest) || observation.length < 0) fault("content");
  }
  for (const entry of cases) {
    for (const candidate of ["direct", "resident"] as const) {
      const own = observations.filter(observation => observation.caseId === entry.id && observation.candidate === candidate);
      if (own.length === 0) continue;
      for (const kind of entry.expects) {
        const samples = own.filter(observation => observation.kind === kind);
        if (samples.length === 0) { faults.push({ caseId: entry.id, candidate, kind, reason: "missing" }); continue; }
        if (kind === "stream" && samples.length === 1 && samples[0]!.detail?.["final"] === true) {
          faults.push({ caseId: entry.id, candidate, kind, seq: samples[0]!.seq, reason: "completion-only" });
        }
      }
    }
  }
  return faults;
}

export interface Divergence {
  readonly caseId: string;
  readonly kind: ObservationKind;
  readonly seq: number;
  readonly field: string;
  readonly direct: string | number | boolean | null;
  readonly resident: string | number | boolean | null;
}

export interface ParityVerdict {
  readonly platform: string;
  readonly passed: boolean;
  readonly compared: number;
  readonly divergences: readonly Divergence[];
  /** Declared resident-only differences that explained an otherwise divergent observation. */
  readonly declared: readonly { readonly caseId: string; readonly difference: ResidentDifference }[];
}

/** Which observation fields a declared difference is allowed to change. */
const TOLERATED: Readonly<Record<ResidentDifference, readonly string[]>> = Object.freeze({
  "tab-strip-row": ["row", "rows"],
  "detach-instead-of-exit": ["action", "digest", "length"],
  "session-name-hidden": ["digest", "length"],
  "image-text-fallback": ["digest", "length"],
  "process-residency": ["latency"],
});

/**
 * Compares direct and resident observations by case, kind, and sequence. Digest, length, and
 * every detail field must match after normalization, each kind's latency must fit its budget,
 * and only a case's declared difference may excuse a mismatch.
 */
export function compareCandidates(observations: readonly Observation[], cases: readonly InteractionCase[], platform: string): ParityVerdict {
  const divergences: Divergence[] = [];
  const declared: { caseId: string; difference: ResidentDifference }[] = [];
  let compared = 0;
  const byKey = (candidate: Candidate) => new Map(observations
    .filter(observation => observation.candidate === candidate && observation.platform === platform)
    .map(observation => [`${observation.caseId}\u0000${observation.kind}\u0000${observation.seq}`, observation] as const));
  const direct = byKey("direct");
  const resident = byKey("resident");
  for (const entry of cases) {
    const tolerated = new Set(entry.residentDifference === undefined ? [] : TOLERATED[entry.residentDifference]);
    let usedDeclared = false;
    const note = (kind: ObservationKind, seq: number, field: string, left: Divergence["direct"], right: Divergence["resident"]) => {
      if (tolerated.has(field)) { usedDeclared = true; return; }
      divergences.push({ caseId: entry.id, kind, seq, field, direct: left, resident: right });
    };
    for (const [key, left] of direct) {
      if (!key.startsWith(`${entry.id}\u0000`)) continue;
      const rightRaw = resident.get(key);
      if (rightRaw === undefined) { note(left.kind, left.seq, "presence", "observed", null); continue; }
      const right = normalizeResident(rightRaw);
      if (right === null) { note(left.kind, left.seq, "row", left.detail?.["row"] ?? null, rightRaw.detail?.["row"] ?? null); continue; }
      compared++;
      if (left.digest !== right.digest) note(left.kind, left.seq, "digest", left.digest, right.digest);
      if (left.length !== right.length) note(left.kind, left.seq, "length", left.length, right.length);
      const fields = new Set([...Object.keys(left.detail ?? {}), ...Object.keys(right.detail ?? {})]);
      for (const field of fields) {
        const l = left.detail?.[field] ?? null; const r = right.detail?.[field] ?? null;
        if (l !== r) note(left.kind, left.seq, field, l, r);
      }
      const latency = right.observedAt - right.sentAt;
      if (latency > LATENCY_BUDGETS_MS[right.kind]) note(right.kind, right.seq, "latency", left.observedAt - left.sentAt, latency);
    }
    for (const key of resident.keys()) {
      if (key.startsWith(`${entry.id}\u0000`) && !direct.has(key)) {
        const extra = resident.get(key)!;
        note(extra.kind, extra.seq, "presence", null, "observed");
      }
    }
    if (usedDeclared && entry.residentDifference !== undefined) declared.push({ caseId: entry.id, difference: entry.residentDifference });
  }
  return { platform, passed: divergences.length === 0, compared, divergences, declared };
}
