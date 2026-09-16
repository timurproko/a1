import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, lstat } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

/** Local-only ownership authority. Absence of a process never transfers ownership. */
export const digest = value => createHash("sha256").update(value).digest("hex");
export const fail = code => { throw Object.assign(new Error(code), { cleanupCode: code }); };
const sha = value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const uuid = value => typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const exact = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join() === [...keys].sort().join();
export const safeRef = ref => typeof ref === "string" && /^refs\/heads\/(?:feature|fix|refactor|docs|test|chore|style)\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(ref)
  && !/(?:\.\.|\/\.|\/\/|\/$|\.$|\.lock(?:\/|$))/.test(ref);
const disposablePath = value => typeof value === "string" && /^(?:(?:node_modules|dist|\.builds|\.artifacts)(?:\/[A-Za-z0-9_-]+)*|native\/(?:process-guardian|terminal-host)\/target(?:\/[A-Za-z0-9_-]+)*)$/.test(value);
const identityKeys = ["primary", "root", "common", "repository", "remote"];
export function validateIdentity(identity) {
  if (!exact(identity, identityKeys) || ![identity.primary, identity.root, identity.common].every(isAbsolute)
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(identity.repository) || identity.remote !== "origin") fail("repository-identity");
}
export function validateEntry(entry) {
  const keys = ["id", "path", "filesystem", "change", "sourcePr", "candidatePr", "role", "head", "ref", "disposable", "generation", "state", "ownerHash", "step"];
  if (!exact(entry, keys) || !uuid(entry.id) || !isAbsolute(entry.path) || typeof entry.filesystem !== "string"
    || !/^\d+:\d+:\d+(?:\.\d+)?$/.test(entry.filesystem) || typeof entry.change !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.change)
    || !positive(entry.sourcePr) || !positive(entry.candidatePr) || !["implementation", "archive", "acceptance"].includes(entry.role)
    || !sha(entry.head) || entry.ref !== null && !safeRef(entry.ref) || !Array.isArray(entry.disposable)
    || entry.disposable.some(value => !disposablePath(value)) || new Set(entry.disposable).size !== entry.disposable.length
    || !uuid(entry.generation) || !["owned", "released", "deleting", "done"].includes(entry.state)
    || typeof entry.ownerHash !== "string" || !/^[a-f0-9]{64}$/.test(entry.ownerHash)
    || !["none", "remove-intent", "worktree-removed", "complete"].includes(entry.step)) fail("registration-schema");
  if ((entry.state === "done") !== (entry.step === "complete")
    || ["owned", "released"].includes(entry.state) && entry.step !== "none"
    || entry.state === "deleting" && !["remove-intent", "worktree-removed"].includes(entry.step)) fail("registration-state");
  return entry;
}
export function validateState(state, identity) {
  validateIdentity(identity);
  if (!exact(state, ["version", "identity", "enabled", "cursor", "entries"]) || state.version !== 1
    || JSON.stringify(state.identity) !== JSON.stringify(identity) || typeof state.enabled !== "boolean"
    || !Number.isSafeInteger(state.cursor) || state.cursor < 0 || !Array.isArray(state.entries) || state.entries.length > 10000) fail("state-schema");
  const ids = new Set(), paths = new Set();
  for (const entry of state.entries) {
    validateEntry(entry);
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
  async function locked(action) {
    await checkDirectory(true);
    let handle;
    try { handle = await open(lock, "wx", 0o600); }
    catch (error) { if (error.code === "EEXIST") fail("mutation-busy"); throw error; }
    try {
      await handle.writeFile(JSON.stringify({ version: 1, pid: process.pid, nonce: randomUUID() })); await handle.sync();
      return await action(await read(), save);
    } finally { await handle.close(); await unlink(lock); }
  }
  async function disabled() {
    try { await lstat(stop); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; }
  }
  async function disable() {
    // Concurrency: a stop sentinel does not wait for the potentially busy mutation owner.
    await checkDirectory(true); await regular(stop, true);
    const handle = await open(stop, "a", 0o600); await handle.close();
  }
  async function enable() {
    return locked(async (state, save) => { state.enabled = true; await save(state); await regular(stop, true); await unlink(stop).catch(error => { if (error.code !== "ENOENT") throw error; }); });
  }
  return { directory, read, locked, disabled, disable, enable };
}

/** Pure ownership transitions; callers persist only while holding the common lock. */
export function registerEntry(state, input, token) {
  if (typeof token !== "string" || token.length < 32) fail("owner-token");
  const entry = validateEntry({ ...input, id: randomUUID(), generation: randomUUID(), state: "owned", ownerHash: digest(token), step: "none" });
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
