import { classifyDocumentationAutoMerge } from "./documentation-auto-merge.mjs";
import { snapshotOpenSpec } from "./openspec-archive-staging.mjs";
import { archiveFailure, CHANGE, SHA } from "./openspec-archive-policy.mjs";

const ACTIVE_PREFIX = "openspec/changes/";
const ARCHIVE_PREFIX = `${ACTIVE_PREFIX}archive/`;

function activeChange(path) {
  if (typeof path !== "string" || !path.startsWith(ACTIVE_PREFIX) || path.startsWith(ARCHIVE_PREFIX)) return null;
  const change = path.slice(ACTIVE_PREFIX.length).split("/", 1)[0];
  if (!CHANGE.test(change) || !path.startsWith(`${ACTIVE_PREFIX}${change}/`)) throw archiveFailure("active-change-path", path);
  return change;
}

function snapshotHasChange(snapshot, change) {
  const prefix = `${ACTIVE_PREFIX}${change}/`;
  return [...snapshot.entries.keys()].some(path => path.startsWith(prefix));
}

/** Classify immutable pull-request path/tree evidence when editable association metadata is absent. */
export function inspectUnassociatedActiveDelivery({ pull, files, base, head }) {
  if (!pull || !Number.isSafeInteger(pull.changed_files) || pull.changed_files !== files?.length
    || !SHA.test(pull.base?.sha ?? "") || !SHA.test(pull.head?.sha ?? "")) throw archiveFailure("association-diff-identity");
  const paths = classifyDocumentationAutoMerge(files);
  if (!paths.examinedPaths.length) throw archiveFailure("association-diff");
  const changes = [...new Set(paths.examinedPaths.map(activeChange).filter(Boolean))].sort();
  const blocking = changes.filter(change => {
    const inBase = snapshotHasChange(base, change);
    const inHead = snapshotHasChange(head, change);
    return inHead && (!inBase || !paths.eligible);
  });
  return blocking.length
    ? { blocked: true, reason: "missing-implementation-association", changes: blocking, documentationOnly: paths.eligible }
    : { blocked: false, reason: changes.length ? "existing-active-documentation" : "no-active-delivery-path", changes, documentationOnly: paths.eligible };
}

/** Load complete changed paths and immutable OpenSpec trees through the trusted GitHub reader. */
export async function inspectUnassociatedPull(reader, pull) {
  if (!reader || pull?.number < 1) throw archiveFailure("implementation-pr");
  const [files, base, head] = await Promise.all([
    reader.pages(`/pulls/${pull.number}/files`, 3000),
    snapshotOpenSpec(reader, pull.base?.sha),
    snapshotOpenSpec(reader, pull.head?.sha),
  ]);
  return inspectUnassociatedActiveDelivery({ pull, files, base, head });
}
