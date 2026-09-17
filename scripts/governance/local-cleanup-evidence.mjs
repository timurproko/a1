import { archiveReaderFromGet, loadArchiveEvidence, findImplementationValidation } from "./openspec-archive-github.mjs";
import { readArchiveMarker } from "./openspec-archive-publication.mjs";
import { snapshotOpenSpec } from "./openspec-archive-staging.mjs";
import { acceptanceBranch, archivedAcceptanceMatches, receiptIdentityMatches } from "./openspec-acceptance-policy.mjs";
import { parseImplementation, SHA } from "./openspec-archive-policy.mjs";
import { digest, fail } from "./local-cleanup-state.mjs";

const IMMUTABLE_CACHE_ENTRIES = 1000, IMMUTABLE_CACHE_BYTES = 64 * 1024 * 1024;
/** Content-addressed objects cannot change under a SHA, so one pass may reuse them across its revalidations. */
const immutablePath = path => /^\/repos\/[^/]+\/[^/]+\/(?:git\/(?:blobs|trees|commits)\/[a-f0-9]{40}(?:\?[A-Za-z0-9=&_-]*)?|compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40})$/.test(path);

/** Remote reads only; shared archive policy retains acceptance and legacy-link authority. */
export function cleanupReader({ repository, token, deadline, now = Date.now, fetchImpl = fetch, budget = { remaining: 500 }, onBackoff = () => {} }) {
  const prefix = `/repos/${repository}`;
  let blockedUntil = 0;
  const cache = new Map(); let cachedBytes = 0;
  const reader = archiveReaderFromGet(repository, async path => {
    if (now() < blockedUntil) fail("remote-backoff");
    if (!path.startsWith(`${prefix}/`) || /[\r\n]/.test(path)) fail("remote-scope");
    // Performance: pull-request, ref, run, and timeline state is always refetched; only SHA-addressed content is memoized.
    const cacheable = immutablePath(path);
    if (cacheable && cache.has(path)) return cache.get(path);
    const value = await fetchOnce(path);
    if (cacheable) {
      const bytes = JSON.stringify(value).length;
      if (cache.size < IMMUTABLE_CACHE_ENTRIES && cachedBytes + bytes <= IMMUTABLE_CACHE_BYTES) { cache.set(path, value); cachedBytes += bytes; }
    }
    return value;
  });
  async function fetchOnce(path) {
    if (--budget.remaining < 0 || now() >= deadline) fail("remote-budget");
    let response;
    try {
      response = await fetchImpl(`https://api.github.com${path}`, { method: "GET", redirect: "error",
        headers: { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        signal: AbortSignal.timeout(Math.max(1, Math.min(10000, deadline - now()))) });
    } catch { fail("remote-unavailable"); }
    if (!response.ok) {
      if (response.status === 429 || response.status === 403) {
        const retry = Number(response.headers.get("retry-after"));
        const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
        blockedUntil = Math.max(now() + 300000, Number.isFinite(retry) ? now() + retry * 1000 : 0, Number.isFinite(reset) ? reset : 0);
        onBackoff(blockedUntil);
      }
      if (response.status === 404) throw Object.assign(new Error("github-not-found"), { archiveCode: "github-not-found" });
      fail("remote-request-failed");
    }
    const chunks = []; let bytes = 0;
    if (!response.body) fail("remote-response-body");
    const stream = response.body.getReader();
    try {
      for (;;) {
        const chunk = await stream.read(); if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 8 * 1024 * 1024) { await stream.cancel(); fail("remote-response-size"); }
        chunks.push(Buffer.from(chunk.value));
      }
    } catch (error) { if (error.cleanupCode) throw error; fail("remote-response-unavailable"); }
    finally { stream.releaseLock(); }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { fail("remote-response-json"); }
  }
  return reader;
}
function merged(pull, repository) {
  if (pull?.merged !== true || pull.state !== "closed" || pull.draft !== false || pull.base?.ref !== "develop"
    || pull.base.repo?.full_name !== repository || pull.head?.repo?.full_name !== repository
    || !SHA.test(pull.head?.sha ?? "") || !SHA.test(pull.merge_commit_sha ?? "")) fail("pr-not-merged");
}

async function optional(reader, path) {
  try { return { kind: "present", value: await reader.get(path) }; }
  catch (error) { if (error.archiveCode === "github-not-found") return { kind: "absent" }; throw error; }
}

/** Explicit rejection authority binds one closed-unmerged PR to one exact local candidate. */
export async function verifyDiscardEvidence(reader, entry) {
  const pull = await reader.get(`${reader.prefix}/pulls/${entry.sourcePr}`);
  const implementation = parseImplementation(pull.body ?? "");
  if (pull.number !== entry.sourcePr || entry.candidatePr !== entry.sourcePr || entry.role !== "discard"
    || pull.state !== "closed" || pull.merged !== false || pull.merged_at !== null
    || pull.base?.ref !== "develop" || pull.base.repo?.full_name !== reader.repository
    || pull.head?.repo?.full_name !== reader.repository || !SHA.test(pull.head?.sha ?? "")
    || implementation?.change !== entry.change || entry.head !== pull.head.sha) fail("discard-source-association");
  const ref = pull.head.ref;
  if (typeof ref !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(ref) || ref.includes("..")
    || entry.ref !== `refs/heads/${ref}` || !/^refs\/heads\/(?:feature|fix|refactor|docs|test|chore|style)\//.test(entry.ref)) fail("discard-ref-identity");
  const encoded = encodeURIComponent(ref);
  const [gitRef, branch] = await Promise.all([
    optional(reader, `${reader.prefix}/git/ref/heads/${encoded}`),
    optional(reader, `${reader.prefix}/branches/${encoded}`),
  ]);
  if (gitRef.kind !== branch.kind) fail("discard-remote-inconsistent");
  if (gitRef.kind === "absent") return { disposition: "eligible", sourcePr: pull.number, sourceHead: pull.head.sha,
    ref, expectedSha: pull.head.sha, remoteRefPresent: false };
  const actualSha = gitRef.value.object?.sha;
  if (!SHA.test(actualSha ?? "") || branch.value.protected !== false) fail(branch.value.protected ? "discard-ref-protected" : "discard-remote-identity");
  if (actualSha !== pull.head.sha) return { disposition: "blocked", reason: "remote-ref-advanced", sourcePr: pull.number,
    sourceHead: pull.head.sha, ref, expectedSha: pull.head.sha, actualSha, remoteRefPresent: true };
  return { disposition: "eligible", sourcePr: pull.number, sourceHead: pull.head.sha, ref,
    expectedSha: pull.head.sha, actualSha, remoteRefPresent: true };
}

/** True when `sha` is `head` or one of its ancestors on GitHub; unknown commits and divergence are false, budgets still throw. */
export async function acceptedHead(reader, sha, head) {
  if (!SHA.test(sha ?? "") || !SHA.test(head ?? "")) return false;
  if (sha === head) return true;
  try { await reader.ancestor(sha, head); return true; }
  catch (error) { if (["commit-ancestry", "github-not-found"].includes(error.archiveCode)) return false; throw error; }
}

/** The one mutable fact retirement needs: this repository's pull request merged into `develop`. */
export async function mergedIntoDevelop(reader, entry) {
  const pull = await reader.get(`${reader.prefix}/pulls/${entry.sourcePr}`);
  return pull?.number === entry.sourcePr && pull.merged === true && pull.state === "closed" && pull.base?.ref === "develop"
    && pull.base.repo?.full_name === reader.repository && pull.head?.repo?.full_name === reader.repository && SHA.test(pull.merge_commit_sha ?? "");
}

/** A status comment or absent branch is never proof of integrated archival. */
export async function verifyCleanupEvidence(reader, entry) {
  const source = await loadArchiveEvidence(reader, entry.sourcePr);
  if (source.implementation?.version === 3 && source.implementation.change === entry.change) {
    // Protocol: an unmerged hand-off is reported, never acted on; closure alone grants no discard authority.
    if (source.disposition === "closed") return { disposition: "awaiting-discard", reason: "pr-closed-unmerged", sourcePr: source.pull.number };
    if (["draft", "needs-finalization", "ready-for-manual-merge"].includes(source.disposition)) return { disposition: "pending", reason: "pr-open", sourcePr: source.pull.number };
  }
  if (source.disposition !== "eligible" || source.implementation.change !== entry.change) fail("source-association");
  if (source.implementation.version === 3) {
    if (entry.role !== "implementation" || entry.candidatePr !== source.pull.number || !await acceptedHead(reader, entry.head, source.pull.head.sha)
      || entry.ref !== null && entry.ref !== `refs/heads/${source.pull.head.ref}`) fail("candidate-head-association");
    const target = await snapshotOpenSpec(reader, source.targetSha);
    if ([...target.entries.keys()].some(path => path.startsWith(`openspec/changes/${entry.change}/`))
      || !target.entries.has(source.implementation.acceptanceManifest)) fail("archived-delivery");
    const ref = source.pull.head.ref;
    if (typeof ref !== "string" || !/^[A-Za-z0-9._/-]+$/.test(ref) || ref.includes("..")) fail("remote-ref-identity");
    try {
      const live = await reader.get(`${reader.prefix}/git/ref/heads/${encodeURIComponent(ref)}`);
      return { disposition: "pending", reason: "remote-ref-present", ref,
        actualSha: SHA.test(live.object?.sha ?? "") ? live.object.sha : null };
    } catch (error) { if (error.archiveCode !== "github-not-found") throw error; }
    return { disposition: "eligible", sourcePr: source.pull.number, sourceHead: source.pull.head.sha,
      sourceMerge: source.pull.merge_commit_sha, archivePr: null, archiveHead: source.pull.head.sha,
      archiveMerge: source.pull.merge_commit_sha, targetSha: source.targetSha, refs: [ref] };
  }
  const branch = `docs/archive-${entry.change}`;
  const pulls = await reader.pages(`/pulls?state=all&base=develop&head=${encodeURIComponent(`${reader.repository.split("/")[0]}:${branch}`)}`, 1000);
  if (pulls.some(pull => pull.state === "open")) return { disposition: "pending", reason: "archive-pending" };
  const candidates = pulls.filter(pull => {
    const marker = readArchiveMarker(pull.body);
    return marker?.sourcePr === entry.sourcePr && marker?.change === entry.change;
  });
  if (candidates.length !== 1) return { disposition: "blocked", reason: "archive-missing-or-ambiguous" };
  const archive = await reader.get(`${reader.prefix}/pulls/${candidates[0].number}`);
  merged(archive, reader.repository);
  if (archive.head.ref !== branch || archive.user?.type !== "Bot" || !/^[a-z0-9-]+\[bot\]$/.test(archive.user?.login ?? "")) fail("archive-branch-or-actor");
  const marker = readArchiveMarker(archive.body);
  if (!marker || marker.change !== entry.change || marker.sourcePr !== entry.sourcePr || marker.sourceHead !== source.pull.head.sha
    || marker.sourceMerge !== source.pull.merge_commit_sha || marker.generatedHead !== archive.head.sha
    || marker.sourceBodyDigest !== digest(source.pull.body) || marker.acceptanceId !== source.acceptance.id
    || marker.acceptanceDigest !== source.acceptance.bodyDigest || marker.acceptanceAuthor !== source.acceptance.author
    || marker.acceptanceCreatedAt !== source.acceptance.createdAt || marker.validationRunId !== source.validation.runId
    || !receiptIdentityMatches(marker.acceptanceReceipt ?? null, source.acceptance)) fail("archive-provenance");
  const commit = await reader.get(`${reader.prefix}/git/commits/${archive.head.sha}`);
  const { generatedHead, ...declared } = marker;
  if (JSON.stringify(readArchiveMarker(commit.message)) !== JSON.stringify(declared)
    || commit.parents?.length !== 1 || commit.parents[0].sha !== marker.targetSha) fail("archive-committed-marker");
  await reader.ancestor(archive.merge_commit_sha, source.targetSha);
  await findImplementationValidation(reader, archive);
  const target = await snapshotOpenSpec(reader, source.targetSha);
  if ([...target.entries.keys()].some(path => path.startsWith(`openspec/changes/${entry.change}/`))) fail("change-still-active");
  const acceptance = (await target.blob(`${marker.archive}acceptance.md`))?.toString();
  if (!archivedAcceptanceMatches(acceptance, source, reader.repository)) fail("archived-acceptance");
  const associated = entry.role === "archive" ? archive : source.pull;
  if (entry.candidatePr !== associated.number || (entry.role === "acceptance" ? entry.head !== associated.merge_commit_sha
    : !await acceptedHead(reader, entry.head, associated.head.sha))) fail("candidate-head-association");
  if (entry.ref !== null && entry.ref !== `refs/heads/${associated.head.ref}`) fail("candidate-ref-association");
  const refs = [...new Set([source.pull.head.ref, archive.head.ref, associated.head.ref,
    ...(source.acceptance.kind === "pull-request" ? [acceptanceBranch(source.acceptance.record)] : [])])];
  for (const ref of refs) {
    if (typeof ref !== "string" || !/^[A-Za-z0-9._/-]+$/.test(ref) || ref.includes("..")) fail("remote-ref-identity");
    try {
      const live = await reader.get(`${reader.prefix}/git/ref/heads/${encodeURIComponent(ref)}`);
      return { disposition: "pending", reason: "remote-ref-present", ref, actualSha: SHA.test(live.object?.sha ?? "") ? live.object.sha : null };
    } catch (error) { if (error.archiveCode !== "github-not-found") throw error; }
  }
  return { disposition: "eligible", sourcePr: source.pull.number, sourceHead: source.pull.head.sha, sourceMerge: source.pull.merge_commit_sha,
    archivePr: archive.number, archiveHead: archive.head.sha, archiveMerge: archive.merge_commit_sha, targetSha: source.targetSha, refs };
}
