import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { captureWorktree, discoverRepository, exists, gitRunner, inspectWorktree, parseWorktrees,
  removeLocalRef, removeRemoteRef, removeWorktree } from "./local-cleanup-git.mjs";
import { COMPLETION_DISPOSABLE_PATHS } from "./local-cleanup-complete.mjs";
import { verifyDiscardEvidence } from "./local-cleanup-evidence.mjs";
import { writeLocalCleanupReport } from "./local-cleanup-reconcile.mjs";
import { fail, registerEntry, transitionEntry } from "./local-cleanup-state.mjs";

const reason = error => error.cleanupCode ?? error.archiveCode ?? "local-operation-failed";
const sameIdentity = (entry, snapshot) => ["path", "filesystem", "head", "ref"].every(key => entry[key] === snapshot[key]);
const sameCandidate = (entry, request) => entry.change === request.change && entry.sourcePr === request.sourcePr
  && entry.candidatePr === request.sourcePr && ["implementation", "discard"].includes(entry.role);

async function assertAbsent(identity, entry, git) {
  if (await exists(entry.path)) fail("residual-or-reused-path");
  const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
  if (rows.some(row => resolve(row.worktree).replaceAll("\\", "/") === entry.path)) fail("retained-worktree-metadata");
}

/** One explicitly confirmed, exact-candidate rejected-work transaction. */
export async function discardLocalCleanup({ identity, store, reader, path, change, sourcePr, confirmed = false,
  cwd = process.cwd(), now = Date.now, deadline = now() + 60000, git = gitRunner({ deadline, now }),
  verify = verifyDiscardEvidence, inspect = inspectWorktree, removeRemote = removeRemoteRef,
  remove = removeWorktree, removeRef = removeLocalRef }) {
  const absolute = resolve(path).replaceAll("\\", "/");
  const report = { version: 1, operation: "discard", results: [], coverage: { total: 1, visited: 0, complete: false }, at: now() };
  const row = { path: absolute, sourcePr, disposition: "blocked", steps: [] };
  report.results.push(row);
  let selected;
  try {
    if (!confirmed) fail("discard-confirmation-required");
    await store.locked(async (state, save) => {
      if (JSON.stringify(await discoverRepository(identity.primary, git)) !== JSON.stringify(identity)) fail("repository-changed");
      const request = { change, sourcePr };
      let entry = state.entries.find(item => item.path === absolute), candidate, token;
      if (entry) {
        if (!sameCandidate(entry, request)) fail("discard-registration-conflict");
        if (entry.state === "owned") fail("owned-worktree");
        if (entry.state === "released") {
          const snapshot = await captureWorktree(identity, absolute, git);
          if (!sameIdentity(entry, snapshot)) fail("worktree-identity-changed");
          candidate = { ...entry, role: "discard",
            disposable: [...new Set([...entry.disposable, ...COMPLETION_DISPOSABLE_PATHS])] };
        } else {
          if (entry.role !== "discard") fail("discard-registration-conflict");
          candidate = entry;
        }
      } else {
        const snapshot = await captureWorktree(identity, absolute, git);
        token = randomBytes(32).toString("hex");
        candidate = { ...snapshot, change, sourcePr, candidatePr: sourcePr, role: "discard",
          disposable: [...COMPLETION_DISPOSABLE_PATHS] };
      }
      if (entry?.state === "done") {
        selected = entry; Object.assign(row, { id: entry.id, head: entry.head });
        const evidence = await verify(reader, entry);
        if (evidence.disposition !== "eligible" || evidence.remoteRefPresent) fail("discard-not-absent");
        await assertAbsent(identity, entry, git);
        if (entry.ref && (await git(identity.primary, ["for-each-ref", "--format=%(refname)", entry.ref])).trim()) fail("completed-ref-recreated");
        Object.assign(row, evidence, { disposition: "already-discarded" });
        return;
      }
      if (!entry || entry.state === "released") {
        const evidence = await verify(reader, candidate); Object.assign(row, evidence);
        if (evidence.disposition !== "eligible") return;
        const content = await inspect(identity, candidate, { git, cwd, deadline, now });
        if (!content.clean) { Object.assign(row, content, { disposition: "blocked" }); return; }
        if (!entry) {
          entry = registerEntry(state, candidate, token);
          transitionEntry(entry, "release", token, entry.generation);
        } else Object.assign(entry, { role: candidate.role, disposable: candidate.disposable });
        selected = entry; Object.assign(row, { id: entry.id, head: entry.head });
        entry.state = "deleting"; entry.step = "remote-delete-intent"; await save(state);
      } else {
        selected = entry; Object.assign(row, { id: entry.id, head: entry.head });
      }
      if (entry.step === "remote-delete-intent") {
        const evidence = await verify(reader, entry); Object.assign(row, evidence);
        if (evidence.disposition !== "eligible") return;
        row.steps.push(`remote-ref-${await removeRemote(identity, entry, git)}`);
        const absent = await verify(reader, entry);
        if (absent.disposition !== "eligible" || absent.remoteRefPresent) fail("remote-ref-removal-partial");
        entry.step = "remote-ref-removed"; await save(state);
      }
      if (entry.step === "remote-ref-removed") {
        const evidence = await verify(reader, entry); Object.assign(row, evidence);
        if (evidence.disposition !== "eligible" || evidence.remoteRefPresent) fail("remote-ref-recreated");
        const content = await inspect(identity, entry, { git, cwd, deadline, now });
        if (!content.clean) { Object.assign(row, content, { disposition: "partial" }); return; }
        entry.step = "remove-intent"; await save(state);
        await remove(identity, entry, git); row.steps.push("worktree-removed");
        entry.step = "worktree-removed"; await save(state);
      } else if (entry.step === "remove-intent") {
        await assertAbsent(identity, entry, git); entry.step = "worktree-removed"; await save(state);
        row.steps.push("worktree-already-absent");
      }
      if (entry.step === "worktree-removed") {
        const evidence = await verify(reader, entry); Object.assign(row, evidence);
        if (evidence.disposition !== "eligible" || evidence.remoteRefPresent) fail("remote-ref-recreated");
        await assertAbsent(identity, entry, git);
        row.steps.push(`local-ref-${await removeRef(identity, entry, git)}`);
        await assertAbsent(identity, entry, git);
        entry.state = "done"; entry.step = "complete"; await save(state);
        row.disposition = "discarded";
      }
    });
  } catch (error) {
    row.reason = reason(error);
    row.disposition = selected?.state === "deleting" ? "partial" : "blocked";
  }
  report.coverage.visited = 1; report.coverage.complete = true;
  try { await writeLocalCleanupReport(store, report, now()); } catch { /* Rationale: The mutation result remains authoritative on stdout. */ }
  return report;
}
