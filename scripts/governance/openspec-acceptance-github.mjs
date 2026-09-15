import { loadImplementationEvidence, loadArchiveEvidence, findImplementationValidation } from "./openspec-archive-github.mjs";
import { snapshotOpenSpec } from "./openspec-archive-staging.mjs";
import { archiveFailure, SHA } from "./openspec-archive-policy.mjs";
import { ACCEPTANCE_ROOT, acceptancePath, acceptanceBranch, acceptanceBytes, acceptanceBlockers, artifactDigest,
  digest, taskInventory, parseAcceptanceRecord, verifyRecordBindings, assertAcceptanceDiff,
  assertManualAcceptanceMerge, requireAcceptance } from "./openspec-acceptance-policy.mjs";

async function sourceMaterials(reader, source) {
  const snapshot = await snapshotOpenSpec(reader, source.pull.head.sha);
  const merged = await snapshotOpenSpec(reader, source.pull.merge_commit_sha);
  const active = `openspec/changes/${source.implementation.change}/`;
  requireAcceptance(snapshot.entries.has(`${active}.openspec.yaml`) && artifactDigest(snapshot, source.implementation.change)
    === artifactDigest(merged, source.implementation.change), "acceptance-source-artifacts");
  const tasks = await snapshot.blob(`${active}tasks.md`);
  requireAcceptance(tasks && tasks.length <= 128 * 1024, "acceptance-task-source");
  return { snapshot, taskText: tasks.toString() };
}

export async function prepareAcceptanceRequest(reader, source) {
  const { snapshot, taskText } = await sourceMaterials(reader, source);
  const { pull, implementation } = source;
  const target = await snapshotOpenSpec(reader, source.targetSha);
  requireAcceptance(artifactDigest(target, implementation.change) === artifactDigest(snapshot, implementation.change), "active-change-drift");
  let validation = null;
  try { validation = await findImplementationValidation(reader, pull); }
  catch (error) {
    // Provenance: only known incomplete CI is representable as pending; unavailable evidence is not absence.
    if (!["implementation-validation", "implementation-required-check"].includes(error.archiveCode)) throw error;
  }
  const evidence = [...snapshot.entries.keys()].filter(path => path.startsWith(`openspec/changes/${implementation.change}/`)
    && /(?:implementation-evidence|evidence)\.md$/.test(path)).map(path => ({
    url: `https://github.com/${reader.repository}/blob/${pull.head.sha}/${path}`,
    outcome: "Recorded source evidence; review its actual outcomes and limitations before accepting.",
  }));
  const record = { version: 1, repository: reader.repository, change: implementation.change, sourcePr: pull.number,
    sourceHead: pull.head.sha, sourceMerge: pull.merge_commit_sha, sourceBodyDigest: digest(pull.body),
    artifactDigest: artifactDigest(snapshot, implementation.change), specBaseSha: pull.base.sha, validation,
    tasks: taskInventory(taskText, implementation.archivePreparationTasks),
    review: { decision: "accept-on-manual-merge", evidence, gaps: [] } };
  parseAcceptanceRecord(acceptanceBytes(record));
  await reader.ancestor(record.specBaseSha, record.sourceHead);
  return { record, targetSha: source.targetSha, blockers: acceptanceBlockers(record) };
}

/** Strict source and CI validation is shared by candidate checks and post-merge receipt consumption. */
export async function verifyAcceptanceRecord(reader, record, source, { requireComplete = true } = {}) {
  const { snapshot, taskText } = await sourceMaterials(reader, source);
  verifyRecordBindings(record, source, snapshot, taskText, reader.repository);
  await reader.ancestor(record.specBaseSha, source.pull.head.sha);
  const references = [...record.review.evidence.map(item => ({ ...item, task: false })),
    ...record.tasks.flatMap(task => task.evidence.map(item => ({ ...item, task: task.completion === "evidenced" })))];
  for (const reference of references) {
    const route = reference.url.slice(`https://github.com/${reader.repository}/`.length);
    let match;
    if ((match = /^blob\/([a-f0-9]{40})\/(.+)$/.exec(route))) {
      requireAcceptance(match[1] === source.pull.head.sha && match[2].startsWith(`openspec/changes/${record.change}/`)
        && snapshot.entries.has(match[2]), "acceptance-evidence-stale");
    } else if ((match = /^actions\/runs\/([1-9]\d*)$/.exec(route))) {
      const run = await reader.get(`${reader.prefix}/actions/runs/${match[1]}`);
      requireAcceptance(run.id === Number(match[1]) && run.head_sha === record.sourceHead && run.status === "completed"
        && (!reference.task || run.conclusion === "success"), "acceptance-evidence-stale");
    } else if ((match = /^pull\/([1-9]\d*)(?:#issuecomment-([1-9]\d*))?$/.exec(route))) {
      const pull = await reader.get(`${reader.prefix}/pulls/${match[1]}`);
      requireAcceptance(pull.number === Number(match[1]) && pull.base?.repo?.full_name === reader.repository, "acceptance-evidence-stale");
      if (match[2]) {
        const comment = await reader.get(`${reader.prefix}/issues/comments/${match[2]}`);
        requireAcceptance(comment.id === Number(match[2]) && comment.issue_url === `https://api.github.com${reader.prefix}/issues/${match[1]}`
          && comment.created_at === comment.updated_at, "acceptance-evidence-stale");
      }
    } else throw archiveFailure("acceptance-evidence-reference");
  }
  if (requireComplete) {
    const blockers = acceptanceBlockers(record);
    if (blockers.length) throw archiveFailure("acceptance-incomplete", blockers.join(","));
    const validation = await findImplementationValidation(reader, source.pull);
    requireAcceptance(Object.entries(validation).every(([key, value]) => record.validation[key] === value), "acceptance-validation-stale");
  }
}

export async function acceptancePulls(reader, record) {
  const branch = acceptanceBranch(record);
  return await reader.pages(`/pulls?state=all&base=develop&head=${encodeURIComponent(`${reader.repository.split("/")[0]}:${branch}`)}`, 1000);
}

export async function inspectAcceptanceCandidate(reader, pull, { requireComplete = true } = {}) {
  const files = await reader.pages(`/pulls/${pull.number}/files`, 3000);
  const touched = files.filter(file => [file.filename, file.previous_filename].some(path => path?.startsWith(ACCEPTANCE_ROOT)));
  if (!touched.length && !pull.head?.ref?.startsWith("docs/accept-")) return null;
  requireAcceptance(touched.length === 1, "acceptance-diff-scope");
  const snapshot = await snapshotOpenSpec(reader, pull.head.sha);
  const bytes = await snapshot.blob(touched[0].filename);
  requireAcceptance(bytes && bytes.length <= 128 * 1024, "acceptance-record-missing");
  const record = parseAcceptanceRecord(bytes.toString());
  const path = acceptancePath(record);
  assertAcceptanceDiff(pull, files, path, reader.repository);
  requireAcceptance(pull.head.ref === acceptanceBranch(record), "acceptance-pr-branch");
  const source = await loadImplementationEvidence(reader, record.sourcePr);
  requireAcceptance(source.disposition === "source", "acceptance-source-identity");
  await verifyAcceptanceRecord(reader, record, source, { requireComplete });
  return { record, bytes, source, path };
}

/** A committed file alone is never authority: resolve its exact manual integration and checked head. */
export async function loadPullRequestAcceptance(reader, source) {
  const target = await snapshotOpenSpec(reader, source.targetSha);
  const paths = [...target.entries.keys()].filter(path => path.startsWith(`${ACCEPTANCE_ROOT}${source.implementation.change}/`));
  if (!paths.length) return null;
  requireAcceptance(paths.length === 1, "acceptance-conflict");
  const bytes = await target.blob(paths[0]);
  const record = parseAcceptanceRecord(bytes.toString());
  requireAcceptance(paths[0] === acceptancePath(record), "acceptance-record-path");
  await verifyAcceptanceRecord(reader, record, source);
  const matches = await acceptancePulls(reader, record);
  const merged = matches.filter(pull => pull.merged_at);
  requireAcceptance(merged.length === 1 && !matches.some(pull => pull.state === "open"), "acceptance-pr-conflict");
  const pull = await reader.get(`${reader.prefix}/pulls/${merged[0].number}`);
  const actor = pull.merged_by?.login;
  requireAcceptance(/^[a-zA-Z0-9-]{1,39}$/.test(actor ?? ""), "acceptance-manual-authority");
  const permission = await reader.get(`${reader.prefix}/collaborators/${actor}/permission`);
  const events = await reader.pages(`/issues/${pull.number}/timeline`, 1000);
  assertManualAcceptanceMerge(pull, permission.permission, events);
  const candidate = await inspectAcceptanceCandidate(reader, pull);
  requireAcceptance(candidate && candidate.bytes.equals(bytes), "acceptance-record-drift");
  await reader.ancestor(source.pull.merge_commit_sha, pull.merge_commit_sha);
  await reader.ancestor(pull.merge_commit_sha, source.targetSha);
  const integrated = await snapshotOpenSpec(reader, pull.merge_commit_sha);
  requireAcceptance((await integrated.blob(paths[0]))?.equals(bytes), "acceptance-record-drift");
  const validation = await findImplementationValidation(reader, pull);
  const jobs = await reader.pages(`/actions/runs/${validation.runId}/jobs?filter=latest`, 1000, "jobs");
  const checks = jobs.filter(job => job.name === "Acceptance record validation");
  requireAcceptance(checks.length === 1 && checks[0].head_sha === validation.checkedSha
    && checks[0].conclusion === "success" && checks[0].status === "completed"
    && checks[0].steps?.some(step => step.name === "Validate acceptance record using trusted policy" && step.conclusion === "success"), "acceptance-required-check");
  return { kind: "pull-request", id: pull.number, author: actor, createdAt: pull.merged_at,
    bodyDigest: digest(bytes), headSha: pull.head.sha, mergeSha: pull.merge_commit_sha, record, recordText: bytes.toString(),
    value: { version: 1, change: record.change, headSha: record.sourceHead, specBaseSha: record.specBaseSha,
      verdict: "accepted", implementationComplete: true, manualReview: "passed", specSyncReviewed: true,
      evidence: `Verified manual acceptance PR #${pull.number}; record SHA-256 ${digest(bytes)}.` } };
}

export async function validateAcceptanceCandidate(reader, number) {
  requireAcceptance(Number.isSafeInteger(number) && number > 0, "acceptance-pr-identity");
  const pull = await reader.get(`${reader.prefix}/pulls/${number}`);
  requireAcceptance(pull.number === number && SHA.test(pull.head?.sha ?? ""), "acceptance-pr-identity");
  const candidate = await inspectAcceptanceCandidate(reader, pull);
  if (!candidate) return { disposition: "not-acceptance" };
  const authority = await loadArchiveEvidence(reader, candidate.record.sourcePr, { allowMissing: true });
  requireAcceptance(authority.disposition === "acceptance-missing", "acceptance-conflict");
  const target = await snapshotOpenSpec(reader, candidate.source.targetSha);
  requireAcceptance(artifactDigest(target, candidate.record.change) === candidate.record.artifactDigest, "active-change-drift");
  requireAcceptance(![...target.entries.keys()].some(path => path.startsWith(`${ACCEPTANCE_ROOT}${candidate.record.change}/`)), "acceptance-already-recorded");
  const matches = await acceptancePulls(reader, candidate.record);
  requireAcceptance(!matches.some(item => item.number !== number && (item.state === "open" || item.merged_at)), "acceptance-pr-conflict");
  return { disposition: "awaiting-manual-acceptance-merge", acceptancePr: number, sourcePr: candidate.record.sourcePr, headSha: pull.head.sha };
}
