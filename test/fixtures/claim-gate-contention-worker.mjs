import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { toNamespacedPath } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const [mode, path, module, protectedPath, stopPath] = process.argv.slice(2);
if (mode === 'hold' || mode === 'read') {
  const db = new DatabaseSync(toNamespacedPath(path));
  db.exec(mode === 'hold' ? 'BEGIN IMMEDIATE' : 'BEGIN');
  if (mode === 'read') db.prepare('SELECT value FROM authority').all();
  process.send({ locked: true });
  process.once('message', () => { db.exec('COMMIT'); db.close(); process.send({ committed: true }); process.disconnect(); });
} else if (mode === 'compete') {
  const { tryAcquireClaimGate, retryClaimGateContention } = await import(module);
  let attempts = 0, acquisitions = 0;
  while (!existsSync(stopPath) && attempts < 10_000) {
    const gate = tryAcquireClaimGate(path.slice(0, -5)); attempts++;
    if (gate) {
      if (existsSync(protectedPath)) throw new Error('competing acquisition overlapped protected work');
      acquisitions++; await retryClaimGateContention(() => gate.release());
    }
    if (attempts === 1) process.send({ ready: true });
    await delay(0);
  }
  process.send({ attempts, acquisitions, overlaps: 0 }); process.disconnect();
} else throw new Error('unknown contention fixture operation');
