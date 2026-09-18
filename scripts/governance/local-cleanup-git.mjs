import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lstat, realpath, readdir, readFile, rm, rmdir } from "node:fs/promises";
import { resolve, relative, isAbsolute, join } from "node:path";
import { fail, safeRef } from "./local-cleanup-state.mjs";

const execute = promisify(execFile);
export const inside = (root, path) => { const suffix = relative(root, path); return suffix !== "" && !suffix.startsWith(`..`) && !isAbsolute(suffix); };
export const canonical = async path => (await realpath(path)).replaceAll("\\", "/");
export const exists = async path => { try { await lstat(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } };
const fingerprint = stat => `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
const normalized = path => resolve(path).replaceAll("\\", "/");
const samePath = (a, b) => process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;

/** Bounded argument-vector Git calls; never use a shell or candidate-supplied hooks. */
export function gitRunner({ deadline = Infinity, now = Date.now } = {}) {
  return async (cwd, args, { input = "" } = {}) => {
    const remaining = deadline - now(); if (remaining <= 0) fail("pass-deadline");
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
    Object.assign(env, { GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" });
    try {
      const pending = execute("git", ["-c", "core.fsmonitor=false", "-c", "core.hooksPath=/dev/null", "-c", "protocol.ext.allow=never", "-c", "gc.auto=0", "-c", "maintenance.auto=false", "-C", cwd, ...args],
        { env, timeout: Math.min(10000, remaining), maxBuffer: 8 * 1024 * 1024, encoding: "utf8", windowsHide: true });
      pending.child.stdin.on("error", () => {}); pending.child.stdin.end(input);
      return (await pending).stdout;
    } catch { fail("git-operation-failed"); }
  };
}

/** Bounded retry for transient Windows sharing violations; a handle still held afterwards surfaces as the named code. */
const REMOVAL_ATTEMPTS = 6, REMOVAL_BACKOFF_MS = 300, TRANSIENT_REMOVAL = new Set(["EBUSY", "EPERM", "EACCES", "ENOTEMPTY"]);
async function removeTree(path, code, reported, { deadline = Infinity, now = Date.now } = {}) {
  for (let attempt = 1; ; attempt++) {
    try { await rm(path, { recursive: true, force: true, maxRetries: 0 }); break; }
    catch (error) {
      const wait = REMOVAL_BACKOFF_MS * attempt;
      if (!TRANSIENT_REMOVAL.has(error.code) || attempt >= REMOVAL_ATTEMPTS || now() + wait >= deadline) fail(code, { paths: [reported] });
      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
  if (await exists(path)) fail(code, { paths: [reported] });
}
const ORDINARY_CONTENT_ENTRY_LIMIT = 20_000;
const GENERATED_CONTENT_ENTRY_LIMIT = 100_000;
/**
 * True only when the path is a non-link directory whose whole subtree holds nothing but non-link directories, so removing it
 * loses no file, link, special entry, or Git metadata. The walk shares the ordinary entry allowance and deadline.
 */
export async function emptyDirectoryTree(path, { entryLimit = ORDINARY_CONTENT_ENTRY_LIMIT, deadline = Infinity, now = Date.now } = {}) {
  const root = await lstat(path);
  if (root.isSymbolicLink() || !root.isDirectory()) return false;
  let visited = 0;
  async function walk(directory) {
    if (now() >= deadline) fail("content-inspection-budget");
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (++visited > entryLimit) fail("content-inspection-budget");
      if (item.name === ".git" || item.isSymbolicLink() || !item.isDirectory()) return false;
      if (!await walk(join(directory, item.name))) return false;
    }
    return true;
  }
  return walk(path);
}
/** Bottom-up removal with the non-recursive primitive only, so a directory that gained content since verification is retained. */
export async function removeEmptyTree(path, code, reported) {
  for (const item of await readdir(path, { withFileTypes: true })) {
    if (item.isSymbolicLink() || !item.isDirectory()) fail(code, { paths: [reported] });
    await removeEmptyTree(join(path, item.name), code, reported);
  }
  try { await rmdir(path); }
  catch (error) { if (error.code === "ENOENT") return; fail(code, { paths: [reported] }); }
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

/** Status rows outside the disposable roots; ignored rows count only when the caller asks for them. */
export async function statusBlockers(git, path, disposable, { ignored = true } = {}) {
  const text = await git(path, ["status", "--porcelain=v1", "-z", "--untracked-files=all", ...(ignored ? ["--ignored"] : []), "--ignore-submodules=none"]);
  const tokens = text.split("\0"), blockers = [];
  for (let i = 0; i < tokens.length; i++) {
    const line = tokens[i]; if (!line) continue;
    const status = line.slice(0, 2), path = line.slice(3).replace(/\/$/, "");
    if (status !== "!!" || !disposable.some(allowed => path === allowed || path.startsWith(`${allowed}/`))) blockers.push(path);
    if (/[RC]/.test(status)) { if (tokens[i + 1]) blockers.push(tokens[++i]); }
  }
  return blockers;
}

export async function inspectWorktree(identity, entry, {
  git = gitRunner(), cwd = process.cwd(), deadline = Infinity, now = Date.now,
  ordinaryEntryLimit = ORDINARY_CONTENT_ENTRY_LIMIT, generatedEntryLimit = GENERATED_CONTENT_ENTRY_LIMIT,
  accepted = async () => false,
} = {}) {
  const actual = await captureWorktree(identity, entry.path, git);
  if (["path", "filesystem", "ref"].some(key => actual[key] !== entry[key])) fail("worktree-identity-changed");
  // Protocol: a HEAD that moved after registration is identity-consistent only when every reachable commit was accepted.
  if (actual.head !== entry.head && !await accepted(actual.head)) fail("worktree-identity-changed");
  const current = await canonical(cwd);
  if (current === entry.path || inside(entry.path, current)) fail("current-worktree");
  const flags = await git(entry.path, ["ls-files", "-v", "-z"]);
  if (flags.split("\0").some(line => line && (line[0] === "S" || line[0] !== line[0].toUpperCase()))) fail("hidden-index-content");
  const staged = await git(entry.path, ["ls-files", "--stage", "-z"]);
  const indexRows = staged.split("\0").filter(Boolean);
  if (indexRows.some(line => line.startsWith("160000 "))) fail("nested-repository");
  for (const row of indexRows) {
    const tab = row.indexOf("\t"); if (tab < 0) fail("git-index-format");
    const path = row.slice(tab + 1);
    if (path !== ".gitmodules" && !path.endsWith("/.gitmodules")) continue;
    const modules = await readFile(join(entry.path, path), "utf8");
    if (/^\s*\[submodule\s+"[^"]+"\]\s*$/mi.test(modules) || /^\s*path\s*=\s*\S+/mi.test(modules)) fail("nested-repository");
  }
  const blockers = await statusBlockers(git, entry.path, entry.disposable);
  if (blockers.length) return { clean: false, reason: "worktree-content", paths: blockers.slice(0, 100), truncated: blockers.length > 100 };
  if (![ordinaryEntryLimit, generatedEntryLimit].every(value => Number.isSafeInteger(value) && value > 0)) fail("content-inspection-budget");
  let ordinaryVisited = 0, generatedVisited = 0;
  const generated = path => entry.disposable.some(root => path === root || path.startsWith(`${root}/`));
  const visit = path => {
    if (generated(path)) {
      if (++generatedVisited > generatedEntryLimit) fail("content-inspection-budget");
    } else if (++ordinaryVisited > ordinaryEntryLimit) fail("content-inspection-budget");
  };
  async function walk(directory, prefix = "") {
    if (now() >= deadline) fail("content-inspection-budget");
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (now() >= deadline) fail("content-inspection-budget");
      if (!prefix && item.name === ".git") continue;
      const path = prefix + item.name;
      visit(path);
      if (item.name === ".git") fail("nested-repository");
      if (item.isSymbolicLink()) fail("content-link");
      if (item.isDirectory()) await walk(join(directory, item.name), `${path}/`);
      else if (!item.isFile()) fail("content-special-file");
    }
  }
  await walk(entry.path);
  return { clean: true, head: actual.head };
}

/** Remove only the entry's declared disposable roots, after inspection has bounded them, so Git deletes tracked content alone. */
export async function purgeDisposable(entry, timing = {}) {
  for (const root of entry.disposable) {
    const target = join(entry.path, root);
    let stat;
    try { stat = await lstat(target); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (stat.isSymbolicLink()) fail("content-link");
    if (!stat.isDirectory()) fail("content-special-file");
    await removeTree(target, "disposable-path-locked", root, timing);
  }
}

const worktreeRows = async (identity, git) => parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
const rowsAt = (rows, path) => rows.filter(row => normalized(row.worktree) === path);

/** Retire only this candidate's dangling registration: a prunable row whose gitdir file names the removed pointer. */
export async function retireRegistration(identity, entry, git, timing) {
  const rows = rowsAt(await worktreeRows(identity, git), entry.path);
  if (!rows.length) return false;
  if (rows.length !== 1 || rows[0].prunable === undefined || rows[0].locked !== undefined) fail("retained-worktree-metadata");
  const base = join(identity.common, "worktrees");
  for (const name of await readdir(base)) {
    const directory = join(base, name), stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
    let pointer;
    try { pointer = (await readFile(join(directory, "gitdir"), "utf8")).trim(); } catch { continue; }
    if (!samePath(normalized(pointer), `${entry.path}/.git`)) continue;
    if (await exists(join(directory, "locked"))) fail("worktree-locked-or-unknown");
    await removeTree(directory, "retained-worktree-metadata", name, timing);
    if (rowsAt(await worktreeRows(identity, git), entry.path).length) fail("retained-worktree-metadata");
    return true;
  }
  fail("retained-worktree-metadata");
}

/**
 * True only when cleanup has nothing left to delete for this entry: the path is gone, Git holds no live row for it,
 * and the exact local topic ref is absent. Any doubt reads as "something remains".
 */
export async function nothingLeft(identity, entry, git = gitRunner()) {
  if (await exists(entry.path)) return false;
  const rows = rowsAt(await worktreeRows(identity, git), entry.path);
  if (rows.some(row => row.prunable === undefined || row.locked !== undefined)) return false;
  if (entry.ref && await readLocalRef(identity, entry.ref, git) !== null) return false;
  return true;
}

/**
 * Classify a path whose removal intent is journaled: absent, still the exact worktree, or residue Git left behind.
 * Residue is clean only when every regular file is below a disposable root or byte-identical to the journaled head.
 */
export async function inspectResidue(identity, entry, {
  git = gitRunner(), cwd = process.cwd(), deadline = Infinity, now = Date.now, inspect = inspectWorktree,
  ordinaryEntryLimit = ORDINARY_CONTENT_ENTRY_LIMIT, generatedEntryLimit = GENERATED_CONTENT_ENTRY_LIMIT,
} = {}) {
  const current = await canonical(cwd);
  if (current === entry.path || inside(entry.path, current)) fail("current-worktree");
  const rows = rowsAt(await worktreeRows(identity, git), entry.path);
  if (!await exists(entry.path)) {
    if (rows.some(row => row.prunable === undefined)) fail("retained-worktree-metadata");
    return { clean: true, shape: "absent" };
  }
  let snapshot = null;
  try { snapshot = await captureWorktree(identity, entry.path, git); } catch { /* Protocol: a dismantled worktree is inspected as residue below. */ }
  if (snapshot) {
    if (["path", "filesystem", "head", "ref"].some(key => snapshot[key] !== entry[key])) fail("residual-or-reused-path");
    const content = await inspect(identity, entry, { git, cwd, deadline, now, ordinaryEntryLimit, generatedEntryLimit });
    return content.clean ? { clean: true, shape: "worktree" } : content;
  }
  if (rows.some(row => row.prunable === undefined) || await exists(join(entry.path, ".git"))) fail("residual-or-reused-path");
  if (!/^[a-f0-9]{40}$/.test(entry.head)) fail("worktree-head-mismatch");
  const tracked = new Map();
  for (const line of (await git(identity.primary, ["ls-tree", "-r", "-z", entry.head])).split("\0")) {
    if (!line) continue;
    const tab = line.indexOf("\t"); if (tab < 0) fail("git-index-format");
    const [, type, object] = line.slice(0, tab).split(" ");
    if (type === "blob") tracked.set(line.slice(tab + 1), object);
  }
  const blockers = [], candidates = [];
  let ordinaryVisited = 0, generatedVisited = 0;
  const generated = path => entry.disposable.some(root => path === root || path.startsWith(`${root}/`));
  async function walk(directory, prefix = "") {
    if (now() >= deadline) fail("content-inspection-budget");
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (now() >= deadline) fail("content-inspection-budget");
      const path = prefix + item.name;
      if (generated(path)) { if (++generatedVisited > generatedEntryLimit) fail("content-inspection-budget"); }
      else if (++ordinaryVisited > ordinaryEntryLimit) fail("content-inspection-budget");
      if (item.name === ".git" || item.isSymbolicLink() || !(item.isDirectory() || item.isFile()) || /[\r\n]/.test(path)) { blockers.push(path); continue; }
      if (item.isDirectory()) await walk(join(directory, item.name), `${path}/`);
      else if (!generated(path)) { if (tracked.has(path)) candidates.push(path); else blockers.push(path); }
    }
  }
  await walk(entry.path);
  if (candidates.length) {
    const input = candidates.map(path => `${join(entry.path, path)}\n`).join("");
    const hashes = (await git(identity.primary, ["hash-object", "--stdin-paths"], { input })).split("\n").filter(Boolean);
    if (hashes.length !== candidates.length) fail("git-operation-failed");
    candidates.forEach((path, index) => { if (hashes[index] !== tracked.get(path)) blockers.push(path); });
  }
  if (blockers.length) return { clean: false, reason: "residual-content", paths: blockers.slice(0, 100), truncated: blockers.length > 100 };
  return { clean: true, shape: "residue" };
}

/** Finish a journaled removal: retry Git on an intact worktree, delete verified residue, and retire the dangling registration. */
export async function repairResidue(identity, entry, { git = gitRunner(), remove = removeWorktree, purge = purgeDisposable, ...options } = {}) {
  const residue = await inspectResidue(identity, entry, { git, ...options });
  if (!residue.clean) return residue;
  const timing = { deadline: options.deadline, now: options.now };
  if (residue.shape === "worktree") {
    await purge(entry, timing);
    await remove(identity, entry, git);
    return { clean: true, step: "worktree-removed" };
  }
  if (residue.shape === "residue") await removeTree(entry.path, "residual-locked", entry.path, timing);
  await retireRegistration(identity, entry, git, timing);
  return { clean: true, step: residue.shape === "residue" ? "residue-removed" : "worktree-already-absent" };
}

/** Expected-SHA remote deletion; the lease is an atomic old-value guard, never an overwrite authority. */
export async function removeRemoteRef(identity, entry, git = gitRunner()) {
  if (!entry.ref || !safeRef(entry.ref) || entry.head.length !== 40) fail("remote-ref-unsafe");
  const inspect = async () => {
    const output = await git(identity.primary, ["ls-remote", "--heads", identity.remote, entry.ref]);
    const rows = output.trim().split("\n").filter(Boolean);
    if (!rows.length) return null;
    if (rows.length !== 1) fail("remote-ref-ambiguous");
    const [sha, ref, extra] = rows[0].split(/\s+/);
    if (extra || ref !== entry.ref || !/^[a-f0-9]{40}$/.test(sha)) fail("remote-ref-identity");
    return sha;
  };
  const before = await inspect();
  if (before === null) return "already-absent";
  if (before !== entry.head) fail("remote-ref-advanced");
  await git(identity.primary, ["push", `--force-with-lease=${entry.ref}:${entry.head}`, identity.remote, `:${entry.ref}`]);
  if (await inspect() !== null) fail("remote-ref-removal-partial");
  return "removed";
}

/** The only destructive local Git primitives. A failed remove is never widened to recursive deletion. */
export async function removeWorktree(identity, entry, git = gitRunner()) {
  await git(identity.primary, ["worktree", "remove", entry.path]);
  const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
  if (await exists(entry.path) || rows.some(row => resolve(row.worktree).replaceAll("\\", "/") === entry.path)) fail("worktree-removal-partial");
}
export async function removeLocalRef(identity, entry, git = gitRunner(), accepted = async () => false) {
  if (!entry.ref) return "not-applicable";
  if (!safeRef(entry.ref) || await exists(entry.path)) fail("local-ref-unsafe");
  const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
  if (rows.some(row => row.branch === entry.ref || resolve(row.worktree).replaceAll("\\", "/") === entry.path)) fail("local-ref-checked-out");
  const tip = await readLocalRef(identity, entry.ref, git);
  if (tip === null) return "already-absent";
  // Protocol: the tip read here is the compare-and-delete expectation; it must be the journaled head or an accepted ancestor.
  if (tip !== entry.head && !await accepted(tip)) fail("local-ref-advanced");
  await deleteLocalRef(identity, entry.ref, tip, git);
  return "removed";
}
export async function readLocalRef(identity, ref, git = gitRunner()) {
  const output = await git(identity.primary, ["for-each-ref", "--format=%(refname) %(objectname)", ref]);
  const exact = output.trim().split("\n").filter(line => line.startsWith(`${ref} `));
  if (!exact.length) return null;
  const sha = exact[0].slice(ref.length + 1);
  if (exact.length !== 1 || !/^[a-f0-9]{40}$/.test(sha)) fail("local-ref-advanced");
  return sha;
}
export async function deleteLocalRef(identity, ref, tip, git = gitRunner()) {
  await git(identity.primary, ["update-ref", "-d", ref, tip]);
  const after = await git(identity.primary, ["for-each-ref", "--format=%(refname)", ref]);
  if (after.trim().split("\n").includes(ref)) fail("local-ref-removal-partial");
}
