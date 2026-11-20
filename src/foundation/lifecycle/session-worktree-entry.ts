import { lstat, mkdir, realpath } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { worktreeGitEnvironment } from "./worktree-git-environment.js";
import { fillDeclaredWorktreeCommand, readDeclaredWorktreeCommand, WORKTREE_DECLARATION } from "./worktree-declaration.js";
import {
  assertSessionRepositoryRuntime, readSessionRepositoryRoot, setSessionRepositoryContext,
  type SessionRepositoryContext, type SessionRepositoryContextOptions, type SessionRepositoryIdentity,
} from "./session-repository-context.js";

/** A declared start command may fetch and prepare a checkout, which the built-in Git calls never do. */
const START_TIMEOUT_MS = 5 * 60_000;
const MAX_REPORT_CHARACTERS = 4_000;

type Git = (...args: string[]) => Promise<string>;

/**
 * Create or resume the checkout of a task branch and attach to it. Failed attachment never deletes
 * existing work.
 *
 * A repository that declares a `start` command decides how its task checkouts are made: A1 runs
 * that command and attaches to the checkout it reports. Without one, A1 creates
 * `.worktrees/<short-description>` itself.
 */
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
  const repository = await readSessionRepositoryRoot(identity, options);
  // Performance: unrelated lifecycle consumers do not need Git process bindings at import time.
  const { execFile } = await import("node:child_process");
  const execute = promisify(execFile);
  const git: Git = async (...args) => (await execute("git", ["-c", "core.hooksPath=/dev/null", ...args], {
    cwd: repository.root, env: worktreeGitEnvironment(), encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: 256 * 1024, signal: options.signal,
  })).stdout.trim();
  const rows = repository.worktrees;
  const root = repository.root;
  const matching = rows.find(row => row.branch === branch);

  // Security: the declaration is read from the verified primary checkout, never from a task checkout.
  const declared = await readDeclaredWorktreeCommand(root, "start");
  if (declared === "invalid") {
    throw failure("worktree-start-declaration", `${WORKTREE_DECLARATION} must hold {"start": ["program", "argument", ...]}; no checkout was created`);
  }
  if (declared !== null) {
    // Invariant: a branch that already has a checkout is resumed there, wherever the command put it; nothing runs.
    if (matching !== undefined) return await setSessionRepositoryContext(identity, matching.root, options);
    // Security: a repository's own command runs only once the person has trusted that repository.
    if (await options.repositoryTrusted?.(root) !== true) {
      throw failure("worktree-start-untrusted", `this repository starts task checkouts with a command it declares in ${WORKTREE_DECLARATION}, which A1 runs only for a trusted repository; trust it first, then enter again`);
    }
    const selected = await selectBase(git, base, root, options.signal);
    const { command: [program, ...arguments_], missing } = fillDeclaredWorktreeCommand(declared, { primary: root, branch, base: selected.name });
    if (missing.length > 0 || program === undefined) {
      throw failure("worktree-start-declaration", `the start command in ${WORKTREE_DECLARATION} uses ${missing.map(name => `{${name}}`).join(" and ")}, which A1 does not provide; it provides {primary}, {branch} and {base}`);
    }
    let output: string;
    try {
      // Security: no shell; the declaration is an argument list, and the task's values are data in it.
      output = (await execute(program, arguments_, {
        cwd: root, env: worktreeGitEnvironment(), encoding: "utf8", windowsHide: true, timeout: START_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, signal: options.signal,
      })).stdout;
    } catch (error) {
      const said = isRecord(error) ? [error.stdout, error.stderr].filter(value => typeof value === "string" && value.length > 0).join("\n") : "";
      throw failure("worktree-start-failed", `the declared start command failed; A1 created no checkout itself. ${bounded(said || (error instanceof Error ? error.message : String(error)))}`);
    }
    const reported = output.split(/\r?\n/u).map(line => line.trim()).filter(Boolean).at(-1);
    if (reported === undefined || !isAbsolute(reported)) {
      throw failure("worktree-start-invalid", "the declared start command reported no absolute checkout path on its last output line; nothing was attached");
    }
    // Invariant: the command's word is checked against Git; only a registered checkout of this branch is attached.
    const real = await realpath(reported).catch(() => null);
    const after = await readSessionRepositoryRoot(identity, options);
    const row = real === null ? undefined : after.worktrees.find(candidate => !("stale" in candidate) && samePath(candidate.root, real));
    if (row === undefined || samePath(row.root, after.root)) {
      throw failure("worktree-start-invalid", `the declared start command reported ${reported}, which is not a registered task worktree of this repository; nothing was attached`);
    }
    if (row.branch !== branch) {
      throw failure("worktree-start-invalid", `the declared start command reported ${reported}, which has ${row.branch ?? "no branch"} checked out instead of ${branch}; nothing was attached`);
    }
    return await setSessionRepositoryContext(identity, row.root, options);
  }

  const worktreeRoot = join(root, ".worktrees");
  await mkdir(worktreeRoot, { recursive: true });
  const directory = await lstat(worktreeRoot);
  if (!directory.isDirectory() || directory.isSymbolicLink()) {
    throw failure("worktree-path-collision", "the worktree directory is a link or unexpected entry; it was preserved");
  }
  const path = join(worktreeRoot, branch.slice(branch.indexOf("/") + 1));
  if (matching !== undefined) {
    if (matching.root === undefined || !samePath(await realpath(matching.root), path)) {
      throw failure("worktree-branch-collision", "the task branch is checked out at another path; attach its exact worktree instead");
    }
    return await setSessionRepositoryContext(identity, path, options);
  }
  if (await lstat(path).then(() => true, error => { if (hasCode(error, "ENOENT")) return false; throw error; })) {
    throw failure("worktree-path-collision", "the task path already exists; existing files were preserved");
  }
  if (await git("branch", "--list", branch)) {
    throw failure("worktree-branch-collision", "the branch already exists without a matching checkout; existing history was preserved");
  }
  const selected = await selectBase(git, base, root, options.signal);
  if (selected.remote) await git("fetch", "--no-tags", "origin", `refs/heads/${selected.name}:refs/remotes/origin/${selected.name}`);
  await git("worktree", "add", "--no-track", "-b", branch, path, selected.remote ? `refs/remotes/origin/${selected.name}` : selected.name);
  return await setSessionRepositoryContext(identity, path, options);
}

/**
 * The base branch of a new task checkout: the explicit one, then `a1.worktreeBase`, then the
 * default branch of `origin`, then the primary branch of a repository without `origin`.
 * Security: never execute repository setup. The selected base is data, not a shell expression.
 */
async function selectBase(git: Git, base: string | undefined, root: string, signal: AbortSignal | undefined): Promise<{ readonly name: string; readonly remote: boolean }> {
  const configured = base ?? await git("config", "--get", "a1.worktreeBase").catch(() => "");
  const remotes = (await git("remote")).split(/\r?\n/u);
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
    return { name, remote: true };
  }
  if (!selectedBase) {
    const { execFile } = await import("node:child_process");
    selectedBase = (await promisify(execFile)("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], {
      cwd: root, env: worktreeGitEnvironment(), encoding: "utf8", windowsHide: true, timeout: 5_000, signal,
    })).stdout.trim();
  }
  if (!selectedBase || selectedBase.startsWith("-")) throw failure("worktree-base-invalid", "select a base branch with --base");
  await git("check-ref-format", `refs/heads/${selectedBase}`);
  return { name: selectedBase, remote: false };
}

function bounded(text: string): string {
  const trimmed = text.trim();
  return trimmed.length <= MAX_REPORT_CHARACTERS ? trimmed : `...${trimmed.slice(-MAX_REPORT_CHARACTERS)}`;
}

function samePath(left: string, right: string): boolean {
  const key = (value: string) => process.platform === "win32" ? resolve(value).toLowerCase() : resolve(value);
  return key(left) === key(right);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasCode(error: unknown, code: string): boolean { return error instanceof Error && "code" in error && error.code === code; }
function failure(code: string, message: string): Error { return Object.assign(new Error(message), { code }); }
