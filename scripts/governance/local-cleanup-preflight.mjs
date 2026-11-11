import { inspectCheckoutProcesses } from "../development/checkout-process-inspection.mjs";
import { inspectSessionAttachment } from "./local-cleanup-attachment.mjs";
import { inspectWorktree } from "./local-cleanup-git.mjs";

/** Gather independent local blockers before purge; only paths and stable process identities leave the inspector. */
export async function cleanupPreflight(identity, entry, {
  inspect = inspectWorktree, inspectProcesses = inspectCheckoutProcesses, inspectAttachment = inspectSessionAttachment, ...options
} = {}) {
  let content;
  try { content = await inspect(identity, entry, options); }
  catch (error) { content = { clean: false, reason: error.cleanupCode ?? "local-operation-failed", ...(error.paths ? { paths: error.paths } : {}) }; }
  const blockers = content.clean ? [] : [{ reason: content.reason, ...(content.paths ? { paths: content.paths } : {}) }];
  // Invariant: a checkout a running session still has attached is never removed from under it.
  const attachment = await Promise.resolve().then(() => inspectAttachment(entry.path)).catch(() => ({ reason: "attached-session-unverifiable" }));
  if (attachment) blockers.push({ reason: attachment.reason });
  let processes = [];
  try {
    processes = (await inspectProcesses(entry.path, { deadline: options.deadline })).map(({ pid, parent, start, script, protected: protectedProcess }) => ({ pid, parent, start, script, protected: protectedProcess }));
    if (processes.length) blockers.push({ reason: processes.some(row => row.protected) ? "development-process-protected" : "development-processes-running", pids: processes.map(row => row.pid) });
  } catch (error) { blockers.push({ reason: error.cleanupCode ?? "development-process-inspection-unavailable" }); }
  return { ...content, clean: blockers.length === 0, ...(blockers.length ? { reason: blockers[0].reason } : {}), blockers, developmentProcesses: processes };
}
