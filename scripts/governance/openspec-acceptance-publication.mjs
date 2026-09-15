import { archiveFailure, metadataBlock, SHA } from "./openspec-archive-policy.mjs";
import { loadArchiveEvidence } from "./openspec-archive-github.mjs";
import { snapshotOpenSpec } from "./openspec-archive-staging.mjs";
import { acceptancePulls, inspectAcceptanceCandidate, verifyAcceptanceRecord } from "./openspec-acceptance-github.mjs";
import { acceptancePath, acceptanceBranch, acceptanceBytes, acceptanceBlockers, parseAcceptanceRecord, digest,
  requireAcceptance } from "./openspec-acceptance-policy.mjs";
import { acceptancePullBody, acceptancePullTitle } from "./openspec-acceptance-checklist.mjs";
export { acceptancePullBody, acceptancePullTitle } from "./openspec-acceptance-checklist.mjs";

const markerText = marker => `\`\`\`openspec-acceptance-request\n${JSON.stringify(marker, null, 2)}\n\`\`\``;
function markerFor(record, targetSha) {
  return { version: 1, change: record.change, sourcePr: record.sourcePr, sourceHead: record.sourceHead,
    targetSha, recordPath: acceptancePath(record), recordDigest: digest(acceptanceBytes(record)) };
}
/** Add-only Git objects and refs: no force pushes, reviewer edits, merges, or settings mutations. */
export async function publishAcceptanceRequest({ reader, publisher, source, candidate, dryRun = false, retryClosed = false }) {
  let record = candidate.record;
  const matches = await acceptancePulls(reader, record);
  requireAcceptance(matches.filter(pull => pull.state === "open").length <= 1
    && !matches.some(pull => pull.merged_at), "acceptance-pr-conflict");
  const existing = matches.find(pull => pull.state === "open") ?? matches[0];
  let pull;
  if (existing) {
    pull = await reader.get(`${reader.prefix}/pulls/${existing.number}`);
    const inspected = await inspectAcceptanceCandidate(reader, pull, { requireComplete: false });
    requireAcceptance(inspected && inspected.record.sourcePr === source.pull.number && pull.user?.type === "Bot"
      && /^[a-z0-9-]+\[bot\]$/.test(pull.user.login) && (dryRun || pull.user.login === publisher?.actor), "acceptance-pr-ownership");
    record = inspected.record;
    if (pull.state === "closed" && !retryClosed) return { disposition: "closed", reason: "acceptance-pr-closed", acceptancePr: pull.number };
  }
  const blockers = acceptanceBlockers(record);
  if (!blockers.length) await verifyAcceptanceRecord(reader, record, source);
  const disposition = blockers.length ? "awaiting-evidence" : "awaiting-manual-acceptance-merge";
  if (dryRun) return { disposition, acceptancePr: pull?.number, proposedAcceptance: !pull, blockers };
  requireAcceptance(publisher?.repository === reader.repository && publisher.actor?.endsWith("[bot]"), "publication-app-setup");
  if (pull?.state === "open") {
    // Invariant: never regenerate committed reviewer evidence or overwrite the PR body.
    if (!blockers.length && pull.draft) await publisher.ready(pull.number, pull.node_id);
    return { disposition, acceptancePr: pull.number, blockers, published: false };
  }
  const branch = acceptanceBranch(record), path = acceptancePath(record);
  let ref;
  try { ref = await reader.get(`${reader.prefix}/git/ref/heads/${branch}`); }
  catch (error) { if (error.archiveCode !== "github-not-found") throw error; }
  let head = ref?.object?.sha;
  if (head) {
    requireAcceptance(SHA.test(head), "acceptance-branch-ownership");
    if (pull) requireAcceptance(head === pull.head.sha, "acceptance-human-edits");
    else {
      const commit = await reader.get(`${reader.prefix}/git/commits/${head}`);
      const marker = metadataBlock(commit.message, "openspec-acceptance-request");
      requireAcceptance(marker && SHA.test(marker.targetSha ?? "")
        && JSON.stringify(marker) === JSON.stringify(markerFor(record, marker.targetSha))
        && commit.parents?.length === 1 && commit.parents[0].sha === marker.targetSha, "acceptance-branch-ownership");
      await reader.ancestor(marker.targetSha, source.targetSha);
      const files = await reader.pages(`/compare/${marker.targetSha}...${head}`, 1000, "files");
      requireAcceptance(files.length === 1 && files[0].filename === path && files[0].status === "added", "acceptance-branch-ownership");
      const tree = await snapshotOpenSpec(reader, head);
      requireAcceptance((await tree.blob(path))?.toString() === acceptanceBytes(record), "acceptance-branch-ownership");
    }
  }
  // Concurrency: recheck mutable source authority and the integration base immediately before publication.
  const fresh = await loadArchiveEvidence(reader, source.pull.number, { allowMissing: true });
  requireAcceptance(fresh.disposition === "acceptance-missing" && fresh.targetSha === source.targetSha
    && fresh.pull.head.sha === record.sourceHead && fresh.pull.merge_commit_sha === record.sourceMerge
    && digest(fresh.pull.body) === record.sourceBodyDigest, "source-evidence-changed");
  if (!head) {
    parseAcceptanceRecord(acceptanceBytes(record));
    const base = await reader.get(`${reader.prefix}/git/commits/${source.targetSha}`);
    requireAcceptance(SHA.test(base.tree?.sha ?? ""), "target-identity");
    const tree = await publisher.mutate(`${reader.prefix}/git/trees`, "POST", { base_tree: base.tree.sha,
      tree: [{ path, mode: "100644", type: "blob", content: acceptanceBytes(record) }] });
    requireAcceptance(SHA.test(tree.sha ?? ""), "acceptance-published-tree");
    const commit = await publisher.mutate(`${reader.prefix}/git/commits`, "POST", { tree: tree.sha, parents: [source.targetSha],
      message: `docs(openspec): request acceptance of ${record.change}\n\n${markerText(markerFor(record, source.targetSha))}` });
    requireAcceptance(SHA.test(commit.sha ?? ""), "acceptance-published-head");
    head = commit.sha;
    await publisher.mutate(`${reader.prefix}/git/refs`, "POST", { ref: `refs/heads/${branch}`, sha: head });
  }
  const created = await publisher.mutate(`${reader.prefix}/pulls`, "POST", { base: "develop", head: branch, draft: blockers.length > 0,
    title: acceptancePullTitle(record, source.pull.title), body: acceptancePullBody(record, source.pull.title) });
  requireAcceptance(Number.isSafeInteger(created.number) && created.number > 0, "acceptance-published-pr");
  return { disposition, acceptancePr: created.number, generatedHead: head, blockers, published: true };
}
