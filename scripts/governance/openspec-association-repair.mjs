import { archiveFailure, CHANGE, SHA } from "./openspec-archive-policy.mjs";

export const ASSOCIATION_REPAIR_SCHEMA = "a1-openspec-association-repair-v1";
const FIELDS = ["change", "correctivePr", "failureReason", "repository", "schema", "sourceHead", "sourceMerge", "sourcePr", "validationRunId"];

/** Parse the deliberately narrow record used to repair one integrated unassociated delivery. */
export function parseAssociationRepair(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw archiveFailure("association-repair-json"); }
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("\0") !== FIELDS.join("\0")
    || value.schema !== ASSOCIATION_REPAIR_SCHEMA || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.repository ?? "")
    || !CHANGE.test(value.change ?? "") || !Number.isSafeInteger(value.sourcePr) || value.sourcePr < 1
    || !SHA.test(value.sourceHead ?? "") || !SHA.test(value.sourceMerge ?? "")
    || !Number.isSafeInteger(value.validationRunId) || value.validationRunId < 1
    || value.failureReason !== "missing-openspec-implementation-metadata"
    || !Number.isSafeInteger(value.correctivePr) || value.correctivePr < 1 || value.correctivePr === value.sourcePr) {
    throw archiveFailure("association-repair-record");
  }
  return value;
}

/** Find and parse the one archived repair record for a named change in a verified OpenSpec snapshot. */
export async function loadAssociationRepair(snapshot, change) {
  if (!CHANGE.test(change ?? "")) throw archiveFailure("association-repair-change");
  const pattern = new RegExp(`^openspec/changes/archive/\\d{4}-\\d{2}-\\d{2}-${change.replaceAll("-", "\\-")}/association-repair\\.json$`);
  const matches = [...snapshot.entries.keys()].filter(path => pattern.test(path));
  if (matches.length !== 1) throw archiveFailure("association-repair-missing-or-ambiguous");
  const bytes = await snapshot.blob(matches[0]);
  if (!bytes || bytes.length > 64 * 1024) throw archiveFailure("association-repair-size");
  const record = parseAssociationRepair(bytes.toString("utf8"));
  if (record.change !== change) throw archiveFailure("association-repair-change");
  return { path: matches[0], archive: matches[0].slice(0, -"association-repair.json".length), record };
}
