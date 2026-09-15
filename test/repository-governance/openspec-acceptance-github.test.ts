import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { archiveReaderFromGet, loadArchiveEvidence } from "../../scripts/governance/openspec-archive-github.mjs";
import { prepareAcceptanceRequest, validateAcceptanceCandidate } from "../../scripts/governance/openspec-acceptance-github.mjs";
import { publishAcceptanceRequest } from "../../scripts/governance/openspec-acceptance-publication.mjs";
import { acceptanceBytes, acceptancePath, acceptanceBranch, archivedAcceptanceMatches, type AcceptanceRecord } from "../../scripts/governance/openspec-acceptance-policy.mjs";
import { loadArchiveTool, prepareArchive } from "../../scripts/governance/openspec-archive-staging.mjs";
import { archiveMarker, archivePullBody } from "../../scripts/governance/openspec-archive-publication.mjs";
import { reconcileArchives } from "../../scripts/governance/reconcile-openspec-archive.mjs";
import { verifyCleanupEvidence } from "../../scripts/governance/local-cleanup-evidence.mjs";
import { archiveFailure, archivePaths } from "../../scripts/governance/openspec-archive-policy.mjs";

function fixture(pending = false) {
  const repository = "owner/repo", prefix = `/repos/${repository}`;
  const head = "a".repeat(40), merge = "b".repeat(40), base = "c".repeat(40), acceptanceHead = "d".repeat(40), acceptanceMerge = "e".repeat(40);
  let target = base;
  const active = "openspec/changes/example/";
  const original: Record<string, string> = {
    "openspec/config.yaml": "schema: spec-driven\n",
    [`${active}.openspec.yaml`]: "schema: spec-driven\ncreated: 2026-09-15\nskip_specs: true\n",
    [`${active}proposal.md`]: "## Why\nImprove internal tooling.\n\n## What Changes\n- Refactor internal tooling.\n\n## Capabilities\n### New Capabilities\nNone.\n\n## Impact\nInternal tooling only.\n",
    [`${active}design.md`]: "## Context\nInternal tooling fixture.\n",
    [`${active}implementation-evidence.md`]: "## Evidence\nFocused fixture outcome recorded.\n",
    [`${active}tasks.md`]: `## Tasks\n- [${pending ? " " : "x"}] 1.1 Implement and verify the internal refactor.\n`,
  };
  const trees = new Map<string, Record<string, string>>([[head, original], [merge, original], [base, original]]);
  const blobs = new Map<string, Buffer>(), commits = new Map<string, any>();
  const refs = new Map<string, string>(), pulls = new Map<number, any>(), comments = new Map<number, any[]>();
  const files = new Map<number, any[]>(), ci = new Map<number, string>(), timelines = new Map<number, any[]>();
  const permissions = new Map([["reviewer", "write"]]);
  const requests: string[] = [], mutations: { path: string; method: string; body: any }[] = [];
  const repo = { full_name: repository };
  const sourcePull = { number: 400, state: "closed", merged: true, draft: false, merged_at: "2026-09-15T06:00:00Z",
    merge_commit_sha: merge, changed_files: 1, head: { sha: head, ref: "feature/example", repo }, base: { sha: base, ref: "develop", repo },
    body: '```openspec-implementation\n{"version":2,"change":"example"}\n```' };
  pulls.set(400, sourcePull); files.set(400, [{ filename: "src/example.ts", status: "modified" }]);
  const get = async (path: string): Promise<any> => {
    requests.push(path);
    const url = new URL(`https://api.github.com${path}`), route = url.pathname.slice(prefix.length);
    if (route === "/pulls") {
      const wanted = url.searchParams.get("head")?.split(":").slice(1).join(":");
      return [...pulls.values()].filter(pull => (!wanted || pull.head.ref === wanted)
        && (url.searchParams.get("state") !== "open" || pull.state === "open"));
    }
    let match;
    if ((match = /^\/pulls\/(\d+)$/.exec(route))) return pulls.get(Number(match[1])) ?? missing();
    if ((match = /^\/pulls\/(\d+)\/files$/.exec(route))) return files.get(Number(match[1])) ?? missing();
    if ((match = /^\/issues\/(\d+)\/comments$/.exec(route))) return comments.get(Number(match[1])) ?? [];
    if ((match = /^\/issues\/(\d+)\/timeline$/.exec(route))) return timelines.get(Number(match[1])) ?? [];
    if ((match = /^\/collaborators\/([^/]+)\/permission$/.exec(route))) return { permission: permissions.get(match[1]!) ?? "none" };
    if (route === "/git/ref/heads/develop") return { object: { sha: target } };
    if (route.startsWith("/git/ref/heads/")) {
      const branch = decodeURIComponent(route.slice(15));
      return refs.has(branch) ? { object: { sha: refs.get(branch) } } : missing();
    }
    if ((match = /^\/git\/trees\/([a-f0-9]{40})$/.exec(route))) {
      const contents = trees.get(match[1]!); if (!contents) return missing();
      return { truncated: false, tree: Object.entries(contents).map(([path, content]) => {
        const bytes = Buffer.from(content), sha = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
        blobs.set(sha, bytes); return { path, sha, type: "blob", mode: "100644" };
      }) };
    }
    if (route.startsWith("/git/blobs/")) {
      const bytes = blobs.get(route.split("/").at(-1)!)!;
      return { size: bytes.length, encoding: "base64", content: bytes.toString("base64") };
    }
    if ((match = /^\/git\/commits\/([a-f0-9]{40})$/.exec(route))) return commits.get(match[1]!) ?? { tree: { sha: match[1] } };
    if ((match = /^\/compare\/([a-f0-9]{40})\.\.\.([a-f0-9]{40})$/.exec(route))) {
      const before = trees.get(match[1]!) ?? {}, after = trees.get(match[2]!) ?? {};
      return { status: "ahead", merge_base_commit: { sha: match[1] }, files: [...new Set([...Object.keys(before), ...Object.keys(after)])]
        .filter(path => before[path] !== after[path]).map(filename => ({ filename, status: before[filename] === undefined ? "added" : after[filename] === undefined ? "removed" : "modified" })) };
    }
    if ((match = /^\/actions\/runs\/(\d+)$/.exec(route))) return { id: Number(match[1]), head_sha: head,
      status: "completed", conclusion: ci.get(-Number(match[1])) ?? "success" };
    if (route === "/actions/workflows/ci.yml/runs") {
      const sha = url.searchParams.get("head_sha"), pull = [...pulls.values()].find(pull => pull.head.sha === sha)!;
      return { total_count: 1, workflow_runs: [{ id: pull.number + 1000, head_sha: sha, head_branch: pull.head.ref,
        head_repository: repo, path: ".github/workflows/ci.yml", event: "pull_request", status: "completed",
        conclusion: ci.get(pull.number) ?? "success", run_number: 1, run_attempt: 1,
        pull_requests: [{ number: pull.number, head: { sha }, base: { sha: pull.base.sha } }] }] };
    }
    if ((match = /^\/actions\/runs\/(\d+)\/jobs$/.exec(route))) {
      const pull = pulls.get(Number(match[1]) - 1000)!;
      return { total_count: 2, jobs: [{ name: "Development validation required", head_sha: pull.head.sha, status: "completed", conclusion: "success" },
        { name: "Acceptance record validation", head_sha: pull.head.sha, status: "completed", conclusion: "success",
          steps: [{ name: "Validate acceptance record using trusted policy", conclusion: "success" }] }] };
    }
    return missing();
  };
  function missing(): never { throw archiveFailure("github-not-found"); }
  const reader = archiveReaderFromGet(repository, get);
  function seed(record: AcceptanceRecord, merged = false) {
    const path = acceptancePath(record), branch = acceptanceBranch(record);
    const pull = { number: 500, node_id: "PR_acceptance", state: merged ? "closed" : "open", merged, draft: false,
      user: { type: "Bot", login: "archive-app[bot]" }, auto_merge: null as object | null, merged_by: { type: "User", login: "reviewer" },
      head: { sha: acceptanceHead, ref: branch, repo }, base: { sha: base, ref: "develop", repo }, changed_files: 1, body: "Human review notes preserved.",
      merged_at: merged ? "2026-09-15T07:00:00Z" : null, merge_commit_sha: merged ? acceptanceMerge : null };
    pulls.set(500, pull); files.set(500, [{ filename: path, status: "added" }]);
    trees.set(acceptanceHead, { ...original, [path]: acceptanceBytes(record) }); refs.set(branch, acceptanceHead);
    if (merged) {
      trees.set(acceptanceMerge, { ...trees.get(acceptanceHead) }); target = acceptanceMerge;
      timelines.set(500, [{ event: "merged", actor: pull.merged_by, performed_via_github_app: null, commit_id: acceptanceMerge, created_at: pull.merged_at }]);
    }
    return pull;
  }
  const publisher = { repository, actor: "archive-app[bot]", async close() {}, async ready(number: number) {
    mutations.push({ path: `/ready/${number}`, method: "READY", body: {} }); pulls.get(number).draft = false;
  }, async mutate(path: string, method: string, body: any) {
    mutations.push({ path, method, body });
    if (path.endsWith("/git/trees")) { trees.set("9".repeat(40), { ...trees.get(body.base_tree), [body.tree[0].path]: body.tree[0].content }); return { sha: "9".repeat(40) }; }
    if (path.endsWith("/git/commits")) { trees.set(acceptanceHead, trees.get(body.tree)!); commits.set(acceptanceHead, { ...body, parents: body.parents.map((sha: string) => ({ sha })) }); return { sha: acceptanceHead }; }
    if (path.endsWith("/git/refs")) { if (refs.has(body.ref.slice(11))) throw new Error("ref already exists"); refs.set(body.ref.slice(11), body.sha); return {}; }
    if (path.endsWith("/pulls")) {
      const bytes = trees.get(acceptanceHead)![Object.keys(trees.get(acceptanceHead)!).find(path => path.startsWith("openspec/acceptance/"))!]!;
      const pull = seed(JSON.parse(bytes)); Object.assign(pull, { draft: body.draft, body: body.body }); return pull;
    }
    const match = /\/issues\/(\d+)\/comments$/.exec(path);
    if (match) { comments.set(Number(match[1]), [{ id: 900, body: body.body, user: { login: "archive-app[bot]" } }]); return {}; }
    if (/\/issues\/comments\/900$/.test(path)) { for (const list of comments.values()) if (list[0]?.id === 900) list[0].body = body.body; return {}; }
    throw new Error(`Unexpected mutation: ${method} ${path}`);
  } };
  const source = () => loadArchiveEvidence(reader, 400, { allowMissing: true });
  return { reader, source, seed, publisher, mutations, requests, pulls, files, refs, trees, commits, ci, comments, timelines, permissions,
    original, head, merge, base, acceptanceHead, acceptanceMerge, prefix, setTarget: (sha: string) => { target = sha; } };
}

describe("visible acceptance publication and authority", () => {
  it("creates one conditional request, reuses it, preserves reviewer edits, and never merges", async () => {
    const f = fixture(); const source = await f.source(), candidate = await prepareAcceptanceRequest(f.reader, source);
    expect(candidate.blockers).toEqual([]);
    const result = await publishAcceptanceRequest({ reader: f.reader, publisher: f.publisher, source, candidate });
    expect(result).toMatchObject({ acceptancePr: 500, disposition: "awaiting-manual-acceptance-merge", published: true });
    f.pulls.get(500).body = "Reviewer-added notes; do not overwrite.";
    await publishAcceptanceRequest({ reader: f.reader, publisher: f.publisher, source, candidate });
    expect(f.pulls.get(500).body).toBe("Reviewer-added notes; do not overwrite.");
    expect(f.mutations.filter(item => item.path.endsWith("/pulls"))).toHaveLength(1);
    expect(f.mutations.every(item => !item.path.endsWith("/merge") && item.method !== "PUT")).toBe(true);
    expect(await f.source()).toMatchObject({ disposition: "acceptance-missing" });
    await expect(validateAcceptanceCandidate(f.reader, 500)).resolves.toMatchObject({ disposition: "awaiting-manual-acceptance-merge" });
  });
  it("surfaces #400-shaped pending tasks and missing CI as a draft rather than approval", async () => {
    const f = fixture(true); f.ci.set(400, "failure");
    const report = await reconcileArchives({ reader: f.reader, tool: {}, pr: 400, dryRun: false, publisherFactory: async () => f.publisher });
    expect(report.results).toMatchObject([{ pr: 400, acceptancePr: 500, disposition: "awaiting-evidence", blockers: ["implementation-validation", "task:1.1"] }]);
    expect(f.pulls.get(500).draft).toBe(true);
    expect(f.pulls.get(500).body).toContain("Merging this PR records your acceptance");
    expect(f.comments.get(400)![0].body).toContain("Acceptance PR: #500");
    expect(f.comments.get(500)![0].body).toContain("Update this same PR with actual evidence");
    expect(f.mutations.some(item => item.body?.ref?.includes("archive-"))).toBe(false);
    await expect(validateAcceptanceCandidate(f.reader, 500)).rejects.toThrow("acceptance-incomplete");
  });
  it("publishes a missing acceptance request despite an unrelated serialized archive queue", async () => {
    const f = fixture();
    const marker = archiveMarker({ implementation: { change: "other" }, targetSha: f.base,
      pull: { number: 300, head: { sha: f.head }, merge_commit_sha: f.merge, body: "linked" },
      acceptance: { id: 9, bodyDigest: "1".repeat(64), author: "reviewer", createdAt: "2026-09-15T05:00:00Z" }, validation: { runId: 12 } },
    { paths: archivePaths("other", "2026-09-15", []), changes: [] });
    const queue = { number: 600, state: "open", head: { ref: "docs/archive-other" },
      body: `\`\`\`openspec-archive\n${JSON.stringify(marker)}\n\`\`\`` };
    const reader = { ...f.reader, async pages(path: string, limit?: number, field?: string) {
      if (path.startsWith("/pulls?state=open&base=develop")) return [queue];
      return f.reader.pages(path, limit, field);
    } };
    const report = await reconcileArchives({ reader, tool: {}, pr: 400, dryRun: false, publisherFactory: async () => f.publisher });
    expect(report.results).toMatchObject([{ disposition: "awaiting-manual-acceptance-merge", acceptancePr: 500 }]);
    expect(f.mutations.some(item => item.path.endsWith("/pulls"))).toBe(true);
  });
  it("previews request generation and reports closed disposition without mutation", async () => {
    const f = fixture(); const source = await f.source(), candidate = await prepareAcceptanceRequest(f.reader, source);
    const audit = await reconcileArchives({ reader: f.reader, tool: {}, pr: 400, dryRun: true });
    expect(audit.results).toMatchObject([{ proposedAcceptance: true, disposition: "awaiting-manual-acceptance-merge" }]);
    expect(f.mutations).toEqual([]);
    const pull = f.seed(candidate.record); pull.state = "closed";
    expect(await publishAcceptanceRequest({ reader: f.reader, publisher: f.publisher, source, candidate })).toMatchObject({ disposition: "closed", acceptancePr: 500 });
    expect(f.mutations).toEqual([]);
    await publishAcceptanceRequest({ reader: f.reader, publisher: f.publisher, source, candidate, retryClosed: true });
    expect(f.mutations.filter(item => item.path.endsWith("/pulls"))).toHaveLength(1);
  });
  it("recovers only matching committed publication and refuses unknown ownership", async () => {
    const f = fixture(); const source = await f.source(), candidate = await prepareAcceptanceRequest(f.reader, source);
    await publishAcceptanceRequest({ reader: f.reader, publisher: f.publisher, source, candidate });
    f.pulls.delete(500); // Concurrency: this crash-equivalent leaves an owned branch before PR publication is observed.
    await publishAcceptanceRequest({ reader: f.reader, publisher: f.publisher, source, candidate });
    expect(f.mutations.filter(item => item.path.endsWith("/git/refs"))).toHaveLength(1);
    f.pulls.delete(500); f.commits.get(f.acceptanceHead).message = "Unknown branch owner";
    await expect(publishAcceptanceRequest({ reader: f.reader, publisher: f.publisher, source, candidate })).rejects.toThrow("acceptance-branch-ownership");
  });
  it("requires exact accepted bytes, human provenance, source and acceptance-head CI", async () => {
    const f = fixture(); const source = await f.source(), candidate = await prepareAcceptanceRequest(f.reader, source);
    const pull = f.seed(candidate.record, true);
    expect(await f.source()).toMatchObject({ disposition: "eligible", acceptance: { kind: "pull-request", id: 500, author: "reviewer" } });
    pull.auto_merge = {};
    await expect(f.source()).rejects.toThrow("acceptance-manual-authority"); pull.auto_merge = null;
    f.ci.set(500, "failure"); await expect(f.source()).rejects.toThrow("implementation-validation"); f.ci.delete(500);
    f.timelines.get(500)![0].performed_via_github_app = {};
    await expect(f.source()).rejects.toThrow("acceptance-merge-provenance"); f.timelines.get(500)![0].performed_via_github_app = null;
    f.permissions.set("reviewer", "read"); await expect(f.source()).rejects.toThrow("acceptance-manual-authority"); f.permissions.set("reviewer", "write");
    f.trees.get(f.acceptanceMerge)![acceptancePath(candidate.record)] += " ";
    await expect(f.source()).rejects.toThrow("acceptance-record-drift");
  });
  it("verifies evidence targets instead of trusting a completion label or URL text", async () => {
    const f = fixture(true), source = await f.source(), candidate = await prepareAcceptanceRequest(f.reader, source);
    candidate.record.tasks[0]!.completion = "evidenced";
    candidate.record.tasks[0]!.evidence = [{ url: "https://github.com/owner/repo/actions/runs/77", outcome: "The exact source-head verification completed successfully." }];
    f.seed(candidate.record);
    await expect(validateAcceptanceCandidate(f.reader, 500)).resolves.toMatchObject({ disposition: "awaiting-manual-acceptance-merge" });
    f.ci.set(-77, "failure");
    await expect(validateAcceptanceCandidate(f.reader, 500)).rejects.toThrow("acceptance-evidence-stale");
    f.ci.delete(-77); candidate.record.tasks[0]!.evidence[0]!.url = `https://github.com/owner/repo/blob/${f.head}/openspec/changes/example/missing.md`;
    f.seed(candidate.record);
    await expect(validateAcceptanceCandidate(f.reader, 500)).rejects.toThrow("acceptance-evidence-stale");
  });
  it("blocks incomplete/bootstrap-only acceptance CI, conflicting authority and extra changes", async () => {
    const f = fixture(); const source = await f.source(), candidate = await prepareAcceptanceRequest(f.reader, source);
    f.seed(candidate.record, true);
    const reader = { ...f.reader, async pages(path: string, limit?: number, field?: string) {
      const values = await f.reader.pages(path, limit, field);
      if (path.includes("/runs/1500/jobs")) values[1].steps = [];
      return values;
    } };
    await expect(loadArchiveEvidence(reader, 400)).rejects.toThrow("acceptance-required-check");
    f.comments.set(400, [{ id: 17, user: { type: "User", login: "reviewer" }, created_at: "2026-09-15T07:00:00Z", updated_at: "2026-09-15T07:00:00Z",
      body: `\`\`\`openspec-acceptance\n${JSON.stringify({ version: 1, change: "example", headSha: f.head, specBaseSha: f.head, verdict: "revoked", implementationComplete: false, manualReview: "pending", specSyncReviewed: false, evidence: "Acceptance was explicitly revoked." })}\n\`\`\`` }]);
    await expect(f.source()).rejects.toThrow("acceptance-incomplete"); f.comments.delete(400);
    f.files.get(500)!.push({ filename: "src/unrelated.ts", status: "modified" });
    await expect(f.source()).rejects.toThrow("acceptance-diff-scope");
  });
  it("routes a manual acceptance merge back to its implementation without recursion", async () => {
    const f = fixture(); const candidate = await prepareAcceptanceRequest(f.reader, await f.source()); f.seed(candidate.record, true);
    const report = await reconcileArchives({ reader: f.reader, tool: {}, pr: 500, dryRun: true, prepare: async () => ({}) });
    expect(report.results).toMatchObject([{ pr: 400, acceptancePr: 500, disposition: "eligible" }]);
    expect(f.mutations).toEqual([]);
  });
  it("retains PR provenance through real archive staging and all local-cleanup gates", async () => {
    const f = fixture(); const request = await prepareAcceptanceRequest(f.reader, await f.source()); f.seed(request.record, true);
    const source = await f.source();
    const tool = await loadArchiveTool(resolve("node_modules/@fission-ai/openspec"));
    const candidate = await prepareArchive({ reader: f.reader, evidence: source, tool, date: "2026-09-15" });
    expect(candidate.acceptanceText).toContain("openspec-acceptance-receipt");
    expect(candidate.acceptanceText).not.toContain("#issuecomment-");
    expect(archivedAcceptanceMatches(candidate.acceptanceText, source, "owner/repo")).toBe(true);
    const entry = { sourcePr: 400, candidatePr: 400, change: "example", role: "implementation" as const, head: f.head, ref: null };
    expect(await verifyCleanupEvidence(f.reader, entry)).toMatchObject({ disposition: "blocked", reason: "archive-missing-or-ambiguous" });
    const archiveHead = "1".repeat(40), archiveMerge = "2".repeat(40);
    const marker = archiveMarker(source, candidate);
    const after = { ...f.trees.get(f.acceptanceMerge) };
    for (const file of candidate.changes) { if (file.data === null) delete after[file.filename]; else after[file.filename] = file.data.toString(); }
    f.trees.set(archiveMerge, after); f.setTarget(archiveMerge);
    f.commits.set(archiveHead, { message: `\`\`\`openspec-archive\n${JSON.stringify(marker)}\n\`\`\``, parents: [{ sha: marker.targetSha }] });
    f.pulls.set(600, { number: 600, state: "closed", merged: true, draft: false, merged_at: "2026-09-15T08:00:00Z", merge_commit_sha: archiveMerge,
      user: { type: "Bot", login: "archive-app[bot]" }, head: { ref: "docs/archive-example", sha: archiveHead, repo: { full_name: "owner/repo" } },
      base: { ref: "develop", sha: f.acceptanceMerge, repo: { full_name: "owner/repo" } }, body: archivePullBody("owner/repo", { ...marker, generatedHead: archiveHead }) });
    expect(await verifyCleanupEvidence(f.reader, entry)).toMatchObject({ disposition: "pending", reason: "remote-ref-present" });
    f.refs.clear();
    expect(await verifyCleanupEvidence(f.reader, entry)).toMatchObject({ disposition: "eligible", sourcePr: 400, archivePr: 600 });
    const historical = await reconcileArchives({ reader: f.reader, tool, pr: 400, dryRun: true });
    expect(historical.results).toMatchObject([{ disposition: "already-archived", acceptancePr: 500, archivePr: 600 }]);
    after[`${candidate.paths.archive}acceptance.md`] += "\n```openspec-acceptance-receipt\n{}\n```\n";
    await expect(verifyCleanupEvidence(f.reader, entry)).rejects.toThrow("metadata-duplicate");
  }, 30_000);
});
