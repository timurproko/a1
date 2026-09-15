import { loadImplementationEvidence, loadArchiveEvidence, findImplementationValidation } from "./openspec-archive-github.mjs";
import { snapshotOpenSpec } from "./openspec-archive-staging.mjs";
import { archiveFailure, parseImplementation, SHA } from "./openspec-archive-policy.mjs";
import { ACCEPTANCE_ROOT, acceptancePath, acceptanceBranch, acceptanceBytes, acceptanceBlockers, artifactDigest,
  digest, taskInventory, parseAcceptanceRecord, verifyRecordBindings, assertAcceptanceDiff,
  assertManualAcceptanceMerge, requireAcceptance } from "./openspec-acceptance-policy.mjs";
import { acceptanceChecklistDigest, acceptancePullTitle, parseImplementationAcceptanceChecks,
  verifyAcceptancePullBody } from "./openspec-acceptance-checklist.mjs";

export async function mapWithConcurrency(items, limit, operation) {
  requireAcceptance(Array.isArray(items) && Number.isInteger(limit) && limit > 0 && typeof operation === "function",
    "acceptance-evidence-concurrency");
  const results = new Array(items.length);
  const failures = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      try { results[index] = await operation(items[index], index); }
      catch (error) { failures[index] = { error }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  const failure = failures.find(item => item !== undefined);
  if (failure) throw failure.error;
  return results;
}

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

async function assertChecklistNovel(snapshot, checks, sourceHead) {
  const identity = acceptanceChecklistDigest(checks);
  for (const path of [...snapshot.entries.keys()].filter(path => path.startsWith(ACCEPTANCE_ROOT) && path.endsWith(".json"))) {
    const bytes = await snapshot.blob(path);
    requireAcceptance(bytes && bytes.length <= 128 * 1024, "acceptance-record-missing");
    const historical = parseAcceptanceRecord(bytes.toString());
    if (historical.version === 2 && historical.sourceHead !== sourceHead
      && acceptanceChecklistDigest(historical.acceptanceChecks) === identity) throw archiveFailure("acceptance-checklist-reused");
  }
}

export async function prepareAcceptanceRequest(reader, source) {
  const { snapshot, taskText } = await sourceMaterials(reader, source);
  const { pull, implementation } = source;
  const target = await snapshotOpenSpec(reader, source.targetSha);
  requireAcceptance(artifactDigest(target, implementation.change) === artifactDigest(snapshot, implementation.change), "active-change-drift");
  const acceptanceChecks = implementation.version === 2 ? parseImplementationAcceptanceChecks(pull.body) : null;
  if (acceptanceChecks) await assertChecklistNovel(target, acceptanceChecks, pull.head.sha);
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
  const record = { version: acceptanceChecks ? 2 : 1, repository: reader.repository, change: implementation.change, sourcePr: pull.number,
    sourceHead: pull.head.sha, sourceMerge: pull.merge_commit_sha, sourceBodyDigest: digest(pull.body),
    artifactDigest: artifactDigest(snapshot, implementation.change), specBaseSha: pull.base.sha,
    ...(acceptanceChecks ? { acceptanceChecks } : {}), validation, tasks: taskInventory(taskText, implementation.archivePreparationTasks),
    review: { decision: "accept-on-manual-merge", evidence, gaps: [] } };
  parseAcceptanceRecord(acceptanceBytes(record));
  await reader.ancestor(record.specBaseSha, record.sourceHead);
  return { record, targetSha: source.targetSha, blockers: acceptanceBlockers(record) };
}

/** Strict source and CI validation is shared by candidate checks and post-merge receipt consumption. */
export async function verifyAcceptanceRecord(reader, record, source, { requireComplete = true } = {}) {
  const { snapshot, taskText } = await sourceMaterials(reader, source);
  verifyRecordBindings(record, source, snapshot, taskText, reader.repository);
  if (record.version === 2) await assertChecklistNovel(await snapshotOpenSpec(reader, source.targetSha), record.acceptanceChecks, record.sourceHead);
  await reader.ancestor(record.specBaseSha, source.pull.head.sha);
  const references = [...record.review.evidence.map(item => ({ ...item, task: false })),
    ...record.tasks.flatMap(task => task.evidence.map(item => ({ ...item, task: task.completion === "evidenced" })))];
  await mapWithConcurrency(references, 6, async reference => {
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
  });
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
  requireAcceptance(pull.title === acceptancePullTitle(record, source.pull.title), "acceptance-pr-title");
  const checklist = verifyAcceptancePullBody(record, source.pull.title, pull.body, { requireComplete });
  return { record, bytes, source, path, checklist };
}

/** A committed file alone is never authority: resolve its exact manual integration and checked head. */
export async function loadPullRequestAcceptance(reader, source) {
  const target = await snapshotOpenSpec(reader, source.targetSha);
  const path = acceptancePath({ change: source.implementation.change, sourceHead: source.pull.head.sha });
  if (!target.entries.has(path)) return null;
  const bytes = await target.blob(path);
  const record = parseAcceptanceRecord(bytes.toString());
  requireAcceptance(path === acceptancePath(record), "acceptance-record-path");
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
  requireAcceptance(candidate && candidate.bytes.equals(bytes) && candidate.checklist.complete, "acceptance-record-drift");
  await reader.ancestor(source.pull.merge_commit_sha, pull.merge_commit_sha);
  await reader.ancestor(pull.merge_commit_sha, source.targetSha);
  const integrated = await snapshotOpenSpec(reader, pull.merge_commit_sha);
  requireAcceptance((await integrated.blob(path))?.equals(bytes), "acceptance-record-drift");
  const validation = await findImplementationValidation(reader, pull);
  const jobs = await reader.pages(`/actions/runs/${validation.runId}/jobs?filter=latest`, 1000, "jobs");
  const checks = jobs.filter(job => job.name === "Acceptance record validation");
  requireAcceptance(checks.length === 1 && checks[0].head_sha === validation.checkedSha
    && checks[0].conclusion === "success" && checks[0].status === "completed"
    && checks[0].steps?.some(step => step.name === "Validate acceptance record using trusted policy" && step.conclusion === "success"), "acceptance-required-check");
  return { kind: "pull-request", id: pull.number, author: actor, createdAt: pull.merged_at,
    bodyDigest: digest(bytes), checklistDigest: candidate.checklist.bodyDigest, checklistComplete: true, checks: candidate.checklist.checks,
    headSha: pull.head.sha, mergeSha: pull.merge_commit_sha, record, recordText: bytes.toString(),
    value: { version: 1, change: record.change, headSha: record.sourceHead, specBaseSha: record.specBaseSha,
      verdict: "accepted", implementationComplete: true, manualReview: "passed", specSyncReviewed: true,
      evidence: `Verified manual acceptance PR #${pull.number}; record SHA-256 ${digest(bytes)}.` } };
}

export async function validateAcceptanceCandidate(reader, number) {
  requireAcceptance(Number.isSafeInteger(number) && number > 0, "acceptance-pr-identity");
  const pull = await reader.get(`${reader.prefix}/pulls/${number}`);
  requireAcceptance(pull.number === number && SHA.test(pull.head?.sha ?? ""), "acceptance-pr-identity");
  // Rationale: candidate CI establishes integrity, not that human verification has already happened;
  // receipt consumption keeps the complete-evidence gate after a manual merge.
  const candidate = await inspectAcceptanceCandidate(reader, pull, { requireComplete: false });
  if (!candidate) {
    const implementation = parseImplementation(pull.body ?? "");
    if (implementation?.version === 2) return { disposition: "implementation-handoff",
      acceptanceChecks: parseImplementationAcceptanceChecks(pull.body) };
    return { disposition: "not-acceptance" };
  }
  const authority = await loadArchiveEvidence(reader, candidate.record.sourcePr, { allowMissing: true });
  requireAcceptance(authority.disposition === "acceptance-missing", "acceptance-conflict");
  const target = await snapshotOpenSpec(reader, candidate.source.targetSha);
  requireAcceptance(artifactDigest(target, candidate.record.change) === candidate.record.artifactDigest, "active-change-drift");
  requireAcceptance(!target.entries.has(acceptancePath(candidate.record)), "acceptance-already-recorded");
  const matches = await acceptancePulls(reader, candidate.record);
  requireAcceptance(!matches.some(item => item.number !== number && (item.state === "open" || item.merged_at)), "acceptance-pr-conflict");
  const blockers = acceptanceBlockers(candidate.record);
  return { disposition: blockers.length ? "awaiting-evidence" : "awaiting-manual-acceptance-merge",
    acceptancePr: number, sourcePr: candidate.record.sourcePr, headSha: pull.head.sha, blockers };
}
