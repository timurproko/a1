import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";

/**
 * Removes the worktrees whose work has landed.
 *
 * Whether a worktree has landed is answered by the pull request that carried its
 * commit, not by whether its tip is an ancestor of the base branch: these merges
 * are squashed, so a landed branch's tip never becomes an ancestor and
 * `git branch --merged` calls it unmerged.
 *
 * A directory that refuses to be deleted — a shell sitting in it, an editor
 * holding a handle — is retried, and then scheduled to be removed on the next
 * restart rather than being left as a surprise for later.
 */

const ROOT = resolve(process.argv.slice(2).find(argument => !argument.startsWith("--")) ?? process.cwd());
const APPLY = process.argv.includes("--apply");

/**
 * What to do with one worktree, given what is known about it. Kept apart from
 * the doing so the rule can be read and tested without a repository.
 *
 * @param {{ path: string, dirty: boolean, isPrimary: boolean, pulls: {number: number, state: string}[], ancestorOfBase: boolean }} state
 * @returns {{ action: "remove" | "keep", reason: string }}
 */
export function decideWorktree(state) {
  if (state.isPrimary) return { action: "keep", reason: "the primary checkout" };
  if (state.dirty) return { action: "keep", reason: "it has uncommitted changes" };

  const open = state.pulls.filter(pull => pull.state === "OPEN");
  if (open.length > 0) {
    return { action: "keep", reason: `pull request #${open[0].number} is still open` };
  }
  const merged = state.pulls.filter(pull => pull.state === "MERGED");
  if (merged.length > 0) {
    return { action: "remove", reason: `pull request #${merged[0].number} merged` };
  }
  if (state.ancestorOfBase) return { action: "remove", reason: "its commit is already on the base branch" };
  return { action: "keep", reason: "no merged pull request carries its commit" };
}

function git(args, cwd = ROOT) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** The pull requests GitHub associates with a commit, which survives a squash. */
function pullsFor(sha) {
  try {
    const raw = execFileSync("gh", ["api", `repos/{owner}/{repo}/commits/${sha}/pulls`, "--jq", "[.[] | {number, state}]"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(raw.trim() || "[]").map(pull => ({ number: pull.number, state: String(pull.state).toUpperCase() }));
  } catch {
    return [];
  }
}

function worktrees() {
  const entries = [];
  let current = null;
  for (const line of git(["worktree", "list", "--porcelain"]).split("\n")) {
    if (line.startsWith("worktree ")) {
      current = { path: line.slice("worktree ".length).trim(), head: "", detached: false };
      entries.push(current);
    } else if (line.startsWith("HEAD ") && current) current.head = line.slice(5).trim();
    else if (line === "detached" && current) current.detached = true;
  }
  return entries;
}

/** Deletes a directory that does not want to be deleted. */
function removeDirectory(path) {
  for (const attempt of [0, 1, 2]) {
    try {
      rmSync(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      if (!existsSync(path)) return { removed: true, scheduled: false };
    } catch {
      if (attempt === 2) break;
    }
  }
  if (!existsSync(path)) return { removed: true, scheduled: false };
  if (process.platform !== "win32") return { removed: false, scheduled: false };

  // Windows keeps a handle on a directory a shell is sitting in. Ask the system
  // to remove it on the next restart rather than leaving it to be found later.
  const script = `
$signature = '[DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)] public static extern bool MoveFileEx(string lpExistingFileName, string lpNewFileName, int dwFlags);';
$type = Add-Type -MemberDefinition $signature -Name "Mover" -Namespace "Win32" -PassThru;
$type::MoveFileEx('${path.replace(/'/g, "''")}', $null, 4)`;
  try {
    execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], { stdio: ["ignore", "pipe", "pipe"] });
    return { removed: false, scheduled: true };
  } catch {
    return { removed: false, scheduled: false };
  }
}

function main() {
  // The checkout every worktree hangs off, which is not necessarily the one this
  // is being run from.
  const primary = resolve(git(["rev-parse", "--path-format=absolute", "--git-common-dir"]), "..");
  const base = "origin/develop";
  try {
    git(["fetch", "--quiet", "--prune", "origin", "develop"]);
  } catch {}

  const decisions = [];
  for (const entry of worktrees()) {
    const isPrimary = resolve(entry.path) === resolve(primary);
    const dirty = !isPrimary && git(["status", "--short"], entry.path).length > 0;
    const ancestorOfBase = (() => {
      try {
        git(["merge-base", "--is-ancestor", entry.head, base]);
        return true;
      } catch {
        return false;
      }
    })();
    const pulls = isPrimary ? [] : pullsFor(entry.head);
    decisions.push({ entry, isPrimary, ...decideWorktree({ path: entry.path, dirty, isPrimary, pulls, ancestorOfBase }) });
  }

  for (const decision of decisions) {
    const name = basename(decision.entry.path);
    if (decision.action === "keep") {
      console.log(`keep    ${name} — ${decision.reason}`);
      continue;
    }
    if (!APPLY) {
      console.log(`would remove ${name} — ${decision.reason}`);
      continue;
    }
    try {
      git(["worktree", "remove", decision.entry.path, "--force"]);
    } catch {
      // Already gone from git's registry, or its files are held; the directory
      // still has to go.
    }
    git(["worktree", "prune"]);
    const outcome = removeDirectory(decision.entry.path);
    const note = outcome.removed
      ? "removed"
      : outcome.scheduled
        ? "removed from git; its directory is held open and will be deleted on the next restart"
        : "removed from git; its directory is held open and could not be deleted";
    console.log(`${note}  ${name} — ${decision.reason}`);
  }

  const removable = decisions.filter(decision => decision.action === "remove").length;
  if (!APPLY && removable > 0) console.log(`\n${removable} worktree(s) would be removed. Run with --apply.`);
}

if (process.argv[1] && resolve(process.argv[1]).endsWith(join("scripts", "clean-worktrees.mjs"))) main();
