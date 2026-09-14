import { createHash } from "node:crypto";
import { classifyDocumentationAutoMerge } from "./documentation-auto-merge.mjs";

export const ARCHIVE_TASKS = Object.freeze({
  recordEvidence: "Record verified implementation acceptance and merge evidence for archive preparation.",
  stageArchive: "Stage and verify delta synchronization and the archive move in an OpenSpec-only candidate.",
});
export const SHA = /^[a-f0-9]{40}$/;
export const CHANGE = /^(?=.{1,100}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TASK_ID = /^[1-9]\d*\.[1-9]\d*$/;
const MAX_TEXT = 256 * 1024;

export function archiveFailure(code, detail = "") {
  const error = new Error(code);
  error.archiveCode = code;
  // Security: callers supply only validated identifiers, never API exception bodies.
  error.archiveDetail = detail;
  return error;
}

function requireValue(condition, code) {
  if (!condition) throw archiveFailure(code);
}

function object(value, required, optional = []) {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value), "metadata-object");
  requireValue(required.every(key => Object.hasOwn(value, key))
    && Object.keys(value).every(key => required.includes(key) || optional.includes(key)), "metadata-fields");
}

function boundedText(value, limit = MAX_TEXT) {
  requireValue(typeof value === "string" && Buffer.byteLength(value) <= limit, "metadata-size");
}

export function metadataBlock(text, label) {
  boundedText(text);
  requireValue(["openspec-implementation", "openspec-acceptance", "openspec-archive"].includes(label), "metadata-label");
  const blocks = [];
  let fence = null;
  let lines = [];
  for (const line of text.replaceAll("\r\n", "\n").split("\n")) {
    const opening = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/.exec(line);
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.character}{${fence.length},}\\s*$`).test(line)) {
        if (fence.label === label) blocks.push(lines.join("\n"));
        fence = null;
      } else if (fence.label === label) lines.push(line);
    } else if (opening) {
      fence = { character: opening[1][0], length: opening[1].length, label: opening[2].trim() };
      lines = [];
    }
  }
  requireValue(fence?.label !== label, "metadata-unclosed");
  requireValue(blocks.length <= 1, "metadata-duplicate");
  if (!blocks.length) return null;
  requireValue(Buffer.byteLength(blocks[0]) <= 16 * 1024, "metadata-size");
  let value;
  try { value = JSON.parse(blocks[0]); }
  catch { throw archiveFailure("metadata-json"); }
  const tokens = [...blocks[0].matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]:,]/g)].map(match => match[0]);
  const scopes = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "{" || token === "[") scopes.push(new Set());
    else if (token === "}" || token === "]") scopes.pop();
    else if (token.startsWith('"') && tokens[index + 1] === ":") {
      const key = JSON.parse(token);
      requireValue(!scopes.at(-1)?.has(key), "metadata-duplicate-key");
      scopes.at(-1)?.add(key);
    }
  }
  return value;
}

export function parseImplementation(text) {
  const value = metadataBlock(text, "openspec-implementation");
  if (value === null) return null;
  object(value, ["version", "change", "specificationPr"], ["archivePreparationTasks"]);
  requireValue(value.version === 1 && typeof value.change === "string" && CHANGE.test(value.change), "implementation-identity");
  requireValue(Number.isSafeInteger(value.specificationPr) && value.specificationPr > 0, "specification-pr");
  if (value.archivePreparationTasks !== undefined) {
    object(value.archivePreparationTasks, [], Object.keys(ARCHIVE_TASKS));
    const ids = Object.values(value.archivePreparationTasks);
    requireValue(ids.every(id => typeof id === "string" && TASK_ID.test(id)) && new Set(ids).size === ids.length, "archive-task-map");
  }
  return value;
}

export function parseAcceptance(text) {
  const value = metadataBlock(text, "openspec-acceptance");
  if (value === null) return null;
  object(value, ["version", "change", "headSha", "specBaseSha", "verdict", "implementationComplete", "manualReview", "specSyncReviewed", "evidence"]);
  requireValue(value.version === 1 && typeof value.change === "string" && CHANGE.test(value.change), "acceptance-identity");
  requireValue(typeof value.headSha === "string" && SHA.test(value.headSha)
    && typeof value.specBaseSha === "string" && SHA.test(value.specBaseSha), "acceptance-sha");
  requireValue(["accepted", "rejected", "revoked"].includes(value.verdict)
    && typeof value.implementationComplete === "boolean" && typeof value.specSyncReviewed === "boolean"
    && ["passed", "failed", "pending"].includes(value.manualReview), "acceptance-verdict");
  boundedText(value.evidence, 8000);
  requireValue(value.evidence.trim().length > 0, "acceptance-evidence");
  return value;
}

export function selectAcceptance(comments, implementation, headSha) {
  requireValue(Array.isArray(comments) && comments.length <= 1000, "acceptance-comments");
  const records = [];
  for (const comment of comments) {
    const value = parseAcceptance(comment.body ?? "");
    if (value === null) continue;
    requireValue(["write", "maintain", "admin"].includes(comment.permission) && comment.user?.type === "User", "acceptance-authority");
    requireValue(Number.isSafeInteger(comment.id) && comment.id > 0
      && typeof comment.user.login === "string" && /^[a-zA-Z0-9-]{1,39}$/.test(comment.user.login), "acceptance-source");
    requireValue(Number.isFinite(Date.parse(comment.created_at))
      && comment.created_at === comment.updated_at, "acceptance-edited");
    requireValue(value.change === implementation.change, "acceptance-change");
    records.push({ value, id: comment.id, author: comment.user.login, createdAt: comment.created_at,
      bodyDigest: createHash("sha256").update(comment.body).digest("hex") });
  }
  const current = records.filter(record => record.value.headSha === headSha);
  requireValue(current.length === 1, current.length ? "acceptance-conflict" : records.length ? "acceptance-stale-head" : "acceptance-missing");
  const record = current[0];
  requireValue(!records.some(other => other !== record && Date.parse(other.createdAt) >= Date.parse(record.createdAt)), "acceptance-conflict");
  requireValue(record.value.verdict === "accepted" && record.value.implementationComplete
    && record.value.manualReview === "passed" && record.value.specSyncReviewed, "acceptance-incomplete");
  return record;
}

export function assertMergedImplementation(pull, repository, files) {
  requireValue(typeof repository === "string" && /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository), "repository-identity");
  requireValue(pull?.merged === true && pull.state === "closed" && pull.draft === false && pull.base?.ref === "develop"
    && pull.base.repo?.full_name === repository && pull.head?.repo?.full_name === repository, "implementation-merge");
  requireValue(Number.isSafeInteger(pull.number) && pull.number > 0 && SHA.test(pull.head.sha ?? "")
    && SHA.test(pull.merge_commit_sha ?? "") && Number.isFinite(Date.parse(pull.merged_at)), "implementation-commit");
  requireValue(Array.isArray(files) && files.length > 0 && files.length === pull.changed_files
    && files.length <= 3000, "implementation-diff-incomplete");
  for (const file of files) {
    requireValue(["added", "modified", "removed", "renamed", "copied", "changed"].includes(file.status), "implementation-file");
    assertRepositoryPath(file.filename);
    if (file.status === "renamed") assertRepositoryPath(file.previous_filename);
  }
  requireValue(!classifyDocumentationAutoMerge(files).eligible, "planning-or-archive-pr");
}

export function assertRepositoryPath(value) {
  requireValue(typeof value === "string" && value.length > 0 && value.length < 512
    && !/[\\\x00-\x1f\x7f:%]/.test(value)
    && value.split("/").every(part => part && part !== "." && part !== ".." && !part.endsWith(".") && !part.endsWith(" ")),
  "unsafe-path");
  return value;
}

export function inspectTasks(text, mapping = {}) {
  boundedText(text);
  object(mapping, [], Object.keys(ARCHIVE_TASKS));
  const tasks = [];
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  let fence = null;
  let previous = null;
  for (const line of lines) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.character}{${fence.length},}\\s*$`).test(line)) fence = null;
    } else if (marker) fence = { character: marker[0], length: marker.length };
    if (/^\s*[-*+]\s+\[/.test(line)) {
      requireValue(!fence, "task-in-fence");
      const match = /^- \[([ xX])\] ([1-9]\d*\.[1-9]\d*) (\S.*)$/.exec(line);
      requireValue(Boolean(match), "task-format");
      previous = { id: match[2], done: match[1] !== " ", text: match[3] };
      tasks.push(previous);
    } else if (line.trim() && !/^## /.test(line) && previous && Object.values(mapping).includes(previous.id)) {
      throw archiveFailure("task-designation-continuation");
    } else if (/^## /.test(line)) previous = null;
  }
  requireValue(tasks.length > 0 && new Set(tasks.map(task => task.id)).size === tasks.length, "task-identities");
  const allowed = new Set();
  for (const [kind, id] of Object.entries(mapping)) {
    const task = tasks.find(item => item.id === id);
    requireValue(task?.text === ARCHIVE_TASKS[kind] && !allowed.has(id), "task-designation");
    allowed.add(id);
  }
  const blocked = tasks.filter(task => !task.done && !allowed.has(task.id));
  if (blocked.length) throw archiveFailure("tasks-incomplete", blocked.map(task => task.id).join(","));
  return tasks;
}

export function completePreparationTask(text, mapping, kind) {
  const tasks = inspectTasks(text, mapping);
  const id = mapping[kind];
  if (!id || tasks.find(task => task.id === id)?.done) return text;
  return text.replace(`- [ ] ${id} ${ARCHIVE_TASKS[kind]}`, `- [x] ${id} ${ARCHIVE_TASKS[kind]}`);
}

export function archivePaths(change, date, capabilities) {
  requireValue(CHANGE.test(change) && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && new Date(date).toISOString().slice(0, 10) === date, "archive-target");
  requireValue(Array.isArray(capabilities) && capabilities.every(value => typeof value === "string"
    && value.split("/").every(part => CHANGE.test(part))), "capability-path");
  const target = /^\d{4}-\d{2}-\d{2}-/.test(change) ? change : `${date}-${change}`;
  return {
    active: `openspec/changes/${change}/`, archive: `openspec/changes/archive/${target}/`,
    specs: capabilities.map(value => `openspec/specs/${value}/spec.md`),
    branch: `docs/archive-${change}`,
  };
}

export function assertArchiveDiff(files, paths) {
  requireValue(Array.isArray(files) && files.length > 0 && files.length <= 1000, "archive-diff");
  for (const file of files) {
    for (const value of [file.filename, ...(file.status === "renamed" ? [file.previous_filename] : [])]) {
      assertRepositoryPath(value);
      requireValue(value.startsWith(paths.active) || value.startsWith(paths.archive) || paths.specs.includes(value), "archive-diff-scope");
    }
  }
}
