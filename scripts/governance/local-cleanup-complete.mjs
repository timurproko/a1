import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { captureWorktree, exists, gitRunner, statusBlockers } from "./local-cleanup-git.mjs";
import { digest, fail, registerEntry, transitionEntry } from "./local-cleanup-state.mjs";
import { reconcileLocalCleanup } from "./local-cleanup-reconcile.mjs";

export const COMPLETION_DISPOSABLE_PATHS = Object.freeze([
  "node_modules",
  "dist",
  ".builds",
  ".artifacts",
  "native/process-guardian/target",
  "native/terminal-host/target",
  "src/integrations/pi/engine/pi-settings-metadata.json",
]);

// Protocol: the head may have moved to an accepted ancestor of the merged PR head; the reconciler judges that, not the binder.
const sameIdentity = (entry, snapshot) => ["path", "filesystem", "ref"].every(key => entry[key] === snapshot[key]);
const sameCandidate = (entry, request) => entry.change === request.change && entry.sourcePr === request.sourcePr
  && entry.candidatePr === request.candidatePr && entry.role === request.role;
/** Only the session holding the owner token may turn its own low-level registration into a release; anyone else stays blocked. */
function releaseOwned(entry, ownerToken, snapshot) {
  if (typeof ownerToken !== "string" || ownerToken.length < 32 || digest(ownerToken) !== entry.ownerHash) fail("owned-worktree");
  Object.assign(entry, snapshot);
  entry.disposable = [...new Set([...entry.disposable, ...COMPLETION_DISPOSABLE_PATHS])];
  transitionEntry(entry, "release", ownerToken, entry.generation);
}

/** Explicitly bind one exact candidate, then reuse the ordinary journaled reconciler for removal. */
export async function completeLocalCleanup({ identity, store, reader, path, change, sourcePr, candidatePr = sourcePr,
  role = "implementation", cwd = process.cwd(), ownerToken = null, reconcile = reconcileLocalCleanup, reconcileOptions = {} }) {
  const absolute = resolve(path).replaceAll("\\", "/");
  let selected;
  await store.locked(async (state, save) => {
    const request = { change, sourcePr, candidatePr, role };
    const existing = state.entries.find(entry => entry.path === absolute);
    if (existing) {
      if (!sameCandidate(existing, request)) fail("completion-registration-conflict");
      if (existing.state === "owned") {
        if (!await exists(absolute)) fail("owned-worktree");
        releaseOwned(existing, ownerToken, await captureWorktree(identity, absolute));
        await save(state);
      } else if (existing.state === "released") {
        // Protocol: a hand-deleted directory has no identity to recapture; the journaled head still binds the ref step.
        if (await exists(absolute)) {
          const snapshot = await captureWorktree(identity, absolute);
          if (!sameIdentity(existing, snapshot)) fail("worktree-identity-changed");
        }
        existing.disposable = [...new Set([...existing.disposable, ...COMPLETION_DISPOSABLE_PATHS])];
        await save(state);
      }
      selected = existing;
      return;
    }
    if (!await exists(absolute)) fail("worktree-absent-unregistered");
    const snapshot = await captureWorktree(identity, absolute);
    const token = randomBytes(32).toString("hex");
    selected = registerEntry(state, { ...snapshot, ...request, disposable: [...COMPLETION_DISPOSABLE_PATHS] }, token);
    transitionEntry(selected, "release", token, selected.generation);
    await save(state);
  });
  return await reconcile({ identity, store, reader, preview: false, cwd, entryIds: [selected.id], requireEnabled: false,
    includeUnmanaged: false, ...reconcileOptions });
}

/**
 * Park a handed-off worktree: register or reclaim it, record its current head, and release it to the sweep.
 * Nothing is evaluated, deleted, or enabled; unpushed content blocks so the release never covers unaccepted work.
 */
export async function handoffLocalCleanup({ identity, store, path, change, sourcePr, candidatePr = sourcePr,
  role = "implementation", ownerToken = null, git = gitRunner() }) {
  const absolute = resolve(path).replaceAll("\\", "/");
  return await store.locked(async (state, save) => {
    const request = { change, sourcePr, candidatePr, role };
    if (!await exists(absolute)) fail("worktree-absent-unregistered");
    const snapshot = await captureWorktree(identity, absolute, git);
    const paths = await statusBlockers(git, absolute, COMPLETION_DISPOSABLE_PATHS, { ignored: false });
    if (paths.length) fail("worktree-content", { paths: paths.slice(0, 100) });
    const token = randomBytes(32).toString("hex");
    const existing = state.entries.find(entry => entry.path === absolute);
    let entry;
    if (existing && existing.state !== "done") {
      if (!sameCandidate(existing, request)) fail("completion-registration-conflict");
      if (existing.filesystem !== snapshot.filesystem) fail("directory-replaced");
      if (existing.ref !== snapshot.ref) fail("worktree-identity-changed");
      if (existing.state === "owned") {
        releaseOwned(existing, ownerToken, snapshot); await save(state);
        return { disposition: "released", id: existing.id, generation: existing.generation, state: existing.state, path: existing.path, head: existing.head,
          ref: existing.ref, sourcePr: existing.sourcePr, candidatePr: existing.candidatePr, change: existing.change };
      }
      transitionEntry(existing, "claim", token, existing.generation);
      Object.assign(existing, snapshot);
      existing.disposable = [...new Set([...existing.disposable, ...COMPLETION_DISPOSABLE_PATHS])];
      entry = existing;
    } else entry = registerEntry(state, { ...snapshot, ...request, disposable: [...COMPLETION_DISPOSABLE_PATHS] }, token);
    transitionEntry(entry, "release", token, entry.generation);
    await save(state);
    return { disposition: "released", id: entry.id, generation: entry.generation, state: entry.state, path: entry.path, head: entry.head, ref: entry.ref,
      sourcePr: entry.sourcePr, candidatePr: entry.candidatePr, change: entry.change };
  });
}
