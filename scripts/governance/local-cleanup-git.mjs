import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lstat, realpath, readdir, readFile } from "node:fs/promises";
import { resolve, relative, isAbsolute, join } from "node:path";
import { fail, safeRef } from "./local-cleanup-state.mjs";

const execute = promisify(execFile);
export const inside = (root, path) => { const suffix = relative(root, path); return suffix !== "" && !suffix.startsWith(`..`) && !isAbsolute(suffix); };
export const canonical = async path => (await realpath(path)).replaceAll("\\", "/");
export const exists = async path => { try { await lstat(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } };
const fingerprint = stat => `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;

/** Bounded argument-vector Git calls; never use a shell or candidate-supplied hooks. */
export function gitRunner({ deadline = Infinity, now = Date.now } = {}) {
  return async (cwd, args) => {
    const remaining = deadline - now(); if (remaining <= 0) fail("pass-deadline");
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
    Object.assign(env, { GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" });
    try {
      const result = await execute("git", ["-c", "core.fsmonitor=false", "-c", "core.hooksPath=/dev/null", "-c", "protocol.ext.allow=never", "-c", "gc.auto=0", "-c", "maintenance.auto=false", "-C", cwd, ...args],
        { env, timeout: Math.min(10000, remaining), maxBuffer: 8 * 1024 * 1024, encoding: "utf8", windowsHide: true });
      return result.stdout;
    } catch { fail("git-operation-failed"); }
  };
}
export function parseWorktrees(text) {
  const rows = []; let row = {};
  for (const line of text.split("\0")) {
    if (!line) { if (row.worktree) rows.push(row); row = {}; continue; }
    const space = line.indexOf(" ");
    row[space < 0 ? line : line.slice(0, space)] = space < 0 ? true : line.slice(space + 1);
  }
  if (row.worktree) rows.push(row);
  if (!rows.length || rows.some(row => !row.worktree || !row.HEAD || row.bare)) fail("worktree-inventory");
  return rows;
}
export async function discoverRepository(primaryPath, git = gitRunner()) {
  const primary = await canonical(primaryPath);
  const common = await canonical((await git(primary, ["rev-parse", "--path-format=absolute", "--git-common-dir"])).trim());
  const rows = parseWorktrees(await git(primary, ["worktree", "list", "--porcelain", "-z"]));
  if (await canonical(rows[0].worktree) !== primary) fail("primary-required");
  const url = (await git(primary, ["remote", "get-url", "origin"])).trim();
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/.exec(url);
  if (!match) fail("unsupported-origin");
  const root = resolve(primary, ".worktrees").replaceAll("\\", "/");
  if (await exists(root) && await canonical(root) !== root) fail("worktree-root-alias");
  return { primary, common, root, repository: match[1], remote: "origin" };
}

/** Capture exact identity without granting cleanup authority or refreshing a released head. */
export async function captureWorktree(identity, path, git = gitRunner()) {
  const absolute = resolve(path).replaceAll("\\", "/");
  if (!inside(identity.root, absolute) || absolute === identity.primary || await canonical(absolute) !== absolute) fail("worktree-path");
  if (await canonical(identity.root) !== identity.root) fail("worktree-root-alias");
  const suffix = relative(identity.root, absolute).split(/[\\/]/); let parent = identity.root;
  for (const segment of suffix) {
    parent = join(parent, segment);
    const stat = await lstat(parent); if (!stat.isDirectory() || stat.isSymbolicLink()) fail("worktree-path-alias");
  }
  const pointer = join(absolute, ".git"), pointerStat = await lstat(pointer);
  if (!pointerStat.isFile() || pointerStat.isSymbolicLink()) fail("worktree-git-pointer");
  const common = await canonical((await git(absolute, ["rev-parse", "--path-format=absolute", "--git-common-dir"])).trim());
  if (common !== identity.common) fail("worktree-repository");
  const gitDirectory = await canonical((await git(absolute, ["rev-parse", "--path-format=absolute", "--git-dir"])).trim());
  if (!inside(join(identity.common, "worktrees"), gitDirectory)
    || await canonical((await readFile(join(gitDirectory, "gitdir"), "utf8")).trim()) !== await canonical(pointer)) fail("worktree-backlink");
  const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
  const matches = rows.filter(row => resolve(row.worktree).replaceAll("\\", "/") === absolute);
  if (matches.length !== 1 || matches[0] === rows[0] || matches[0].locked !== undefined || matches[0].prunable !== undefined) fail("worktree-locked-or-unknown");
  if (rows.some(row => inside(absolute, resolve(row.worktree)))) fail("nested-worktree");
  const row = matches[0], ref = row.branch ?? null;
  if (ref !== null && !safeRef(ref) || ref === null && !row.detached) fail("reserved-or-unknown-ref");
  if ((await git(absolute, ["rev-parse", "HEAD"])).trim() !== row.HEAD
    || (await git(absolute, ["rev-parse", "--symbolic-full-name", "HEAD"])).trim() !== (ref ?? "HEAD")) fail("worktree-head-mismatch");
  return { path: absolute, filesystem: fingerprint(await lstat(absolute)), head: row.HEAD, ref };
}
export async function inspectWorktree(identity, entry, { git = gitRunner(), cwd = process.cwd(), deadline = Infinity, now = Date.now } = {}) {
  const actual = await captureWorktree(identity, entry.path, git);
  if (["path", "filesystem", "head", "ref"].some(key => actual[key] !== entry[key])) fail("worktree-identity-changed");
  const current = await canonical(cwd);
  if (current === entry.path || inside(entry.path, current)) fail("current-worktree");
  const flags = await git(entry.path, ["ls-files", "-v", "-z"]);
  if (flags.split("\0").some(line => line && (line[0] === "S" || line[0] !== line[0].toUpperCase()))) fail("hidden-index-content");
  const text = await git(entry.path, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignored", "--ignore-submodules=none"]);
  const tokens = text.split("\0"), blockers = [];
  for (let i = 0; i < tokens.length; i++) {
    const line = tokens[i]; if (!line) continue;
    const status = line.slice(0, 2), path = line.slice(3).replace(/\/$/, "");
    if (status !== "!!" || !entry.disposable.some(allowed => path === allowed || path.startsWith(`${allowed}/`))) blockers.push(path);
    if (/[RC]/.test(status)) { if (tokens[i + 1]) blockers.push(tokens[++i]); }
  }
  if (blockers.length) return { clean: false, reason: "worktree-content", paths: blockers.slice(0, 100), truncated: blockers.length > 100 };
  let visited = 0;
  async function walk(directory, prefix = "") {
    if (now() >= deadline || ++visited > 20000) fail("content-inspection-budget");
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (now() >= deadline || ++visited > 20000) fail("content-inspection-budget");
      if (!prefix && item.name === ".git") continue;
      const path = prefix + item.name;
      if (item.name === ".git" || item.name === ".gitmodules") fail("nested-repository");
      if (item.isSymbolicLink()) fail("content-link");
      if (item.isDirectory()) await walk(join(directory, item.name), `${path}/`);
      else if (!item.isFile()) fail("content-special-file");
    }
  }
  await walk(entry.path);
  return { clean: true };
}

/** The only destructive Git primitives. A failed remove is never widened to recursive deletion. */
export async function removeWorktree(identity, entry, git = gitRunner()) {
  await git(identity.primary, ["worktree", "remove", entry.path]);
  const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
  if (await exists(entry.path) || rows.some(row => resolve(row.worktree).replaceAll("\\", "/") === entry.path)) fail("worktree-removal-partial");
}
export async function removeLocalRef(identity, entry, git = gitRunner()) {
  if (!entry.ref) return "not-applicable";
  if (!safeRef(entry.ref) || await exists(entry.path)) fail("local-ref-unsafe");
  const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
  if (rows.some(row => row.branch === entry.ref || resolve(row.worktree).replaceAll("\\", "/") === entry.path)) fail("local-ref-checked-out");
  const output = await git(identity.primary, ["for-each-ref", "--format=%(refname) %(objectname)", entry.ref]);
  const exact = output.trim().split("\n").filter(line => line.startsWith(`${entry.ref} `));
  if (!exact.length) return "already-absent";
  if (exact.length !== 1 || exact[0] !== `${entry.ref} ${entry.head}`) fail("local-ref-advanced");
  await git(identity.primary, ["update-ref", "-d", entry.ref, entry.head]);
  const after = await git(identity.primary, ["for-each-ref", "--format=%(refname)", entry.ref]);
  if (after.trim().split("\n").includes(entry.ref)) fail("local-ref-removal-partial");
  return "removed";
}
