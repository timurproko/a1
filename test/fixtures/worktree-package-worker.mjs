import { executeCleanupCommand, executeUnclaimedWorktreeCleanup } from '@timurproko/a1/dist/foundation/lifecycle/worktree-claim-boundary.mjs';
import { captureWorktreeCleanupSnapshot } from '@timurproko/a1/dist/foundation/lifecycle/worktree-cleanup-snapshot.mjs';
// Provenance: test-only producer probes use shipped SDK modules, not additional supported consumer contracts.
import * as context from '@timurproko/a1/dist/foundation/lifecycle/session-repository-context.js';
import { inspectClaimGate, recoverClaimGate } from '@timurproko/a1/dist/foundation/lifecycle/claim-gate-core.mjs';
import { withSessionClaimLock } from '@timurproko/a1/dist/foundation/lifecycle/session-claim-lock.js';
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { join } from 'node:path';
const [mode, file] = process.argv.slice(2), data = JSON.parse(await readFile(file, 'utf8'));
const send = value => { if (process.connected) process.send(value); };
const wait = async path => { for (;;) { try { await readFile(path); return; } catch (error) { if (error.code !== 'ENOENT') throw error; } await delay(20); } };
if (mode === 'recover') {
  send({ starting: true });
  try { send(recoverClaimGate(data.approval)); } catch (error) { send({ state: 'refused', detail: error.message }); }
} else if (mode === 'inspect') {
  send(inspectClaimGate(data.gate));
} else if (mode === 'attach') {
  const options = { dataDir: data.dataDir, runtimeId: `package-${process.pid}`, lockTimeoutMs: 150,
    inspectProcess: async pid => ({ pid, startIdentity: 'packaged-probe' }) };
  await context.registerSessionRepositoryRuntime(data.session, options.runtimeId, { pid: process.pid, startIdentity: 'packaged-probe' }, options);
  process.on('message', async message => {
    try {
      if (message === 'detach') { await context.clearSessionRepositoryContext(data.session, options); send({ detached: true }); }
      else { await context.setSessionRepositoryContext(data.session, data.path, options); send({ attached: true }); }
    } catch (error) { send({ attached: false, code: error.code, detail: error.message }); }
  });
  send({ ready: true });
} else if (mode === 'legacy') {
  const directory = join(data.dataDir, 'session-worktree-claims'); await (await import('node:fs/promises')).mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'mutation.lock'), JSON.stringify({ legacyFixture: true }), { flag: 'wx' });
  await writeFile(data.ready, JSON.stringify({ pid: process.pid })); await wait(data.release);
} else if (mode === 'global') {
  await withSessionClaimLock(join(data.dataDir, 'session-worktree-claims'), {}, async () => {
    await writeFile(data.ready, JSON.stringify({ pid: process.pid })); await wait(data.release);
  });
} else if (mode === 'holder') {
  try {
    await executeUnclaimedWorktreeCleanup(data.snapshot, process.execPath, [process.argv[1], data.descendant ? 'relay' : 'cleanup', file], { dataDir: data.dataDir, cwd: data.primary });
    send({ finished: true });
  } catch (error) { send({ finished: false, code: error.code, detail: error.stderr }); }
} else if (mode === 'relay') {
  await executeCleanupCommand(process.execPath, [process.argv[1], 'cleanup', file], { cwd: data.primary, protectTarget: true });
} else if (mode === 'cleanup') {
  await writeFile(data.ready, JSON.stringify({ pid: process.pid, parent: process.ppid })); await wait(data.release);
  if (data.rebind) {
    const reservation = JSON.parse(process.env.WORKTREE_CLEANUP_RESERVATION);
    reservation.expected = await captureWorktreeCleanupSnapshot(data.path);
    process.env.WORKTREE_CLEANUP_RESERVATION = JSON.stringify(reservation);
  }
  if (!data.noRemove) await executeCleanupCommand('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', '-c', 'gc.auto=0', '-C', data.primary, 'worktree', 'remove', data.path], { cwd: data.primary, protectTarget: true });
  await writeFile(data.done, 'destructive command closed');
} else throw new Error('unknown fixture mode');
