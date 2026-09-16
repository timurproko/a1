import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { captureWorktree } from "./local-cleanup-git.mjs";
import { fail, registerEntry, transitionEntry } from "./local-cleanup-state.mjs";
import { reconcileLocalCleanup } from "./local-cleanup-reconcile.mjs";

export const COMPLETION_DISPOSABLE_PATHS = Object.freeze([
  "node_modules",
  "dist",
  ".builds",
  ".artifacts/openspec-archive",
  ".artifacts/validation",
  "native/process-guardian/target",
  "native/terminal-host/target",
]);

const sameIdentity = (entry, snapshot) => ["path", "filesystem", "head", "ref"].every(key => entry[key] === snapshot[key]);
const sameCandidate = (entry, request) => entry.change === request.change && entry.sourcePr === request.sourcePr
  && entry.candidatePr === request.candidatePr && entry.role === request.role;

/** Explicitly bind one exact candidate, then reuse the ordinary journaled reconciler for removal. */
export async function completeLocalCleanup({ identity, store, reader, path, change, sourcePr, candidatePr = sourcePr,
  role = "implementation", cwd = process.cwd(), reconcile = reconcileLocalCleanup, reconcileOptions = {} }) {
  const absolute = resolve(path).replaceAll("\\", "/");
  let selected;
  await store.locked(async (state, save) => {
    const request = { change, sourcePr, candidatePr, role };
    const existing = state.entries.find(entry => entry.path === absolute);
    if (existing) {
      if (!sameCandidate(existing, request)) fail("completion-registration-conflict");
      if (existing.state === "owned") fail("owned-worktree");
      if (existing.state === "released") {
        const snapshot = await captureWorktree(identity, absolute);
        if (!sameIdentity(existing, snapshot)) fail("worktree-identity-changed");
        existing.disposable = [...new Set([...existing.disposable, ...COMPLETION_DISPOSABLE_PATHS])];
        await save(state);
      }
      selected = existing;
      return;
    }
    const snapshot = await captureWorktree(identity, absolute);
    const token = randomBytes(32).toString("hex");
    selected = registerEntry(state, { ...snapshot, ...request, disposable: [...COMPLETION_DISPOSABLE_PATHS] }, token);
    transitionEntry(selected, "release", token, selected.generation);
    await save(state);
  });
  return await reconcile({ identity, store, reader, preview: false, cwd, entryIds: [selected.id], requireEnabled: false,
    includeUnmanaged: false, ...reconcileOptions });
}
