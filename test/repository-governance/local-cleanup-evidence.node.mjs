import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { acceptedHead, cleanupReader, verifyCleanupEvidence, verifyDiscardEvidence } from "../../scripts/governance/local-cleanup-evidence.mjs";
import { digest } from "../../scripts/governance/local-cleanup-state.mjs";

function fixture(version = 2) {
  const repository = "owner/repo", prefix = `/repos/${repository}`, head = "a".repeat(40), merge = "b".repeat(40), target = "c".repeat(40), spec = "d".repeat(40);
  const archiveHead = "e".repeat(40), archiveMerge = "f".repeat(40), paths = "openspec/changes/archive/2026-09-14-example/";
  const block = (label, data) => `\`\`\`${label}\n${JSON.stringify(data)}\n\`\`\``;
  const source = { number: 20, state: "closed", merged: true, draft: false, changed_files: 1, merged_at: "2026-09-14T11:00:00Z", merge_commit_sha: merge,
    head: { sha: head, ref: "feature/example", repo: { full_name: repository } }, base: { ref: "develop", repo: { full_name: repository } },
    body: block("openspec-implementation", { version, change: "example", ...(version === 1 ? { specificationPr: 10 } : {}) }) };
  const value = { version: 1, change: "example", headSha: head, specBaseSha: spec, verdict: "accepted", implementationComplete: true, manualReview: "passed", specSyncReviewed: true, evidence: "Actual isolated fixture reviewed." };
  const comment = { id: 99, user: { type: "User", login: "reviewer" }, created_at: "2026-09-14T10:00:00Z", updated_at: "2026-09-14T10:00:00Z", body: block("openspec-acceptance", value) };
  const marker = { version: 1, change: "example", sourcePr: 20, sourceHead: head, sourceMerge: merge, targetSha: merge, archive: paths,
    acceptanceId: 99, acceptanceDigest: digest(comment.body), acceptanceAuthor: "reviewer", acceptanceCreatedAt: comment.created_at,
    validationRunId: 7, sourceBodyDigest: digest(source.body), digest: "1".repeat(64) };
  const archive = { ...source, number: 21, merge_commit_sha: archiveMerge, head: { ...source.head, ref: "docs/archive-example", sha: archiveHead },
    user: { type: "Bot", login: "archive-app[bot]" }, body: block("openspec-archive", { ...marker, generatedHead: archiveHead }) };
  const run = pull => ({ id: pull.number === 20 ? 7 : 8, head_sha: pull.head.sha, head_branch: pull.head.ref, head_repository: { full_name: repository }, path: ".github/workflows/ci.yml",
    event: "pull_request", status: "completed", conclusion: "success", run_number: 5, run_attempt: 1, pull_requests: [{ number: pull.number, head: { sha: pull.head.sha }, base: { sha: spec } }] });
  const evidenceText = `Implementation merge: ${merge}\nAcceptance: https://github.com/${repository}/pull/20#issuecomment-99\n${block("openspec-acceptance", value)}`;
  const data = Buffer.from(evidenceText), blob = createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
  const item = { path: "openspec/changes/example/.openspec.yaml", sha: spec, mode: "100644", type: "blob" };
  const routes = {
    [`${prefix}/pulls/20`]: source, [`${prefix}/pulls/21`]: archive, [`${prefix}/pulls`]: [archive],
    [`${prefix}/pulls/20/files`]: [{ filename: "src/example.ts", status: "modified" }],
    [`${prefix}/git/ref/heads/develop`]: { object: { sha: target } },
    [`${prefix}/pulls/10`]: { merged: true, base: source.base, merge_commit_sha: spec, merged_at: "2026-09-12T11:00:00Z", changed_files: 1 },
    [`${prefix}/pulls/10/files`]: [{ filename: item.path, status: "added" }],
    [`${prefix}/git/trees/${head}`]: { truncated: false, tree: [item] }, [`${prefix}/git/trees/${merge}`]: { truncated: false, tree: [item] },
    [`${prefix}/issues/20/comments`]: [comment], [`${prefix}/collaborators/reviewer/permission`]: { permission: "write" },
    [`${prefix}/git/commits/${archiveHead}`]: { message: block("openspec-archive", marker), parents: [{ sha: merge }] },
    [`${prefix}/git/trees/${target}`]: { truncated: false, tree: [{ path: paths + "acceptance.md", sha: blob, mode: "100644", type: "blob" }] },
    [`${prefix}/git/blobs/${blob}`]: { content: data.toString("base64"), encoding: "base64", size: data.length },
    [`${prefix}/actions/runs/7/jobs`]: { total_count: 1, jobs: [{ name: "Development validation required", status: "completed", conclusion: "success", head_sha: head }] },
    [`${prefix}/actions/runs/8/jobs`]: { total_count: 1, jobs: [{ name: "Development validation required", status: "completed", conclusion: "success", head_sha: archiveHead }] },
  };
  const calls = [], diverged = new Set();
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init.method }); const parsed = new URL(url), path = parsed.pathname;
    const comparison = /\/compare\/([a-f0-9]{40})\.\.\./.exec(path);
    let result = routes[path];
    if (path.endsWith("/actions/workflows/ci.yml/runs")) result = { total_count: 1, workflow_runs: [run(parsed.searchParams.get("head_sha") === head ? source : archive)] };
    if (comparison) result = diverged.has(comparison[1]) ? { status: "diverged", merge_base_commit: { sha: spec } } : { status: "ahead", merge_base_commit: { sha: comparison[1] } };
    return new Response(JSON.stringify(result ?? null), { status: result === undefined ? 404 : 200 });
  };
  const reader = cleanupReader({ repository, token: "private-fixture-token", deadline: Date.now() + 60000, fetchImpl });
  const entry = { sourcePr: 20, candidatePr: 20, change: "example", head, ref: null, role: "implementation" };
  return { reader, entry, routes, source, archive, marker, comment, calls, diverged, prefix, head, merge, target, spec, archiveHead, archiveMerge, fetchImpl };
}

for (const version of [1, 2]) test(`verifies version-${version} implementation, accepted automatic archive, CI and absent refs using GET only`, async () => {
  const f = fixture(version), result = await verifyCleanupEvidence(f.reader, f.entry);
  assert.equal(result.disposition, "eligible"); assert.equal(result.archivePr, 21);
  assert.ok(f.calls.every(call => call.method === "GET"));
});

test("open/missing/closed-unmerged archive is never a completed lifecycle", async () => {
  let f = fixture(); f.archive.state = "open";
  assert.equal((await verifyCleanupEvidence(f.reader, f.entry)).disposition, "pending");
  f = fixture(); f.routes[`${f.prefix}/pulls`] = [];
  assert.equal((await verifyCleanupEvidence(f.reader, f.entry)).disposition, "blocked");
  f = fixture(); f.archive.merged = false;
  await assert.rejects(verifyCleanupEvidence(f.reader, f.entry), /pr-not-merged/);
});

test("implementation must be merged, accepted and have genuine successful current-head validation", async () => {
  let f = fixture(); f.source.merged = false;
  await assert.rejects(verifyCleanupEvidence(f.reader, f.entry), /implementation-merge/);
  f = fixture(); f.routes[`${f.prefix}/issues/20/comments`] = [];
  await assert.rejects(verifyCleanupEvidence(f.reader, f.entry), /acceptance-missing/);
  f = fixture(); f.routes[`${f.prefix}/actions/runs/7/jobs`].jobs[0].conclusion = "failure";
  await assert.rejects(verifyCleanupEvidence(f.reader, f.entry), /implementation-required-check/);
});

test("source body and archive marker or artifact drift blocks cleanup", async () => {
  let f = fixture(); f.source.body += "\nchanged";
  await assert.rejects(verifyCleanupEvidence(f.reader, f.entry), /archive-provenance/);
  f = fixture(); f.routes[`${f.prefix}/git/commits/${f.archiveHead}`].message = "no marker";
  await assert.rejects(verifyCleanupEvidence(f.reader, f.entry), /archive-committed-marker/);
  f = fixture(); f.routes[`${f.prefix}/git/trees/${f.target}`].tree.push({ path: "openspec/changes/example/.openspec.yaml", sha: f.spec, type: "blob", mode: "100644" });
  await assert.rejects(verifyCleanupEvidence(f.reader, f.entry), /change-still-active/);
});

test("exact candidate roles, heads, refs and archive actor are verified", async () => {
  let f = fixture(); f.entry.head = "8".repeat(40); f.diverged.add("8".repeat(40));
  await assert.rejects(verifyCleanupEvidence(f.reader, f.entry), /candidate-head-association/);
  f = fixture(); f.entry.head = "9".repeat(40);
  assert.equal((await verifyCleanupEvidence(f.reader, f.entry)).disposition, "eligible", "an ancestor of the merged head is accepted");
  assert.ok(f.calls.some(call => call.url.includes(`/compare/${"9".repeat(40)}...${f.head}`)));

  f = fixture(); f.entry.ref = "refs/heads/fix/unrelated";
  await assert.rejects(verifyCleanupEvidence(f.reader, f.entry), /candidate-ref-association/);
  f = fixture(); f.archive.user.type = "User";
  await assert.rejects(verifyCleanupEvidence(f.reader, f.entry), /actor/);
  f = fixture(); Object.assign(f.entry, { role: "acceptance", head: f.merge });
  assert.equal((await verifyCleanupEvidence(f.reader, f.entry)).disposition, "eligible");
  f = fixture(); Object.assign(f.entry, { role: "archive", candidatePr: 21, head: f.archiveHead });
  assert.equal((await verifyCleanupEvidence(f.reader, f.entry)).disposition, "eligible");
});

test("present or recreated topic refs block even at the merged SHA", async () => {
  for (const sha of ["a".repeat(40), "b".repeat(40)]) {
    const f = fixture(); f.routes[`${f.prefix}/git/ref/heads/feature%2Fexample`] = { object: { sha } };
    const result = await verifyCleanupEvidence(f.reader, f.entry);
    assert.equal(result.reason, "remote-ref-present"); assert.equal(result.actualSha, sha);
  }
});

test("pagination, response, request and time budgets fail closed without exposing tokens", async () => {
  let f = fixture(); f.routes[`${f.prefix}/pulls`] = Array(100).fill(f.archive);
  await assert.rejects(verifyCleanupEvidence(f.reader, f.entry), /github-pagination-limit/);
  const reader = cleanupReader({ repository: "owner/repo", token: "PRIVATE", deadline: Date.now() + 60000, budget: { remaining: 0 } });
  await assert.rejects(reader.get("/repos/owner/repo/pulls/20"), /remote-budget/);
  const failed = cleanupReader({ repository: "owner/repo", token: "PRIVATE", deadline: Date.now() + 60000, fetchImpl: async () => new Response("PRIVATE", { status: 401 }) });
  await assert.rejects(failed.get("/repos/owner/repo/pulls/20"), /remote-request-failed/);
  await assert.rejects(failed.get("/repos/other/repo/pulls/20"), /remote-scope/);
});

test("rate limits request bounded retry rather than aggressive repeated calls", async () => {
  let retry = 0;
  const reader = cleanupReader({ repository: "owner/repo", now: () => 1000, deadline: 2000, onBackoff: time => { retry = time; },
    fetchImpl: async () => new Response("private", { status: 429, headers: { "retry-after": "600" } }) });
  await assert.rejects(reader.get("/repos/owner/repo/pulls/20"), /remote-request-failed/); assert.equal(retry, 601000);
  await assert.rejects(reader.get("/repos/owner/repo/pulls/21"), /remote-backoff/);
});

function discardFixture() {
  const repository = "owner/repo", prefix = `/repos/${repository}`, head = "a".repeat(40), ref = "fix/rejected";
  const pull = { number: 40, state: "closed", merged: false, merged_at: null, draft: false,
    body: `\`\`\`openspec-implementation\n${JSON.stringify({ version: 3, change: "rejected-change" })}\n\`\`\``,
    base: { ref: "develop", repo: { full_name: repository } }, head: { sha: head, ref, repo: { full_name: repository } } };
  const routes = { [`${prefix}/pulls/40`]: pull, [`${prefix}/git/ref/heads/fix%2Frejected`]: { object: { sha: head } },
    [`${prefix}/branches/fix%2Frejected`]: { protected: false } };
  const reader = { repository, prefix, async get(path) {
    if (!Object.hasOwn(routes, path)) throw Object.assign(Error("github-not-found"), { archiveCode: "github-not-found" });
    return routes[path];
  } };
  const entry = { sourcePr: 40, candidatePr: 40, change: "rejected-change", head, ref: "refs/heads/fix/rejected", role: "discard" };
  return { repository, prefix, head, ref, pull, routes, reader, entry };
}

test("closed-unmerged discard evidence binds exact PR, head, repository, ref and protection", async () => {
  let f = discardFixture();
  assert.deepEqual(await verifyDiscardEvidence(f.reader, f.entry), {
    disposition: "eligible", sourcePr: 40, sourceHead: f.head, ref: f.ref, expectedSha: f.head, actualSha: f.head, remoteRefPresent: true,
  });
  delete f.routes[`${f.prefix}/git/ref/heads/fix%2Frejected`]; delete f.routes[`${f.prefix}/branches/fix%2Frejected`];
  assert.equal((await verifyDiscardEvidence(f.reader, f.entry)).remoteRefPresent, false);
  f = discardFixture(); f.routes[`${f.prefix}/branches/fix%2Frejected`].protected = true;
  await assert.rejects(verifyDiscardEvidence(f.reader, f.entry), /discard-ref-protected/);
  f = discardFixture(); f.routes[`${f.prefix}/git/ref/heads/fix%2Frejected`].object.sha = "b".repeat(40);
  assert.equal((await verifyDiscardEvidence(f.reader, f.entry)).reason, "remote-ref-advanced");
});

test("discard evidence refuses open, merged, forked, malformed and mismatched candidates", async () => {
  for (const mutate of [
    f => { f.pull.state = "open"; },
    f => { f.pull.merged = true; f.pull.merged_at = "2026-09-16T00:00:00Z"; },
    f => { f.pull.head.repo.full_name = "other/fork"; },
    f => { f.pull.base.ref = "main"; },
    f => { f.pull.body = "no association"; },
    f => { f.entry.head = "b".repeat(40); },
    f => { f.entry.ref = "refs/heads/release/1"; },
  ]) {
    const f = discardFixture(); mutate(f);
    await assert.rejects(verifyDiscardEvidence(f.reader, f.entry), /discard-/);
  }
  const f = discardFixture(); delete f.routes[`${f.prefix}/branches/fix%2Frejected`];
  await assert.rejects(verifyDiscardEvidence(f.reader, f.entry), /discard-remote-inconsistent/);
});

test("unmerged version-3 hand-offs report pending or awaiting-discard without evidence failure", async () => {
  const f = discardFixture(), entry = { ...f.entry, role: "implementation" };
  assert.deepEqual(await verifyCleanupEvidence(f.reader, entry), { disposition: "awaiting-discard", reason: "pr-closed-unmerged", sourcePr: 40 });
  Object.assign(f.pull, { state: "open", draft: true });
  assert.deepEqual(await verifyCleanupEvidence(f.reader, entry), { disposition: "pending", reason: "pr-open", sourcePr: 40 });
  Object.assign(f.pull, { draft: false });
  assert.equal((await verifyCleanupEvidence(f.reader, entry)).disposition, "pending", "a ready but unfinalized candidate is still pending");
  await assert.rejects(verifyCleanupEvidence(f.reader, { ...entry, change: "other-change" }), /source-association/);
});

test("accepted heads are the merged head or a GitHub-known ancestor; unknown commits and budgets are not silently accepted", async () => {
  const f = fixture(), unknown = "7".repeat(40);
  assert.equal(await acceptedHead(f.reader, f.head, f.head), true);
  assert.equal(await acceptedHead(f.reader, "9".repeat(40), f.head), true);
  f.diverged.add(unknown); assert.equal(await acceptedHead(f.reader, unknown, f.head), false);
  assert.equal(await acceptedHead(f.reader, "not-a-sha", f.head), false);
  const missing = { repository: "owner/repo", prefix: "/repos/owner/repo", async ancestor() { throw Object.assign(Error("github-not-found"), { archiveCode: "github-not-found" }); } };
  assert.equal(await acceptedHead(missing, unknown, f.head), false);
  const exhausted = { ...missing, async ancestor() { throw Object.assign(Error("remote-budget"), { cleanupCode: "remote-budget" }); } };
  await assert.rejects(acceptedHead(exhausted, unknown, f.head), /remote-budget/);
});

test("SHA-addressed blobs, trees, commits, and comparisons are fetched once per reader while PR and ref state is refetched", async () => {
  const f = fixture();
  await verifyCleanupEvidence(f.reader, f.entry); const first = f.calls.length;
  await verifyCleanupEvidence(f.reader, f.entry); const second = f.calls.slice(first);
  const immutable = url => /\/git\/(?:blobs|trees|commits)\/[a-f0-9]{40}|\/compare\//.test(url);
  assert.ok(f.calls.slice(0, first).some(call => immutable(call.url)), "the first verification fetched content by SHA");
  assert.equal(second.filter(call => immutable(call.url)).length, 0, "the second verification reused every SHA-addressed object");
  assert.ok(second.some(call => call.url.includes("/pulls/20")), "pull-request state was refetched");
  assert.ok(second.some(call => call.url.includes("/git/ref/heads/")), "ref state was refetched");
});
