import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { captureWorktree, discoverRepository, exists, gitRunner, inspectWorktree, parseWorktrees, purgeDisposable, removeWorktree,
  REPOSITORY_DISPOSABLE_PATHS } from "./local-cleanup-git.mjs";
import { cleanupPreflight } from "./local-cleanup-preflight.mjs";
import { digest, fail, registerEntry, transitionEntry } from "./local-cleanup-state.mjs";
import { inspectPublication } from "./delivery-publication.mjs";
import { repairPublishedRemoval } from "./local-cleanup-remove-local-recovery.mjs";
import { readDeliveryAdapter } from "./delivery-contract.mjs";

const same = (entry, snapshot) => ["path", "filesystem", "head", "ref"].every(key => entry[key] === snapshot[key]);

/** Exact published local removal never consults merge/CI/archive eligibility, writes a remote, or deletes a branch. */
export async function removePublishedLocalWorktree({ identity, store, path, confirmed = false, preflightOnly = false, runtimePreflight = false,
  ownerToken = null, cwd = process.cwd(), now = Date.now, deadline = now() + 60000, git = gitRunner({ deadline, now }),
  inspect = inspectWorktree, preflight = cleanupPreflight, publication = inspectPublication, purge = purgeDisposable,
  remove = removeWorktree, repair = repairPublishedRemoval }) {
  const absolute = resolve(path).replaceAll("\\", "/");
  const report = { version: 1, operation: "remove-local", preflight: preflightOnly, results: [] };
  const row = { path: absolute, disposition: "blocked", steps: [] }; report.results.push(row);
  let selected, release;
  const active = () => { if (now() >= deadline) fail("pass-deadline"); };
  try {
    if (!confirmed || runtimePreflight && !preflightOnly) fail("local-removal-confirmation-required");
    if (identity.repository !== (await readDeliveryAdapter()).repository) fail("local-removal-adapter-identity");
    const known = await store.locked(state => structuredClone(state.entries.find(entry => entry.path === absolute)));
    const first = known?.role === "local-removal" ? known : await captureWorktree(identity, absolute, git);
    if (!first.ref) fail("publication-branch-required");
    release = await store.acquireResources([`path:${absolute}`, `ref:${first.ref}`]);
    await store.session(async (state, save) => {
      active();
      if (JSON.stringify(await discoverRepository(identity.primary, git)) !== JSON.stringify(identity)) fail("repository-changed");
      let prior = state.entries.find(entry => entry.path === absolute);
      if (prior && known && prior.generation !== known.generation) fail("generation-changed");
      if (prior && prior.state === "owned" && (!ownerToken || digest(ownerToken) !== prior.ownerHash)) fail("owned-worktree");
      if (prior && prior.state === "deleting" && prior.role !== "local-removal") fail("cleanup-in-progress");
      if (prior?.role === "local-removal" && prior.state === "done") {
        if (await exists(absolute)) fail("residual-or-reused-path");
        const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
        if (rows.some(item => resolve(item.worktree).replaceAll("\\", "/") === absolute)) fail("retained-worktree-metadata");
        row.disposition = "already-absent"; row.reason = "published-local-removal"; return;
      }
      const candidate = prior?.role === "local-removal" ? prior : { ...await captureWorktree(identity, absolute, git), disposable: [...REPOSITORY_DISPOSABLE_PATHS] };
      if (candidate.ref !== first.ref) fail("worktree-identity-changed");
      if (prior && prior.role !== "local-removal" && (prior.filesystem !== candidate.filesystem || prior.ref !== candidate.ref)) fail("worktree-identity-changed");
      Object.assign(row, { head: candidate.head, ref: candidate.ref });
      const requirePublication = async () => {
        active(); const evidence = await publication(identity, candidate, { git }); Object.assign(row, evidence);
        if (!evidence.publicationVerified) fail(evidence.reason ?? "publication-unverified");
      };
      const requireContent = async () => {
        const result = await preflight(identity, candidate, { inspect, git, cwd, deadline, now, preserveKeep: true,
          // Security: read-only runtime preflight follows the product's own claim validation; execution never bypasses claims.
          ...(runtimePreflight ? { inspectAttachment: async () => null } : {}) });
        if (!result.clean) { Object.assign(row, result); fail(result.reason ?? "worktree-content"); }
        return result;
      };
      await requirePublication();
      if (candidate.step !== "remove-intent" && candidate.step !== "worktree-removed") await requireContent();
      if (preflightOnly) { row.disposition = "eligible"; return; }
      if (prior?.role !== "local-removal") {
        if (prior) {
          // Compatibility: the delivery association remains recorded; the distinct role/note prevents sweep from deleting retained refs.
          Object.assign(prior, candidate, { role: "local-removal", state: "released", step: "none", completion: null, completionReason: null });
          prior.disposable = [...REPOSITORY_DISPOSABLE_PATHS];
        } else {
          const token = randomBytes(32).toString("hex");
          prior = registerEntry(state, { ...candidate, role: "local-removal", change: "published-local-worktree", sourcePr: 0, candidatePr: 0 }, token);
          transitionEntry(prior, "release", token, prior.generation);
        }
        await save(state);
      }
      selected = prior;
      if (selected.state === "owned") { selected.state = "released"; await save(state); }
      if (selected.step === "none") {
        if (!same(candidate, await captureWorktree(identity, absolute, git))) fail("worktree-identity-changed");
        await requirePublication(); const content = await requireContent(); active();
        await purge(selected, { deadline, now, containedLinks: content.containedLinks });
        // Security: purge never grants removal authority over content or claims appearing in the meantime.
        await requirePublication(); await requireContent(); active();
        selected.state = "deleting"; selected.step = "remove-intent"; await save(state);
        await remove(identity, selected, git); row.steps.push("worktree-removed");
        selected.step = "worktree-removed"; await save(state);
      } else if (selected.step === "remove-intent") {
        await requirePublication(); active();
        const result = await repair(identity, selected, { git, cwd, deadline, now, inspect, preflight, remove, purge });
        if (!result.clean) fail(result.reason ?? "residual-content");
        row.steps.push(result.step); selected.step = "worktree-removed"; await save(state);
      }
      active();
      if (await exists(absolute)) fail("residual-or-reused-path");
      const rows = parseWorktrees(await git(identity.primary, ["worktree", "list", "--porcelain", "-z"]));
      if (rows.some(item => resolve(item.worktree).replaceAll("\\", "/") === absolute)) fail("retained-worktree-metadata");
      Object.assign(selected, { state: "done", step: "complete", completion: "published-local-removal", completionReason: null });
      await save(state); row.steps.push("local-and-remote-refs-retained"); row.disposition = "removed";
    });
  } catch (error) {
    row.reason = error.cleanupCode ?? "local-operation-failed";
    if (error.paths) row.paths = error.paths;
    row.disposition = selected?.state === "deleting" ? "partial" : row.reason === "resource-busy" ? "deferred" : "blocked";
  } finally { if (release) await release(); }
  return report;
}
