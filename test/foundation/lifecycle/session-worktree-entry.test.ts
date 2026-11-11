import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearSessionRepositoryContext, listSessionRepositoryWorktrees, readActiveSessionRepositoryContext,
  registerSessionRepositoryRuntime, setSessionRepositoryContext,
} from "../../../src/foundation/lifecycle/session-repository-context.js";
import { enterSessionRepositoryWorktree } from "../../../src/foundation/lifecycle/session-worktree-entry.js";
import { updateSessionRepositoryContext } from "../../../src/features/launch/session-context.js";
import { withSessionClaimLock } from "../../../src/foundation/lifecycle/session-claim-lock.js";

const execute = promisify(execFile);
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5 }))); });

async function fixture(base = "develop") {
  const root = await mkdtemp(join(tmpdir(), "a1-worktree-entry-")); roots.push(root);
  const primary = join(root, "primary"), dataDir = join(root, "data");
  const git = async (...args: string[]) => (await execute("git", ["-C", primary, ...args], { encoding: "utf8" })).stdout.trim();
  await execute("git", ["init", "-b", base, primary]);
  await writeFile(join(primary, "README.md"), "base\n");
  await git("add", ".");
  await git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "base");
  const identity = { sessionId: "session-one", sessionFile: join(root, "session.jsonl") };
  await writeFile(identity.sessionFile, JSON.stringify({ type: "session", id: identity.sessionId, cwd: primary }) + "\n");
  const inspectProcess = async (pid: number) => ({ pid, startIdentity: "test" });
  const options = { dataDir, runtimeId: "runtime-one", inspectProcess };
  await registerSessionRepositoryRuntime(identity, options.runtimeId, { pid: 1001, startIdentity: "test" }, options);
  return { root, primary, dataDir, identity, options, git };
}

describe("self-contained worktree entry", () => {
  it.each(["main", "develop"])("creates from %s, resumes edits, and detaches without deleting", async base => {
    const f = await fixture(base);
    const result = await updateSessionRepositoryContext(f.identity, { action: "enter-worktree", branch: "fix/example" }, f.options);
    expect(result).toMatchObject({ kind: "linked", branch: "fix/example" });
    if (result.kind !== "linked") throw new Error("expected attachment");
    expect(result.cwd).toBe(await realpath(join(f.primary, ".worktrees", "example")));
    await writeFile(join(result.cwd, "README.md"), "local edits\n");
    expect(await enterSessionRepositoryWorktree(f.identity, "fix/example", undefined, f.options)).toMatchObject({ cwd: result.cwd });
    expect(await readFile(join(result.cwd, "README.md"), "utf8")).toBe("local edits\n");
    expect((await readActiveSessionRepositoryContext(f.identity, f.options))?.cwd).toBe(result.cwd);
    const claimDir = join(f.dataDir, "session-worktree-claims", "worktrees");
    const names = await readdir(claimDir);
    const bytes = await readFile(join(claimDir, names[0]!), "utf8");
    await readActiveSessionRepositoryContext(f.identity, f.options);
    expect(await readFile(join(claimDir, names[0]!), "utf8")).toBe(bytes);
    await clearSessionRepositoryContext(f.identity, f.options);
    expect(await readActiveSessionRepositoryContext(f.identity, f.options)).toBeNull();
    expect(await readFile(join(result.cwd, "README.md"), "utf8")).toBe("local edits\n");
    expect(await f.git("branch", "--show-current")).toBe(base);
  });

  it("fetches the remote default base instead of assuming main or develop", async () => {
    const f = await fixture("integration");
    const remote = join(f.root, "remote.git");
    await execute("git", ["clone", "--bare", f.primary, remote]);
    await f.git("remote", "add", "origin", remote);
    const result = await enterSessionRepositoryWorktree(f.identity, "feat/remote-base", undefined, f.options);
    expect(result.branch).toBe("feat/remote-base");
    expect(await f.git("rev-parse", "refs/remotes/origin/integration")).toBe(await f.git("rev-parse", "integration"));
  });

  it("honors an explicit base and refuses path/branch collisions", async () => {
    const f = await fixture();
    await f.git("branch", "alternate");
    const result = await enterSessionRepositoryWorktree(f.identity, "fix/example", "alternate", f.options);
    await expect(enterSessionRepositoryWorktree(f.identity, "feat/example", undefined, f.options)).rejects.toMatchObject({ code: "worktree-path-collision" });
    await f.git("branch", "fix/existing");
    await expect(enterSessionRepositoryWorktree(f.identity, "fix/existing", undefined, f.options)).rejects.toMatchObject({ code: "worktree-branch-collision" });
    await expect(enterSessionRepositoryWorktree(f.identity, "../../escape", undefined, f.options)).rejects.toMatchObject({ code: "worktree-branch-invalid" });
    expect((await readActiveSessionRepositoryContext(f.identity, f.options))?.cwd).toBe(result.cwd);
  });

  it("preserves the old attachment when a foreign, primary, locked, or busy checkout is requested", async () => {
    const f = await fixture(), foreign = await fixture();
    const first = await enterSessionRepositoryWorktree(f.identity, "fix/first", undefined, f.options);
    const second = await enterSessionRepositoryWorktree(f.identity, "fix/second", undefined, f.options);
    await setSessionRepositoryContext(f.identity, first.cwd, f.options);
    await expect(setSessionRepositoryContext(f.identity, foreign.primary, f.options)).rejects.toMatchObject({ code: "worktree-foreign-repository" });
    await expect(setSessionRepositoryContext(f.identity, f.primary, f.options)).rejects.toMatchObject({ code: "worktree-primary-checkout" });
    await f.git("worktree", "lock", second.cwd);
    await expect(setSessionRepositoryContext(f.identity, second.cwd, f.options)).rejects.toMatchObject({ code: "worktree-git-locked" });
    await f.git("worktree", "unlock", second.cwd);
    const other = { sessionId: "session-two", sessionFile: join(f.root, "other.jsonl") };
    await writeFile(other.sessionFile, JSON.stringify({ type: "session", id: other.sessionId, cwd: f.primary }) + "\n");
    const options = { ...f.options, runtimeId: "runtime-two" };
    await registerSessionRepositoryRuntime(other, options.runtimeId, { pid: 1002, startIdentity: "test" }, options);
    await setSessionRepositoryContext(other, second.cwd, options);
    await expect(setSessionRepositoryContext(f.identity, second.cwd, f.options)).rejects.toMatchObject({ code: "worktree-active-in-another-session" });
    expect((await readActiveSessionRepositoryContext(f.identity, f.options))?.cwd).toBe(first.cwd);
  }, 15_000);

  it("waits internally for ordinary coordination without poisoning the inventory", async () => {
    const f = await fixture();
    const selected = await enterSessionRepositoryWorktree(f.identity, "fix/first", undefined, f.options);
    let release!: () => void, acquired!: () => void;
    const ready = new Promise<void>(resolve => { acquired = resolve; });
    const holder = withSessionClaimLock(join(f.dataDir, "session-worktree-claims"), {}, async () => {
      acquired(); await new Promise<void>(resolve => { release = resolve; });
    });
    await ready;
    const listing = listSessionRepositoryWorktrees(f.identity, f.options);
    setTimeout(release, 100);
    const entries = await listing;
    await holder;
    expect(entries.find(entry => entry.cwd === selected.cwd)?.status).toBe("current");
    expect(entries.some(entry => entry.status === "unverifiable")).toBe(false);
  });

  it("does not execute repository checkout hooks while creating a worktree", async () => {
    const f = await fixture();
    const hooks = join(f.root, "hooks"); await mkdir(hooks);
    await writeFile(join(hooks, "post-checkout"), "#!/bin/sh\nprintf hook-ran > hook-marker.txt\n", { mode: 0o755 });
    await f.git("config", "core.hooksPath", hooks);
    const result = await enterSessionRepositoryWorktree(f.identity, "fix/no-hooks", undefined, f.options);
    await expect(readFile(join(result.cwd, "hook-marker.txt"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps an unrelated broken registration from blocking attachment", async () => {
    const f = await fixture();
    const broken = await enterSessionRepositoryWorktree(f.identity, "fix/broken", undefined, f.options);
    // Platform: replace the fixture's hidden Windows Git pointer rather than truncating it in place.
    await rm(join(broken.cwd, ".git"));
    await writeFile(join(broken.cwd, ".git"), "gitdir: missing-administrative-directory\n");
    const selected = await enterSessionRepositoryWorktree(f.identity, "fix/healthy", undefined, f.options);
    const rows = await listSessionRepositoryWorktrees(f.identity, f.options);
    expect(rows.find(row => row.cwd === selected.cwd)?.status).toBe("current");
    expect(rows.find(row => row.branch === "fix/broken")?.status).toBe("unverifiable");
  });

  it("does not silently treat a corrupt attachment as detached", async () => {
    const f = await fixture();
    await enterSessionRepositoryWorktree(f.identity, "fix/first", undefined, f.options);
    const dir = join(f.dataDir, "session-repositories");
    const [name] = await readdir(dir);
    await writeFile(join(dir, name!), "invalid");
    await expect(readActiveSessionRepositoryContext(f.identity, f.options)).rejects.toMatchObject({ code: "worktree-owner-unverifiable" });
  });
});
