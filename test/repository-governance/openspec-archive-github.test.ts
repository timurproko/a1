import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { loadArchiveTool, prepareArchive } from "../../scripts/governance/openspec-archive-staging.mjs";
import { describe, expect, it } from "vitest";
import { createArchiveReader, loadArchiveEvidence } from "../../scripts/governance/openspec-archive-github.mjs";
import { discoverArchiveCheckpoint, reconcileArchives, validateArchiveCandidate } from "../../scripts/governance/reconcile-openspec-archive.mjs";
import { archiveFailure, archivePaths } from "../../scripts/governance/openspec-archive-policy.mjs";
import { archiveAuthorityCurrent, archiveMarker, memoizeArchiveAuthorityGet } from "../../scripts/governance/openspec-archive-publication.mjs";
import { advanceArchiveCheckpoint, newArchiveCheckpoint, scanArchiveCandidates, validateArchiveCheckpoint } from "../../scripts/governance/openspec-archive-scan.mjs";

function fixture() {
  const repository = "owner/repo", prefix = `/repos/${repository}`;
  const sha = "a".repeat(40), merge = "b".repeat(40), target = "c".repeat(40), spec = "d".repeat(40);
  const block = (label: string, value: unknown) => `\`\`\`${label}\n${JSON.stringify(value)}\n\`\`\``;
  const pull = { number: 20, state: "closed", merged: true, draft: false, changed_files: 1,
    merged_at: "2026-09-13T11:00:00Z", merge_commit_sha: merge,
    head: { sha, ref: "feature/example", repo: { full_name: repository } }, base: { sha: spec, ref: "develop", repo: { full_name: repository } },
    body: block("openspec-implementation", { version: 1, change: "example", specificationPr: 10 }) };
  const comment = { id: 99, user: { type: "User", login: "reviewer" }, created_at: "2026-09-13T10:00:00Z", updated_at: "2026-09-13T10:00:00Z",
    body: block("openspec-acceptance", { version: 1, change: "example", headSha: sha, specBaseSha: spec,
      verdict: "accepted", implementationComplete: true, manualReview: "passed", specSyncReviewed: true, evidence: "Exact build reviewed." }) };
  const run = { id: 7, head_sha: sha, head_branch: "feature/example", head_repository: { full_name: repository }, path: ".github/workflows/ci.yml", event: "pull_request",
    status: "completed", conclusion: "success", run_number: 5, run_attempt: 1, pull_requests: [{ number: 20, head: { sha }, base: { sha: spec } }] };
  const required = { name: "Development validation required", status: "completed", conclusion: "success", head_sha: sha };
  const routes: Record<string, unknown> = {
    [`${prefix}/pulls`]: [], [`${prefix}/pulls/20`]: pull,
    [`${prefix}/pulls/20/files`]: [{ filename: "src/example.ts", status: "modified" }],
    [`${prefix}/git/ref/heads/develop`]: { object: { sha: target } },
    [`${prefix}/pulls/10`]: { merged: true, base: pull.base, merge_commit_sha: spec, merged_at: "2026-09-12T11:00:00Z", changed_files: 1 },
    [`${prefix}/pulls/10/files`]: [{ filename: "openspec/changes/example/.openspec.yaml", status: "added" }],
    [`${prefix}/issues/20/comments`]: [comment], [`${prefix}/collaborators/reviewer/permission`]: { permission: "write" },
    [`${prefix}/actions/workflows/ci.yml/runs`]: { total_count: 1, workflow_runs: [run] },
    [`${prefix}/actions/runs/7/jobs`]: { total_count: 1, jobs: [required] },
  };
  // Compatibility: legacy fixtures explicitly expose the authoritative registry/active trees for the new receipt reader.
  const tree = Object.entries({ "openspec/changes/example/.openspec.yaml": "schema: spec-driven\n",
    "openspec/changes/example/tasks.md": "## Tasks\n- [ ] 1.1 Verify the live lifecycle and record outcomes.\n" }).map(([path, text]) => {
    const bytes = Buffer.from(text);
    const id = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    routes[`${prefix}/git/blobs/${id}`] = { encoding: "base64", size: bytes.length, content: bytes.toString("base64") };
    return { path, sha: id, mode: "100644", type: "blob" };
  });
  for (const commit of [sha, merge, target]) routes[`${prefix}/git/trees/${commit}`] = { truncated: false, tree };
  const requests: { method: string; path: string }[] = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    requests.push({ method: init?.method ?? "GET", path });
    const comparison = /\/compare\/([a-f0-9]{40})\.\.\./.exec(path);
    const value = Object.hasOwn(routes, path) ? routes[path] : comparison ? { status: "ahead", merge_base_commit: { sha: comparison[1] } } : null;
    return new Response(JSON.stringify(value), { status: value === null ? 404 : 200 });
  };
  return { reader: createArchiveReader({ repository, token: "read-only-fixture", fetchImpl }), routes, requests, pull, comment, run, required, sha, spec, target, prefix };
}

describe("archive GitHub evidence", () => {
  it("links specification, accepted head, merge ancestry and real required CI", async () => {
    const f = fixture();
    const evidence = await loadArchiveEvidence(f.reader, 20);
    expect(evidence).toMatchObject({ disposition: "eligible", targetSha: f.target,
      acceptance: { id: 99, author: "reviewer" }, validation: { runId: 7, headSha: f.sha } });
    expect(f.requests.every(request => request.method === "GET")).toBe(true);
  });
  it("binds version-2 artifacts to source and merged trees without a specification PR", async () => {
    const f = fixture();
    f.pull.body = '```openspec-implementation\n{"version":2,"change":"example"}\n```';
    const item = { path: "openspec/changes/example/.openspec.yaml", sha: "e".repeat(40), mode: "100644", type: "blob" };
    f.routes[`${f.prefix}/git/trees/${f.sha}`] = { truncated: false, tree: [item] };
    f.routes[`${f.prefix}/git/trees/${f.pull.merge_commit_sha}`] = { truncated: false, tree: [item] };
    await expect(loadArchiveEvidence(f.reader, 20)).resolves.toMatchObject({ disposition: "eligible", implementation: { version: 2 } });
    expect(f.requests.some(request => request.path.includes("/pulls/10"))).toBe(false);
    f.routes[`${f.prefix}/git/trees/${f.pull.merge_commit_sha}`] = { truncated: false, tree: [{ ...item, sha: "f".repeat(40) }] };
    await expect(loadArchiveEvidence(f.reader, 20)).rejects.toThrow("implementation-change-drift");
    f.routes[`${f.prefix}/git/trees/${f.pull.merge_commit_sha}`] = { truncated: false, tree: [] };
    await expect(loadArchiveEvidence(f.reader, 20)).rejects.toThrow("implementation-change-missing");
    f.pull.merged = false;
    const rejected = await reconcileArchives({ reader: f.reader, tool: {}, pr: 20, dryRun: true });
    expect(rejected.results).toMatchObject([{ disposition: "blocked", reason: "implementation-merge" }]);
    expect(f.requests.every(request => request.method === "GET")).toBe(true);
  });

  it("recovers cleared historical run associations only with matching commit and branch evidence", async () => {
    const f = fixture(); f.run.pull_requests = [];
    f.routes[`${f.prefix}/commits/${f.sha}/pulls`] = [f.pull];
    await expect(loadArchiveEvidence(f.reader, 20)).resolves.toMatchObject({ disposition: "eligible" });
    f.run.head_branch = "feature/unrelated";
    await expect(loadArchiveEvidence(f.reader, 20)).rejects.toThrow("implementation-validation");
    f.run.head_branch = "feature/example";
    f.routes[`${f.prefix}/commits/${f.sha}/pulls`] = [];
    await expect(loadArchiveEvidence(f.reader, 20)).rejects.toThrow("implementation-validation");
  });
  it.each(["failure", "cancelled", "skipped", "pending"])("does not accept %s validation", async conclusion => {
    const f = fixture(); f.run.conclusion = conclusion;
    await expect(loadArchiveEvidence(f.reader, 20)).rejects.toThrow("implementation-validation");
  });
  it("refuses unrelated successful CI and verifies synthetic check heads", async () => {
    const f = fixture(); f.run.pull_requests[0]!.number = 21;
    await expect(loadArchiveEvidence(f.reader, 20)).rejects.toThrow("implementation-validation");
    f.run.pull_requests[0]!.number = 20;
    f.required.head_sha = "e".repeat(40);
    f.routes[`${f.prefix}/git/commits/${f.required.head_sha}`] = { parents: [{ sha: f.spec }, { sha: f.sha }] };
    await expect(loadArchiveEvidence(f.reader, 20)).resolves.toMatchObject({ disposition: "eligible" });
    f.routes[`${f.prefix}/git/commits/${f.required.head_sha}`] = { parents: [{ sha: f.spec }, { sha: "f".repeat(40) }] };
    await expect(loadArchiveEvidence(f.reader, 20)).rejects.toThrow("validation-head");
  });
  it("refuses missing acceptance, stale authority and incomplete required checks", async () => {
    const f = fixture();
    f.routes[`${f.prefix}/issues/20/comments`] = [];
    await expect(loadArchiveEvidence(f.reader, 20)).rejects.toThrow("acceptance-missing");
    f.routes[`${f.prefix}/issues/20/comments`] = [f.comment];
    f.routes[`${f.prefix}/collaborators/reviewer/permission`] = { permission: "read" };
    await expect(loadArchiveEvidence(f.reader, 20)).rejects.toThrow("acceptance-authority");
    f.routes[`${f.prefix}/collaborators/reviewer/permission`] = { permission: "write" };
    f.required.conclusion = "skipped";
    await expect(loadArchiveEvidence(f.reader, 20)).rejects.toThrow("implementation-required-check");
  });
  it("refuses broken ancestry or a spec PR that did not introduce the change", async () => {
    const f = fixture();
    f.routes[`${f.prefix}/compare/${f.spec}...${f.sha}`] = { status: "diverged", merge_base_commit: { sha: f.spec } };
    await expect(loadArchiveEvidence(f.reader, 20)).rejects.toThrow("commit-ancestry");
    delete f.routes[`${f.prefix}/compare/${f.spec}...${f.sha}`];
    f.routes[`${f.prefix}/pulls/10/files`] = [{ filename: "openspec/changes/other/.openspec.yaml", status: "added" }];
    await expect(loadArchiveEvidence(f.reader, 20)).rejects.toThrow("specification-change-link");
  });
  it("sanitizes failed API responses and refuses cross-repository endpoints", async () => {
    const f = fixture();
    await expect(f.reader.get("/repos/other/repo/pulls/1")).rejects.toThrow("api-scope");
    const reader = createArchiveReader({ repository: "owner/repo", fetchImpl: async () => new Response("private response", { status: 403 }) });
    await expect(reader.get("/repos/owner/repo/pulls/1")).rejects.toThrow("github-request");
  });
});

describe("read-only archive reconciliation", () => {
  it("audits eligible work without invoking a publisher or altering checkpoint state", async () => {
    const f = fixture(); let preparations = 0;
    const report = await reconcileArchives({ reader: f.reader, tool: {}, pr: 20, dryRun: true,
      publisherFactory: () => { throw new Error("Unexpected mutation"); },
      prepare: async () => { preparations += 1; return {}; },
      publish: () => { throw new Error("Unexpected publication"); },
    });
    expect(report.results).toMatchObject([{ pr: 20, disposition: "eligible" }]);
    expect(preparations).toBe(1);
    expect(report.checkpoint).toBeNull();
    expect(f.requests.every(request => request.method === "GET")).toBe(true);
  });
  it("reports unfinished work and unlinked PRs without pretending completion", async () => {
    const f = fixture();
    const report = await reconcileArchives({ reader: f.reader, tool: {}, pr: 20,
      prepare: async () => { throw Object.assign(new Error("tasks-incomplete"), { archiveCode: "tasks-incomplete", archiveDetail: "4.2" }); },
    });
    expect(report.results).toMatchObject([{ disposition: "accepted-archive-blocked", reason: "tasks-incomplete", detail: "4.2" }]);
    f.pull.body = "Planning only, no implementation metadata";
    const unlinked = await reconcileArchives({ reader: f.reader, tool: {}, pr: 20 });
    expect(unlinked.results).toMatchObject([{ disposition: "unlinked" }]);
  });
});

describe("archive orchestration and current authority", () => {
  it("stops before network access when the shared deadline expires", async () => {
    let requests = 0;
    const reader = createArchiveReader({ repository: "owner/repo", deadline: 0,
      fetchImpl: async () => { requests += 1; throw new Error("Unexpected request"); } });
    await expect(reader.get("/repos/owner/repo/pulls/1")).rejects.toThrow("archive-deadline");
    expect(requests).toBe(0);
  });

  it("finds a retained trusted cursor without requiring an exhaustive workflow history", async () => {
    const f = fixture();
    const trusted = { id: 8, head_branch: "develop", head_repository: { full_name: "owner/repo" },
      event: "schedule", path: ".github/workflows/openspec-archive.yml" };
    f.routes[`${f.prefix}/actions/workflows/openspec-archive.yml/runs`] = { total_count: 9000,
      workflow_runs: [{ ...trusted, id: 9, head_branch: "untrusted" }, trusted] };
    f.routes[`${f.prefix}/actions/runs/8/artifacts`] = { total_count: 1,
      artifacts: [{ name: "openspec-archive-checkpoint", expired: false, size_in_bytes: 1000 }] };
    expect(await discoverArchiveCheckpoint(f.reader)).toBe(8);
    f.routes[`${f.prefix}/actions/runs/8/artifacts`] = { total_count: 1,
      artifacts: [{ name: "openspec-archive-checkpoint", expired: true, size_in_bytes: 1000 }] };
    expect(await discoverArchiveCheckpoint(f.reader)).toBeNull();
    expect(f.requests.some(request => request.path.includes("/runs/9/artifacts"))).toBe(false);
  });

  it("preserves queue serialization before staging a second change", async () => {
    const f = fixture();
    const evidence = await loadArchiveEvidence(f.reader, 20);
    const marker = archiveMarker(evidence, { paths: archivePaths("example", "2026-09-13", []), changes: [] });
    const queued = { number: 50, head: { ref: "docs/archive-example" },
      body: `\`\`\`openspec-archive\n${JSON.stringify(marker)}\n\`\`\`` };
    const reader = { ...f.reader, async pages(path: string, limit?: number, field?: string) {
      if (path.startsWith("/pulls?state=open")) return [queued];
      if (path.startsWith("/pulls?state=all")) return [];
      return f.reader.pages(path, limit, field);
    } };
    const report = await reconcileArchives({ reader, tool: {}, pr: 20, dryRun: false,
      prepare: () => { throw new Error("Must not stage while another archive is pending"); },
      publisherFactory: () => { throw new Error("Must not publish"); } });
    expect(report.results).toMatchObject([{ disposition: "deferred", reason: "archive-queue-pending", archivePr: 50 }]);
  });

  it("reports missing publication setup and does not leak exception bodies", async () => {
    const f = fixture();
    f.routes[`${f.prefix}/issues/20/comments`] = [];
    const missing = await reconcileArchives({ reader: f.reader, tool: {}, pr: 20, dryRun: false,
      publisherFactory: () => { throw archiveFailure("publication-app-setup"); } });
    expect(missing.results).toMatchObject([{ change: "example", disposition: "blocked", reason: "publication-app-setup", reporting: "publication-app-setup" }]);
    const audit = await reconcileArchives({ reader: f.reader, tool: {}, pr: 20, dryRun: true });
    expect(audit.results).toMatchObject([{ change: "example", disposition: "awaiting-manual-acceptance-merge", proposedAcceptance: true }]);
    f.routes[`${f.prefix}/issues/20/comments`] = [f.comment];
    const privateError = await reconcileArchives({ reader: f.reader, tool: {}, pr: 20,
      prepare: () => { throw new Error("PRIVATE exception containing credentials"); } });
    expect(JSON.stringify(privateError)).not.toContain("PRIVATE");
    expect(privateError.results[0].reason).toBe("internal-error");
  });

  it("reports current archive CI failure without waiting or claiming integration", async () => {
    const f = fixture(); const head = "e".repeat(40);
    const reader = { ...f.reader, async pages(path: string, limit?: number, field?: string) {
      if (path.includes(`head_sha=${head}`)) return [{ head_sha: head, run_number: 8, status: "completed", conclusion: "failure" }];
      return f.reader.pages(path, limit, field);
    } };
    let publishes = 0;
    const report = await reconcileArchives({ reader, tool: {}, pr: 20, dryRun: false,
      prepare: async () => ({}), publisherFactory: async () => ({ actor: "archive-app[bot]", async mutate() {}, async close() {} }),
      publish: async () => { publishes += 1; return { disposition: "pending", archivePr: 50, generatedHead: head }; } });
    expect(publishes).toBe(1);
    expect(report.results).toMatchObject([{ disposition: "accepted-archive-blocked", reason: "archive-validation-failed", archivePr: 50 }]);
  });

  it("deduplicates concurrent immutable authority reads within one decision", async () => {
    const calls: string[] = [];
    const get = memoizeArchiveAuthorityGet(async path => {
      calls.push(path);
      await new Promise(resolve => setTimeout(resolve, 1));
      return { path };
    });
    const [first, second] = await Promise.all([get("/source"), get("/source")]);
    expect(first).toBe(second);
    expect(calls).toEqual(["/source"]);
    await get("/other");
    expect(calls).toEqual(["/source", "/other"]);
  });

  it("rechecks committed metadata, current acceptance bytes and maintainer permissions", async () => {
    const f = fixture(); const head = "e".repeat(40);
    const evidence = await loadArchiveEvidence(f.reader, 20);
    const marker = archiveMarker(evidence, { paths: archivePaths("example", "2026-09-13", []), changes: [] });
    f.routes[`${f.prefix}/git/commits/${head}`] = { message: `\`\`\`openspec-archive\n${JSON.stringify(marker)}\n\`\`\``, parents: [{ sha: f.target }] };
    f.routes[`${f.prefix}/issues/comments/99`] = f.comment;
    const check = () => archiveAuthorityCurrent(f.reader.get, "owner/repo", { head: { sha: head } }, { ...marker, generatedHead: head });
    f.requests.length = 0;
    expect(await check()).toBe(true);
    expect(f.requests.filter(request => request.path === `${f.prefix}/pulls/20`)).toHaveLength(1);
    f.routes[`${f.prefix}/collaborators/reviewer/permission`] = { permission: "read" };
    expect(await check()).toBe(false);
    f.routes[`${f.prefix}/collaborators/reviewer/permission`] = { permission: "write" };
    f.routes[`${f.prefix}/issues/20/comments`] = [f.comment, { ...f.comment, id: 100,
      body: f.comment.body.replace('"verdict":"accepted"', '"verdict":"revoked"') }];
    expect(await check()).toBe(false);
    f.routes[`${f.prefix}/issues/20/comments`] = [f.comment];
    f.comment.body += "\nRevoked";
    expect(await check()).toBe(false);
  });

  it("validates an actual CLI-generated archive against its synthetic merge result", async () => {
    const f = fixture(); const head = "e".repeat(40), preview = "f".repeat(40);
    const active = "openspec/changes/example/";
    const source: Record<string, string> = {
      "openspec/config.yaml": "schema: spec-driven\n",
      [`${active}.openspec.yaml`]: "schema: spec-driven\ncreated: 2026-09-13\nskip_specs: true\n",
      [`${active}proposal.md`]: "## Why\nImprove internal tooling.\n\n## What Changes\n- Refactor internal tooling.\n\n## Capabilities\n### New Capabilities\nNone.\n\n## Impact\nInternal tooling only.\n",
      [`${active}design.md`]: "## Context\nInternal tooling fixture.\n",
      [`${active}tasks.md`]: "## Tasks\n- [x] 1.1 Implement and verify the internal refactor.\n",
    };
    f.pull.body = '```openspec-implementation\n{"version":2,"change":"example"}\n```';
    const trees = new Map([[f.sha, source], [f.pull.merge_commit_sha, source], [f.target, source], [f.spec, {} as Record<string, string>]]);
    const blobs = new Map<string, Buffer>();
    const reader = { ...f.reader, async get(path: string) {
      const sha = /\/git\/trees\/([a-f0-9]{40})\?/.exec(path)?.[1];
      if (sha) return { truncated: false, tree: Object.entries(trees.get(sha)!).map(([name, content]) => {
        const bytes = Buffer.from(content);
        const digest = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
        blobs.set(digest, bytes);
        return { path: name, sha: digest, mode: "100644", type: "blob" };
      }) };
      if (path.includes("/git/blobs/")) {
        const bytes = blobs.get(path.split("/").at(-1)!)!;
        return { encoding: "base64", size: bytes.length, content: bytes.toString("base64") };
      }
      return f.reader.get(path);
    } };
    const tool = await loadArchiveTool(resolve("node_modules/@fission-ai/openspec"));
    const evidence = await loadArchiveEvidence(reader, 20);
    const candidate = await prepareArchive({ reader, tool, evidence, date: "2026-09-13" });
    expect(candidate.changes.every((file: { filename: string }) => !file.filename.startsWith("openspec/specs/"))).toBe(true);
    const result = { ...source };
    for (const file of candidate.changes) {
      if (file.data === null) delete result[file.filename]; else result[file.filename] = file.data.toString();
    }
    trees.set(preview, result);
    const marker = archiveMarker(evidence, candidate);
    f.routes[`${f.prefix}/pulls/50`] = { head: { sha: head, repo: { full_name: "owner/repo" } }, base: { ref: "develop" },
      merge_commit_sha: preview, changed_files: candidate.changes.length,
      body: `\`\`\`openspec-archive\n${JSON.stringify({ ...marker, generatedHead: head })}\n\`\`\`` };
    f.routes[`${f.prefix}/pulls/50/files`] = candidate.changes;
    f.routes[`${f.prefix}/git/commits/${head}`] = { message: `\`\`\`openspec-archive\n${JSON.stringify(marker)}\n\`\`\`` };
    f.routes[`${f.prefix}/git/commits/${preview}`] = { parents: [{ sha: f.target }, { sha: head }] };
    await expect(validateArchiveCandidate(reader, tool, 50)).resolves.toMatchObject({ disposition: "validated", headSha: head });
    result[`${candidate.paths.archive}tasks.md`] += "\nUnreviewed mutation.\n";
    await expect(validateArchiveCandidate(reader, tool, 50)).rejects.toThrow("archive-merge-result-mismatch");
    result[`${candidate.paths.archive}tasks.md`] = source[`${active}tasks.md`]!;
    const currentTarget = "1".repeat(40), archiveMerge = "2".repeat(40);
    trees.set(currentTarget, result);
    f.routes[`${f.prefix}/git/ref/heads/develop`] = { object: { sha: currentTarget } };
    const integrated = { ...f.routes[`${f.prefix}/pulls/50`] as object, number: 50, state: "closed",
      merged_at: "2026-09-13T12:00:00Z", merge_commit_sha: archiveMerge };
    const historical = { ...reader, async pages(path: string, limit?: number, field?: string) {
      if (path.startsWith("/pulls?state=all")) return [integrated];
      return reader.pages(path, limit, field);
    } };
    const report = await reconcileArchives({ reader: historical, tool, pr: 20 });
    expect(report.results).toMatchObject([{ disposition: "already-archived", archivePr: 50, mergeCommit: archiveMerge }]);
  }, 30_000);

  it("does not let a PR body add or conceal an archive identity after ordinary CI", async () => {
    const f = fixture(); const head = "e".repeat(40);
    const evidence = await loadArchiveEvidence(f.reader, 20);
    const marker = archiveMarker(evidence, { paths: archivePaths("example", "2026-09-13", []), changes: [] });
    const pull = { head: { sha: head }, body: "Ordinary documentation" };
    f.routes[`${f.prefix}/pulls/50`] = pull;
    f.routes[`${f.prefix}/git/commits/${head}`] = { message: "Ordinary documentation" };
    await expect(validateArchiveCandidate(f.reader, {}, 50)).resolves.toMatchObject({ disposition: "not-generated" });
    pull.body = `\`\`\`openspec-archive\n${JSON.stringify({ ...marker, generatedHead: head })}\n\`\`\``;
    await expect(validateArchiveCandidate(f.reader, {}, 50)).rejects.toThrow("archive-candidate-identity");
    pull.body = "Ordinary documentation";
    f.routes[`${f.prefix}/git/commits/${head}`] = { message: `\`\`\`openspec-archive\n${JSON.stringify(marker)}\n\`\`\`` };
    await expect(validateArchiveCandidate(f.reader, {}, 50)).rejects.toThrow("archive-candidate-identity");
  });
});

describe("bounded catch-up cursor", () => {
  it("sorts merged identities and resumes without newer work starving older candidates", async () => {
    const checkpoint = newArchiveCheckpoint();
    const mergedAt = new Date(Date.now() - 1000).toISOString();
    const items = [22, 20, 21].map(number => ({ number, pull_request: { merged_at: mergedAt } }));
    const reader = { repository: "owner/repo", async get() { return { incomplete_results: false, total_count: 3, items }; } };
    const scan = await scanArchiveCandidates(reader, checkpoint);
    expect(scan.candidates.map((item: { number: number }) => item.number)).toEqual([20, 21, 22]);
    const cursor = advanceArchiveCheckpoint(checkpoint, scan, scan.candidates.slice(0, 1));
    expect(cursor.last[1]).toBe(20);
    expect((await scanArchiveCandidates(reader, cursor)).candidates.map((item: { number: number }) => item.number)).toEqual([21, 22]);
    expect(advanceArchiveCheckpoint(checkpoint, scan, scan.candidates)).toBeNull();
  });
  it("splits over-budget windows and refuses duplicate or saturated search pages", async () => {
    const checkpoint = newArchiveCheckpoint();
    const start = Date.parse(checkpoint.start), end = Date.parse(checkpoint.end);
    const items = Array.from({ length: 600 }, (_, index) => ({ number: index + 1,
      pull_request: { merged_at: new Date(Math.floor((start + (end - start) * (index + 1) / 601) / 1000) * 1000).toISOString() } }));
    const reader = { repository: "owner/repo", async get(path: string) {
      const params = new URL(`https://api.github.com${path}`).searchParams;
      const [from, to] = params.get("q")!.split("merged:")[1]!.split("..").map(Date.parse);
      const matches = items.filter(item => Date.parse(item.pull_request.merged_at) >= from! && Date.parse(item.pull_request.merged_at) <= to!);
      const page = Number(params.get("page"));
      return { incomplete_results: false, total_count: matches.length, items: matches.slice((page - 1) * 100, page * 100) };
    } };
    const scan = await scanArchiveCandidates(reader, checkpoint);
    expect(scan.scanned).toBeLessThanOrEqual(500);
    expect(scan.complete).toBe(false);
    const next = advanceArchiveCheckpoint(checkpoint, scan, scan.candidates);
    expect(Date.parse(next.start)).toBe(Date.parse(scan.windowEnd) + 1000);
    const duplicate = { repository: "owner/repo", async get() { return { total_count: 2, incomplete_results: false, items: [items[0], items[0]] }; } };
    await expect(scanArchiveCandidates(duplicate, checkpoint)).rejects.toThrow("scan-search-changed");
    const saturated = { repository: "owner/repo", async get() { return { total_count: 501, incomplete_results: false, items: [] }; } };
    await expect(scanArchiveCandidates(saturated, { ...checkpoint, start: checkpoint.end })).rejects.toThrow("scan-time-bucket-capacity");
  });
  it("rejects future or oversized windows and incomplete search responses", async () => {
    expect(() => validateArchiveCheckpoint({ version: 1, start: "2000-01-01", end: "2026-09-13", last: null })).toThrow("scan-checkpoint");
    const reader = { repository: "owner/repo", async get() { return { incomplete_results: true }; } };
    await expect(scanArchiveCandidates(reader, newArchiveCheckpoint())).rejects.toThrow("scan-search-incomplete");
  });
});
