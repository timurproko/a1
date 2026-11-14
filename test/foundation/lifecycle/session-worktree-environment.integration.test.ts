import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readActiveSessionRepositoryContext, registerSessionRepositoryRuntime, setSessionRepositoryContext,
} from "../../../src/foundation/lifecycle/session-repository-context.js";
import { enterSessionRepositoryWorktree } from "../../../src/foundation/lifecycle/session-worktree-entry.js";
import { requestSessionWorktreeCompletion } from "../../../src/foundation/lifecycle/session-worktree-completion.js";

const execute = promisify(execFile);
const roots: string[] = [];
vi.setConfig({ testTimeout: 30_000 });
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5 })));
});

async function fixture(outsideGit = false) {
  const root = await mkdtemp(join(tmpdir(), "a1-worktree-environment-")); roots.push(root);
  const primary = join(root, "primary"), task = join(root, "task"), clean = join(root, "clean");
  const home = join(root, "home"), dataDir = join(root, "data");
  await mkdir(home);
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (["GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR", "GIT_INDEX_FILE"].includes(key.toUpperCase())) delete environment[key];
  }
  const git = async (cwd: string, ...args: string[]) => (await execute("git", args, { cwd, env: environment, encoding: "utf8" })).stdout.trim();
  await git(root, "init", "-b", "develop", primary);
  await writeFile(join(primary, "README.md"), "fixture\n");
  await git(primary, "add", ".");
  await git(primary, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "fixture");
  await git(primary, "worktree", "add", "-b", "fix/task", task);
  await git(primary, "worktree", "add", "-b", "fix/clean", clean);
  const identity = { sessionId: "session-one", sessionFile: join(root, "session.jsonl") };
  await writeFile(identity.sessionFile, JSON.stringify({ type: "session", id: identity.sessionId, cwd: outsideGit ? home : primary }) + "\n");
  const options = { dataDir, runtimeId: "runtime-one", inspectProcess: async (pid: number) => ({ pid, startIdentity: "fixture" }) };
  await registerSessionRepositoryRuntime(identity, options.runtimeId, { pid: 1001, startIdentity: "fixture" }, options);
  const redirect = async (target: string) => {
    vi.stubEnv("GIT_DIR", await git(target, "rev-parse", "--absolute-git-dir"));
    vi.stubEnv("GIT_WORK_TREE", target);
  };
  const records = async (directory: string) => {
    const path = join(dataDir, directory);
    const names = await readdir(path).catch(error => { if (error.code === "ENOENT") return []; throw error; });
    return await Promise.all(names.sort().map(async name => [name, await readFile(join(path, name), "utf8")]));
  };
  return { root, primary, task, clean, home, dataDir, identity, options, git, redirect, records };
}

describe("explicit-root worktree Git environment", () => {
  it("rejects non-repository startup under temporary task overrides without poisoning later context", async () => {
    const f = await fixture(true);
    const header = await readFile(f.identity.sessionFile, "utf8");
    await f.redirect(f.task);
    await expect(setSessionRepositoryContext(f.identity, f.task, f.options))
      .rejects.toMatchObject({ code: "worktree-startup-not-repository" });
    expect(await f.records("session-repositories")).toEqual([]);
    expect(await f.records("session-worktree-claims/worktrees")).toEqual([]);
    vi.unstubAllEnvs();
    await expect(readActiveSessionRepositoryContext(f.identity, f.options)).resolves.toBeNull();
    expect(await readFile(f.identity.sessionFile, "utf8")).toBe(header);
    expect(await readFile(join(f.home, "../primary/README.md"), "utf8")).toBe("fixture\n");
  });

  it("attaches to the actual startup repository despite overrides pointing at another checkout", async () => {
    const f = await fixture(), foreign = await fixture();
    await f.redirect(foreign.task);
    await expect(setSessionRepositoryContext(f.identity, f.task, f.options)).resolves.toMatchObject({ branch: "fix/task" });
    const records = await f.records("session-repositories");
    expect(JSON.parse(records[0]![1]!)).toMatchObject({ startupRoot: await realpath(f.primary), worktreeRoot: await realpath(f.task) });
    await expect(readActiveSessionRepositoryContext(f.identity, f.options)).resolves.toMatchObject({ cwd: await realpath(f.task) });
    vi.unstubAllEnvs();
    await expect(readActiveSessionRepositoryContext(f.identity, f.options)).resolves.toMatchObject({ cwd: await realpath(f.task) });
  });

  it("rejects a foreign target under matching overrides and preserves the prior context and claims byte-for-byte", async () => {
    const f = await fixture(), foreign = await fixture();
    await setSessionRepositoryContext(f.identity, f.task, f.options);
    const beforeContext = await f.records("session-repositories");
    const beforeClaims = await f.records("session-worktree-claims/worktrees");
    await f.redirect(foreign.task);
    await expect(setSessionRepositoryContext(f.identity, foreign.task, f.options))
      .rejects.toMatchObject({ code: "worktree-foreign-repository" });
    expect(await f.records("session-repositories")).toEqual(beforeContext);
    expect(await f.records("session-worktree-claims/worktrees")).toEqual(beforeClaims);
    vi.unstubAllEnvs();
    await expect(readActiveSessionRepositoryContext(f.identity, f.options)).resolves.toMatchObject({ cwd: await realpath(f.task) });
  });

  it("creates a task in the real startup repository and leaves a redirected foreign checkout unchanged", async () => {
    const f = await fixture(), foreign = await fixture();
    const before = await foreign.git(foreign.primary, "worktree", "list", "--porcelain");
    await f.redirect(foreign.task);
    const selected = await enterSessionRepositoryWorktree(f.identity, "fix/created", undefined, f.options);
    expect(selected.cwd).toBe(await realpath(join(f.primary, ".worktrees", "created")));
    expect(await foreign.git(foreign.primary, "worktree", "list", "--porcelain")).toBe(before);
  });

  it("rejects entry outside Git without creating a branch or checkout in the redirected repository", async () => {
    const f = await fixture(true);
    await f.redirect(f.task);
    const before = await f.git(f.primary, "worktree", "list", "--porcelain");
    await expect(enterSessionRepositoryWorktree(f.identity, "fix/rejected", undefined, f.options))
      .rejects.toMatchObject({ code: "worktree-startup-not-repository" });
    expect(await f.git(f.primary, "worktree", "list", "--porcelain")).toBe(before);
    expect(await f.git(f.primary, "branch", "--list", "fix/rejected")).toBe("");
  });

  it("keeps a dirty attached checkout attached even if overrides point at a clean checkout", async () => {
    const f = await fixture();
    await setSessionRepositoryContext(f.identity, f.task, f.options);
    await writeFile(join(f.task, "README.md"), "unpublished\n");
    await f.redirect(f.clean);
    await expect(requestSessionWorktreeCompletion(f.identity, {}, f.options))
      .rejects.toMatchObject({ code: "worktree-content" });
    await expect(readActiveSessionRepositoryContext(f.identity, f.options)).resolves.toMatchObject({ cwd: await realpath(f.task) });
    expect(await readFile(join(f.task, "README.md"), "utf8")).toBe("unpublished\n");
  });
});
