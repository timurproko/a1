import { randomUUID } from "node:crypto";
import { lstat, readFile, unlink } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { atomicJson, digest, fail } from "./local-cleanup-state.mjs";
import { canonical, discoverRepository, exists, gitRunner, inside, inspectWorktree, REPOSITORY_DISPOSABLE_PATHS } from "./local-cleanup-git.mjs";
import { acceptedHead, verifyCleanupEvidence } from "./local-cleanup-evidence.mjs";
import { writeLocalCleanupReport } from "./local-cleanup-reconcile.mjs";
import { copyExport, exportAncestors, exportSnapshot, preservedExportDirectory } from "./local-cleanup-export-files.mjs";

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const samePath = (left, right) => process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;

/** Preserve exactly one explicitly selected user export; this grants neither worktree removal nor general file disposal. */
export async function preserveExport({ identity, store, reader, path, change, sourcePr, file, confirmed = false,
  cwd = process.cwd(), home, now = Date.now, deadline = now() + 60000, git = gitRunner({ deadline, now }),
  verify = verifyCleanupEvidence, inspect = inspectWorktree, afterCopy = async () => {}, afterUnlink = async () => {} }) {
  const absolute = resolve(path).replaceAll("\\", "/");
  const report = { version: 1, operation: "preserve-export", results: [], coverage: { total: 1, visited: 0, complete: false }, at: now() };
  const row = { path: absolute, sourcePr, file, disposition: "blocked", steps: [] }; report.results.push(row);
  let release, journal;
  try {
    if (!confirmed) fail("export-preservation-confirmation-required");
    if (typeof file !== "string" || !/^[A-Za-z0-9_. -]+(?:\/[A-Za-z0-9_. -]+)*\.(?:html|jsonl)$/iu.test(file)
      || file.split("/").some(part => [".", "..", ".git"].includes(part.toLowerCase()))) fail("export-preservation-path");
    const known = await store.locked(state => structuredClone(state.entries.find(entry => entry.path === absolute)));
    if (!known) fail("export-preservation-unregistered");
    if (known.change !== change || known.sourcePr !== sourcePr || known.role !== "implementation") fail("export-preservation-candidate");
    if (known.state !== "released") fail(known.state === "owned" ? "owned-worktree" : "cleanup-in-progress");
    release = await store.acquireResources([`path:${known.path}`, known.ref ? `ref:${known.ref}` : ""]);
    const candidate = { ...known, disposable: [...REPOSITORY_DISPOSABLE_PATHS] };
    const source = join(absolute, file);
    const journalPath = join(store.directory, `export-preservation-${digest(`${known.id}\0${file}`)}.json`);
    async function authorized() {
      if (now() >= deadline) fail("pass-deadline");
      await store.locked(state => { if (!same(state.entries.find(entry => entry.id === known.id), known)) fail("export-preservation-registration-drift"); });
      if (!same(await discoverRepository(identity.primary, git), identity)) fail("repository-changed");
      const evidence = await verify(reader, candidate);
      if (evidence.disposition !== "eligible" || evidence.remoteRefPresent === true || !/^[a-f0-9]{40}$/u.test(evidence.sourceHead ?? "")) fail(evidence.reason ?? "export-preservation-delivery");
      const sourcePresent = await exists(source);
      const content = await inspect(identity, candidate, { git, cwd, deadline, now,
        accepted: sha => acceptedHead(reader, sha, evidence.sourceHead), ...(sourcePresent ? { remediationExport: file } : {}) });
      if (!content.clean) fail(content.reason ?? "worktree-content", { paths: content.paths });
      return { sourcePresent, ancestors: await exportAncestors(absolute, file), sourceHead: evidence.sourceHead };
    }
    const before = await authorized();
    Object.assign(row, { id: known.id, head: known.head, sourceHead: before.sourceHead });
    const directory = await preservedExportDirectory(home);
    if (directory === identity.primary || inside(identity.primary, directory) || directory === identity.common || inside(identity.common, directory)) fail("export-destination-inside-repository");
    if (await exists(journalPath)) {
      const stat = await lstat(journalPath);
      if (!stat.isFile() || stat.isSymbolicLink()) fail("export-preservation-journal");
      journal = JSON.parse(await readFile(journalPath, "utf8"));
      if (journal.schema !== "a1-export-preservation-v1" || journal.id !== known.id || journal.file !== file || journal.sourceHead !== before.sourceHead
        || !["copy-intent", "copied", "done"].includes(journal.step) || typeof journal.destination !== "string"
        || !inside(directory, journal.destination) || resolve(journal.destination, "..") !== directory
        || !/^[a-f0-9]{64}$/u.test(journal.source?.hash ?? "") || !same(journal.ancestors, before.ancestors)) fail("export-preservation-journal");
    } else {
      if (!before.sourcePresent) fail("export-preservation-missing");
      const snapshot = await exportSnapshot(source, deadline, now);
      const name = basename(file), extension = name.slice(name.lastIndexOf("."));
      journal = { schema: "a1-export-preservation-v1", id: known.id, file, sourceHead: before.sourceHead, ancestors: before.ancestors,
        source: snapshot, destination: join(directory, `${name.slice(0, -extension.length).slice(0, 140)}-${randomUUID()}${extension}`), step: "copy-intent" };
      await atomicJson(journalPath, journal);
    }
    row.destination = journal.destination;
    if (before.sourcePresent && !same(await exportSnapshot(source, deadline, now), journal.source)) fail("export-preservation-source-drift");
    if (!await exists(journal.destination)) {
      if (journal.step !== "copy-intent" || !before.sourcePresent) fail("export-preservation-copy-missing");
      await copyExport(source, journal.destination, journal.source, deadline, now);
    }
    const destination = await exportSnapshot(journal.destination, deadline, now);
    if (destination.hash !== journal.source.hash || destination.size !== journal.source.size || journal.copy && !same(destination, journal.copy)) fail("export-preservation-destination-drift");
    journal.copy = destination;
    journal.step = journal.step === "done" ? "done" : "copied";
    await atomicJson(journalPath, journal);
    row.steps.push("export-copy-verified");
    await afterCopy();
    const current = await authorized();
    if (current.sourceHead !== journal.sourceHead || !same(current.ancestors, journal.ancestors)
      || !same(await exportSnapshot(journal.destination, deadline, now), journal.copy)
      || !samePath(await canonical(directory), directory.replaceAll("\\", "/"))) fail("export-preservation-drift");
    if (current.sourcePresent) {
      if (!same(await exportSnapshot(source, deadline, now), journal.source)) fail("export-preservation-source-drift");
      await unlink(source);
      row.steps.push("export-source-removed");
      await afterUnlink();
    }
    journal.step = "done";
    await atomicJson(journalPath, journal);
    row.disposition = "preserved";
  } catch (error) {
    row.reason = error.cleanupCode ?? error.archiveCode ?? ({ EACCES: "export-preservation-access", EPERM: "export-preservation-access", EEXIST: "export-preservation-destination-exists", ENOENT: "export-preservation-path-missing" }[error.code] ?? "local-operation-failed");
    if (error.paths) row.paths = error.paths;
    row.disposition = row.steps.length ? "partial" : row.reason === "resource-busy" ? "deferred" : "blocked";
  } finally { if (release) await release(); }
  report.coverage.visited = 1; report.coverage.complete = true;
  try { await writeLocalCleanupReport(store, report, now()); } catch { /* Rationale: diagnostics never replace the preservation result. */ }
  return report;
}
