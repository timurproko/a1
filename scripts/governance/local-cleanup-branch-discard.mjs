import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { atomicJson, digest, fail, safeRef } from "./local-cleanup-state.mjs";
import { deleteLocalRef, discoverRepository, gitRunner, parseWorktrees, readLocalRef, removeRemoteRef } from "./local-cleanup-git.mjs";
import { verifyBranchDiscardEvidence } from "./local-cleanup-evidence.mjs";
import { writeLocalCleanupReport } from "./local-cleanup-reconcile.mjs";

const journalKeys = ["version", "repository", "ref", "change", "sourcePr", "head", "step"].sort().join();
const sameRef = (left, right) => process.platform === "win32" ? left?.toLowerCase() === right?.toLowerCase() : left === right;
const journalPath = (store, ref) => join(store.directory, `branch-discard-${digest(ref.toLowerCase())}.json`);
const asCandidate = record => ({ ...record, candidatePr: record.sourcePr, role: "discard" });

/** Ref-only journals never impersonate a worktree registration or grant filesystem deletion authority. */
async function readJournal(path, identity, ref) {
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536) fail("discard-branch-journal");
    const record = JSON.parse(await readFile(path, "utf8"));
    if (!record || Object.keys(record).sort().join() !== journalKeys || record.version !== 1
      || record.repository !== identity.repository || record.ref !== ref || !safeRef(record.ref)
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.change ?? "")
      || !Number.isSafeInteger(record.sourcePr) || record.sourcePr < 1 || !/^[a-f0-9]{40}$/.test(record.head ?? "")
      || !["remote-delete-intent", "remote-ref-removed", "complete"].includes(record.step)) fail("discard-branch-journal");
    return record;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    if (error.cleanupCode) throw error;
    fail("discard-branch-journal");
  }
}

/** Explicitly discard only a closed PR's exact refs when no checkout or live registration owns them. */
export async function discardBranchCleanup({ identity, store, reader, branch, change, sourcePr, confirmed = false,
  now = Date.now, deadline = now() + 60000, git = gitRunner({ deadline, now }), verify = verifyBranchDiscardEvidence,
  removeRemote = removeRemoteRef, removeRef = deleteLocalRef }) {
  const report = { version: 1, operation: "discard-branch", results: [], coverage: { total: 1, visited: 0, complete: false }, at: now() };
  const ref = `refs/heads/${branch}`;
  const row = { ref, sourcePr, disposition: "blocked", steps: [] };
  report.results.push(row);
  let release, journal, remoteAttempted = false;
  try {
    if (!confirmed) fail("discard-confirmation-required");
    if (typeof branch !== "string" || !safeRef(ref) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(change ?? "")
      || !Number.isSafeInteger(sourcePr) || sourcePr < 1) fail("discard-branch-arguments");
    release = await store.acquireResources([`ref:${ref}`]);
    const path = journalPath(store, ref);
    journal = await store.locked(() => readJournal(path, identity, ref));
    if (journal && (journal.change !== change || journal.sourcePr !== sourcePr)) fail("discard-branch-journal-conflict");
    if (!journal) {
      const pull = await reader.get(`${reader.prefix}/pulls/${sourcePr}`);
      journal = { version: 1, repository: identity.repository, ref, change, sourcePr, head: pull?.head?.sha, step: "remote-delete-intent" };
    }
    const candidate = asCandidate(journal);
    row.head = journal.head;
    async function localPreflight() {
      if (now() >= deadline) fail("pass-deadline");
      if (JSON.stringify(await discoverRepository(identity.primary, git)) !== JSON.stringify(identity)) fail("repository-changed");
      const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
      if (rows.some(item => sameRef(item.branch, ref))) fail("local-ref-checked-out");
      await store.locked(state => {
        if (state.entries.some(entry => entry.state !== "done" && sameRef(entry.ref, ref))) fail("discard-branch-registered");
      });
      const tip = await readLocalRef(identity, ref, git);
      if (tip !== null && tip !== journal.head) fail("local-ref-advanced");
      return tip;
    }
    async function evidence() {
      const result = await verify(reader, candidate);
      Object.assign(row, result);
      if (result.disposition !== "eligible") fail(result.reason ?? "discard-branch-evidence");
      return result;
    }
    let previous = await store.locked(() => readJournal(path, identity, ref));
    async function persist(step) {
      const next = { ...journal, step };
      await store.locked(async () => {
        if (JSON.stringify(await readJournal(path, identity, ref)) !== JSON.stringify(previous)) fail("discard-branch-journal-drift");
        await atomicJson(path, next);
      });
      journal = next; previous = next;
    }
    const remote = await evidence(), local = await localPreflight();
    if (journal.step === "complete") {
      if (remote.remoteRefPresent || local !== null) fail("discard-ref-recreated");
      if ((await git(identity.primary, ["ls-remote", "--heads", identity.remote, ref])).trim()) fail("discard-ref-recreated");
      row.disposition = "already-discarded";
    } else {
      if (previous === null) await persist("remote-delete-intent");
      if (journal.step === "remote-delete-intent") {
        await evidence(); await localPreflight();
        remoteAttempted = true;
        row.steps.push(`remote-ref-${await removeRemote(identity, candidate, git)}`);
        const absent = await evidence();
        if (absent.remoteRefPresent) fail("remote-ref-removal-partial");
        await persist("remote-ref-removed");
      }
      const absent = await evidence();
      if (absent.remoteRefPresent || (await git(identity.primary, ["ls-remote", "--heads", identity.remote, ref])).trim()) fail("remote-ref-recreated");
      const tip = await localPreflight();
      if (tip !== null) {
        await removeRef(identity, ref, journal.head, git);
        row.steps.push("local-ref-removed");
      } else row.steps.push("local-ref-already-absent");
      if (await readLocalRef(identity, ref, git) !== null) fail("local-ref-removal-partial");
      await persist("complete");
      row.disposition = "discarded";
    }
  } catch (error) {
    row.reason = error.cleanupCode ?? error.archiveCode ?? "local-operation-failed";
    row.disposition = journal?.step === "remote-ref-removed" || remoteAttempted || row.steps.length ? "partial" : row.reason === "resource-busy" ? "deferred" : "blocked";
  } finally { if (release) await release(); }
  report.coverage.visited = 1; report.coverage.complete = true;
  try { await writeLocalCleanupReport(store, report, now()); } catch { /* Rationale: report persistence must not obscure the authoritative operation result. */ }
  return report;
}
