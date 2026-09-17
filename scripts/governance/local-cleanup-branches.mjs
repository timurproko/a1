import { deleteLocalRef, gitRunner, parseWorktrees, readLocalRef } from "./local-cleanup-git.mjs";
import { safeRef } from "./local-cleanup-state.mjs";
import { SHA } from "./openspec-archive-policy.mjs";

const BRANCH_LIMIT = 100;
const retained = (ref, tip, reason, extra = {}) => ({ ref, tip, disposition: "retained", reason, ...extra });

/** Pull requests of this repository whose head ref is exactly `name`, split by state. */
async function pullRequestsFor(reader, name) {
  const owner = reader.repository.split("/")[0];
  const pulls = await reader.pages(`/pulls?state=all&base=develop&head=${encodeURIComponent(`${owner}:${name}`)}`, 300);
  const same = pulls.filter(pull => pull.head?.ref === name && pull.head.repo?.full_name === reader.repository
    && pull.base?.ref === "develop" && pull.base.repo?.full_name === reader.repository);
  const merged = same.filter(pull => typeof pull.merged_at === "string" && SHA.test(pull.head.sha ?? ""))
    .sort((a, b) => Date.parse(b.merged_at) - Date.parse(a.merged_at));
  return { open: same.filter(pull => pull.state === "open"), merged, any: same.length > 0 };
}

async function remotePresent(reader, name) {
  try { await reader.get(`${reader.prefix}/git/ref/heads/${encodeURIComponent(name)}`); return true; }
  catch (error) { if (error.archiveCode === "github-not-found") return false; throw error; }
}

/**
 * Delete local topic branches whose every commit reached `develop` through a merged pull request of the same name.
 * A branch is never adopted by age or name alone: it needs a merged PR, no open PR, accepted ancestry, an absent
 * remote ref, no checkout, and no live registration; everything else is reported and kept.
 */
export async function pruneMergedBranches({ identity, state, reader, git = gitRunner(), deadline = Infinity, now = Date.now,
  ancestorOf, cancelled = () => false, enabled = async () => {}, limit = BRANCH_LIMIT }) {
  const result = { results: [], coverage: { total: 0, visited: 0, complete: false } };
  const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
  const checkedOut = new Set(rows.map(row => row.branch).filter(Boolean));
  const registered = new Set(state.entries.filter(entry => entry.state !== "done" && entry.ref).map(entry => entry.ref));
  const listing = await git(identity.primary, ["for-each-ref", "--format=%(refname) %(objectname)", "refs/heads/"]);
  const branches = listing.trim().split("\n").filter(Boolean).map(line => { const space = line.indexOf(" "); return { ref: line.slice(0, space), tip: line.slice(space + 1) }; })
    .filter(({ ref, tip }) => safeRef(ref) && SHA.test(tip) && !registered.has(ref));
  result.coverage.total = branches.length;
  for (const { ref, tip } of branches.slice(0, limit)) {
    if (now() >= deadline || cancelled()) break;
    result.coverage.visited++;
    const name = ref.slice("refs/heads/".length);
    try {
      if (checkedOut.has(ref)) { result.results.push(retained(ref, tip, "branch-checked-out")); continue; }
      const pulls = await pullRequestsFor(reader, name);
      if (pulls.open.length) { result.results.push(retained(ref, tip, "branch-open-pull-request", { sourcePr: pulls.open[0].number })); continue; }
      if (!pulls.merged.length) { result.results.push(retained(ref, tip, pulls.any ? "branch-closed-pull-request" : "branch-no-pull-request")); continue; }
      const source = pulls.merged[0];
      if (!await ancestorOf(tip, source.head.sha)) { result.results.push(retained(ref, tip, "branch-unmerged-commits", { sourcePr: source.number })); continue; }
      if (await remotePresent(reader, name)) { result.results.push(retained(ref, tip, "branch-remote-present", { sourcePr: source.number })); continue; }
      await enabled();
      // Protocol: reread the tip and checkout state immediately before the compare-and-delete.
      const current = await readLocalRef(identity, ref, git);
      const live = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
      if (current === null) { result.results.push({ ref, tip, disposition: "already-absent", sourcePr: source.number }); continue; }
      if (live.some(row => row.branch === ref)) { result.results.push(retained(ref, current, "branch-checked-out", { sourcePr: source.number })); continue; }
      if (current !== tip && !await ancestorOf(current, source.head.sha)) { result.results.push(retained(ref, current, "branch-unmerged-commits", { sourcePr: source.number })); continue; }
      await deleteLocalRef(identity, ref, current, git);
      result.results.push({ ref, tip: current, disposition: "removed", sourcePr: source.number });
    } catch (error) {
      const code = error.cleanupCode ?? error.archiveCode ?? "local-operation-failed";
      result.results.push(retained(ref, tip, code));
      if (["pass-deadline", "remote-budget", "remote-backoff", "cancelled", "cleanup-disabled"].includes(code)) { result.deferred = code; break; }
    }
  }
  result.coverage.complete = result.coverage.visited === branches.length;
  return result;
}
