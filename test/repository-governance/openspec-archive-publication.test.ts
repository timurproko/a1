import { createHash, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { archivePaths, archiveFailure } from "../../scripts/governance/openspec-archive-policy.mjs";
import { archiveMarker, archivePullBody, createArchivePublisher, publishArchive, readArchiveMarker } from "../../scripts/governance/openspec-archive-publication.mjs";

function fixture() {
  const target = "a".repeat(40), source = "b".repeat(40), generated = "c".repeat(40);
  const evidence = { disposition: "eligible", implementation: { change: "example" }, targetSha: target,
    pull: { number: 20, head: { sha: source }, merge_commit_sha: "d".repeat(40), body: "Original implementation metadata" },
    acceptance: { id: 99, author: "reviewer", createdAt: "2026-09-13T10:00:00Z", bodyDigest: createHash("sha256").update("Exact accepted source").digest("hex") },
    validation: { runId: 7 } };
  const paths = archivePaths("example", "2026-09-13", []);
  const candidate = { paths, changes: [{ filename: `${paths.archive}tasks.md`, status: "added", data: Buffer.from("All performed tasks complete.") }] };
  const mutations: { path: string; method: string; body: unknown }[] = [];
  const calls: { args: string[]; options: { env: Record<string, string>; cwd: string } }[] = [];
  const publisher = { repository: "owner/repo", actor: "archive-app[bot]", token: "fixture-installation-token",
    async mutate(path: string, method: string, body: unknown) { mutations.push({ path, method, body }); return { number: 50 }; } };
  const reader = { repository: "owner/repo", prefix: "/repos/owner/repo",
    async get(path: string) {
      if (path.endsWith("/git/ref/heads/develop")) return { object: { sha: target } };
      if (path.endsWith("/pulls/20")) return evidence.pull;
      if (path.endsWith("/issues/comments/99")) return { created_at: evidence.acceptance.createdAt, updated_at: evidence.acceptance.createdAt,
        user: { login: "reviewer" }, body: "Exact accepted source" };
      throw archiveFailure("github-not-found");
    },
  };
  const gitImpl = async (_command: string, args: string[], options: { env: Record<string, string>; cwd: string }) => {
    calls.push({ args, options });
    if (args[0] === "ls-tree" && args[3] === "HEAD") {
      const file = candidate.changes[0]!;
      const sha = createHash("sha1").update(`blob ${file.data.length}\0`).update(file.data).digest("hex");
      return { stdout: `100644 blob ${sha}\t${file.filename}\0` };
    }
    return { stdout: args[0] === "rev-parse" ? args[1] === "HEAD" ? generated : target : "" };
  };
  return { evidence, candidate, reader, publisher, gitImpl, recheckEvidence: async () => evidence, calls, mutations, target, source, generated };
}

describe("archive publication ownership and authority", () => {
  it("publishes with an expected-ref lease and leaves merging to documentation policy", async () => {
    const f = fixture();
    await expect(publishArchive(f)).resolves.toMatchObject({ disposition: "pending", archivePr: 50, generatedHead: f.generated });
    expect(f.calls.find(call => call.args[0] === "push")?.args).toEqual([
      "push", "--force-with-lease=refs/heads/docs/archive-example:", "origin", "HEAD:refs/heads/docs/archive-example",
    ]);
    expect(f.calls[0]?.options.env.GIT_CONFIG_NOSYSTEM).toBe("1");
    expect(f.calls[0]?.options.env.HOME).not.toBe(f.calls[0]?.options.cwd);
    expect(f.mutations).toHaveLength(1);
    expect(f.mutations[0]).toMatchObject({ path: "/repos/owner/repo/pulls", method: "POST" });
    expect(readArchiveMarker((f.mutations[0]?.body as { body: string }).body)).toMatchObject({ sourceHead: f.source, generatedHead: f.generated });
    expect(f.mutations.some(item => item.path.includes("/merge"))).toBe(false);
  });

  it("refuses target drift before any git or PR mutation", async () => {
    const f = fixture(), get = f.reader.get;
    f.reader.get = async path => path.endsWith("/heads/develop") ? { object: { sha: "f".repeat(40) } } : get(path);
    await expect(publishArchive(f)).rejects.toThrow("target-advanced");
    expect(f.calls).toHaveLength(0); expect(f.mutations).toHaveLength(0);
  });

  it("refuses newly withdrawn acceptance immediately before the remote push", async () => {
    const f = fixture();
    await expect(publishArchive({ ...f, recheckEvidence: async () => { throw archiveFailure("acceptance-conflict"); } })).rejects.toThrow("acceptance-conflict");
    expect(f.calls.some(call => call.args[0] === "push")).toBe(false);
    expect(f.mutations).toHaveLength(0);
  });

  it("refuses human edits, closed PRs, and unknown reserved branch ownership", async () => {
    const f = fixture();
    const marker = archiveMarker(f.evidence, f.candidate);
    const body = `\`\`\`openspec-archive\n${JSON.stringify({ ...marker, generatedHead: f.generated })}\n\`\`\``;
    const existing = { body, number: 50, state: "open", user: { login: f.publisher.actor },
      base: { ref: "develop" }, head: { ref: f.candidate.paths.branch, sha: "f".repeat(40), repo: { full_name: f.reader.repository } } };
    await expect(publishArchive({ ...f, existing })).rejects.toThrow("archive-human-edits");
    await expect(publishArchive({ ...f, existing: { ...existing, state: "closed" } })).rejects.toThrow("archive-pr-closed");
    expect(f.calls).toHaveLength(0); expect(f.mutations).toHaveLength(0);
  });

  it("does not republish an unchanged owned open candidate", async () => {
    const f = fixture();
    const marker = { ...archiveMarker(f.evidence, f.candidate), generatedHead: f.generated };
    const existing = { number: 50, state: "open", user: { login: f.publisher.actor }, base: { ref: "develop" },
      body: archivePullBody(f.reader.repository, marker),
      head: { sha: f.generated, ref: f.candidate.paths.branch, repo: { full_name: f.reader.repository } } };
    const reader = { ...f.reader, async get(path: string) { return path.endsWith("/pulls/50") ? existing : f.reader.get(path); } };
    await expect(publishArchive({ ...f, reader, existing })).resolves.toMatchObject({ disposition: "pending", archivePr: 50 });
    expect(f.calls).toHaveLength(0); expect(f.mutations).toHaveLength(0);
  });

  it("recovers a branch-only publication against its original baseline with an exact lease", async () => {
    const f = fixture(); const orphan = "e".repeat(40), previousBase = "f".repeat(40);
    const recoveryCandidate = { ...f.candidate, targetSha: previousBase };
    const marker = { ...archiveMarker(f.evidence, recoveryCandidate), targetSha: previousBase };
    const file = f.candidate.changes[0]!;
    const sha = createHash("sha1").update(`blob ${file.data.length}\0`).update(file.data).digest("hex");
    let corrupted = false;
    const comparisons: string[] = [];
    const reader = { ...f.reader, async get(path: string) {
      if (path.endsWith("/heads/docs/archive-example")) return { object: { sha: orphan } };
      if (path.endsWith(`/git/commits/${orphan}`)) return { message: `\`\`\`openspec-archive\n${JSON.stringify(marker)}\n\`\`\``, parents: [{ sha: previousBase }] };
      if (path.includes(`/git/trees/${orphan}`)) return { truncated: false, tree: [{ path: file.filename, sha: corrupted ? f.source : sha }] };
      return f.reader.get(path);
    }, async pages(path: string) { comparisons.push(path); return f.candidate.changes; } };
    await expect(publishArchive({ ...f, reader, recoveryCandidate })).resolves.toMatchObject({ disposition: "pending" });
    expect(comparisons[0]).toContain(`${previousBase}...${orphan}`);
    expect(f.calls.find(call => call.args[0] === "push")?.args).toContain(`--force-with-lease=refs/heads/docs/archive-example:${orphan}`);
    f.calls.length = 0; f.mutations.length = 0; corrupted = true;
    await expect(publishArchive({ ...f, reader, recoveryCandidate })).rejects.toThrow("archive-branch-ownership");
    expect(f.calls).toHaveLength(0); expect(f.mutations).toHaveLength(0);
  });

  it("replaces a closed PR only under explicit retry authorization", async () => {
    const f = fixture();
    const marker = { ...archiveMarker(f.evidence, f.candidate), generatedHead: f.generated };
    const existing = { number: 48, state: "closed", user: { login: f.publisher.actor }, base: { ref: "develop" },
      body: archivePullBody(f.reader.repository, marker),
      head: { sha: f.generated, ref: f.candidate.paths.branch, repo: { full_name: f.reader.repository } } };
    const reader = { ...f.reader, async get(path: string) { return path.endsWith("/pulls/48") ? existing : f.reader.get(path); } };
    await expect(publishArchive({ ...f, reader, existing })).rejects.toThrow("archive-pr-closed");
    await expect(publishArchive({ ...f, reader, existing, retryClosed: true })).resolves.toMatchObject({ archivePr: 50 });
    expect(f.mutations).toHaveLength(1);
    expect(f.mutations[0]).toMatchObject({ path: "/repos/owner/repo/pulls", method: "POST" });
  });

  it("rejects out-of-scope files and missing publication identity", async () => {
    const f = fixture();
    await expect(publishArchive({ ...f, publisher: null })).rejects.toThrow("publication-app-setup");
    f.candidate.changes[0]!.filename = "config/baselines/unsafe.json";
    await expect(publishArchive(f)).rejects.toThrow("archive-diff-scope");
    expect(f.mutations).toHaveLength(0);
  });
});

describe("event-triggering App publication", () => {
  it("does not fall back to a workflow token when setup is missing", async () => {
    await expect(createArchivePublisher({ repository: "owner/repo" })).rejects.toThrow("publication-app-setup");
  });

  it("limits token permissions and mutation routes and revokes the installation token", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const requests: { path: string; method: string; body: string }[] = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      const path = new URL(String(url)).pathname;
      requests.push({ path, method: init?.method ?? "GET", body: String(init?.body ?? "") });
      const value = path === "/app" ? { id: 42, slug: "archive-app" }
        : path.startsWith("/users/") ? { id: 1234, login: "archive-app[bot]", type: "Bot" }
        : path.endsWith("/installation") ? { id: 90, app_id: 42 }
        : path.endsWith("/access_tokens") ? { token: "short-lived-token", permissions: { contents: "write", pull_requests: "write" } }
        : path === "/graphql" ? { data: { markPullRequestReadyForReview: { pullRequest: { number: 50 } } } }
        : { number: 50 };
      return path === "/installation/token" ? new Response(null, { status: 204 }) : Response.json(value);
    };
    const publisher = await createArchivePublisher({ repository: "owner/repo", appId: "42",
      privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(), fetchImpl });
    await expect(publisher.mutate("/repos/owner/repo/pulls/50/merge", "PUT", {})).rejects.toThrow("publication-route");
    await expect(publisher.mutate("/repos/owner/repo/git/refs/heads/docs/accept-example-20", "PATCH", {})).rejects.toThrow("publication-route");
    await expect(publisher.mutate("/repos/owner/repo/git/refs", "POST", { ref: "refs/heads/docs/archive-example", sha: "a".repeat(40) })).rejects.toThrow("publication-route");
    await publisher.mutate("/repos/owner/repo/git/trees", "POST", { tree: [] });
    await publisher.mutate("/repos/owner/repo/git/commits", "POST", { message: "owned" });
    await publisher.mutate("/repos/owner/repo/git/refs", "POST", { ref: "refs/heads/docs/accept-example-20", sha: "a".repeat(40) });
    await publisher.mutate("/repos/owner/repo/pulls", "POST", { head: "docs/archive-example" });
    await publisher.ready(50, "PR_accepted");
    await publisher.close();
    expect(JSON.parse(requests.find(item => item.path.endsWith("/access_tokens"))!.body)).toEqual({
      repositories: ["repo"], permissions: { contents: "write", pull_requests: "write" },
    });
    expect(requests.at(-1)).toMatchObject({ path: "/installation/token", method: "DELETE" });
  });
});
