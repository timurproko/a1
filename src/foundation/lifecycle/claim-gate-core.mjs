import { randomUUID } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, linkSync, unlinkSync } from "node:fs";
import { dirname, join, resolve, toNamespacedPath } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";
import { tryAcquireClaimGate as legacyAcquire, trackClaimGateChild } from "./claim-gate-legacy.mjs";
import { assertClaimGateVolume, claimGateLifetime, inspectClaimGateLifetime } from "./claim-gate-witness.mjs";

export { trackClaimGateChild };
const schema = "claim-gate-storage-v2", fingerprint = s => `${s.dev}:${s.ino}:${s.birthtimeNs}`;
const key = p => process.platform === "win32" ? resolve(p).toLowerCase() : resolve(p);
const fail = message => Object.assign(new Error(message), { code: "worktree-gate-unverifiable" });
function regular(path, links) {
  const s = lstatSync(path, { bigint: true });
  if (!s.isFile() || s.isSymbolicLink() || s.nlink !== BigInt(links) || s.ino === 0n || s.birthtimeNs <= 0n || s.size > 1024n * 1024n) throw fail("gate storage is linked, oversized or malformed; retained");
  return fingerprint(s);
}
function initialize(path) {
  const token = randomUUID(), anchor = `${path}.store-${token}`;
  const db = new DatabaseSync(toNamespacedPath(anchor));
  try {
    db.exec("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; BEGIN IMMEDIATE; CREATE TABLE metadata (value TEXT NOT NULL); CREATE TABLE authority (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);");
    db.prepare("INSERT INTO metadata VALUES (?)").run(JSON.stringify({ schema, token, path: key(path) }));
    db.exec("COMMIT");
  } finally { db.close(); }
  // Protocol: publish a complete database atomically, retaining its exact second name as a permanent identity anchor.
  try { linkSync(anchor, path); }
  catch (error) { unlinkSync(anchor); if (error.code !== "EEXIST") throw error; }
}
function openGate(path, create = false) {
  assertClaimGateVolume(path);
  if (key(realpathSync(dirname(path))) !== key(dirname(path))) throw fail("gate directory is linked or replaced");
  if (!existsSync(path)) { if (!create) return null; initialize(path); }
  const physical = regular(path, 2);
  for (const suffix of ["-journal", "-wal", "-shm"]) if (existsSync(path + suffix)) regular(path + suffix, 1);
  const db = new DatabaseSync(toNamespacedPath(path));
  try {
    db.exec("PRAGMA synchronous=FULL; PRAGMA busy_timeout=0; BEGIN IMMEDIATE");
    const objects = db.prepare("SELECT name, type FROM sqlite_master ORDER BY name").all();
    if (JSON.stringify(objects) !== JSON.stringify([{ name: "authority", type: "table" }, { name: "metadata", type: "table" }])) throw fail("unknown gate database objects; retained");
    const rows = db.prepare("SELECT value FROM metadata").all();
    if (rows.length !== 1) throw fail("gate storage schema differs");
    const meta = JSON.parse(rows[0].value);
    if (meta.schema !== schema || meta.path !== key(path) || !/^[a-f0-9-]{36}$/u.test(meta.token)
      || regular(`${path}.store-${meta.token}`, 2) !== physical || regular(path, 2) !== physical) throw fail("gate identity anchor changed");
    const rowsActive = db.prepare("SELECT value FROM authority").all();
    if (rowsActive.length > 1) throw fail("gate authority is malformed");
    const value = rowsActive.length ? JSON.parse(rowsActive[0].value) : null;
    if (rowsActive.length && (!value || value.schema !== schema || !/^[a-f0-9-]{36}$/u.test(value.nonce) || !Number.isSafeInteger(value.pid) || value.pid <= 0 || value.lifetime?.holder !== value.pid || value.binding !== undefined && !/^[a-f0-9]{64}$/u.test(value.binding))) throw fail("gate generation is malformed");
    return { db, value, physical, check() { if (regular(path, 2) !== physical || regular(`${path}.store-${meta.token}`, 2) !== physical) throw fail("gate replaced during operation"); } };
  } catch (error) { db.close(); throw error; }
}
function transaction(path, create, operation) {
  const store = openGate(path, create);
  if (!store) return null;
  try { const result = operation(store); store.check(); store.db.exec("COMMIT"); return result; }
  finally { store.db.close(); }
}
const busy = error => error?.code === "ERR_SQLITE_ERROR" && [5, 6].includes(error.errcode & 0xff);

/** Retain the caller's exact capability through temporary SQLite contention, never retry identity/child/proof failures. */
export async function retryClaimGateContention(operation, { signal } = {}) {
  for (;;) {
    signal?.throwIfAborted();
    try { return operation(); }
    catch (error) { if (!busy(error)) throw error; }
    await delay(20, undefined, { signal });
  }
}
function ownedTransaction(path, nonce, physical, operation) {
  const committed = transaction(path, false, store => {
    assertGeneration(store, nonce);
    if (store.physical !== physical) throw fail("gate identity changed; stale authority cannot mutate its successor");
    operation(store);
    return true;
  });
  if (committed !== true) throw fail("gate authority disappeared; retirement is unverifiable");
}
function assertGeneration(store, nonce) {
  if (store.value?.nonce !== nonce) throw fail("gate generation changed; stale authority cannot mutate its successor");
}
function childPaths(path, nonce) {
  const directory = `${path}.children`;
  if (!existsSync(directory)) return [];
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw fail("cleanup child metadata is linked or malformed");
  return readdirSync(directory).map(name => {
    if (!/^[a-f0-9-]{36}$/u.test(name)) throw fail("unknown child intent; retained");
    const file = join(directory, name); regular(file, 1);
    const child = JSON.parse(readFileSync(file, "utf8"));
    if (child.nonce !== nonce || !Number.isSafeInteger(child.pid) || child.pid <= 0) throw fail("child intent belongs to another or malformed generation");
    return file;
  });
}

/** Windows v2: persistent kernel-serialized storage and positive lifetime proof; other platforms retain v1 exclusion. */
export function tryAcquireClaimGate(path) {
  if (process.platform !== "win32" || process.arch !== "x64") return legacyAcquire(path);
  const gate = `${path}.gate`, lifetime = claimGateLifetime();
  try {
    return transaction(gate, true, store => {
      if (store.value) return null;
      if (childPaths(gate, null).length) throw fail("orphan child intents lack authority; retained");
      const nonce = randomUUID(), physical = store.physical, value = { schema, nonce, pid: process.pid, lifetime };
      store.db.prepare("INSERT INTO authority VALUES (1, ?)").run(JSON.stringify(value));
      let released = false, bound = false;
      return { path: gate, nonce,
        bind(binding) {
          if (released || bound || !/^[a-f0-9]{64}$/u.test(binding)) throw fail("worktree gate binding is unavailable");
          ownedTransaction(gate, nonce, physical, current => { current.db.prepare("UPDATE authority SET value=? WHERE id=1").run(JSON.stringify({ ...current.value, binding })); });
          bound = true;
        },
        release() {
          if (released) return;
          ownedTransaction(gate, nonce, physical, current => {
            if (childPaths(gate, nonce).length) throw Object.assign(new Error("cleanup descendants are not proven stopped; gate retained"), { code: "worktree-cleanup-child-unverifiable" });
            current.db.exec("DELETE FROM authority");
          });
          released = true;
        },
      };
    });
  } catch (error) {
    if (busy(error)) return null;
    // Compatibility: historical regular wx gates remain exclusion barriers, never silently upgraded or reclaimed.
    if (existsSync(gate)) {
      const stat = lstatSync(gate);
      if (stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size <= 4096 && readFileSync(gate, "utf8").startsWith("{")) return null;
    }
    throw error;
  }
}

/** Read delegation while serialized with release/recovery; persistent idle storage is not active authority. */
export function readClaimGate(path) {
  if (process.platform !== "win32" || process.arch !== "x64") return JSON.parse(readFileSync(path, "utf8"));
  return transaction(path, false, store => store.value);
}

/** Inspection grants no recovery authority: the caller must retain this exact physical identity and generation. */
export function inspectClaimGate(path) {
  try {
    const result = transaction(path, false, store => ({ path: key(path), physical: store.physical, nonce: store.value?.nonce ?? null, lifetime: store.value?.lifetime }));
    if (!result) return { path: key(path), state: "absent" };
    const { lifetime, ...approval } = result;
    return { ...approval, state: lifetime ? inspectClaimGateLifetime(lifetime) : "idle" };
  } catch (error) { return { path: key(path), state: busy(error) ? "contended" : "unverifiable", detail: String(error.message) }; }
}

/** Clear only one positively stopped generation. SQLite rollback makes recovery interruption retryable. */
export function recoverClaimGate(approval) {
  if (approval?.state !== "recoverable") throw fail("inspect first; only a positively recoverable gate can be recovered");
  return transaction(approval.path, false, store => {
    if (store.physical !== approval.physical) throw fail("gate replaced since recovery inspection");
    assertGeneration(store, approval.nonce);
    if (inspectClaimGateLifetime(store.value.lifetime) !== "recoverable") throw fail("old execution has not been proven stopped");
    store.check();
    for (const child of childPaths(approval.path, approval.nonce)) unlinkSync(child);
    store.db.exec("DELETE FROM authority");
    return { state: "recovered", nonce: approval.nonce };
  });
}
