import { createHash } from "node:crypto";
import { archiveFailure, assertRepositoryPath, CHANGE, SHA, inspectTasks, strictJson, metadataBlock, parseAcceptance } from "./openspec-archive-policy.mjs";
import { acceptanceChecklistDigest, parseImplementationAcceptanceChecks } from "./openspec-acceptance-checklist.mjs";

export const ACCEPTANCE_ROOT = "openspec/acceptance/";
export const ACCEPTANCE_SIGNOFF = "Record maintainer acceptance by manually merging the acceptance PR.";
export const digest = value => createHash("sha256").update(value).digest("hex");
const HASH = /^[a-f0-9]{64}$/;
const integer = value => Number.isSafeInteger(value) && value > 0;
const text = (value, max = 8000) => typeof value === "string" && value.trim().length > 0 && Buffer.byteLength(value) <= max;
export function requireAcceptance(value, code) { if (!value) throw archiveFailure(code); }
function fields(value, keys) {
  requireAcceptance(value && typeof value === "object" && !Array.isArray(value)
    && keys.length === Object.keys(value).length && keys.every(key => Object.hasOwn(value, key)), "acceptance-record-fields");
}
export const acceptancePath = record => `${ACCEPTANCE_ROOT}${record.change}/${record.sourceHead}.json`;
export const acceptanceBranch = record => `docs/accept-${record.change}-${record.sourcePr}`;
export const acceptanceBytes = record => `${JSON.stringify(record, null, 2)}\n`;
export const artifactDigest = (snapshot, change) => digest(JSON.stringify([...snapshot.entries]
  .filter(([path]) => path.startsWith(`openspec/changes/${change}/`)).sort(([a], [b]) => a.localeCompare(b))));

/** Include continuation lines in review identities; archive administrative tasks keep their exact parser. */
export function taskInventory(taskText, mapping = {}) {
  const tasks = inspectTasks(taskText, mapping, { allowIncomplete: true });
  requireAcceptance(tasks.length <= 500, "acceptance-task-limit");
  const lines = taskText.replaceAll("\r\n", "\n").split("\n");
  return tasks.map(task => {
    const start = lines.findIndex(line => line === `- [${task.done ? "x" : " "}] ${task.id} ${task.text}`
      || task.done && line === `- [X] ${task.id} ${task.text}`);
    requireAcceptance(start >= 0, "acceptance-task-identity");
    let end = start + 1;
    while (end < lines.length && !/^(?:## |[-*+] \[)/.test(lines[end])) end += 1;
    const full = { ...task, text: [task.text, ...lines.slice(start + 1, end)].join("\n").trimEnd() };
    return { ...full, digest: digest(JSON.stringify(full)), completion: task.done ? "recorded"
      : Object.values(mapping).includes(task.id) ? "archive-preparation" : "pending", evidence: [] };
  });
}
function references(values, repository) {
  requireAcceptance(Array.isArray(values) && values.length <= 40, "acceptance-evidence");
  for (const item of values) {
    fields(item, ["url", "outcome"]);
    requireAcceptance(text(item.url, 1500) && text(item.outcome), "acceptance-evidence");
    const prefix = `https://github.com/${repository}/`;
    requireAcceptance(item.url.startsWith(prefix) && /^(?:actions\/runs\/[1-9]\d*|pull\/[1-9]\d*|blob\/[a-f0-9]{40}\/[^?#]+)(?:#[A-Za-z0-9_.-]+)?$/.test(item.url.slice(prefix.length)), "acceptance-evidence-reference");
  }
}

/** A request describes a conditional decision, never a pre-existing human verdict. */
export function parseAcceptanceRecord(bytes) {
  const record = strictJson(bytes, 128 * 1024);
  const baseFields = ["version", "repository", "change", "sourcePr", "sourceHead", "sourceMerge", "sourceBodyDigest",
    "artifactDigest", "specBaseSha", "validation", "tasks", "review"];
  fields(record, record?.version === 2 ? [...baseFields, "acceptanceChecks"] : baseFields);
  requireAcceptance([1, 2].includes(record.version) && /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(record.repository ?? "")
    && typeof record.change === "string" && CHANGE.test(record.change) && integer(record.sourcePr), "acceptance-record-identity");
  if (record.version === 2) acceptanceChecklistDigest(record.acceptanceChecks);
  requireAcceptance([record.sourceHead, record.sourceMerge, record.specBaseSha].every(value => typeof value === "string" && SHA.test(value))
    && [record.sourceBodyDigest, record.artifactDigest].every(value => typeof value === "string" && HASH.test(value)), "acceptance-record-sha");
  if (record.validation !== null) {
    fields(record.validation, ["runId", "headSha", "checkedSha", "attempt"]);
    requireAcceptance(integer(record.validation.runId) && integer(record.validation.attempt) && record.validation.headSha === record.sourceHead
      && SHA.test(record.validation.checkedSha ?? ""), "acceptance-record-validation");
  }
  requireAcceptance(Array.isArray(record.tasks) && record.tasks.length > 0 && record.tasks.length <= 500, "acceptance-record-tasks");
  const ids = new Set();
  for (const task of record.tasks) {
    fields(task, ["id", "text", "done", "digest", "completion", "evidence"]);
    requireAcceptance(/^[1-9]\d*\.[1-9]\d*$/.test(task.id ?? "") && !ids.has(task.id) && text(task.text)
      && typeof task.done === "boolean" && HASH.test(task.digest ?? ""), "acceptance-task-identity");
    ids.add(task.id);
    requireAcceptance(["recorded", "pending", "evidenced", "signoff-on-merge", "archive-preparation"].includes(task.completion), "acceptance-task-completion");
    references(task.evidence, record.repository);
    if (task.completion === "evidenced") requireAcceptance(task.evidence.length > 0, "acceptance-task-evidence");
    if (task.completion === "signoff-on-merge") requireAcceptance(task.text === ACCEPTANCE_SIGNOFF && !task.done, "acceptance-signoff-designation");
    requireAcceptance(task.completion !== "recorded" || task.done, "acceptance-task-recorded");
  }
  fields(record.review, ["decision", "evidence", "gaps"]);
  requireAcceptance(["accept-on-manual-merge", "known-gaps"].includes(record.review.decision)
    && Array.isArray(record.review.gaps) && record.review.gaps.length <= 40 && record.review.gaps.every(value => text(value)), "acceptance-review");
  references(record.review.evidence, record.repository);
  return record;
}

export function acceptanceBlockers(record) {
  return [...(record.validation ? [] : ["implementation-validation"]),
    ...(record.review.decision === "known-gaps" || record.review.gaps.length ? ["known-gaps-manual-disposition"] : [])];
}

export function verifyRecordBindings(record, source, snapshot, taskText, repository) {
  requireAcceptance(record.repository === repository && record.change === source.implementation.change
    && record.sourcePr === source.pull.number && record.sourceHead === source.pull.head.sha
    && record.sourceMerge === source.pull.merge_commit_sha && record.sourceBodyDigest === digest(source.pull.body)
    && record.artifactDigest === artifactDigest(snapshot, record.change), "acceptance-source-drift");
  if (record.version === 2) requireAcceptance(JSON.stringify(parseImplementationAcceptanceChecks(source.pull.body))
    === JSON.stringify(record.acceptanceChecks), "acceptance-checklist-drift");
  const original = taskInventory(taskText, source.implementation.archivePreparationTasks);
  requireAcceptance(original.length === record.tasks.length && original.every((task, index) => {
    const item = record.tasks[index];
    return item.id === task.id && item.text === task.text && item.done === task.done && item.digest === task.digest
      && (item.completion !== "archive-preparation" || task.completion === "archive-preparation")
      && (!task.done || item.completion === "recorded");
  }), "acceptance-task-drift");
}

/** Only a verified receipt caller may apply these reviewed changes to the archive copy. */
export function reconcileAcceptanceTasks(taskText, receipt, mapping) {
  if (receipt.kind !== "pull-request") return taskText;
  const record = parseAcceptanceRecord(acceptanceBytes(receipt.record));
  const original = taskInventory(taskText, mapping);
  requireAcceptance(original.length === record.tasks.length && original.every((task, index) => task.digest === record.tasks[index].digest), "acceptance-task-drift");
  requireAcceptance(receipt.checklistComplete === true && HASH.test(receipt.checklistDigest ?? "")
    && Array.isArray(receipt.checks) && receipt.checks.length > 0
    && (record.version !== 2 || JSON.stringify(receipt.checks) === JSON.stringify(record.acceptanceChecks)), "acceptance-checklist-receipt");
  requireAcceptance(!acceptanceBlockers(record).length, "acceptance-incomplete");
  let result = taskText;
  for (const task of record.tasks) {
    if (task.completion !== "archive-preparation") {
      const firstLine = task.text.split("\n")[0];
      result = result.replace(`- [ ] ${task.id} ${firstLine}`, `- [x] ${task.id} ${firstLine}`);
    }
  }
  inspectTasks(result, mapping);
  return result;
}

export function assertAcceptanceDiff(pull, files, path, repository) {
  assertRepositoryPath(path);
  requireAcceptance(pull.base?.ref === "develop" && pull.base.repo?.full_name === repository
    && pull.head?.repo?.full_name === repository && SHA.test(pull.head.sha ?? ""), "acceptance-pr-identity");
  requireAcceptance(pull.changed_files === 1 && files.length === 1 && files[0].status === "added"
    && files[0].filename === path && !files[0].previous_filename, "acceptance-diff-scope");
}

/** GitHub stamps the pull request and its timeline event from different services; a few seconds of skew is the same merge. */
const MERGE_EVENT_SKEW_MS = 5000;
const sameMergeTime = (event, merged) => {
  const a = Date.parse(event ?? ""), b = Date.parse(merged ?? "");
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= MERGE_EVENT_SKEW_MS;
};

/** GitHub retains auto_merge after automatic integration; null means no authority remained active at merge time. */
const authorizedPermission = permission => ["write", "maintain", "admin"].includes(permission);
const human = actor => actor?.type === "User" && /^[a-zA-Z0-9-]{1,39}$/.test(actor.login ?? "");
/** The timeline names an enable by its merge method; only the webhook action is the generic `auto_merge_enabled`. */
const AUTO_MERGE_ENABLE_EVENTS = new Set(["auto_merge_enabled", "auto_squash_enabled", "auto_rebase_enabled"]);
const autoMergeEnabled = event => AUTO_MERGE_ENABLE_EVENTS.has(event.event);

function assertMergeEvent(pull, permission, events) {
  const actor = pull.merged_by;
  requireAcceptance(pull.merged === true && pull.state === "closed" && pull.draft === false
    && SHA.test(pull.merge_commit_sha ?? "") && Number.isFinite(Date.parse(pull.merged_at)), "acceptance-not-merged");
  requireAcceptance(human(actor) && authorizedPermission(permission), "acceptance-manual-authority");
  requireAcceptance(Array.isArray(events) && events.length <= 1000
    && !events.some(event => event.event === "added_to_merge_queue"), "acceptance-merge-provenance");
  const mergeIndexes = events.flatMap((event, index) => event.event === "merged" ? [index] : []);
  requireAcceptance(mergeIndexes.length === 1, "acceptance-merge-provenance");
  const mergeIndex = mergeIndexes[0], merge = events[mergeIndex];
  requireAcceptance(merge.actor?.login === actor.login && merge.actor?.type === "User"
    && merge.performed_via_github_app === null && merge.commit_id === pull.merge_commit_sha
    && sameMergeTime(merge.created_at, pull.merged_at), "acceptance-merge-provenance");
  return { actor: actor.login, mergeIndex };
}

function activeAutoMergeEvent(pull, events, mergeIndex = events.length) {
  let active = null;
  for (let index = 0; index < mergeIndex; index += 1) {
    const event = events[index];
    if (autoMergeEnabled(event)) {
      requireAcceptance(active === null && human(event.actor) && event.performed_via_github_app === null
        && Number.isFinite(Date.parse(event.created_at)), "acceptance-merge-provenance");
      active = { event, index };
    } else if (event.event === "auto_merge_disabled") {
      requireAcceptance(active !== null, "acceptance-merge-provenance");
      active = null;
    }
  }
  if (!active) return null;
  const commits = events.flatMap((event, index) => event.event === "committed" && index < mergeIndex
    ? [{ index, sha: event.sha }] : []);
  const finalCommit = commits.at(-1);
  requireAcceptance(finalCommit?.sha === pull.head?.sha && finalCommit.index < active.index
    && !commits.some(commit => commit.index > active.index), "acceptance-merge-provenance");
  return active;
}

/** Legacy acceptance PRs remain manual-only under their original policy. */
export function assertManualAcceptanceMerge(pull, permission, events) {
  const decision = assertMergeEvent(pull, permission, events);
  requireAcceptance(pull.auto_merge === null, "acceptance-manual-authority");
  requireAcceptance(!events.some(autoMergeEnabled), "acceptance-merge-provenance");
  return { kind: "manual", actor: decision.actor };
}

/** Version 3 accepts either direct manual integration or native auto-merge personally armed for the final head. */
export function assertVersion3AcceptanceMerge(pull, permission, events) {
  const decision = assertMergeEvent(pull, permission, events);
  const active = activeAutoMergeEvent(pull, events, decision.mergeIndex);
  if (pull.auto_merge === null) {
    requireAcceptance(active === null, "acceptance-merge-provenance");
    const enables = events.slice(0, decision.mergeIndex).filter(autoMergeEnabled);
    requireAcceptance(enables.every(event => event.actor?.login === decision.actor), "acceptance-merge-provenance");
    return { kind: "manual", actor: decision.actor };
  }
  const enabledBy = pull.auto_merge?.enabled_by;
  requireAcceptance(human(enabledBy) && enabledBy.login === decision.actor && active?.event.actor?.login === decision.actor
    && Date.parse(active.event.created_at) <= Date.parse(pull.merged_at), "acceptance-auto-merge-authority");
  return { kind: "human-auto-merge", actor: decision.actor, enabledAt: active.event.created_at };
}

/** Open-candidate guard used only to preserve, never create or exercise, a human implementation arm. */
export function assertHumanAutoMergeArm(pull, permission, events) {
  const enabledBy = pull.auto_merge?.enabled_by;
  requireAcceptance(pull.state === "open" && pull.merged !== true && pull.draft === false && human(enabledBy)
    && authorizedPermission(permission), "acceptance-auto-merge-authority");
  requireAcceptance(Array.isArray(events) && events.length <= 1000
    && !events.some(event => ["added_to_merge_queue", "merged"].includes(event.event)), "acceptance-merge-provenance");
  const active = activeAutoMergeEvent(pull, events);
  requireAcceptance(active?.event.actor?.login === enabledBy.login, "acceptance-auto-merge-authority");
  return { kind: "human-auto-merge", actor: enabledBy.login, enabledAt: active.event.created_at };
}

function legacyReceiptIdentity(receipt) {
  if (receipt.kind === "single-pr") return { kind: "single-pr", pr: receipt.id, head: receipt.headSha,
    merge: receipt.mergeSha, path: receipt.manifest?.acceptanceManifest, digest: receipt.bodyDigest,
    author: receipt.author, createdAt: receipt.createdAt };
  return receipt.kind === "pull-request" ? { kind: "pull-request", pr: receipt.id, head: receipt.headSha,
    merge: receipt.mergeSha, path: acceptancePath(receipt.record), digest: receipt.bodyDigest,
    author: receipt.author, createdAt: receipt.createdAt } : null;
}
export function receiptIdentity(receipt) {
  const identity = legacyReceiptIdentity(receipt);
  return identity && HASH.test(receipt.checklistDigest ?? "") && Array.isArray(receipt.checks)
    ? { ...identity, checklistDigest: receipt.checklistDigest, checks: receipt.checks } : identity;
}
export function receiptIdentityMatches(value, receipt) {
  return JSON.stringify(value) === JSON.stringify(receiptIdentity(receipt))
    || JSON.stringify(value) === JSON.stringify(legacyReceiptIdentity(receipt));
}
export function acceptanceUrl(repository, sourcePr, receipt) {
  return `https://github.com/${repository}/pull/${["pull-request", "single-pr"].includes(receipt.kind) ? receipt.id : `${sourcePr}#issuecomment-${receipt.id}`}`;
}

export function retainedAcceptance(receipt) {
  if (receipt.kind !== "pull-request") return `\`\`\`openspec-acceptance\n${JSON.stringify(receipt.value, null, 2)}\n\`\`\`\n`;
  requireAcceptance(typeof receipt.recordText === "string" && digest(receipt.recordText) === receipt.bodyDigest, "acceptance-record-drift");
  return `\`\`\`openspec-acceptance-receipt\n${JSON.stringify(receiptIdentity(receipt), null, 2)}\n\`\`\`\n\n`
    + `Accepted implementation checks:\n${receipt.checks.map(check => `- ${check}`).join("\n")}\n\n`
    + `Original internal source-binding request:\n\n\`\`\`json\n${receipt.recordText}\n\`\`\`\n`;
}
export function archivedAcceptanceMatches(text, source, repository) {
  if (typeof text !== "string" || !text.includes(`Implementation merge: ${source.pull.merge_commit_sha}`)
    || !text.includes(acceptanceUrl(repository, source.pull.number, source.acceptance))) return false;
  if (source.acceptance.kind === "pull-request") {
    const retained = metadataBlock(text, "openspec-acceptance-receipt");
    const compatibleIdentity = receiptIdentityMatches(retained, source.acceptance);
    return compatibleIdentity && text.includes(source.acceptance.recordText);
  }
  return JSON.stringify(parseAcceptance(text)) === JSON.stringify(source.acceptance.value);
}
