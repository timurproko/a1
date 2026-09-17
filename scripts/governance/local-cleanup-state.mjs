import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, lstat, utimes } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

/** Local-only ownership authority. Absence of a process never transfers ownership. */
export const digest = value => createHash("sha256").update(value).digest("hex");
export const fail = (code, details = {}) => { throw Object.assign(new Error(code), { cleanupCode: code, ...details }); };
const sha = value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const uuid = value => typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const exact = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join() === [...keys].sort().join();
export const LOCK_HEARTBEAT_MS = 5000, LOCK_STALE_MS = 120000;
/** Signal 0 only probes existence; a PID we may not signal (EPERM) is still alive, so the lock is kept. */
export function processAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== "ESRCH"; }
}
export const safeRef = ref => typeof ref === "string" && /^refs\/heads\/(?:feature|fix|refactor|docs|test|chore|style)\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(ref)
  && !/(?:\.\.|\/\.|\/\/|\/$|\.$|\.lock(?:\/|$))/.test(ref);
const disposablePath = value => typeof value === "string" && /^(?:(?:node_modules|dist|\.builds|\.artifacts)(?:\/[A-Za-z0-9_-]+)*|native\/(?:process-guardian|terminal-host)\/target(?:\/[A-Za-z0-9_-]+)*)$/.test(value);
const identityKeys = ["primary", "root", "common", "repository", "remote"];
export function validateIdentity(identity) {
  if (!exact(identity, identityKeys) || ![identity.primary, identity.root, identity.common].every(isAbsolute)
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(identity.repository) || identity.remote !== "origin") fail("repository-identity");
}
export const COMPLETION_NOTES = Object.freeze(["retired-nothing-left", "forgotten"]);
/** Entries written before completion notes existed read as ordinary completions. */
export function normalizeEntry(entry) {
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    if (!("completion" in entry)) entry.completion = null;
    if (!("completionReason" in entry)) entry.completionReason = null;
  }
  return entry;
}
export function validateEntry(entry) {
  const keys = ["id", "path", "filesystem", "change", "sourcePr", "candidatePr", "role", "head", "ref", "disposable", "generation", "state", "ownerHash", "step", "completion", "completionReason"];
  if (!exact(entry, keys) || !uuid(entry.id) || !isAbsolute(entry.path) || typeof entry.filesystem !== "string"
    || !/^\d+:\d+:\d+(?:\.\d+)?$/.test(entry.filesystem) || typeof entry.change !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.change)
    || !positive(entry.sourcePr) || !positive(entry.candidatePr) || !["implementation", "archive", "acceptance", "discard"].includes(entry.role)
    || !sha(entry.head) || entry.ref !== null && !safeRef(entry.ref) || !Array.isArray(entry.disposable)
    || entry.disposable.some(value => !disposablePath(value)) || new Set(entry.disposable).size !== entry.disposable.length
    || !uuid(entry.generation) || !["owned", "released", "deleting", "done"].includes(entry.state)
    || typeof entry.ownerHash !== "string" || !/^[a-f0-9]{64}$/.test(entry.ownerHash)
    || !["none", "remote-delete-intent", "remote-ref-removed", "remove-intent", "worktree-removed", "complete"].includes(entry.step)
    || entry.completion !== null && !COMPLETION_NOTES.includes(entry.completion)
    || entry.completionReason !== null && !(typeof entry.completionReason === "string" && /^[a-z0-9-]{1,80}$/.test(entry.completionReason))) fail("registration-schema");
  if ((entry.completion !== null || entry.completionReason !== null) && entry.state !== "done") fail("registration-state");
  if ((entry.state === "done") !== (entry.step === "complete")
    || ["owned", "released"].includes(entry.state) && entry.step !== "none"
    || entry.state === "deleting" && !["remote-delete-intent", "remote-ref-removed", "remove-intent", "worktree-removed"].includes(entry.step)
    || entry.role !== "discard" && ["remote-delete-intent", "remote-ref-removed"].includes(entry.step)) fail("registration-state");
  return entry;
}
export function validateState(state, identity) {
  validateIdentity(identity);
  if (!exact(state, ["version", "identity", "enabled", "cursor", "entries"]) || state.version !== 1
    || JSON.stringify(state.identity) !== JSON.stringify(identity) || typeof state.enabled !== "boolean"
    || !Number.isSafeInteger(state.cursor) || state.cursor < 0 || !Array.isArray(state.entries) || state.entries.length > 10000) fail("state-schema");
  const ids = new Set(), paths = new Set();
  for (const entry of state.entries) {
    validateEntry(normalizeEntry(entry));
    if (ids.has(entry.id) || paths.has(entry.path)) fail("duplicate-registration");
    ids.add(entry.id); paths.add(entry.path);
  }
  return state;
}

/** Atomic replacements keep the prior complete journal on failed writes. */
export async function atomicJson(path, value, replace = rename) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const file = await open(temporary, "wx", 0o600);
  try { await file.writeFile(JSON.stringify(value, null, 2) + "\n"); await file.sync(); }
  finally { await file.close(); }
  try { await replace(temporary, path); }
  finally { await unlink(temporary).catch(error => { if (error.code !== "ENOENT") throw error; }); }
}
async function regular(path, missing = false) {
  try { const stat = await lstat(path); if (!stat.isFile() || stat.isSymbolicLink()) fail("state-path"); }
  catch (error) { if (!(missing && error.code === "ENOENT")) throw error; }
}
export function createStateStore(identity) {
  validateIdentity(identity);
  const directory = join(identity.common, "local-worktree-cleanup");
  const path = join(directory, "state.json"), lock = join(directory, "mutation.lock"), stop = join(directory, "disabled");
  const initial = () => ({ version: 1, identity, enabled: false, cursor: 0, entries: [] });
  async function checkDirectory(create = false) {
    if (create) await mkdir(directory, { recursive: true, mode: 0o700 });
    try { const stat = await lstat(directory); if (!stat.isDirectory() || stat.isSymbolicLink()) fail("state-directory"); }
    catch (error) { if (error.code !== "ENOENT" || create) throw error; }
  }
  async function read() {
    await checkDirectory(); await regular(path, true);
    try {
      const text = await readFile(path, "utf8"); if (Buffer.byteLength(text) > 16 * 1024 * 1024) fail("state-size");
      return validateState(JSON.parse(text), identity);
    } catch (error) { if (error.code === "ENOENT") return initial(); throw error; }
  }
  async function save(state) { validateState(state, identity); await regular(path, true); await atomicJson(path, state); }
  async function readLock() {
    try { return JSON.parse(await readFile(lock, "utf8")); } catch { return null; }
  }
  /**
   * Evict a lock only when its holder is provably gone: no heartbeat for LOCK_STALE_MS and a PID that no longer exists.
   * A reused or foreign PID reads as alive, which keeps the lock; the eviction itself is journaled beside the state.
   */
  async function evictStaleLock(now) {
    let stat;
    try { stat = await lstat(lock); } catch (error) { if (error.code === "ENOENT") return false; throw error; }
    const record = await readLock();
    const heartbeat = Number.isFinite(record?.heartbeatAt) ? record.heartbeatAt : stat.mtimeMs;
    if (now - heartbeat < LOCK_STALE_MS || processAlive(record?.pid)) return false;
    await atomicJson(join(directory, `lock-evicted-${now}-${randomUUID()}.json`), { version: 1, evictedAt: now, evictedBy: process.pid, lock: record, mtimeMs: stat.mtimeMs });
    await unlink(lock).catch(error => { if (error.code !== "ENOENT") throw error; });
    return true;
  }
  async function locked(action, now = Date.now) {
    await checkDirectory(true);
    let handle;
    for (let attempt = 0; ; attempt++) {
      try { handle = await open(lock, "wx", 0o600); break; }
      catch (error) {
        if (error.code !== "EEXIST") throw error;
        if (attempt === 0 && await evictStaleLock(now())) continue;
        fail("mutation-busy");
      }
    }
    const record = { version: 2, pid: process.pid, nonce: randomUUID(), startedAt: now(), heartbeatAt: now() };
    const write = async () => { const text = JSON.stringify(record); await handle.truncate(0); await handle.write(text, 0, "utf8"); await handle.sync(); };
    // Concurrency: the heartbeat lets a later process distinguish a slow holder from one that was killed before its finally ran.
    const timer = setInterval(() => { record.heartbeatAt = now(); write().catch(() => {}); }, LOCK_HEARTBEAT_MS);
    timer.unref();
    try {
      await write();
      return await action(await read(), save);
    } finally { clearInterval(timer); await handle.close(); await unlink(lock).catch(error => { if (error.code !== "ENOENT") throw error; }); }
  }
  /** With `since`, only a sentinel written at or after that time counts, so an old stop does not veto an explicit sweep. */
  async function disabled(since = null) {
    try { const stat = await lstat(stop); return since === null || stat.mtimeMs >= since; }
    catch (error) { if (error.code === "ENOENT") return false; throw error; }
  }
  async function disable(now = Date.now) {
    // Concurrency: a stop sentinel does not wait for the potentially busy mutation owner.
    await checkDirectory(true); await regular(stop, true);
    const handle = await open(stop, "a", 0o600); await handle.close();
    const time = new Date(now()); await utimes(stop, time, time);
  }
  async function enable() {
    return locked(async (state, save) => { state.enabled = true; await save(state); await regular(stop, true); await unlink(stop).catch(error => { if (error.code !== "ENOENT") throw error; }); });
  }
  return { directory, read, locked, disabled, disable, enable };
}

/** Pure ownership transitions; callers persist only while holding the common lock. */
export function registerEntry(state, input, token) {
  if (typeof token !== "string" || token.length < 32) fail("owner-token");
  const entry = validateEntry({ ...input, id: randomUUID(), generation: randomUUID(), state: "owned", ownerHash: digest(token), step: "none", completion: null, completionReason: null });
  const previous = state.entries.findIndex(old => old.path === entry.path);
  if (previous !== -1) {
    if (state.entries[previous].state !== "done") fail("duplicate-registration");
    // Concurrency: only an explicit new registration may replace a completed path's tombstone.
    state.entries.splice(previous, 1);
  }
  state.entries.push(entry); return entry;
}
export function transitionEntry(entry, operation, token, expectedGeneration) {
  validateEntry(entry);
  if (entry.generation !== expectedGeneration) fail("generation-changed");
  if (entry.state === "deleting" || entry.state === "done") fail("cleanup-in-progress");
  if (typeof token !== "string" || token.length < 32) fail("owner-token");
  if (operation === "claim") {
    if (entry.state !== "released") fail("owned-worktree");
    entry.ownerHash = digest(token); entry.state = "owned";
  } else if (operation === "release") {
    if (entry.state !== "owned" || entry.ownerHash !== digest(token)) fail("owner-mismatch");
    entry.state = "released";
  } else if (operation === "recover") {
    // Protocol: explicit generation-bound recovery claims; it never releases or deletes.
    entry.ownerHash = digest(token); entry.state = "owned";
  } else fail("ownership-operation");
  entry.generation = randomUUID(); return entry;
}
