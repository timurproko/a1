import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { readActiveSessionRepositoryContext, registerSessionRepositoryRuntime } from "../../../src/foundation/lifecycle/session-repository-context.js";
import { enterSessionRepositoryWorktree } from "../../../src/foundation/lifecycle/session-worktree-entry.js";

const execute = promisify(execFile);
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5 }))); });

/**
 * A stand-in for a repository's start command. It records the arguments A1 gave it and, by the
 * mode written next to it, makes a checkout outside the repository folder or misbehaves.
 */
const STAND_IN = `
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const [primary, branch, base] = process.argv.slice(2);
appendFileSync(join(here, "calls.jsonl"), JSON.stringify(process.argv.slice(2)) + "\\n");
const mode = readFileSync(join(here, "mode.txt"), "utf8").trim();
const git = (...args) => execFileSync("git", ["-C", primary, ...args], { encoding: "utf8" });
const slot = join(here, "pool", "1", "primary");
if (mode === "fail") { console.error("the pool is full"); process.exit(3); }
if (mode === "empty") process.exit(0);
if (mode === "primary") { console.log(primary); process.exit(0); }
if (mode === "unregistered") { mkdirSync(slot, { recursive: true }); console.log(slot); process.exit(0); }
git("worktree", "add", "--no-track", "-b", mode === "wrong-branch" ? "fix/another" : branch, slot, base);
console.log("preparing the checkout");
console.log(slot);
`;

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "a1-declared-start-"))); roots.push(root);
  const primary = join(root, "primary"), dataDir = join(root, "data"), script = join(root, "start.mjs");
  const git = async (...args: string[]) => (await execute("git", ["-C", primary, ...args], { encoding: "utf8" })).stdout.trim();
  await execute("git", ["init", "-b", "develop", primary]);
  await writeFile(join(primary, "README.md"), "base\n");
  await git("add", ".");
  await git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "base");
  await writeFile(script, STAND_IN);
  const mode = async (value: string) => { await writeFile(join(root, "mode.txt"), value); };
  await mode("pool");
  const declare = async (value: unknown) => {
    await mkdir(join(primary, ".a1"), { recursive: true });
    await writeFile(join(primary, ".a1", "worktree.json"), JSON.stringify(value));
  };
  await declare({ start: [process.execPath, script, "{primary}", "{branch}", "{base}"] });
  const calls = async (): Promise<string[][]> => existsSync(join(root, "calls.jsonl"))
    ? (await readFile(join(root, "calls.jsonl"), "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line) as string[]) : [];
  const identity = { sessionId: "session-one", sessionFile: join(root, "session.jsonl") };
  await writeFile(identity.sessionFile, JSON.stringify({ type: "session", id: identity.sessionId, cwd: primary }) + "\n");
  const inspectProcess = async (pid: number) => ({ pid, startIdentity: "test" });
  const untrusted = { dataDir, runtimeId: "runtime-one", inspectProcess };
  const trusted = { ...untrusted, repositoryTrusted: async () => true };
  await registerSessionRepositoryRuntime(identity, untrusted.runtimeId, { pid: 1001, startIdentity: "test" }, untrusted);
  return { root, primary, script, identity, untrusted, trusted, git, mode, declare, calls, slot: join(root, "pool", "1", "primary") };
}

describe("repository-declared worktree start", () => {
  it("runs the declared command with the task's values and attaches to the checkout it reports", async () => {
    const f = await fixture();
    const result = await enterSessionRepositoryWorktree(f.identity, "fix/login", undefined, f.trusted);
    expect(result).toMatchObject({ cwd: f.slot, branch: "fix/login" });
    expect(await f.calls()).toEqual([[f.primary, "fix/login", "develop"]]);
    expect(existsSync(join(f.primary, ".worktrees"))).toBe(false);
    expect((await readActiveSessionRepositoryContext(f.identity, f.trusted))?.cwd).toBe(f.slot);
  }, 30_000);

  it("passes the selected base: explicit, configured, or the default branch of origin", async () => {
    const explicit = await fixture();
    await explicit.git("branch", "release");
    await enterSessionRepositoryWorktree(explicit.identity, "fix/login", "release", explicit.trusted);
    expect((await explicit.calls())[0]).toEqual([explicit.primary, "fix/login", "release"]);

    const configured = await fixture();
    await configured.git("branch", "release");
    await configured.git("config", "a1.worktreeBase", "release");
    await enterSessionRepositoryWorktree(configured.identity, "fix/login", undefined, configured.trusted);
    expect((await configured.calls())[0]?.[2]).toBe("release");

    const remote = await fixture();
    await execute("git", ["clone", "--bare", remote.primary, join(remote.root, "remote.git")]);
    await remote.git("remote", "add", "origin", join(remote.root, "remote.git"));
    await enterSessionRepositoryWorktree(remote.identity, "fix/login", undefined, remote.trusted);
    expect((await remote.calls())[0]?.[2]).toBe("develop");
  }, 60_000);

  it("resumes a branch that already has a checkout, wherever it is, without running or needing trust", async () => {
    const f = await fixture();
    const first = await enterSessionRepositoryWorktree(f.identity, "fix/login", undefined, f.trusted);
    await f.mode("fail");
    expect(await enterSessionRepositoryWorktree(f.identity, "fix/login", undefined, f.untrusted)).toMatchObject({ cwd: first.cwd });
    expect(await f.calls()).toHaveLength(1);
  }, 30_000);

  it("runs nothing for a repository that is not trusted", async () => {
    const f = await fixture();
    for (const options of [f.untrusted, { ...f.untrusted, repositoryTrusted: async () => false }]) {
      await expect(enterSessionRepositoryWorktree(f.identity, "fix/login", undefined, options)).rejects.toMatchObject({ code: "worktree-start-untrusted" });
    }
    expect(await f.calls()).toEqual([]);
    expect(await readActiveSessionRepositoryContext(f.identity, f.untrusted)).toBeNull();
    expect(existsSync(join(f.primary, ".worktrees"))).toBe(false);
  });

  it.each([
    ["unregistered", "worktree-start-invalid", /not a registered task worktree/u],
    ["wrong-branch", "worktree-start-invalid", /has fix\/another checked out instead of fix\/login/u],
    ["primary", "worktree-start-invalid", /not a registered task worktree/u],
    ["empty", "worktree-start-invalid", /reported no absolute checkout path/u],
    ["fail", "worktree-start-failed", /the pool is full/u],
  ])("refuses a %s result, keeps the previous context and creates nothing itself", async (mode, code, message) => {
    const f = await fixture();
    await f.mode(mode);
    await expect(enterSessionRepositoryWorktree(f.identity, "fix/login", undefined, f.trusted)).rejects.toMatchObject({ code, message: expect.stringMatching(message) });
    expect(await f.calls()).toHaveLength(1);
    expect(await readActiveSessionRepositoryContext(f.identity, f.trusted)).toBeNull();
    expect(existsSync(join(f.primary, ".worktrees"))).toBe(false);
    if (mode === "wrong-branch") expect(existsSync(f.slot)).toBe(true);
  }, 30_000);

  it.each([
    [{ start: [] }],
    [{ start: [process.execPath, 7] }],
    [{ start: "node start.mjs" }],
    [{ start: [process.execPath, "{unknown}"] }],
  ])("refuses an unusable declaration %j instead of creating the checkout itself", async declaration => {
    const f = await fixture();
    await f.declare(declaration);
    await expect(enterSessionRepositoryWorktree(f.identity, "fix/login", undefined, f.trusted)).rejects.toMatchObject({ code: "worktree-start-declaration", message: expect.stringContaining(".a1/worktree.json") });
    expect(await f.calls()).toEqual([]);
    expect(existsSync(join(f.primary, ".worktrees"))).toBe(false);
  });

  it("keeps the built-in entry, collisions included, when only cleanup is declared", async () => {
    const f = await fixture();
    await f.declare({ cleanup: [process.execPath, "--version"] });
    const result = await enterSessionRepositoryWorktree(f.identity, "fix/login", undefined, f.untrusted);
    expect(result.cwd).toBe(await realpath(join(f.primary, ".worktrees", "login")));
    await f.git("worktree", "add", "-b", "fix/elsewhere", join(f.root, "elsewhere"), "develop");
    await expect(enterSessionRepositoryWorktree(f.identity, "fix/elsewhere", undefined, f.untrusted)).rejects.toMatchObject({ code: "worktree-branch-collision" });
    expect(await f.calls()).toEqual([]);
  }, 30_000);
});
