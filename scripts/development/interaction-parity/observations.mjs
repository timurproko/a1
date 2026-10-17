import { createHash } from "node:crypto";
import { LATENCY_BUDGETS_MS } from "./matrix.mjs";

/**
 * Content-free semantic observations and their comparison.
 *
 * An observation carries a digest and a length instead of content, plus a detail map of
 * identities and coordinates. Validation rejects sets that could hide a divergence; comparison
 * names the first semantic difference by case, kind, sequence, and field.
 */

const CONTENT_FIELDS = new Set(["text", "prompt", "clipboard", "payload", "content", "transcript", "selectionText"]);

/** Which observation fields a declared resident-only difference is allowed to change. */
const TOLERATED = Object.freeze({
  "tab-strip-row": ["row", "rows"],
  "detach-instead-of-exit": ["action", "digest", "length"],
  "session-name-hidden": ["digest", "length"],
  "image-text-fallback": ["digest", "length"],
  "process-residency": ["latency"],
});

/** The digest observations carry instead of content. */
export function digestContent(content) {
  return createHash("sha256").update(content).digest("hex");
}

/** Resident coordinates lose exactly the strip row; anything on row 0 belongs to the host and cannot normalize. */
export function normalizeResident(observation) {
  if (observation.candidate !== "resident" || observation.detail === undefined) return observation;
  const row = observation.detail.row;
  if (typeof row !== "number") return observation;
  if (row < 1) return null;
  return { ...observation, detail: { ...observation.detail, row: row - 1 } };
}

/**
 * Rejects observation sets that could hide a divergence: duplicates, effects observed before their
 * input, out-of-order sends, kinds a case expects but never saw, streams that report only a final
 * sample, resident coordinates that cannot drop the strip row, and any detail that smuggles content.
 */
export function validateObservations(observations, cases) {
  const faults = [];
  const seen = new Set();
  const lastSent = new Map();
  for (const observation of observations) {
    const key = [observation.caseId, observation.candidate, observation.kind, observation.seq].join("\u0000");
    const fault = reason => faults.push({ caseId: observation.caseId, candidate: observation.candidate, kind: observation.kind, seq: observation.seq, reason });
    if (seen.has(key)) fault("duplicate");
    seen.add(key);
    if (observation.observedAt < observation.sentAt) fault("stale");
    const order = [observation.caseId, observation.candidate, observation.kind].join("\u0000");
    const previous = lastSent.get(order);
    if (previous !== undefined && observation.sentAt < previous) fault("negative");
    lastSent.set(order, observation.sentAt);
    if (observation.candidate === "resident" && normalizeResident(observation) === null) fault("non-normalizable");
    if (observation.detail && Object.keys(observation.detail).some(field => CONTENT_FIELDS.has(field))) fault("content");
    if (!/^[0-9a-f]{64}$/u.test(observation.digest) || observation.length < 0) fault("content");
  }
  for (const entry of cases) {
    for (const candidate of ["direct", "resident"]) {
      const own = observations.filter(observation => observation.caseId === entry.id && observation.candidate === candidate);
      if (own.length === 0) continue;
      for (const kind of entry.expects) {
        const samples = own.filter(observation => observation.kind === kind);
        if (samples.length === 0) { faults.push({ caseId: entry.id, candidate, kind, reason: "missing" }); continue; }
        if (kind === "stream" && samples.length === 1 && samples[0].detail?.final === true) {
          faults.push({ caseId: entry.id, candidate, kind, seq: samples[0].seq, reason: "completion-only" });
        }
      }
    }
  }
  return faults;
}

/**
 * Compares direct and resident observations by case, kind, and sequence. Digest, length, and
 * every detail field must match after normalization, each kind's latency must fit its budget,
 * and only a case's declared difference may excuse a mismatch.
 */
export function compareCandidates(observations, cases, platform) {
  const divergences = [];
  const declared = [];
  let compared = 0;
  const byKey = candidate => new Map(observations
    .filter(observation => observation.candidate === candidate && observation.platform === platform)
    .map(observation => [[observation.caseId, observation.kind, observation.seq].join("\u0000"), observation]));
  const direct = byKey("direct");
  const resident = byKey("resident");
  for (const entry of cases) {
    const tolerated = new Set(entry.residentDifference === undefined ? [] : TOLERATED[entry.residentDifference]);
    let usedDeclared = false;
    const note = (kind, seq, field, left, right) => {
      if (tolerated.has(field)) { usedDeclared = true; return; }
      divergences.push({ caseId: entry.id, kind, seq, field, direct: left, resident: right });
    };
    for (const [key, left] of direct) {
      if (!key.startsWith(`${entry.id}\u0000`)) continue;
      const rightRaw = resident.get(key);
      if (rightRaw === undefined) { note(left.kind, left.seq, "presence", "observed", null); continue; }
      const right = normalizeResident(rightRaw);
      if (right === null) { note(left.kind, left.seq, "row", left.detail?.row ?? null, rightRaw.detail?.row ?? null); continue; }
      compared++;
      if (left.digest !== right.digest) note(left.kind, left.seq, "digest", left.digest, right.digest);
      if (left.length !== right.length) note(left.kind, left.seq, "length", left.length, right.length);
      const fields = new Set([...Object.keys(left.detail ?? {}), ...Object.keys(right.detail ?? {})]);
      for (const field of fields) {
        const l = left.detail?.[field] ?? null;
        const r = right.detail?.[field] ?? null;
        if (l !== r) note(left.kind, left.seq, field, l, r);
      }
      const latency = right.observedAt - right.sentAt;
      if (latency > LATENCY_BUDGETS_MS[right.kind]) note(right.kind, right.seq, "latency", left.observedAt - left.sentAt, latency);
    }
    for (const key of resident.keys()) {
      if (key.startsWith(`${entry.id}\u0000`) && !direct.has(key)) {
        const extra = resident.get(key);
        note(extra.kind, extra.seq, "presence", null, "observed");
      }
    }
    if (usedDeclared && entry.residentDifference !== undefined) declared.push({ caseId: entry.id, difference: entry.residentDifference });
  }
  return { platform, passed: divergences.length === 0, compared, divergences, declared };
}
