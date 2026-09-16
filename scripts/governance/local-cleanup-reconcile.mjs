import { readdir, lstat, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { atomicJson, fail } from "./local-cleanup-state.mjs";
import { discoverRepository, exists, inspectWorktree, parseWorktrees, removeLocalRef, removeWorktree, gitRunner } from "./local-cleanup-git.mjs";
import { verifyCleanupEvidence } from "./local-cleanup-evidence.mjs";

const reason = error => error.cleanupCode ?? error.archiveCode ?? "local-operation-failed";
const deferred = code => ["pass-deadline", "remote-budget", "remote-backoff", "content-inspection-budget", "mutation-busy"].includes(code);
async function absent(identity, entry, git) {
  if (await exists(entry.path)) fail("residual-or-reused-path");
  const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
  if (rows.some(row => resolve(row.worktree).replaceAll("\\", "/") === entry.path)) fail("retained-worktree-metadata");
}
async function reportFile(store, report, now) {
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
  remove = removeWorktree, removeRef = removeLocalRef, cwd = process.cwd(), entryIds = null, requireEnabled = true,
  includeUnmanaged = true }) {
  const report = { version: 1, preview, results: [], coverage: { total: 0, visited: 0, complete: false }, at: now() };
  async function run(state, save) {
    const fresh = await discoverRepository(identity.primary, git);
    if (JSON.stringify(fresh) !== JSON.stringify(identity)) fail("repository-changed");
    const selectedIds = entryIds === null ? null : new Set(entryIds);
    if (selectedIds && (selectedIds.size !== entryIds.length || entryIds.some(id => typeof id !== "string"))) fail("candidate-selection");
    const selected = entry => selectedIds === null || selectedIds.has(entry.id);
    const entries = state.entries.filter(entry => entry.state !== "done" && selected(entry));
    if (selectedIds && !state.entries.some(selected)) fail("candidate-selection");
    report.coverage.total = entries.length;
    const start = entries.length ? state.cursor % entries.length : 0;
    async function enabled() {
      if (cancelled()) fail("cancelled");
      if (requireEnabled && (!state.enabled || await store.disabled())) fail("cleanup-disabled");
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
        let evidence = await verify(reader, entry); Object.assign(row, evidence);
        if (evidence.disposition !== "eligible") continue;
        if (entry.step === "none") {
          const content = await inspect(identity, entry, { git, cwd, deadline, now });
          if (!content.clean) { Object.assign(row, content, { disposition: "blocked" }); continue; }
        } else await absent(identity, entry, git);
        if (preview) continue;
        await enabled();
        // Provenance: bind freshly fetched integration objects without moving primary HEAD.
        await git(identity.primary, ["fetch", "--no-tags", "origin", "refs/heads/develop:refs/remotes/origin/develop"]);
        for (const commit of [evidence.sourceMerge, evidence.archiveMerge]) await git(identity.primary, ["merge-base", "--is-ancestor", commit, "refs/remotes/origin/develop"]);
        if (entry.step === "none") {
          evidence = await verify(reader, entry);
          if (evidence.disposition !== "eligible") { Object.assign(row, evidence); continue; }
          if (JSON.stringify(await discoverRepository(identity.primary, git)) !== JSON.stringify(identity)) fail("repository-changed");
          const content = await inspect(identity, entry, { git, cwd, deadline, now });
          if (!content.clean) { Object.assign(row, content, { disposition: "blocked" }); continue; }
          await enabled(); entry.state = "deleting"; entry.step = "remove-intent"; await save(state);
          await remove(identity, entry, git); row.steps.push("worktree-removed");
          entry.step = "worktree-removed"; await save(state);
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
        row.steps.push(`local-ref-${await removeRef(identity, entry, git)}`);
        // Invariant: Git worktree remove prunes its own registration. Never sweep unrelated stale registrations.
        await absent(identity, entry, git);
        entry.state = "done"; entry.step = "complete"; await save(state);
        row.disposition = "removed";
      } catch (error) {
        row.reason = reason(error);
        row.disposition = entry.state === "deleting" ? "partial" : deferred(row.reason) ? "deferred" : "blocked";
      } finally {
        if (!preview) { if (selectedIds === null) state.cursor = start + offset + 1; await save(state); }
      }
    }
    report.coverage.complete = report.coverage.visited === entries.length;
    const completed = state.entries.filter(item => item.state === "done" && selected(item) && !report.results.some(row => row.id === item.id));
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
      for (const name of names.slice(0, 100)) {
        const path = join(identity.root, name.name).replaceAll("\\", "/");
        if (!registered.has(path)) report.results.push({ path, disposition: "unmanaged", reason: "not-registered" });
      }
      if (names.length > 100) report.unmanagedCoverage = "truncated";
    }
    if (!preview) await reportFile(store, report, now());
  }
  try {
    if (preview) await run(await store.read(), () => fail("preview-mutation"));
    else await store.locked(run);
  } catch (error) { report.error = reason(error); report.coverage.complete = false; }
  return report;
}
