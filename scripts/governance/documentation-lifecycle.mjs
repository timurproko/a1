import { classifyDocumentationAutoMerge } from "./documentation-auto-merge.mjs";
import { parseImplementation, metadataBlock, CHANGE, SHA } from "./openspec-archive-policy.mjs";
import { snapshotOpenSpec } from "./openspec-archive-staging.mjs";

/** Resolve implementation holds separately from the path-only code/operational classifier. */
export async function inspectDocumentationLifecycle(pull, files, reader) {
  const classification = classifyDocumentationAutoMerge(files);
  if (!classification.eligible) return { held: true, reason: "code-or-unclassifiable-diff" };
  if (!Number.isSafeInteger(pull.changed_files) || pull.changed_files !== files.length) return { held: true, reason: "incomplete-diff" };
  if (pull.draft !== false) return { held: true, reason: "draft-or-unknown-state" };
  if (pull.body !== null && typeof pull.body !== "string") return { held: true, reason: "missing-lifecycle-metadata" };
  // Invariant: reserved paths on either side of the diff and the dedicated branch survive marker removal.
  if (classification.examinedPaths.some(path => path === "openspec/acceptance" || path.startsWith("openspec/acceptance/"))
    || pull.head?.ref?.startsWith("docs/accept-")) return { held: true, reason: "acceptance-associated" };
  try {
    if (metadataBlock(pull.body ?? "", "openspec-acceptance-request")) return { held: true, reason: "acceptance-associated" };
    if (parseImplementation(pull.body ?? "")) return { held: true, reason: "implementation-associated" };
  } catch { return { held: true, reason: "invalid-lifecycle-metadata" }; }
  const changes = new Set();
  for (const path of classification.examinedPaths) {
    const change = /^openspec\/changes\/([^/]+)\//.exec(path)?.[1];
    if (!change || change === "archive") continue;
    if (!CHANGE.test(change)) return { held: true, reason: "invalid-active-change-path" };
    changes.add(change);
  }
  if (!changes.size) return { held: false, reason: "standalone-documentation" };
  if (!SHA.test(pull.base?.sha ?? "") || !SHA.test(pull.head?.sha ?? "")) return { held: true, reason: "missing-tree-identity" };
  // Provenance: inspect immutable commit trees, never event paths or file-status guesses.
  const base = await snapshotOpenSpec(reader, pull.base.sha);
  const head = await snapshotOpenSpec(reader, pull.head.sha);
  for (const change of changes) {
    const prefix = `openspec/changes/${change}/`;
    const exists = snapshot => [...snapshot.entries.keys()].some(path => path.startsWith(prefix));
    if (exists(head) && !exists(base)) return { held: true, reason: "introduced-active-change", change };
  }
  return { held: false, reason: "existing-change-revision-or-archive" };
}
