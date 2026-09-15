import { archiveReaderFromGet, loadArchiveEvidence, findImplementationValidation } from "./openspec-archive-github.mjs";
import { readArchiveMarker } from "./openspec-archive-publication.mjs";
import { snapshotOpenSpec } from "./openspec-archive-staging.mjs";
import { acceptanceBranch, archivedAcceptanceMatches, receiptIdentity } from "./openspec-acceptance-policy.mjs";
import { SHA } from "./openspec-archive-policy.mjs";
import { digest, fail } from "./local-cleanup-state.mjs";

/** Remote reads only; shared archive policy retains acceptance and legacy-link authority. */
export function cleanupReader({ repository, token, deadline, now = Date.now, fetchImpl = fetch, budget = { remaining: 500 }, onBackoff = () => {} }) {
  const prefix = `/repos/${repository}`;
  let blockedUntil = 0;
  const reader = archiveReaderFromGet(repository, async path => {
    if (now() < blockedUntil) fail("remote-backoff");
    if (!path.startsWith(`${prefix}/`) || /[\r\n]/.test(path)) fail("remote-scope");
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
  });
  return reader;
}
function merged(pull, repository) {
  if (pull?.merged !== true || pull.state !== "closed" || pull.draft !== false || pull.base?.ref !== "develop"
    || pull.base.repo?.full_name !== repository || pull.head?.repo?.full_name !== repository
    || !SHA.test(pull.head?.sha ?? "") || !SHA.test(pull.merge_commit_sha ?? "")) fail("pr-not-merged");
}

/** A status comment or absent branch is never proof of integrated archival. */
export async function verifyCleanupEvidence(reader, entry) {
  const source = await loadArchiveEvidence(reader, entry.sourcePr);
  if (source.disposition !== "eligible" || source.implementation.change !== entry.change) fail("source-association");
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
    || JSON.stringify(marker.acceptanceReceipt ?? null) !== JSON.stringify(receiptIdentity(source.acceptance))) fail("archive-provenance");
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
  if (entry.candidatePr !== associated.number || entry.head !== (entry.role === "acceptance" ? associated.merge_commit_sha : associated.head.sha)) fail("candidate-head-association");
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
