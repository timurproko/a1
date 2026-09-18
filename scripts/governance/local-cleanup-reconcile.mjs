import { readdir, lstat, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { atomicJson, fail } from "./local-cleanup-state.mjs";
import { discoverRepository, emptyDirectoryTree, exists, inside, inspectResidue, inspectWorktree, nothingLeft, parseWorktrees, purgeDisposable, removeEmptyTree, removeLocalRef, removeWorktree, repairResidue, retireRegistration, canonical, gitRunner } from "./local-cleanup-git.mjs";
import { acceptedHead, mergedIntoDevelop, verifyCleanupEvidence } from "./local-cleanup-evidence.mjs";
import { pruneMergedBranches } from "./local-cleanup-branches.mjs";

/** A folder Git left behind is removable only once it has sat untouched long enough that no worktree add or removal is mid-flight. */
const EMPTY_DIRECTORY_GRACE_MS = 10 * 60 * 1000;
const reason = error => error.cleanupCode ?? error.archiveCode ?? "local-operation-failed";
const deferred = code => ["pass-deadline", "remote-budget", "remote-backoff", "content-inspection-budget", "mutation-busy"].includes(code);
async function absent(identity, entry, git) {
  if (await exists(entry.path)) fail("residual-or-reused-path");
  const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
  if (rows.some(row => resolve(row.worktree).replaceAll("\\", "/") === entry.path)) fail("retained-worktree-metadata");
}
export async function writeLocalCleanupReport(store, report, now) {
  await atomicJson(join(store.directory, `report-${now}-${randomUUID()}.json`), report);
  const files = [];
  for (const name of await readdir(store.directory)) {
    if (!/^report-\d+-[a-f0-9-]{36}\.json$/.test(name)) continue;
    const path = join(store.directory, name), stat = await lstat(path);
    if (stat.isFile() && !stat.isSymbolicLink()) files.push({ path, time: stat.mtimeMs, size: stat.size });
  }
  files.sort((a, b) => b.time - a.time); let bytes = 0;
  for (const file of files) {
    bytes += file.size;
    if (now - file.time > 30 * 86400000 || bytes > 10 * 1024 * 1024) await unlink(file.path);
  }
}

/** One bounded pass, with no implicit activation, foreground CI wait, or remote writes. */
export async function reconcileLocalCleanup({ identity, store, reader, preview = true, now = Date.now, deadline = now() + 60000,
  cancelled = () => false, git = gitRunner({ deadline, now }), verify = verifyCleanupEvidence, inspect = inspectWorktree,
  remove = removeWorktree, removeRef = removeLocalRef, purge = purgeDisposable, repair = repairResidue,
  cwd = process.cwd(), entryIds = null, requireEnabled = true, includeUnmanaged = true, stopSince = null, pruneBranches = false,
  ancestorOf = (sha, head) => acceptedHead(reader, sha, head), merged = entry => mergedIntoDevelop(reader, entry) }) {
  const report = { version: 1, preview, results: [], coverage: { total: 0, visited: 0, complete: false }, at: now() };
  // Protocol: a completed-delivery HEAD or tip is accepted when every reachable commit is reachable from the merged head.
  const acceptedFor = (entry, evidence) => {
    const head = entry.role === "acceptance" ? null : evidence[entry.role === "archive" ? "archiveHead" : "sourceHead"];
    return async sha => typeof head === "string" && await ancestorOf(sha, head);
  };
  async function run(state, save) {
    const fresh = await discoverRepository(identity.primary, git);
    if (JSON.stringify(fresh) !== JSON.stringify(identity)) fail("repository-changed");
    const selectedIds = entryIds === null ? null : new Set(entryIds);
    if (selectedIds && (selectedIds.size !== entryIds.length || entryIds.some(id => typeof id !== "string"))) fail("candidate-selection");
    const selected = entry => selectedIds === null || selectedIds.has(entry.id);
    const entries = state.entries.filter(entry => entry.state !== "done" && entry.role !== "discard" && selected(entry));
    if (selectedIds && !state.entries.some(selected)) fail("candidate-selection");
    report.coverage.total = entries.length;
    const start = entries.length ? state.cursor % entries.length : 0;
    async function enabled() {
      if (cancelled()) fail("cancelled");
      if (requireEnabled && (!state.enabled || await store.disabled())) fail("cleanup-disabled");
      if (!requireEnabled && stopSince !== null && await store.disabled(stopSince)) fail("cleanup-disabled");
      if (now() >= deadline) fail("pass-deadline");
    }
    if (!preview) await enabled();
    for (let offset = 0; offset < Math.min(100, entries.length); offset++) {
      if (now() >= deadline || cancelled()) break;
      const entry = entries[(start + offset) % entries.length];
      const row = { id: entry.id, path: entry.path, sourcePr: entry.sourcePr, head: entry.head, disposition: "blocked", steps: [] };
      report.results.push(row); report.coverage.visited++;
      try {
        if (entry.state === "owned") { row.reason = "owned-worktree"; continue; }
        let evidence;
        try { evidence = await verify(reader, entry); }
        catch (error) {
          // Protocol: unverifiable evidence with nothing left on disk or in refs retires the journal instead of blocking forever.
          const code = reason(error);
          if (preview || entry.step !== "none" || deferred(code) || !await nothingLeft(identity, entry, git) || !await merged(entry)) throw error;
          await enabled();
          await retireRegistration(identity, entry, git, { deadline, now });
          Object.assign(entry, { state: "done", step: "complete", completion: "retired-nothing-left", completionReason: code });
          await save(state);
          Object.assign(row, { disposition: "retired", reason: code, steps: ["retired-nothing-left"] });
          continue;
        }
        Object.assign(row, evidence);
        if (evidence.disposition !== "eligible") continue;
        const accepted = acceptedFor(entry, evidence);
        // Protocol: a released path deleted by hand is judged by its journal, not by a directory that no longer exists.
        const absentBeforeRemoval = entry.step === "none" && !await exists(entry.path);
        if (entry.step === "none" && !absentBeforeRemoval) {
          const content = await inspect(identity, entry, { git, cwd, deadline, now, accepted });
          if (!content.clean) { Object.assign(row, content, { disposition: "blocked" }); continue; }
        } else if (entry.step === "remove-intent" || absentBeforeRemoval) {
          const residue = await inspectResidue(identity, entry, { git, cwd, deadline, now, inspect });
          if (!residue.clean) { Object.assign(row, residue, { disposition: "partial" }); continue; }
        } else await absent(identity, entry, git);
        if (preview) continue;
        await enabled();
        // Provenance: bind freshly fetched integration objects without moving primary HEAD.
        await git(identity.primary, ["fetch", "--no-tags", "origin", "refs/heads/develop:refs/remotes/origin/develop"]);
        for (const commit of [evidence.sourceMerge, evidence.archiveMerge]) await git(identity.primary, ["merge-base", "--is-ancestor", commit, "refs/remotes/origin/develop"]);
        if (absentBeforeRemoval) {
          evidence = await verify(reader, entry);
          if (evidence.disposition !== "eligible") { Object.assign(row, evidence); continue; }
          if (JSON.stringify(await discoverRepository(identity.primary, git)) !== JSON.stringify(identity)) fail("repository-changed");
          await enabled(); entry.state = "deleting"; entry.step = "remove-intent"; await save(state);
        }
        if (entry.step === "none") {
          evidence = await verify(reader, entry);
          if (evidence.disposition !== "eligible") { Object.assign(row, evidence); continue; }
          if (JSON.stringify(await discoverRepository(identity.primary, git)) !== JSON.stringify(identity)) fail("repository-changed");
          const content = await inspect(identity, entry, { git, cwd, deadline, now, accepted });
          if (!content.clean) { Object.assign(row, content, { disposition: "blocked" }); continue; }
          // Invariant: generated roots go first with bounded retries, so a held handle blocks before any journaled intent.
          await enabled(); await purge(entry, { deadline, now }); await enabled();
          // Provenance: journal the accepted live HEAD so residue verification and ref deletion compare against the tree Git removes.
          if (content.head !== entry.head) { entry.head = content.head; row.head = content.head; }
          entry.state = "deleting"; entry.step = "remove-intent"; await save(state);
          await remove(identity, entry, git); row.steps.push("worktree-removed");
          entry.step = "worktree-removed"; await save(state);
        } else if (entry.step === "remove-intent") {
          // Protocol: an interrupted removal resumes only through verified residue or the exact intact worktree.
          const repaired = await repair(identity, entry, { git, cwd, deadline, now, inspect, remove, purge });
          if (!repaired.clean) { Object.assign(row, repaired, { disposition: "partial" }); continue; }
          row.steps.push(repaired.step); entry.step = "worktree-removed"; await save(state);
        } else {
          // Protocol: an absent path and its Git metadata prove the journaled step, not a reused directory.
          await absent(identity, entry, git); entry.step = "worktree-removed"; await save(state);
          row.steps.push("worktree-already-absent");
        }
        await enabled();
        evidence = await verify(reader, entry);
        if (evidence.disposition !== "eligible") { Object.assign(row, evidence, { disposition: "partial" }); continue; }
        if (JSON.stringify(await discoverRepository(identity.primary, git)) !== JSON.stringify(identity)) fail("repository-changed");
        await absent(identity, entry, git); await enabled();
        row.steps.push(`local-ref-${await removeRef(identity, entry, git, accepted)}`);
        // Invariant: Git worktree remove prunes its own registration. Never sweep unrelated stale registrations.
        await absent(identity, entry, git);
        entry.state = "done"; entry.step = "complete"; await save(state);
        row.disposition = "removed";
      } catch (error) {
        row.reason = reason(error); if (Array.isArray(error.paths)) row.paths = error.paths;
        row.disposition = entry.state === "deleting" ? "partial" : deferred(row.reason) ? "deferred" : "blocked";
      } finally {
        if (!preview) { if (selectedIds === null) state.cursor = start + offset + 1; await save(state); }
      }
    }
    report.coverage.complete = report.coverage.visited === entries.length;
    const completed = state.entries.filter(item => item.state === "done" && item.role !== "discard" && selected(item)
      && !report.results.some(row => row.id === item.id));
    const completedBudget = Math.max(0, 100 - report.coverage.visited);
    for (const entry of completed.slice(0, completedBudget)) {
      if (now() >= deadline || cancelled()) { report.completedCoverage = "deferred"; break; }
      const row = { id: entry.id, path: entry.path, disposition: "already-absent", reason: "verified-completed-journal" };
      try {
        await absent(identity, entry, git);
        if (entry.ref) {
          const refs = await git(identity.primary, ["for-each-ref", "--format=%(refname)", entry.ref]);
          if (refs.trim().split("\n").includes(entry.ref)) fail("completed-ref-recreated");
        }
      } catch (error) { row.disposition = "blocked"; row.reason = reason(error); }
      if (!report.results.some(existing => existing.id === entry.id)) report.results.push(row);
    }
    if (completed.length > completedBudget) report.completedCoverage = "truncated";
    if (includeUnmanaged && await exists(identity.root)) {
      const registered = new Set(state.entries.map(entry => entry.path));
      const names = await readdir(identity.root, { withFileTypes: true });
      const listed = new Set(parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"])).map(row => resolve(row.worktree).replaceAll("\\", "/")));
      const current = await canonical(cwd);
      // Rationale: an all-empty tree has no content to protect, so it is the one unregistered shape a pass may remove.
      async function reclaimEmptyDirectory(row, item) {
        if (listed.has(row.path) || item.isSymbolicLink() || !item.isDirectory()) return;
        if (!await emptyDirectoryTree(row.path, { deadline, now })) return;
        if (current === row.path || inside(row.path, current)) fail("current-worktree");
        if (now() - (await lstat(row.path)).mtimeMs < EMPTY_DIRECTORY_GRACE_MS) { row.reason = "empty-directory-recent"; return; }
        row.reason = "empty-directory";
        if (preview) return;
        await enabled();
        await removeEmptyTree(row.path, "empty-directory-locked", row.path);
        Object.assign(row, { disposition: "removed", steps: ["empty-directory-removed"] });
      }
      for (const name of names.slice(0, 100)) {
        const path = join(identity.root, name.name).replaceAll("\\", "/");
        if (registered.has(path)) continue;
        const row = { path, disposition: "unmanaged", reason: "not-registered" };
        report.results.push(row);
        try { await reclaimEmptyDirectory(row, name); }
        catch (error) { row.reason = reason(error); if (Array.isArray(error.paths)) row.paths = error.paths; row.disposition = deferred(row.reason) ? "deferred" : "blocked"; }
      }
      if (names.length > 100) report.unmanagedCoverage = "truncated";
    }
    if (pruneBranches && !preview) {
      // Rationale: an exhausted candidate pass defers branch pruning to the next sweep instead of failing the whole report.
      try { await enabled(); report.branches = await pruneMergedBranches({ identity, state, reader, git, deadline, now, ancestorOf, cancelled, enabled }); }
      catch (error) { report.branches = { results: [], coverage: { total: 0, visited: 0, complete: false }, deferred: reason(error) }; }
    }
    if (!preview) await writeLocalCleanupReport(store, report, now());
  }
  try {
    if (preview) await run(await store.read(), () => fail("preview-mutation"));
    else await store.locked(run);
  } catch (error) { report.error = reason(error); report.coverage.complete = false; }
  return report;
}
