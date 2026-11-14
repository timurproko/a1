import { resolve } from "node:path";
import { captureWorktree, gitRunner, REPOSITORY_DISPOSABLE_PATHS } from "./local-cleanup-git.mjs";
import { cleanupPreflight } from "./local-cleanup-preflight.mjs";
import { digest, fail } from "./local-cleanup-state.mjs";

/** Read-only exact preservation preflight for merged completion; it is neither publication proof nor cleanup enrollment. */
export async function inspectLocalPreservation({ identity, store, path, runtimePreflight = false, ownerToken = null,
  cwd = process.cwd(), git = gitRunner(), preflight = cleanupPreflight, deadline = Date.now() + 60_000 }) {
  const absolute = resolve(path).replaceAll("\\", "/"), row = { path: absolute, disposition: "blocked" };
  let release;
  try {
    const snapshot = await captureWorktree(identity, absolute, git);
    release = await store.acquireResources([`path:${absolute}`, snapshot.ref ? `ref:${snapshot.ref}` : ""]);
    const state = await store.read(), prior = state.entries.find(entry => entry.path === absolute);
    if (prior && prior.state === "owned" && (!ownerToken || digest(ownerToken) !== prior.ownerHash)) fail("owned-worktree");
    if (prior && prior.state === "deleting") fail("cleanup-in-progress");
    if (prior && (prior.filesystem !== snapshot.filesystem || prior.ref !== snapshot.ref)) fail("worktree-identity-changed");
    const content = await preflight(identity, { ...snapshot, disposable: [...REPOSITORY_DISPOSABLE_PATHS] }, { git, cwd, deadline, preserveKeep: true,
      ...(runtimePreflight ? { inspectAttachment: async () => null } : {}) });
    Object.assign(row, content, { disposition: content.clean ? "eligible" : "blocked" });
  } catch (error) { row.reason = error.cleanupCode ?? "preservation-unverifiable"; }
  finally { if (release) await release(); }
  return { operation: "preservation-preflight", preflight: true, results: [row] };
}
