import { lstat, mkdir, realpath } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  assertSessionRepositoryRuntime, readSessionStartupRoot, setSessionRepositoryContext,
  type SessionRepositoryContext, type SessionRepositoryContextOptions, type SessionRepositoryIdentity,
} from "./session-repository-context.js";

/** Create or resume a matching registered checkout. Failed attachment never deletes existing work. */
export async function enterSessionRepositoryWorktree(
  identity: SessionRepositoryIdentity,
  branch: string,
  base: string | undefined,
  options: SessionRepositoryContextOptions,
): Promise<SessionRepositoryContext> {
  if (!/^[a-z][a-z0-9-]*\/[a-z0-9][a-z0-9-]{0,99}$/u.test(branch)) {
    throw failure("worktree-branch-invalid", "use a task branch such as fix/short-description");
  }
  await assertSessionRepositoryRuntime(identity, options);
  const startup = await readSessionStartupRoot(identity);
  // Performance: unrelated lifecycle consumers do not need Git process bindings at import time.
  const { execFile } = await import("node:child_process");
  const execute = promisify(execFile);
  const git = async (...args: string[]) => (await execute("git", ["-c", "core.hooksPath=/dev/null", ...args], {
    cwd: startup, encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: 256 * 1024, signal: options.signal,
  })).stdout.trim();
  const inventory = await git("worktree", "list", "--porcelain", "-z");
  const rows = inventory.split("\0\0").filter(Boolean).map(record => {
    const fields = record.split("\0");
    return {
      root: fields.find(field => field.startsWith("worktree "))?.slice(9),
      branch: fields.find(field => field.startsWith("branch refs/heads/"))?.slice(18),
    };
  });
  const primary = rows[0]?.root;
  if (primary === undefined) throw failure("worktree-repository-invalid", "cannot determine the primary Git checkout");
  const root = await realpath(primary);
  const worktreeRoot = join(root, ".worktrees");
  await mkdir(worktreeRoot, { recursive: true });
  const directory = await lstat(worktreeRoot);
  if (!directory.isDirectory() || directory.isSymbolicLink()) {
    throw failure("worktree-path-collision", "the worktree directory is a link or unexpected entry; it was preserved");
  }
  const path = join(worktreeRoot, branch.slice(branch.indexOf("/") + 1));
  const matching = rows.find(row => row.branch === branch);
  if (matching !== undefined) {
    if (matching.root === undefined || !samePath(await realpath(matching.root), path)) {
      throw failure("worktree-branch-collision", "the task branch is checked out at another path; attach its exact worktree instead");
    }
    return await setSessionRepositoryContext(identity, path, options);
  }
  if (await lstat(path).then(() => true, error => { if (hasCode(error, "ENOENT")) return false; throw error; })) {
    throw failure("worktree-path-collision", "the task path already exists; existing files were preserved");
  }
  const { resumed, remotes } = await prepareExistingTaskBranch(branch, path, git);
  if (resumed) return await setSessionRepositoryContext(identity, path, options);
  // Security: never execute repository setup. The selected base is data, not a shell expression.
  const configured = base ?? await git("config", "--get", "a1.worktreeBase").catch(() => "");
  let selectedBase = configured;
  if (remotes.includes("origin")) {
    if (!selectedBase) {
      selectedBase = await git("symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD").catch(() => "");
      if (!selectedBase) {
        const head = await git("ls-remote", "--symref", "origin", "HEAD");
        selectedBase = /^ref: refs\/heads\/([^\t\r\n]+)\tHEAD/mu.exec(head)?.[1] ?? "";
      }
    }
    const name = selectedBase.replace(/^origin\//u, "");
    if (!name || name.startsWith("-") || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(name)) {
      throw failure("worktree-base-invalid", "cannot determine a safe base branch; select it with --base");
    }
    await git("check-ref-format", `refs/heads/${name}`);
    await git("fetch", "--no-tags", "origin", `refs/heads/${name}:refs/remotes/origin/${name}`);
    selectedBase = `refs/remotes/origin/${name}`;
  } else {
    selectedBase ||= (await execute("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], {
      cwd: root, encoding: "utf8", windowsHide: true, timeout: 5_000, signal: options.signal,
    })).stdout.trim();
    if (!selectedBase || selectedBase.startsWith("-")) throw failure("worktree-base-invalid", "select a base branch with --base");
    await git("check-ref-format", `refs/heads/${selectedBase}`);
  }
  await git("worktree", "add", "--no-track", "-b", branch, path, selectedBase);
  return await setSessionRepositoryContext(identity, path, options);
}

async function prepareExistingTaskBranch(branch: string, path: string, git: (...args: string[]) => Promise<string>): Promise<{ resumed: boolean; remotes: string[] }> {
  const local = await git("branch", "--list", branch);
  const remotes = (await git("remote")).split(/\r?\n/u);
  let remoteTip: string | undefined;
  if (remotes.includes("origin")) {
    const advertised = await git("ls-remote", "--heads", "origin", `refs/heads/${branch}`);
    if (advertised) {
      const match = /^([a-f0-9]{40,64})\s+refs\/heads\/(.+)$/u.exec(advertised);
      if (!match || match[2] !== branch) throw failure("worktree-remote-invalid", "the remote branch identity could not be verified");
      await git("fetch", "--no-tags", "origin", `refs/heads/${branch}:refs/remotes/origin/${branch}`);
      remoteTip = await git("rev-parse", `refs/remotes/origin/${branch}`);
      if (remoteTip !== match[1]) throw failure("worktree-remote-changed", "the remote branch changed while fetching; existing work was preserved");
    } else if (local) await git("fetch", "--no-tags", "origin");
  }
  if (local) {
    if (remoteTip !== undefined) {
      const ancestor = async (left: string, right: string) => {
        try { await git("merge-base", "--is-ancestor", left, right); return true; }
        catch (error) { if (error instanceof Error && "code" in error && error.code === 1) return false; throw error; }
      };
      if (!await ancestor(`refs/heads/${branch}`, remoteTip) && !await ancestor(remoteTip, `refs/heads/${branch}`)) {
        throw failure("worktree-branch-diverged", "local and remote task history diverged; neither was reset or replaced");
      }
    }
    // Invariant: an unoccupied local branch keeps its exact tip, including unpublished commits.
    await git("worktree", "add", path, branch);
  } else if (remoteTip !== undefined) await git("worktree", "add", "--no-track", "-b", branch, path, remoteTip);
  return { resumed: Boolean(local) || remoteTip !== undefined, remotes };
}

function samePath(left: string, right: string): boolean {
  const key = (value: string) => process.platform === "win32" ? resolve(value).toLowerCase() : resolve(value);
  return key(left) === key(right);
}
function hasCode(error: unknown, code: string): boolean { return error instanceof Error && "code" in error && error.code === code; }
function failure(code: string, message: string): Error { return Object.assign(new Error(message), { code }); }
