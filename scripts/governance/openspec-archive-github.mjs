import { loadPullRequestAcceptance } from "./openspec-acceptance-github.mjs";
import { snapshotOpenSpec } from "./openspec-archive-staging.mjs";
import { archiveFailure, assertMergedImplementation, parseImplementation, parseAcceptance, selectAcceptance, SHA } from "./openspec-archive-policy.mjs";

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

export async function loadImplementationEvidence(reader, number) {
  if (!Number.isSafeInteger(number) || number < 1) throw archiveFailure("implementation-pr");
  const { get, pages, prefix, repository, ancestor } = reader;
  const pull = await get(`${prefix}/pulls/${number}`);
  if (pull.number !== number) throw archiveFailure("implementation-pr");
  const implementation = parseImplementation(pull.body ?? "");
  if (!implementation) return { disposition: "unlinked", pull };
  try {
    const files = await pages(`/pulls/${number}/files`, 3000);
    assertMergedImplementation(pull, repository, files);
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
    } else {
      const active = `openspec/changes/${implementation.change}/`;
      const source = await snapshotOpenSpec(reader, pull.head.sha);
      const merged = await snapshotOpenSpec(reader, pull.merge_commit_sha);
      if (!source.entries.has(`${active}.openspec.yaml`) || !merged.entries.has(`${active}.openspec.yaml`)) throw archiveFailure("implementation-change-missing");
      const selected = snapshot => [...snapshot.entries].filter(([path]) => path.startsWith(active)).sort(([a], [b]) => a.localeCompare(b));
      if (JSON.stringify(selected(source)) !== JSON.stringify(selected(merged))) throw archiveFailure("implementation-change-drift");
    }

    return { disposition: "source", pull, implementation, targetSha };
  } catch (error) {
    error.archiveChange = implementation.change;
    throw error;
  }
}

export async function loadArchiveEvidence(reader, number, { allowMissing = false } = {}) {
  const source = await loadImplementationEvidence(reader, number);
  if (source.disposition === "unlinked") return source;
  const { implementation, pull } = source;
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
