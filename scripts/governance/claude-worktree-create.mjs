#!/usr/bin/env node
/**
 * Claude Code `WorktreeCreate` hook. Claude Code runs it instead of its own `git worktree add` whenever a session enters
 * a worktree by name (`EnterWorktree(name)`, `claude --worktree <name>`, subagent `isolation: worktree`). The hook creates
 * the worktree where the repository rules require it, `<primary-checkout>/.worktrees/<name>`, detached at fresh
 * `origin/develop`, and prints that absolute path as the last stdout line. When `.worktrees/<name>` is already a
 * registered worktree of this repository, the hook prints its path so a session can re-enter it by name. The agent
 * creates its `<type>/<short-description>` branch inside the worktree afterwards.
 *
 * Stdin carries Claude Code's JSON hook input (`name`, `cwd`, `session_id`, `hook_event_name`). Diagnostics go to stderr
 * because Claude Code reads only the last non-empty stdout line.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/u;

/** Write one diagnostic line to stderr with the hook prefix. */
function log(message) {
  process.stderr.write(`[claude-worktree-create] ${message}\n`);
}

/** Run one git command in `cwd` and return its trimmed stdout. */
function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** Parse the JSON hook input from stdin, returning an empty object when it is absent or malformed. */
function readHookInput() {
  try {
    const raw = readFileSync(0, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (error) {
    log(`could not parse hook input: ${error.message}`);
    return {};
  }
}

/** Resolve the primary checkout root from any directory inside the repository, including another worktree. */
function primaryCheckout(startDir) {
  const commonDir = path.resolve(startDir, git(startDir, ["rev-parse", "--git-common-dir"]));
  return path.dirname(commonDir);
}

/** List the absolute paths of every worktree registered with the repository. */
function registeredWorktrees(primaryRoot) {
  return git(primaryRoot, ["worktree", "list", "--porcelain"])
    .split(/\r?\n/u)
    .filter(line => line.startsWith("worktree "))
    .map(line => path.resolve(line.slice("worktree ".length)));
}

/** Canonicalize an existing path so Windows short names, casing, and separators compare equal to Git's output. */
function canonical(value) {
  const resolved = existsSync(value) ? realpathSync.native(value) : path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

/** Compare two absolute paths the way the host file system does. */
function samePath(left, right) {
  return canonical(left) === canonical(right);
}

/**
 * Create or reuse `.worktrees/<name>` and return its absolute path, or throw with the reason the hook must fail.
 * Exported for the governance test; the command-line entry below reads stdin and prints the result.
 */
export function createTaskWorktree({ name, cwd }) {
  const worktreeName = String(name ?? "").trim();
  if (!NAME_PATTERN.test(worktreeName) || worktreeName.includes("..")) {
    throw new Error(`refusing worktree name "${worktreeName}": use letters, digits, dot, underscore or dash only`);
  }
  const primaryRoot = primaryCheckout(cwd);
  const target = path.join(primaryRoot, ".worktrees", worktreeName);
  if (registeredWorktrees(primaryRoot).some(entry => samePath(entry, target))) {
    log(`reusing registered worktree ${target}`);
    return target;
  }
  if (existsSync(target)) {
    throw new Error(`${target} exists but is not a registered worktree of ${primaryRoot}; remove or register it first`);
  }
  try {
    log("fetching origin/develop");
    git(primaryRoot, ["fetch", "--quiet", "origin", "develop"]);
  } catch (error) {
    log(`fetch failed, using the local origin/develop ref: ${String(error.message).split("\n")[0]}`);
  }
  log(`creating detached worktree at ${target} from origin/develop`);
  git(primaryRoot, ["worktree", "add", "--detach", target, "origin/develop"]);
  return target;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const input = readHookInput();
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  try {
    process.stdout.write(`${createTaskWorktree({ name: input.name, cwd })}\n`);
  } catch (error) {
    log(error.stderr?.toString().trim() || error.message);
    process.exit(1);
  }
}
