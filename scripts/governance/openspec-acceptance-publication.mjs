import { archiveFailure, metadataBlock, SHA } from "./openspec-archive-policy.mjs";
import { loadArchiveEvidence } from "./openspec-archive-github.mjs";
import { snapshotOpenSpec } from "./openspec-archive-staging.mjs";
import { acceptancePulls, inspectAcceptanceCandidate, verifyAcceptanceRecord } from "./openspec-acceptance-github.mjs";
import { acceptancePath, acceptanceBranch, acceptanceBytes, acceptanceBlockers, parseAcceptanceRecord, digest,
  requireAcceptance } from "./openspec-acceptance-policy.mjs";

const markerText = marker => `\`\`\`openspec-acceptance-request\n${JSON.stringify(marker, null, 2)}\n\`\`\``;
const display = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("`", "\\`");
function markerFor(record, targetSha) {
  return { version: 1, change: record.change, sourcePr: record.sourcePr, sourceHead: record.sourceHead,
    targetSha, recordPath: acceptancePath(record), recordDigest: digest(acceptanceBytes(record)) };
}
export function acceptancePullBody(record, targetSha) {
  const blockers = acceptanceBlockers(record);
  const base = `https://github.com/${record.repository}`;
  return `## Acceptance review for implementation #${record.sourcePr}\n\n`
    + `**Merging this PR records your acceptance of the exact implementation below. Merge manually; never enable auto-merge.**\n\n`
    + `This is a review record, not a new proposal. Review the committed JSON and its diff: this body is the generation snapshot. Missing work must be performed and evidenced in this same PR first.\n\n`
    + `| Evidence | Identity |\n| --- | --- |\n| Implementation | ${base}/pull/${record.sourcePr} |\n`
    + `| Reviewed head | ${record.sourceHead} |\n| Implementation merge | ${record.sourceMerge} |\n`
    + `| Spec baseline | ${base}/tree/${record.specBaseSha}/openspec/specs |\n`
    + `| Required source CI | ${record.validation ? `${base}/actions/runs/${record.validation.runId}` : "Pending or failed; no successful result recorded"} |\n\n`
    + `## Source tasks\n\n${record.tasks.map(task => `- [${task.done ? "x" : " "}] ${task.id}: ${display(task.text).replaceAll("\n", "<br>")} — **${task.completion}**`).join("\n")}\n\n`
    + `## Recorded evidence and gaps\n\n${record.review.evidence.map(item => `- ${item.url}: ${display(item.outcome)}`).join("\n") || "No separate source evidence document was found; inspect source tasks and CI."}\n\n`
    + `${record.review.gaps.length ? `Known gaps:\n${record.review.gaps.map(gap => `- ${display(gap)}`).join("\n")}\n\n` : "Known gaps: none recorded.\n\n"}`
    + `${blockers.length ? `**Awaiting evidence:** ${blockers.map(display).join(", ")}. Record actual outcomes and reconcile only those exact tasks before marking ready.`
      : "**Next action:** review implementation outcomes, delta synchronization, and this exact record; manually merge after current-head checks pass."}\n\n`
    + `A manual merge attests your review, not unperformed tests. Known gaps require the explicit manual-disposition route. After verified acceptance, automation prepares the separate CI-gated archive PR. Acceptance alone never enables local cleanup.\n\n`
    + markerText(markerFor(record, targetSha));
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
    title: `Accept: ${record.change} — implementation #${record.sourcePr}`, body: acceptancePullBody(record, source.targetSha) });
  requireAcceptance(Number.isSafeInteger(created.number) && created.number > 0, "acceptance-published-pr");
  return { disposition, acceptancePr: created.number, generatedHead: head, blockers, published: true };
}
