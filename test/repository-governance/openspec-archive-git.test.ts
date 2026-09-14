import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { archiveFailure, archivePaths } from "../../scripts/governance/openspec-archive-policy.mjs";
import { archiveMarker, archivePullBody, publishArchive } from "../../scripts/governance/openspec-archive-publication.mjs";

const execute = promisify(execFile);

describe("archive Git publication against a disposable bare remote", () => {
  it("pushes the exact candidate and refuses a ref advanced between checking and pushing", async () => {
    const root = await mkdtemp(join(tmpdir(), "archive-git-test-"));
    const remote = join(root, "remote.git"), seed = join(root, "seed");
    await mkdir(seed);
    const git = async (cwd: string, args: string[]) => (await execute("git", args, { cwd, timeout: 15_000 })).stdout.trim();
    try {
      await git(root, ["init", "--bare", remote]);
      await git(seed, ["init", "-b", "develop"]);
      await git(seed, ["config", "user.name", "Fixture"]);
      await git(seed, ["config", "user.email", "fixture@example.test"]);
      await mkdir(join(seed, "openspec/specs/existing"), { recursive: true });
      await writeFile(join(seed, "openspec/specs/existing/spec.md"), "Retain this unrelated specification.\n");
      await git(seed, ["add", "."]); await git(seed, ["commit", "-m", "Fixture base"]);
      await git(seed, ["remote", "add", "origin", remote]); await git(seed, ["push", "origin", "develop"]);
      const base = await git(seed, ["rev-parse", "HEAD"]);
      const body = "Accepted fixture evidence";
      const evidence = { implementation: { change: "example" }, targetSha: base,
        pull: { number: 20, head: { sha: "b".repeat(40) }, merge_commit_sha: "d".repeat(40), body: "Source metadata" },
        acceptance: { id: 99, author: "reviewer", createdAt: "2026-09-13T10:00:00Z", bodyDigest: createHash("sha256").update(body).digest("hex") },
        validation: { runId: 7 } };
      const candidate = { paths: archivePaths("example", "2026-09-13", []),
        changes: [{ filename: "openspec/changes/archive/2026-09-13-example/tasks.md", status: "added", data: Buffer.from("Verified fixture archive.\n") }] };
      let ref: string | null = null;
      let existing: any = null;
      const reader = { repository: "owner/repo", prefix: "/repos/owner/repo", async get(path: string) {
        if (path.endsWith("/heads/develop")) return { object: { sha: base } };
        if (path.endsWith("/heads/docs/archive-example") && ref) return { object: { sha: ref } };
        if (path.endsWith("/pulls/20")) return evidence.pull;
        if (path.endsWith("/pulls/50")) return existing;
        if (path.endsWith("/issues/comments/99")) return { body, user: { login: "reviewer" },
          created_at: evidence.acceptance.createdAt, updated_at: evidence.acceptance.createdAt };
        throw archiveFailure("github-not-found");
      } };
      const mutations: string[] = [];
      const publisher = { repository: reader.repository, actor: "archive-app[bot]", token: "fixture-only",
        async mutate(path: string) { mutations.push(path); return { number: 50 }; } };
      const gitImpl = async (command: string, args: string[], options: any) => {
        const actual = args[0] === "remote" && args[1] === "add" ? [...args.slice(0, 3), remote] : args;
        return await execute(command, actual, options);
      };
      const result = await publishArchive({ reader, publisher, evidence, candidate, gitImpl });
      ref = await git(remote, ["rev-parse", "refs/heads/docs/archive-example"]);
      expect(ref).toBe(result.generatedHead);
      expect(await git(remote, ["show", `${ref}:openspec/specs/existing/spec.md`])).toBe("Retain this unrelated specification.");
      expect(await git(remote, ["show", `${ref}:${candidate.changes[0]!.filename}`])).toBe("Verified fixture archive.");
      const marker = { ...archiveMarker(evidence, candidate), generatedHead: ref };
      existing = { number: 50, state: "open", body: archivePullBody(reader.repository, marker), user: { login: publisher.actor },
        base: { ref: "develop" }, head: { sha: ref, ref: candidate.paths.branch, repo: { full_name: reader.repository } } };
      await git(seed, ["commit", "--allow-empty", "-m", "Human sentinel"]);
      await git(seed, ["push", "origin", "HEAD:refs/heads/human-sentinel"]);
      const human = await git(seed, ["rev-parse", "HEAD"]);
      const changed = { ...candidate, changes: [{ ...candidate.changes[0], data: Buffer.from("Regenerated fixture archive.\n") }] };
      const racingGit = async (command: string, args: string[], options: any) => {
        if (args[0] === "push") await git(remote, ["update-ref", "refs/heads/docs/archive-example", human, ref!]);
        return await gitImpl(command, args, options);
      };
      mutations.length = 0;
      await expect(publishArchive({ reader, publisher, evidence, candidate: changed, existing, gitImpl: racingGit })).rejects.toThrow("archive-git");
      expect(await git(remote, ["rev-parse", "refs/heads/docs/archive-example"])).toBe(human);
      expect(mutations).toHaveLength(0);
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 30_000);
});
