import { readFile, writeFile, access } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { once } from "node:events";
import { executeCleanupCommand, executeUnclaimedWorktreeCleanup } from "../../dist/foundation/lifecycle/worktree-claim-boundary.mjs";
import { captureWorktreeCleanupSnapshot } from "../../dist/foundation/lifecycle/worktree-cleanup-snapshot.mjs";

const [mode, file] = process.argv.slice(2), data = JSON.parse(await readFile(file, "utf8"));
const wait = async path => { for (;;) { try { await access(path); return; } catch {} await delay(20); } };
if (mode === "repository") {
  const { discoverRepository, removeWorktree } = await import("../../scripts/governance/local-cleanup-git.mjs");
  const { removePublishedLocalWorktree } = await import("../../scripts/governance/local-cleanup-remove-local.mjs");
  const { createStateStore } = await import("../../scripts/governance/local-cleanup-state.mjs");
  const { cleanupPreflight } = await import("../../scripts/governance/local-cleanup-preflight.mjs");
  const identity = await discoverRepository(data.primary), store = createStateStore(identity);
  const report = await removePublishedLocalWorktree({ identity, store, path: data.path, cwd: data.primary, confirmed: true,
    claimOptions: { dataDir: data.dataDir }, preflight: (owner, entry, options) => cleanupPreflight(owner, entry, { ...options, inspectProcesses: async () => [] }),
    remove: async (...args) => { process.send({ atRemove: true }); await once(process, "message"); await removeWorktree(...args); } });
  process.send({ report }); process.disconnect();
} else if (mode === "attach") {
  const { registerSessionRepositoryRuntime, setSessionRepositoryContext } = await import("../../dist/foundation/lifecycle/session-repository-context.js");
  const { PID_LIVENESS_IDENTITY } = await import("../../dist/foundation/lifecycle/process-liveness.js");
  const options = { dataDir: data.dataDir, runtimeId: `competitor-${process.pid}`, lockTimeoutMs: 150 };
  await registerSessionRepositoryRuntime(data.session, options.runtimeId, { pid: process.pid, startIdentity: PID_LIVENESS_IDENTITY }, options);
  process.send({ ready: true });
  process.on("message", async () => {
    try { await setSessionRepositoryContext(data.session, data.path, options); process.send({ attached: true }); }
    catch (error) { process.send({ attached: false, code: error.code }); }
  });
} else if (mode === "holder") {
  try {
    await executeUnclaimedWorktreeCleanup(data.snapshot, process.execPath, [import.meta.filename, "cleanup", file], { dataDir: data.dataDir, cwd: data.primary });
    process.send?.({ finished: true });
  } catch (error) { process.send?.({ finished: false, code: error.code, message: error.message, stderr: error.stderr }); process.exitCode = 1; }
} else if (mode === "cleanup") {
  if (data.grandchild) {
    await executeCleanupCommand(process.execPath, [import.meta.filename, "destructive", file], { environment: process.env, cwd: data.primary, protectTarget: true });
  } else await destructive();
} else if (mode === "destructive") await destructive();

async function destructive() {
  await writeFile(data.ready, JSON.stringify({ pid: process.pid, parent: process.ppid }));
  await wait(data.release);
  if (data.tamper) {
    const reservation = JSON.parse(process.env.WORKTREE_CLEANUP_RESERVATION);
    if (data.tamper === "snapshot") reservation.expected = await captureWorktreeCleanupSnapshot(data.path);
    else reservation.dataDir = `${data.dataDir}-different`;
    process.env.WORKTREE_CLEANUP_RESERVATION = JSON.stringify(reservation);
  }
  await executeCleanupCommand("git", ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", "-C", data.primary, "worktree", "remove", data.path], { environment: process.env, protectTarget: true });
  await writeFile(data.done, "removed");
}
