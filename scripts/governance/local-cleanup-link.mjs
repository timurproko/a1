import { lstat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fail } from "./local-cleanup-state.mjs";
import { canonical, discoverRepository, gitRunner, inside, inspectWorktree, removeLinkEntry, REPOSITORY_DISPOSABLE_PATHS } from "./local-cleanup-git.mjs";
import { acceptedHead, verifyCleanupEvidence } from "./local-cleanup-evidence.mjs";
import { writeLocalCleanupReport } from "./local-cleanup-reconcile.mjs";

const fingerprint = stat => `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
const samePath = (left, right) => process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;

/** Every lexical ancestor must remain a real directory, never an alternate route through a link. */
async function realAncestors(worktree, link) {
  const result = [];
  let path = worktree;
  for (const component of [null, ...link.split("/").slice(0, -1)]) {
    if (component !== null) path = join(path, component);
    const stat = await lstat(path);
    if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(await canonical(path), resolve(path).replaceAll("\\", "/"))) fail("disposable-link-ancestor");
    result.push({ path: resolve(path).replaceAll("\\", "/"), filesystem: fingerprint(stat) });
  }
  return result;
}

/** Explicitly remove one ignored disposable link, not its target, the worktree, or any other link. */
export async function unlinkDisposableLink({ identity, store, reader, path, change, sourcePr, link, confirmed = false,
  cwd = process.cwd(), now = Date.now, deadline = now() + 60000, git = gitRunner({ deadline, now }),
  verify = verifyCleanupEvidence, inspect = inspectWorktree, removeLink = removeLinkEntry }) {
  const absolute = resolve(path).replaceAll("\\", "/");
  const report = { version: 1, operation: "unlink-disposable-link", results: [], coverage: { total: 1, visited: 0, complete: false }, at: now() };
  const row = { path: absolute, sourcePr, link, disposition: "blocked", steps: [] };
  report.results.push(row);
  let release;
  try {
    if (!confirmed) fail("disposable-link-confirmation-required");
    if (typeof link !== "string" || !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(link)
      || link.split("/").some(part => [".", "..", ".git"].includes(part.toLowerCase()))
      || !REPOSITORY_DISPOSABLE_PATHS.some(root => link.startsWith(`${root}/`))
      || REPOSITORY_DISPOSABLE_PATHS.includes(link)) fail("disposable-link-path");
    const known = await store.locked(state => structuredClone(state.entries.find(entry => samePath(entry.path, absolute))));
    if (!known) fail("disposable-link-unregistered");
    if (known.path !== absolute || known.change !== change || known.sourcePr !== sourcePr) fail("disposable-link-candidate");
    if (known.state !== "released") fail(known.state === "owned" ? "owned-worktree" : "cleanup-in-progress");
    release = await store.acquireResources([`path:${known.path}`, known.ref ? `ref:${known.ref}` : ""]);
    const candidate = { ...known, disposable: [...REPOSITORY_DISPOSABLE_PATHS] };
    async function unchangedRegistration() {
      await store.locked(state => {
        const entry = state.entries.find(item => item.id === known.id);
        if (JSON.stringify(entry) !== JSON.stringify(known)) fail("disposable-link-registration-drift");
      });
    }
    async function preflight() {
      if (now() >= deadline) fail("pass-deadline");
      await unchangedRegistration();
      if (JSON.stringify(await discoverRepository(identity.primary, git)) !== JSON.stringify(identity)) fail("repository-changed");
      const evidence = await verify(reader, candidate);
      if (evidence.disposition !== "eligible" || evidence.remoteRefPresent === true || !/^[a-f0-9]{40}$/.test(evidence.sourceHead ?? "")) {
        fail(evidence.reason ?? "disposable-link-delivery");
      }
      const ancestors = await realAncestors(absolute, link);
      if ((await git(absolute, ["ls-files", "--stage", "-z", "--", link])).trim()) fail("disposable-link-tracked");
      let ignored;
      try { ignored = (await git(absolute, ["check-ignore", "--no-index", "--", link])).trim(); }
      catch { fail("disposable-link-not-ignored"); }
      if (ignored !== link) fail("disposable-link-not-ignored");
      const selectedPath = join(absolute, link), stat = await lstat(selectedPath);
      if (!stat.isSymbolicLink()) fail("disposable-link-not-link");
      let target;
      try { target = await canonical(selectedPath); } catch { fail("disposable-link-unresolved"); }
      if (inside(target, selectedPath)) fail("content-link-cycle");
      // Internal targets belong to ordinary generated-content inspection, not this no-target-enumeration exception.
      if (samePath(target, absolute) || inside(absolute, target)) fail("disposable-link-internal-target");
      if (target.split(/[\\/]/).some(part => part.toLowerCase() === ".git")
        || samePath(target, identity.common) || inside(identity.common, target)) fail("disposable-link-git-target");
      const content = await inspect(identity, candidate, { git, cwd, deadline, now,
        accepted: sha => acceptedHead(reader, sha, evidence.sourceHead), remediationLink: link });
      if (!content.clean) fail(content.reason ?? "worktree-content", { paths: content.paths });
      const selected = content.selectedLink;
      if (!selected || selected.path !== link || selected.kind !== "descendant") fail("disposable-link-not-link");
      if (selected.filesystem !== fingerprint(stat) || selected.target !== target) fail("disposable-link-drift");
      // Security: a parent that changed during the bounded full-tree inspection invalidates the whole snapshot.
      if (JSON.stringify(await realAncestors(absolute, link)) !== JSON.stringify(ancestors)) fail("disposable-link-ancestor-drift");
      return { ancestors, selected, sourceHead: evidence.sourceHead };
    }
    const before = await preflight();
    const current = await preflight();
    if (JSON.stringify(current) !== JSON.stringify(before)) fail("disposable-link-drift");
    const selectedPath = join(absolute, link);
    // Security: repeat the same binding before every unlink attempt, including Windows junction fallback and retries.
    async function validate() {
      if (now() >= deadline) fail("pass-deadline");
      await unchangedRegistration();
      const evidence = await verify(reader, candidate);
      if (evidence.disposition !== "eligible" || evidence.remoteRefPresent === true || evidence.sourceHead !== before.sourceHead) fail(evidence.reason ?? "disposable-link-delivery-drift");
      if (JSON.stringify(await realAncestors(absolute, link)) !== JSON.stringify(before.ancestors)) fail("disposable-link-ancestor-drift");
      const content = await inspect(identity, candidate, { git, cwd, deadline, now,
        accepted: sha => acceptedHead(reader, sha, before.sourceHead), remediationLink: link });
      if (!content.clean) fail(content.reason ?? "worktree-content", { paths: content.paths });
      if (JSON.stringify(content.selectedLink) !== JSON.stringify(before.selected)) fail("disposable-link-drift");
      if (JSON.stringify(await realAncestors(absolute, link)) !== JSON.stringify(before.ancestors)) fail("disposable-link-ancestor-drift");
      const stat = await lstat(selectedPath);
      if (!stat.isSymbolicLink() || fingerprint(stat) !== before.selected.filesystem || await canonical(selectedPath) !== before.selected.target) fail("disposable-link-drift");
    }
    await validate();
    await removeLink(selectedPath, link, { deadline, now, validate });
    row.steps.push("link-entry-removed");
    try { await lstat(selectedPath); fail("disposable-link-removal-partial"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    row.disposition = "unlinked";
    row.id = known.id; row.head = known.head;
    row.linkIdentity = { filesystem: before.selected.filesystem, target: before.selected.target };
  } catch (error) {
    row.reason = error.cleanupCode ?? error.archiveCode ?? (error.code === "ENOENT" ? "disposable-link-missing" : "local-operation-failed");
    if (Array.isArray(error.paths)) row.paths = error.paths;
    row.disposition = row.steps.length ? "partial" : row.reason === "resource-busy" ? "deferred" : "blocked";
  } finally { if (release) await release(); }
  report.coverage.visited = 1; report.coverage.complete = true;
  try { await writeLocalCleanupReport(store, report, now()); } catch { /* The operation's stdout remains authoritative. */ }
  return report;
}
