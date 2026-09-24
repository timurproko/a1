import { loadPullRequestAcceptance } from "./openspec-acceptance-github.mjs";
import { snapshotOpenSpec } from "./openspec-archive-staging.mjs";
import { archiveFailure, assertMergedImplementation, inspectTasks, parseImplementation, parseAcceptance, selectAcceptance, SHA } from "./openspec-archive-policy.mjs";
import { parseImplementationAcceptanceScenarios } from "./openspec-acceptance-checklist.mjs";
import { assertManualAcceptanceMerge, digest, requireAcceptance } from "./openspec-acceptance-policy.mjs";
import { parseAssociationRepair } from "./openspec-association-repair.mjs";
import { parseConditionalAcceptance, verifyConditionalAcceptance } from "./openspec-delivery-policy.mjs";

export const ACTIVE_TO_ARCHIVE_RENAME_POLICY = true;

export function createArchiveReader({ repository, token, fetchImpl = fetch, apiUrl = "https://api.github.com", deadline = Infinity }) {
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)) throw archiveFailure("repository-identity");
  const prefix = `/repos/${repository}`;
  async function get(path) {
    const search = path.startsWith("/search/issues?") && new URLSearchParams(path.split("?")[1]).get("q")?.startsWith(`repo:${repository} `);
    if ((!path.startsWith(`${prefix}/`) && !search) || /[\r\n]/.test(path)) throw archiveFailure("api-scope");
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw archiveFailure("archive-deadline");
    let response;
    try {
      response = await fetchImpl(`${apiUrl}${path}`, {
        headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}), "x-github-api-version": "2022-11-28" },
        signal: AbortSignal.timeout(Math.min(20_000, remaining)), redirect: "error",
      });
    } catch { throw archiveFailure("github-unavailable"); }
    if (!response.ok) throw archiveFailure(response.status === 404 ? "github-not-found" : "github-request", String(response.status));
    const body = await response.text();
    if (Buffer.byteLength(body) > 8 * 1024 * 1024) throw archiveFailure("github-response-size");
    try { return JSON.parse(body); } catch { throw archiveFailure("github-response-json"); }
  }
  return archiveReaderFromGet(repository, get);
}

export function archiveReaderFromGet(repository, get) {
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)) throw archiveFailure("repository-identity");
  const prefix = `/repos/${repository}`;
  async function pages(path, limit = 1000, field = null) {
    const items = [];
    for (let page = 1; page <= Math.ceil(limit / 100); page += 1) {
      const result = await get(`${prefix}${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
      const batch = field ? result[field] : result;
      if (!Array.isArray(batch)) throw archiveFailure("github-pagination");
      items.push(...batch);
      if (batch.length < 100 || field && result.total_count === items.length) return items;
    }
    throw archiveFailure("github-pagination-limit");
  }
  async function ancestor(base, head) {
    if (!SHA.test(base) || !SHA.test(head)) throw archiveFailure("commit-identity");
    const comparison = await get(`${prefix}/compare/${base}...${head}`);
    if (!["ahead", "identical"].includes(comparison.status) || comparison.merge_base_commit?.sha !== base) {
      throw archiveFailure("commit-ancestry");
    }
  }
  return { repository, prefix, get, pages, ancestor };
}

async function snapshotBytes(snapshot, paths) {
  return await Promise.all(paths.map(async path => {
    const bytes = await snapshot.blob(path);
    if (!bytes) throw archiveFailure("delivery-content-missing", path);
    return [path, bytes];
  }));
}

export async function inspectVersion3DeliverySnapshot(reader, pull, implementation, sha, { allowLegacyVersion3Phase = false } = {}) {
  requireAcceptance(implementation?.version === 3 && implementation.archive && implementation.acceptanceManifest
    && implementation.acceptanceManifest === `${implementation.archive}acceptance.md`, "delivery-not-finalized");
  const snapshot = await snapshotOpenSpec(reader, sha);
  const active = `openspec/changes/${implementation.change}/`;
  requireAcceptance(![...snapshot.entries.keys()].some(path => path.startsWith(active)), "delivery-change-still-active");
  const archivePaths = [...snapshot.entries.keys()].filter(path => path.startsWith(implementation.archive)).sort();
  for (const required of [".openspec.yaml", "proposal.md", "design.md", "tasks.md", "acceptance.md"]) {
    requireAcceptance(archivePaths.includes(`${implementation.archive}${required}`), "delivery-artifact-missing");
  }
  const manifestText = (await snapshot.blob(implementation.acceptanceManifest))?.toString();
  requireAcceptance(manifestText, "delivery-manifest-missing");
  const manifest = parseConditionalAcceptance(manifestText);
  requireAcceptance(manifest.specBaseSha === pull.base?.sha, "delivery-target-stale");
  const contentPaths = archivePaths.filter(path => path !== implementation.acceptanceManifest);
  const archiveEntries = await snapshotBytes(snapshot, contentPaths);
  const evidenceEntries = archiveEntries.filter(([path]) => /(?:^|\/)(?:evidence\/|implementation-evidence\.md$)/.test(path));
  const tasksBytes = await snapshot.blob(`${implementation.archive}tasks.md`);
  requireAcceptance(tasksBytes, "delivery-tasks-missing");
  inspectTasks(tasksBytes.toString());
  const capabilities = [...new Set(contentPaths.flatMap(path => {
    const suffix = path.slice(implementation.archive.length);
    const match = /^specs\/(.+)\/spec\.md$/.exec(suffix);
    return match ? [match[1]] : [];
  }))];
  const specEntries = await snapshotBytes(snapshot, capabilities.map(capability => `openspec/specs/${capability}/spec.md`));
  const scenarios = parseImplementationAcceptanceScenarios(pull.body ?? "", 3, { allowLegacyVersion3Phase });
  const verified = verifyConditionalAcceptance(manifest, { implementation, repository: reader.repository, sourcePr: pull.number,
    archiveEntries, specEntries, evidenceEntries, tasksBytes, scenarios, knownGaps: manifest.knownGaps });
  const repairBytes = await snapshot.blob(`${implementation.archive}association-repair.json`);
  const associationRepair = repairBytes ? parseAssociationRepair(repairBytes.toString()) : null;
  requireAcceptance(!associationRepair || associationRepair.repository === reader.repository
    && associationRepair.change === implementation.change && associationRepair.correctivePr === pull.number,
  "association-repair-corrective");
  return { snapshot, manifest, archiveEntries, specEntries, evidenceEntries, tasksBytes, scenarios, associationRepair, ...verified };
}

async function verifyAssociationRepairSource(reader, correctivePull, record) {
  if (!record) return;
  const source = await reader.get(`${reader.prefix}/pulls/${record.sourcePr}`);
  let implementation;
  try { implementation = parseImplementation(source.body ?? ""); }
  catch { throw archiveFailure("association-repair-source-metadata"); }
  requireAcceptance(!implementation && source.number === record.sourcePr && source.merged === true && source.state === "closed"
    && source.draft === false && source.base?.ref === "develop" && source.base?.repo?.full_name === reader.repository
    && source.head?.repo?.full_name === reader.repository && source.head?.sha === record.sourceHead
    && source.merge_commit_sha === record.sourceMerge && source.number !== correctivePull.number,
  "association-repair-source");
  const validation = await findImplementationValidation(reader, source);
  requireAcceptance(validation.runId === record.validationRunId, "association-repair-validation");
  const actor = source.merged_by?.login;
  requireAcceptance(/^[a-zA-Z0-9-]{1,39}$/.test(actor ?? ""), "association-repair-merge-authority");
  const [permission, events] = await Promise.all([
    reader.get(`${reader.prefix}/collaborators/${actor}/permission`),
    reader.pages(`/issues/${source.number}/timeline`, 1000),
  ]);
  try { assertManualAcceptanceMerge(source, permission.permission, events); }
  catch { throw archiveFailure("association-repair-merge-authority"); }
}

export async function validateVersion3Candidate(reader, number) {
  if (!Number.isSafeInteger(number) || number < 1) throw archiveFailure("implementation-pr");
  const pull = await reader.get(`${reader.prefix}/pulls/${number}`);
  const implementation = parseImplementation(pull.body ?? "");
  requireAcceptance(implementation?.version === 3, "delivery-version");
  const files = await reader.pages(`/pulls/${number}/files`, 3000);
  requireAcceptance(pull.number === number && pull.state === "open" && pull.draft === false && pull.base?.ref === "develop"
    && pull.base?.repo?.full_name === reader.repository && pull.head?.repo?.full_name === reader.repository
    && SHA.test(pull.base?.sha ?? "") && SHA.test(pull.head?.sha ?? "")
    && files.length > 0 && files.length === pull.changed_files, "delivery-candidate-identity");
  const target = await reader.get(`${reader.prefix}/git/ref/heads/develop`);
  requireAcceptance(target.object?.sha === pull.base.sha, "delivery-target-stale");
  await reader.ancestor(pull.base.sha, pull.head.sha);
  const value = await inspectVersion3DeliverySnapshot(reader, pull, implementation, pull.head.sha);
  await verifyAssociationRepairSource(reader, pull, value.associationRepair);
  const changed = new Set(files.flatMap(file => [file.filename, ...(file.status === "renamed" ? [file.previous_filename] : [])]));
  requireAcceptance(value.archiveEntries.every(([path]) => changed.has(path)) && changed.has(implementation.acceptanceManifest),
    "delivery-diff-incomplete");
  const specPaths = new Set(value.specEntries.map(([path]) => path));
  const activePrefix = `openspec/changes/${implementation.change}/`;
  const archivedRenameSources = new Set(files.flatMap(file => {
    if (file.status !== "renamed" || typeof file.previous_filename !== "string" || !file.previous_filename.startsWith(activePrefix)) return [];
    const expected = `${implementation.archive}${file.previous_filename.slice(activePrefix.length)}`;
    return file.filename === expected ? [file.previous_filename] : [];
  }));
  for (const path of changed) {
    if (path.startsWith("openspec/changes/") && !path.startsWith(implementation.archive) && !archivedRenameSources.has(path)) {
      throw archiveFailure("delivery-unexpected-openspec-path", path);
    }
    if (path.startsWith("openspec/specs/") && !specPaths.has(path)) throw archiveFailure("delivery-unexpected-openspec-path", path);
  }
  return { disposition: "ready-for-manual-merge", pull, implementation, targetSha: target.object.sha, ...value };
}

export async function loadImplementationEvidence(reader, number) {
  if (!Number.isSafeInteger(number) || number < 1) throw archiveFailure("implementation-pr");
  const { get, pages, prefix, repository, ancestor } = reader;
  const pull = await get(`${prefix}/pulls/${number}`);
  if (pull.number !== number) throw archiveFailure("implementation-pr");
  const implementation = parseImplementation(pull.body ?? "");
  if (!implementation) return { disposition: "unlinked", pull };
  if (implementation.version === 3 && pull.merged !== true) {
    if (pull.state === "closed") return { disposition: "closed", pull, implementation };
    if (pull.draft !== false) return { disposition: "draft", pull, implementation };
    if (!implementation.archive || !implementation.acceptanceManifest) return { disposition: "needs-finalization", pull, implementation };
    return await validateVersion3Candidate(reader, number);
  }
  try {
    const files = await pages(`/pulls/${number}/files`, 3000);
    assertMergedImplementation(pull, repository, files, { allowDocumentation: implementation.version === 3 });
    const target = await get(`${prefix}/git/ref/heads/develop`);
    const targetSha = target.object?.sha;
    if (!SHA.test(targetSha ?? "")) throw archiveFailure("target-identity");
    await ancestor(pull.merge_commit_sha, targetSha);

    if (implementation.version === 1) {
      const specification = await get(`${prefix}/pulls/${implementation.specificationPr}`);
      if (specification.merged !== true || specification.base?.ref !== "develop"
        || specification.base.repo?.full_name !== repository || !SHA.test(specification.merge_commit_sha ?? "")
        || Date.parse(specification.merged_at) >= Date.parse(pull.merged_at)) throw archiveFailure("specification-merge");
      await ancestor(specification.merge_commit_sha, pull.head.sha);
      const specFiles = await pages(`/pulls/${implementation.specificationPr}/files`, 3000);
      if (specFiles.length !== specification.changed_files || !specFiles.some(file => file.status === "added"
        && file.filename === `openspec/changes/${implementation.change}/.openspec.yaml`)) throw archiveFailure("specification-change-link");
    } else if (implementation.version === 2) {
      const active = `openspec/changes/${implementation.change}/`;
      const source = await snapshotOpenSpec(reader, pull.head.sha);
      const merged = await snapshotOpenSpec(reader, pull.merge_commit_sha);
      if (!source.entries.has(`${active}.openspec.yaml`) || !merged.entries.has(`${active}.openspec.yaml`)) throw archiveFailure("implementation-change-missing");
      const selected = snapshot => [...snapshot.entries].filter(([path]) => path.startsWith(active)).sort(([a], [b]) => a.localeCompare(b));
      if (JSON.stringify(selected(source)) !== JSON.stringify(selected(merged))) throw archiveFailure("implementation-change-drift");
    } else {
      await inspectVersion3DeliverySnapshot(reader, pull, implementation, pull.head.sha, { allowLegacyVersion3Phase: true });
      await inspectVersion3DeliverySnapshot(reader, pull, implementation, pull.merge_commit_sha, { allowLegacyVersion3Phase: true });
    }

    return { disposition: "source", pull, implementation, targetSha, files };
  } catch (error) {
    error.archiveChange = implementation.change;
    throw error;
  }
}

export async function loadVersion3Acceptance(reader, source) {
  const { implementation, pull } = source;
  requireAcceptance(implementation.version === 3, "delivery-version");
  const actor = pull.merged_by?.login;
  requireAcceptance(/^[a-zA-Z0-9-]{1,39}$/.test(actor ?? ""), "acceptance-manual-authority");
  const permission = await reader.get(`${reader.prefix}/collaborators/${actor}/permission`);
  const events = await reader.pages(`/issues/${pull.number}/timeline`, 1000);
  assertManualAcceptanceMerge(pull, permission.permission, events);
  const delivery = await inspectVersion3DeliverySnapshot(reader, pull, implementation, pull.head.sha, { allowLegacyVersion3Phase: true });
  await verifyAssociationRepairSource(reader, pull, delivery.associationRepair);
  const validation = await findImplementationValidation(reader, pull);
  await reader.ancestor(pull.merge_commit_sha, source.targetSha);
  const target = await snapshotOpenSpec(reader, source.targetSha);
  const retained = snapshot => [...snapshot.entries].filter(([path]) => path.startsWith(implementation.archive)).sort(([a], [b]) => a.localeCompare(b));
  requireAcceptance(JSON.stringify(retained(target)) === JSON.stringify(retained(delivery.snapshot))
    && ![...target.entries.keys()].some(path => path.startsWith(`openspec/changes/${implementation.change}/`)),
  "delivery-archive-drift");
  const manifestText = (await delivery.snapshot.blob(implementation.acceptanceManifest)).toString();
  const acceptance = { kind: "single-pr", id: pull.number, author: actor, createdAt: pull.merged_at,
    bodyDigest: digest(manifestText), checklistDigest: delivery.checklistDigest, checklistComplete: true,
    checks: delivery.scenarios, headSha: pull.head.sha, mergeSha: pull.merge_commit_sha, manifest: delivery.manifest,
    value: { version: 1, change: implementation.change, headSha: pull.head.sha, specBaseSha: delivery.manifest.specBaseSha,
      verdict: "accepted", implementationComplete: true, manualReview: "passed", specSyncReviewed: true,
      evidence: `Authorized manual merge of single delivery PR #${pull.number}; manifest SHA-256 ${digest(manifestText)}.` } };
  return { ...source, disposition: "eligible", acceptance, validation, delivery };
}

export async function loadArchiveEvidence(reader, number, { allowMissing = false } = {}) {
  const source = await loadImplementationEvidence(reader, number);
  if (["unlinked", "closed", "draft", "needs-finalization", "ready-for-manual-merge"].includes(source.disposition)) return source;
  const { implementation, pull } = source;
  if (implementation.version === 3) {
    try { return await loadVersion3Acceptance(reader, source); }
    catch (error) { error.archiveChange = implementation.change; throw error; }
  }
  const { get, pages, prefix, ancestor } = reader;
  try {
    const comments = await pages(`/issues/${number}/comments`);
    const evidenceComments = [];
    for (const comment of comments) {
      if (!parseAcceptance(comment.body ?? "")) continue;
      if (!/^[a-zA-Z0-9-]{1,39}$/.test(comment.user?.login ?? "")) throw archiveFailure("acceptance-authority");
      const permission = await get(`${prefix}/collaborators/${comment.user.login}/permission`);
      evidenceComments.push({ ...comment, permission: permission.permission });
    }
    let legacy = null;
    try { legacy = selectAcceptance(evidenceComments, implementation, pull.head.sha); }
    catch (error) { if (error.archiveCode !== "acceptance-missing") throw error; }
    const receipt = await loadPullRequestAcceptance(reader, source);
    if (legacy && receipt) throw archiveFailure("acceptance-conflict");
    const acceptance = receipt ?? (legacy ? { kind: "comment", ...legacy } : null);
    if (!acceptance) {
      if (allowMissing) return { ...source, disposition: "acceptance-missing" };
      throw archiveFailure("acceptance-missing");
    }
    await ancestor(acceptance.value.specBaseSha, pull.head.sha);
    const validation = await findImplementationValidation(reader, pull);
    return { ...source, disposition: "eligible", acceptance, validation };
  } catch (error) {
    error.archiveChange = implementation.change;
    throw error;
  }
}

export async function findImplementationValidation(reader, pull) {
  const { pages, get, prefix } = reader;
  // Provenance: only the reviewed CI workflow and PR association can certify this head.
  const runs = await pages(`/actions/workflows/ci.yml/runs?event=pull_request&head_sha=${pull.head.sha}`, 1000, "workflow_runs");
  const candidates = [];
  let associated;
  for (const run of runs) {
    if (run.head_sha !== pull.head.sha || run.event !== "pull_request" || run.path !== ".github/workflows/ci.yml"
      || run.head_repository?.full_name !== reader.repository || !Array.isArray(run.pull_requests)) continue;
    if (run.pull_requests.some(item => item.number === pull.number && item.head?.sha === pull.head.sha)) candidates.push(run);
    else if (!run.pull_requests.length && typeof pull.head.ref === "string" && run.head_branch === pull.head.ref) {
      // Compatibility: GitHub clears historical run PR arrays after squash, but retains commit association.
      associated ??= await pages(`/commits/${pull.head.sha}/pulls`, 1000);
      if (associated.some(item => item.number === pull.number && item.head?.sha === pull.head.sha
        && item.head.repo?.full_name === reader.repository && item.base?.ref === "develop")) candidates.push(run);
    }
  }
  candidates.sort((a, b) => b.run_number - a.run_number || b.run_attempt - a.run_attempt);
  const run = candidates[0];
  if (!run || run.status !== "completed" || run.conclusion !== "success" || !Number.isSafeInteger(run.id)) {
    throw archiveFailure("implementation-validation");
  }
  const jobs = await pages(`/actions/runs/${run.id}/jobs?filter=latest`, 1000, "jobs");
  const required = jobs.filter(job => job.name === "Development validation required");
  if (required.length !== 1 || required[0].status !== "completed" || required[0].conclusion !== "success") {
    throw archiveFailure("implementation-required-check");
  }
  const validated = required[0].head_sha;
  if (validated !== pull.head.sha) {
    if (!SHA.test(validated ?? "")) throw archiveFailure("validation-head");
    const merge = await get(`${prefix}/git/commits/${validated}`);
    if (merge.parents?.length !== 2 || merge.parents[1]?.sha !== pull.head.sha) throw archiveFailure("validation-head");
    if (run.pull_requests.length) {
      if (!run.pull_requests.some(item => item.number === pull.number && item.base?.sha === merge.parents[0]?.sha)) throw archiveFailure("validation-head");
    } else await reader.ancestor(merge.parents[0].sha, pull.merge_commit_sha);
  }
  return { runId: run.id, headSha: pull.head.sha, checkedSha: validated, attempt: run.run_attempt };
}
