import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { pullRequestsFor, remotePresent } from "./local-cleanup-branches.mjs";
import { COMPLETION_DISPOSABLE_PATHS } from "./local-cleanup-complete.mjs";
import {
  captureWorktree,
  discoverRepository,
  exists,
  gitRunner,
  inspectWorktree,
  parseWorktrees,
  purgeDisposable,
  readLocalRef,
  removeLocalRef,
  removeWorktree,
  repairResidue,
} from "./local-cleanup-git.mjs";
import { writeLocalCleanupReport } from "./local-cleanup-reconcile.mjs";
import { fail, registerEntry, transitionEntry } from "./local-cleanup-state.mjs";

const reason = error => error.cleanupCode ?? error.archiveCode ?? "local-operation-failed";
const sameIdentity = (entry, snapshot) => ["path", "filesystem", "head", "ref"].every(key => entry[key] === snapshot[key]);

async function assertAbsent(identity, entry, git) {
  if (await exists(entry.path)) fail("residual-or-reused-path");
  const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
  if (rows.some(row => resolve(row.worktree).replaceAll("\\", "/") === entry.path)) fail("retained-worktree-metadata");
}

/** Freshly prove that a no-PR/no-remote topic tip contributes no commit beyond origin/develop. */
export async function verifyRedundantWorktree(identity, reader, entry, git = gitRunner(), { acquireResources = null } = {}) {
  if (entry.ref === null || !entry.ref.startsWith("refs/heads/")) fail("redundant-detached");
  const name = entry.ref.slice("refs/heads/".length);
  const pulls = await pullRequestsFor(reader, name, { target: null });
  if (pulls.any) fail("redundant-pull-request", { sourcePr: pulls.open[0]?.number ?? pulls.merged[0]?.number });
  if (await remotePresent(reader, name)) fail("redundant-remote-ref");
  const releaseFetch = acquireResources ? await acquireResources(["ref:refs/remotes/origin/develop"]) : null;
  try { await git(identity.primary, ["fetch", "--no-tags", "origin", "refs/heads/develop:refs/remotes/origin/develop"]); }
  finally { if (releaseFetch) await releaseFetch(); }
  const targetSha = (await git(identity.primary, ["rev-parse", "refs/remotes/origin/develop"])).trim();
  const unique = (await git(identity.primary, ["rev-list", "--count", entry.head, "--not", targetSha])).trim();
  if (unique !== "0") fail("redundant-unintegrated-head");
  return { targetSha, ref: name, remoteRefPresent: false, pullRequestPresent: false };
}

/** One explicitly confirmed transaction for an unregistered checkout that contains no unique work. */
export async function retireRedundantWorktree({ identity, store, reader, path, confirmed = false,
  cwd = process.cwd(), now = Date.now, deadline = now() + 60000, git = gitRunner({ deadline, now }),
  verify = verifyRedundantWorktree, inspect = inspectWorktree, remove = removeWorktree,
  removeRef = removeLocalRef, purge = purgeDisposable, repair = repairResidue }) {
  const absolute = resolve(path).replaceAll("\\", "/");
  const report = { version: 1, operation: "retire-redundant", results: [], coverage: { total: 1, visited: 0, complete: false }, at: now() };
  const row = { path: absolute, disposition: "blocked", steps: [] };
  report.results.push(row);
  let selected, releaseResources;
  try {
    if (!confirmed) fail("redundant-confirmation-required");
    const known = await store.locked(state => structuredClone(state.entries.find(item => item.path === absolute)));
    const initialRef = known?.ref ?? (await captureWorktree(identity, absolute, git)).ref;
    releaseResources = await store.acquireResources([`path:${absolute}`, initialRef ? `ref:${initialRef}` : ""]);
    const verifyCurrent = entry => verify(identity, reader, entry, git, { acquireResources: store.acquireResources });
    await store.session(async (state, save) => {
      if (JSON.stringify(await discoverRepository(identity.primary, git)) !== JSON.stringify(identity)) fail("repository-changed");
      let entry = state.entries.find(item => item.path === absolute);
      if (entry) {
        if (entry.ref !== initialRef) fail("worktree-identity-changed");
        if (entry.role !== "redundant") fail("redundant-registration-conflict");
        selected = entry; Object.assign(row, { id: entry.id, head: entry.head, ref: entry.ref });
        if (entry.state === "owned") fail("owned-worktree");
        if (entry.state === "done") {
          await assertAbsent(identity, entry, git);
          if (entry.ref && await readLocalRef(identity, entry.ref, git) !== null) fail("completed-ref-recreated");
          row.disposition = "already-retired";
          return;
        }
      } else {
        if (!await exists(absolute)) fail("worktree-absent-unregistered");
        const snapshot = await captureWorktree(identity, absolute, git);
        if (snapshot.ref !== initialRef) fail("worktree-identity-changed");
        if (snapshot.ref === null) fail("redundant-detached");
        if (state.entries.some(item => item.ref === snapshot.ref)) fail("redundant-registration-conflict");
        const candidate = { ...snapshot, change: "redundant-worktree", sourcePr: 0, candidatePr: 0, role: "redundant",
          disposable: [...COMPLETION_DISPOSABLE_PATHS] };
        Object.assign(row, await verifyCurrent(candidate));
        const content = await inspect(identity, candidate, { git, cwd, deadline, now });
        if (!content.clean) { Object.assign(row, content, { disposition: "blocked" }); return; }
        const token = randomBytes(32).toString("hex");
        entry = registerEntry(state, candidate, token);
        transitionEntry(entry, "release", token, entry.generation);
        await save(state);
        selected = entry; Object.assign(row, { id: entry.id, head: entry.head, ref: entry.ref });
      }

      if (entry.step === "none") {
        const snapshot = await captureWorktree(identity, absolute, git);
        if (!sameIdentity(entry, snapshot)) fail("worktree-identity-changed");
        if (state.entries.some(item => item.id !== entry.id && (item.path === entry.path || item.ref === entry.ref))) {
          fail("redundant-registration-conflict");
        }
        Object.assign(row, await verifyCurrent(entry));
        const content = await inspect(identity, entry, { git, cwd, deadline, now });
        if (!content.clean) { Object.assign(row, content, { disposition: "blocked" }); return; }
        await purge(entry, { deadline, now, containedLinks: content.containedLinks });
        entry.state = "deleting"; entry.step = "remove-intent"; await save(state);
        await remove(identity, entry, git); row.steps.push("worktree-removed");
        entry.step = "worktree-removed"; await save(state);
      } else if (entry.step === "remove-intent") {
        Object.assign(row, await verifyCurrent(entry));
        const repaired = await repair(identity, entry, { git, cwd, deadline, now, inspect, remove, purge });
        if (!repaired.clean) { Object.assign(row, repaired, { disposition: "partial" }); return; }
        row.steps.push(repaired.step); entry.step = "worktree-removed"; await save(state);
      }

      if (entry.step === "worktree-removed") {
        Object.assign(row, await verifyCurrent(entry));
        await assertAbsent(identity, entry, git);
        row.steps.push(`local-ref-${await removeRef(identity, entry, git)}`);
        await assertAbsent(identity, entry, git);
        entry.state = "done"; entry.step = "complete"; await save(state);
        row.disposition = "retired";
      }
    });
  } catch (error) {
    row.reason = reason(error); if (Array.isArray(error.paths)) row.paths = error.paths;
    if (Number.isSafeInteger(error.sourcePr)) row.sourcePr = error.sourcePr;
    row.disposition = selected?.state === "deleting" ? "partial" : error.cleanupCode === "resource-busy" ? "deferred" : "blocked";
  } finally { if (releaseResources) await releaseResources(); }
  report.coverage.visited = 1; report.coverage.complete = true;
  try { await writeLocalCleanupReport(store, report, now()); } catch { /* Rationale: stdout remains the mutation authority. */ }
  return report;
}
