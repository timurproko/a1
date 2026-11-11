import { createHash, randomUUID } from "node:crypto";
import { open, lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import type { ProcessIdentity } from "./model.js";
import { inspectLiveProcess } from "./process-liveness.js";
import { resolveProductPaths } from "./paths.js";
import { withSessionClaimSnapshot, withSessionClaimLock } from "./session-claim-lock.js";

const CONTEXT_SCHEMA = "a1-session-repository-context-v1";
const RUNTIME_SCHEMA = "a1-session-runtime-v1";
const CLAIM_SCHEMA = "a1-session-worktree-claim-v1";
const MAX_RECORD_BYTES = 16 * 1024;
const MAX_HEADER_BYTES = 64 * 1024;
const MAX_WORKTREES = 256;
const GIT_TIMEOUT_MS = 5_000;
/** Records without an agent id were written by a single-agent release and belong to its one agent. */
export const PRIMARY_SESSION_AGENT_ID = "primary";
const RECORD_FORMAT_VERSION = 2;
const NOT_A_WORKTREE_ROOT = "associated path must be a Git worktree root";
const INVALID_ATTACHMENT = "worktree-attachment-invalid";

export interface SessionRepositoryIdentity {
  readonly sessionId: string;
  readonly sessionFile: string;
}

export interface SessionRepositoryContext {
  readonly cwd: string;
  readonly branch: string;
}

export type SessionWorktreeStatus = "current" | "busy" | "available" | "unverifiable";

export interface SessionWorktreeInventoryEntry extends SessionRepositoryContext {
  readonly status: SessionWorktreeStatus;
  /** Agent holding the claim within its runtime; null when the worktree is unclaimed or unverifiable. */
  readonly agentId: string | null;
}

interface SessionHeader {
  readonly id: string;
  readonly cwd: string;
  readonly file: string;
}

interface GitWorktreeIdentity {
  readonly root: string;
  readonly commonDir: string;
  readonly gitDir: string;
  readonly branch: string | null;
}

/** A registered worktree whose directory or Git pointer is gone; Git lists it as prunable until someone prunes it. */
interface StaleGitWorktree {
  readonly stale: true;
  readonly root: string;
  readonly branch: string | null;
}

interface SessionRepositoryRecord {
  readonly schema: typeof CONTEXT_SCHEMA;
  readonly sessionId: string;
  readonly sessionFile: string;
  readonly startupRoot: string;
  readonly startupCommonDir: string;
  readonly revision?: string;
  readonly worktreeRoot: string;
  readonly worktreeCommonDir: string;
  readonly worktreeGitDir: string;
  readonly updatedAt: string;
}

interface SessionRuntimeRecord {
  readonly schema: typeof RUNTIME_SCHEMA;
  readonly formatVersion: typeof RECORD_FORMAT_VERSION;
  readonly runtimeId: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly sessionFile: string;
  readonly pid: number;
  readonly startIdentity: string;
  readonly updatedAt: string;
}

interface ClaimOwner {
  readonly runtimeId: string;
  readonly agentId: string;
}

interface WorktreeClaimRecord {
  readonly schema: typeof CLAIM_SCHEMA;
  readonly formatVersion: typeof RECORD_FORMAT_VERSION;
  readonly runtimeId: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly worktreeRoot: string;
  readonly worktreeCommonDir: string;
  readonly worktreeGitDir: string;
  readonly pid: number;
  readonly startIdentity: string;
  readonly updatedAt: string;
}

export interface SessionRepositoryContextOptions {
  readonly dataDir?: string;
  readonly signal?: AbortSignal;
  readonly runtimeId?: string;
  /** Agent within the runtime that owns the claim; defaults to the primary agent. */
  readonly agentId?: string;
  readonly runtimeIdentity?: ProcessIdentity;
  readonly inspectProcess?: (pid: number) => Promise<ProcessIdentity | null>;
  readonly lockTimeoutMs?: number;
}

/** Publish the exact live runtime that may acquire a delivery worktree. */
export async function registerSessionRepositoryRuntime(
  identity: SessionRepositoryIdentity,
  runtimeId: string,
  runtimeIdentity: ProcessIdentity,
  options: SessionRepositoryContextOptions = {},
): Promise<void> {
  const header = await readSessionHeader(identity);
  assertRuntimeId(runtimeId);
  const agentId = requireAgentId(options);
  assertProcessIdentity(runtimeIdentity);
  await withClaimLock({ ...options, runtimeIdentity }, async () => {
    await writeRuntimeRecord(header, runtimeId, agentId, runtimeIdentity, options);
  });
}

/** Revalidate a durable association and acquire its live claim for this runtime's agent; sibling agents' claims stay. */
export async function activateSessionRepositoryContext(
  identity: SessionRepositoryIdentity,
  runtimeId: string,
  runtimeIdentity: ProcessIdentity,
  options: SessionRepositoryContextOptions = {},
): Promise<SessionRepositoryContext | null> {
  const header = await readSessionHeader(identity);
  assertRuntimeId(runtimeId);
  const agentId = requireAgentId(options);
  assertProcessIdentity(runtimeIdentity);
  const owner = { runtimeId, agentId };
  return await withClaimLock({ ...options, runtimeIdentity }, async () => {
    await writeRuntimeRecord(header, runtimeId, agentId, runtimeIdentity, options);
    const record = await readContextRecord(header, options);
    if (record === null) {
      await releaseClaimsOwnedBy(owner, null, options);
      return null;
    }
    const selected = await validateContextRecord(header, record, options.signal).catch(() => null);
    if (selected === null) {
      await releaseClaimsOwnedBy(owner, null, options);
      return null;
    }
    const status = await claimAvailability(selected, owner, options);
    if (status !== "available" && status !== "current") {
      await releaseClaimsOwnedBy(owner, null, options);
      return null;
    }
    await writeClaim(header, selected, owner, runtimeIdentity, options);
    await releaseClaimsOwnedBy(owner, selected.gitDir, options);
    return { cwd: selected.root, branch: requireBranch(selected) };
  });
}

/** Release every agent's cooperative editing claims held by this exact runtime generation. */
export async function releaseSessionRepositoryRuntime(
  runtimeId: string,
  runtimeIdentity: ProcessIdentity,
  options: SessionRepositoryContextOptions = {},
): Promise<void> {
  assertRuntimeId(runtimeId);
  assertProcessIdentity(runtimeIdentity);
  await withClaimLock({ ...options, runtimeIdentity }, async () => {
    const runtimes = (await readRuntimeRecordsOf(runtimeId, options))
      .filter(({ record }) => record.pid === runtimeIdentity.pid && record.startIdentity === runtimeIdentity.startIdentity);
    if (runtimes.length === 0) return;
    await releaseRuntimeClaims(runtimeId, options);
    for (const { path } of runtimes) await rm(path, { force: true });
  });
}

/** Persist one explicit same-repository worktree association after atomically claiming it. */
export async function setSessionRepositoryContext(
  identity: SessionRepositoryIdentity,
  worktreePath: string,
  options: SessionRepositoryContextOptions = {},
): Promise<SessionRepositoryContext> {
  const header = await readSessionHeader(identity);
  const startup = await readGitWorktreeIdentity(header.cwd, false, options.signal);
  const selected = await readGitWorktreeIdentity(worktreePath, true, options.signal);
  if (!samePath(startup.commonDir, selected.commonDir)) {
    throw contextError("associated worktree belongs to a different Git repository", "worktree-foreign-repository");
  }
  if (samePath(selected.gitDir, selected.commonDir)) {
    throw contextError("task attachment requires a linked worktree, not the primary checkout", "worktree-primary-checkout");
  }
  const registered = await listGitWorktrees(startup.root, startup.commonDir, options.signal);
  if (!registered.some(entry => !("stale" in entry) && samePath(entry.root, selected.root) && samePath(entry.gitDir, selected.gitDir))) {
    throw contextError("selected path is not a registered worktree", "worktree-not-registered");
  }
  if (await lstat(join(selected.gitDir, "locked")).then(() => true, error => { if (isMissingPathError(error)) return false; throw error; })) {
    throw contextError("selected worktree is locked in Git", "worktree-git-locked");
  }
  const owner = { runtimeId: requireRuntimeId(options), agentId: requireAgentId(options) };
  return await withClaimLock(options, async () => {
    const runtime = await requireLiveRuntime(header, owner, options);
    const current = await readGitWorktreeIdentity(selected.root, true, options.signal);
    if (!samePath(current.gitDir, selected.gitDir) || !samePath(current.commonDir, selected.commonDir) || current.branch !== selected.branch) {
      throw contextError("worktree changed while attaching", "worktree-context-changed");
    }
    if (await lstat(join(selected.gitDir, "locked")).then(() => true, error => { if (isMissingPathError(error)) return false; throw error; })) {
      throw contextError("selected worktree is locked in Git", "worktree-git-locked");
    }
    const status = await claimAvailability(selected, owner, options);
    if (status === "busy") throw contextError("worktree is active in another session", "worktree-active-in-another-session");
    if (status === "unverifiable") throw contextError("worktree ownership cannot be verified", "worktree-owner-unverifiable");
    const prior = await readContextRecord(header, options);
    const unchanged = prior !== null && samePath(prior.worktreeGitDir, selected.gitDir)
      && await validateContextRecord(header, prior, options.signal).then(() => true, () => false);
    const revision = unchanged ? prior.revision ?? randomUUID() : randomUUID();
    await writeClaim(header, selected, owner, processIdentityOf(runtime), options);
    try {
      await writeContextRecord(header, startup, selected, revision, options);
    } catch (error) {
      if (status !== "current") await removeMatchingClaim(selected, owner, options);
      throw error;
    }
    await releaseClaimsOwnedBy(owner, selected.gitDir, options);
    if (prior !== null && !samePath(prior.worktreeGitDir, selected.gitDir)) {
      await removeClaimByGitDir(prior.worktreeCommonDir, prior.worktreeGitDir, owner, options);
    }
    return { cwd: selected.root, branch: requireBranch(selected) };
  });
}

/** Remove only the association and live claim belonging to the supplied stable session/runtime. */
export async function clearSessionRepositoryContext(
  identity: SessionRepositoryIdentity,
  options: SessionRepositoryContextOptions = {},
): Promise<void> {
  const header = await readSessionHeader(identity);
  if (options.runtimeId === undefined) {
    await withClaimLock(options, async () => { await rm(contextRecordPath(header, options), { force: true }); });
    return;
  }
  const owner = { runtimeId: requireRuntimeId(options), agentId: requireAgentId(options) };
  await withClaimLock(options, async () => {
    await requireLiveRuntime(header, owner, options);
    await rm(contextRecordPath(header, options), { force: true });
    await releaseClaimsOwnedBy(owner, null, options);
  });
}

/** Read and revalidate a persisted association; malformed or stale state fails closed to absence. */
export async function readSessionRepositoryContext(
  identity: SessionRepositoryIdentity,
  options: SessionRepositoryContextOptions = {},
): Promise<SessionRepositoryContext | null> {
  let header: SessionHeader;
  try {
    header = await readSessionHeader(identity);
  } catch {
    return null;
  }
  const record = await readContextRecord(header, options);
  if (record === null) return null;
  const selected = await validateContextRecord(header, record, options.signal).catch(() => null);
  return selected === null ? null : { cwd: selected.root, branch: requireBranch(selected) };
}

/** A verified naming context. Revision changes on explicit association transitions, not heartbeats. */
export interface SessionRepositoryObservation {
  readonly cwd: string;
  readonly branch: string | null;
  readonly revision: string;
}

/**
 * Observe and synchronously consume a context under the existing mutation gate. Missing records
 * mean unlinked; malformed, inaccessible, or invalid associations throw instead of inventing exits.
 * The callback must not perform asynchronous work; provider I/O never holds this gate.
 */
export async function withSessionRepositoryObservation<T>(
  identity: SessionRepositoryIdentity,
  consume: (context: SessionRepositoryObservation) => T,
  options: SessionRepositoryContextOptions = {},
): Promise<T> {
  const header = await readSessionHeader(identity);
  return await withClaimLock(options, async () => {
    let record: SessionRepositoryRecord | null = null;
    try {
      const path = contextRecordPath(header, options);
      const metadata = await lstat(path);
      if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_RECORD_BYTES) throw new Error("invalid repository context");
      const value: unknown = JSON.parse(await readFile(path, { encoding: "utf8", signal: options.signal }));
      if (!isContextRecord(value)) throw new Error("invalid repository context");
      record = value;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    let context: SessionRepositoryObservation;
    if (record !== null) {
      const selected = await validateContextRecord(header, record, options.signal);
      const revision = record.revision ?? randomUUID();
      if (record.revision === undefined) await atomicWrite(contextRecordPath(header, options), { ...record, revision });
      context = { cwd: selected.root, branch: selected.branch, revision };
    } else {
      let cwd = await realpath(header.cwd);
      let branch: string | null;
      try {
        const selected = await readGitWorktreeIdentity(cwd, false, options.signal);
        cwd = selected.root;
        const result = await executeGit(["branch", "--show-current"], cwd, 4_096, options.signal);
        branch = result.stdout.trim() || null;
      }
      catch (error) {
        if (!(error instanceof Error && "stderr" in error && String(error.stderr).includes("not a git repository"))) throw error;
        branch = null;
      }
      context = { cwd, branch, revision: "unlinked" };
    }
    options.signal?.throwIfAborted();
    return consume(context);
  });
}

/** Validate the command's existing runtime before any Git worktree creation. */
export async function assertSessionRepositoryRuntime(identity: SessionRepositoryIdentity, options: SessionRepositoryContextOptions): Promise<void> {
  await requireLiveRuntime(await readSessionHeader(identity), { runtimeId: requireRuntimeId(options), agentId: requireAgentId(options) }, options);
}

/** Startup root used by product worktree operations; the durable session header stays unchanged. */
export async function readSessionStartupRoot(identity: SessionRepositoryIdentity): Promise<string> {
  return (await readSessionHeader(identity)).cwd;
}

/** Read a live attachment without activating or rewriting its claim. Invalid state never means detached. */
export async function readActiveSessionRepositoryContext(
  identity: SessionRepositoryIdentity,
  options: SessionRepositoryContextOptions,
): Promise<SessionRepositoryObservation | null> {
  const header = await readSessionHeader(identity);
  const owner = { runtimeId: requireRuntimeId(options), agentId: requireAgentId(options) };
  await requireLiveRuntime(header, owner, options);
  const path = contextRecordPath(header, options);
  const metadata = await lstat(path).catch(error => { if (isMissingPathError(error)) return null; throw error; });
  if (metadata === null) return null;
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_RECORD_BYTES) {
    throw contextError("repository attachment cannot be verified", "worktree-owner-unverifiable");
  }
  const record = await readContextRecord(header, options);
  if (record === null) throw contextError("repository attachment cannot be verified", "worktree-owner-unverifiable");
  const selected = await validateContextRecord(header, record, options.signal);
  const claim = await readClaim(selected, options);
  if (claim === undefined) throw contextError("the editing claim needs reactivation", "worktree-context-changed");
  if (claim === null || !claimMatchesWorktree(claim, selected) || !ownedBy(claim, owner)) {
    throw contextError("the session no longer owns its attached worktree", "worktree-owner-unverifiable");
  }
  const after = await readContextRecord(header, options);
  if (after === null || after.revision !== record.revision || !samePath(after.worktreeGitDir, record.worktreeGitDir)) {
    throw contextError("repository attachment changed during observation", "worktree-context-changed");
  }
  return { cwd: selected.root, branch: requireBranch(selected), revision: record.revision ?? "legacy" };
}

/** List same-repository worktrees without acquiring, releasing, or repairing an editing claim. */
export async function listSessionRepositoryWorktrees(
  identity: SessionRepositoryIdentity,
  options: SessionRepositoryContextOptions = {},
): Promise<readonly SessionWorktreeInventoryEntry[]> {
  const header = await readSessionHeader(identity);
  const owner = { runtimeId: requireRuntimeId(options), agentId: requireAgentId(options) };
  await requireLiveRuntime(header, owner, options);
  const startup = await readGitWorktreeIdentity(header.cwd, false, options.signal);
  const worktrees = await listGitWorktrees(startup.root, startup.commonDir, options.signal);
  if (worktrees.length > MAX_WORKTREES) throw contextError("worktree inventory exceeds its bounded limit", "worktree-inventory-limit");
  return await withSessionClaimSnapshot(claimStoreRoot(options), options, async () => {
    const entries: SessionWorktreeInventoryEntry[] = [];
    for (const selected of worktrees) {
      if ("stale" in selected) {
        entries.push({ cwd: selected.root, branch: selected.branch ?? "(detached)", status: "unverifiable", agentId: null });
        continue;
      }
      if (selected.branch === null) {
        entries.push({ cwd: selected.root, branch: "(detached)", status: "unverifiable", agentId: null });
        continue;
      }
      const status = await claimAvailability(selected, owner, options);
      const claim = status === "current" || status === "busy" ? await readClaim(selected, options) : null;
      entries.push({ cwd: selected.root, branch: selected.branch, status, agentId: claim?.agentId ?? null });
    }
    return entries.sort((left, right) => pathKey(left.cwd).localeCompare(pathKey(right.cwd)));
  });
}

async function requireLiveRuntime(
  header: SessionHeader,
  owner: ClaimOwner,
  options: SessionRepositoryContextOptions,
): Promise<SessionRuntimeRecord> {
  const runtime = await readRuntimeRecord(owner, options);
  if (runtime === null || runtime.sessionId !== header.id || runtime.sessionFile !== header.file) {
    throw contextError("active session runtime is unavailable", "session-runtime-unavailable");
  }
  const inspection = requireInspector(options);
  let observed: ProcessIdentity | null;
  try {
    observed = await inspection(runtime.pid);
  } catch {
    throw contextError("active session runtime cannot be verified", "session-runtime-unverifiable");
  }
  if (observed === null || observed.pid !== runtime.pid || observed.startIdentity !== runtime.startIdentity) {
    throw contextError("active session runtime is no longer running", "session-runtime-stopped");
  }
  return runtime;
}

async function claimAvailability(
  selected: GitWorktreeIdentity,
  owner: ClaimOwner,
  options: SessionRepositoryContextOptions,
): Promise<SessionWorktreeStatus> {
  const claim = await readClaim(selected, options);
  if (claim === undefined) return "available";
  if (claim === null || !claimMatchesWorktree(claim, selected)) return "unverifiable";
  if (ownedBy(claim, owner)) return "current";
  // Invariant: a sibling agent of this runtime is live by construction, so its claim reads busy below.
  const inspection = requireInspector(options);
  let observed: ProcessIdentity | null;
  try {
    observed = await inspection(claim.pid);
  } catch {
    return "unverifiable";
  }
  const live = observed !== null && observed.pid === claim.pid && observed.startIdentity === claim.startIdentity;
  return live ? "busy" : "available";
}

async function writeRuntimeRecord(
  header: SessionHeader,
  runtimeId: string,
  agentId: string,
  runtimeIdentity: ProcessIdentity,
  options: SessionRepositoryContextOptions,
): Promise<void> {
  const existing = await readRuntimeRecord({ runtimeId, agentId }, options);
  if (existing !== null && (existing.pid !== runtimeIdentity.pid || existing.startIdentity !== runtimeIdentity.startIdentity)) {
    const inspection = requireInspector(options);
    let observed: ProcessIdentity | null;
    try {
      observed = await inspection(existing.pid);
    } catch {
      throw contextError("session runtime ownership cannot be verified", "session-runtime-unverifiable");
    }
    if (observed !== null && observed.pid === existing.pid && observed.startIdentity === existing.startIdentity) {
      throw contextError("session runtime identity is active in another process", "session-runtime-conflict");
    }
  }
  const record: SessionRuntimeRecord = {
    schema: RUNTIME_SCHEMA,
    formatVersion: RECORD_FORMAT_VERSION,
    runtimeId,
    agentId,
    sessionId: header.id,
    sessionFile: header.file,
    pid: runtimeIdentity.pid,
    startIdentity: runtimeIdentity.startIdentity,
    updatedAt: new Date().toISOString(),
  };
  await atomicWrite(runtimeRecordPath({ runtimeId, agentId }, options), record);
}

async function writeContextRecord(
  header: SessionHeader,
  startup: GitWorktreeIdentity,
  selected: GitWorktreeIdentity,
  revision: string,
  options: SessionRepositoryContextOptions,
): Promise<void> {
  const record: SessionRepositoryRecord = {
    schema: CONTEXT_SCHEMA,
    revision,
    sessionId: header.id,
    sessionFile: header.file,
    startupRoot: startup.root,
    startupCommonDir: startup.commonDir,
    worktreeRoot: selected.root,
    worktreeCommonDir: selected.commonDir,
    worktreeGitDir: selected.gitDir,
    updatedAt: new Date().toISOString(),
  };
  await atomicWrite(contextRecordPath(header, options), record);
}

async function writeClaim(
  header: SessionHeader,
  selected: GitWorktreeIdentity,
  owner: ClaimOwner,
  runtimeIdentity: ProcessIdentity,
  options: SessionRepositoryContextOptions,
): Promise<void> {
  const claim: WorktreeClaimRecord = {
    schema: CLAIM_SCHEMA,
    formatVersion: RECORD_FORMAT_VERSION,
    runtimeId: owner.runtimeId,
    agentId: owner.agentId,
    sessionId: header.id,
    worktreeRoot: selected.root,
    worktreeCommonDir: selected.commonDir,
    worktreeGitDir: selected.gitDir,
    pid: runtimeIdentity.pid,
    startIdentity: runtimeIdentity.startIdentity,
    updatedAt: new Date().toISOString(),
  };
  await atomicWrite(claimRecordPath(selected.commonDir, selected.gitDir, options), claim);
}

async function readContextRecord(header: SessionHeader, options: SessionRepositoryContextOptions): Promise<SessionRepositoryRecord | null> {
  return await readJsonRecord(contextRecordPath(header, options), isContextRecord);
}

async function readRuntimeRecord(owner: ClaimOwner, options: SessionRepositoryContextOptions): Promise<SessionRuntimeRecord | null> {
  const record = await readRuntimeRecordAt(runtimeRecordPath(owner, options));
  return record !== null && ownedBy(record, owner) ? record : null;
}

async function readRuntimeRecordAt(path: string): Promise<SessionRuntimeRecord | null> {
  const stored = await readJsonRecord(path, isStoredRuntimeRecord);
  return stored === null ? null : { ...stored, formatVersion: RECORD_FORMAT_VERSION, agentId: stored.agentId ?? PRIMARY_SESSION_AGENT_ID };
}

/** Every agent's runtime record of one runtime, with the file that holds it. */
async function readRuntimeRecordsOf(
  runtimeId: string,
  options: SessionRepositoryContextOptions,
): Promise<ReadonlyArray<{ readonly path: string; readonly record: SessionRuntimeRecord }>> {
  const directory = runtimesDirectory(options);
  const names = await readdir(directory).catch(() => []);
  if (names.length > MAX_WORKTREES * 4) throw contextError("session runtime store exceeds its bounded limit", "session-runtime-limit");
  const records: Array<{ readonly path: string; readonly record: SessionRuntimeRecord }> = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const path = join(directory, name);
    const record = await readRuntimeRecordAt(path);
    if (record?.runtimeId === runtimeId) records.push({ path, record });
  }
  return records;
}

async function readClaimRecordAt(path: string): Promise<WorktreeClaimRecord | null> {
  const stored = await readJsonRecord(path, isStoredClaimRecord);
  return stored === null ? null : normalizeClaim(stored);
}

/** Undefined means absent; null means present but invalid. */
async function readClaim(selected: GitWorktreeIdentity, options: SessionRepositoryContextOptions): Promise<WorktreeClaimRecord | null | undefined> {
  const path = claimRecordPath(selected.commonDir, selected.gitDir, options);
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size === 0 || metadata.size > MAX_RECORD_BYTES) return null;
    const value: unknown = JSON.parse((await readFile(path, { signal: options.signal })).toString("utf8"));
    return isStoredClaimRecord(value) ? normalizeClaim(value) : null;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    return null;
  }
}

async function validateContextRecord(
  header: SessionHeader,
  record: SessionRepositoryRecord,
  signal?: AbortSignal,
): Promise<GitWorktreeIdentity> {
  if (record.sessionId !== header.id || record.sessionFile !== header.file) throw new Error("associated session identity changed");
  const startup = await readGitWorktreeIdentity(header.cwd, false, signal);
  if (!samePath(startup.root, record.startupRoot) || !samePath(startup.commonDir, record.startupCommonDir)) {
    throw new Error("associated worktree identity changed");
  }
  // Invariant: only a verified startup checkout makes the attached checkout's absence definitive.
  const invalid = (detail: string) => Object.assign(contextError(
    `attached worktree ${record.worktreeRoot} ${detail}`, INVALID_ATTACHMENT), { worktreeRoot: record.worktreeRoot, startupRoot: startup.root });
  const missing = (error: unknown) => { if (isMissingPathError(error)) return null; throw error; };
  const root = await realpath(record.worktreeRoot).catch(missing);
  if (root === null) throw invalid("no longer exists");
  if (await lstat(join(root, ".git")).catch(missing) === null) throw invalid("no longer has its Git pointer");
  let selected: GitWorktreeIdentity;
  try {
    selected = await readGitWorktreeIdentity(root, true, signal);
  } catch (error) {
    if (error instanceof Error && (error.message === NOT_A_WORKTREE_ROOT
      || ("stderr" in error && String(error.stderr).includes("not a git repository")))) throw invalid("is no longer a Git worktree");
    throw error;
  }
  if (!samePath(selected.commonDir, record.worktreeCommonDir) || !samePath(selected.gitDir, record.worktreeGitDir)
    || !samePath(startup.commonDir, selected.commonDir)) throw invalid("was replaced by a different Git worktree");
  if (!samePath(selected.root, record.worktreeRoot)) throw new Error("associated worktree identity changed");
  return selected;
}

/** The released checkout and the verified startup root the session continues from. */
export interface ReleasedSessionAttachment {
  readonly worktreeRoot: string;
  readonly startupRoot: string;
}

/**
 * Release this session's own association and claim when its checkout is definitively gone.
 * Uncertain validation keeps the attachment; files, branches, and other owners' claims are never touched.
 */
export async function releaseInvalidSessionRepositoryContext(
  identity: SessionRepositoryIdentity,
  options: SessionRepositoryContextOptions,
): Promise<ReleasedSessionAttachment | null> {
  const header = await readSessionHeader(identity);
  const owner = { runtimeId: requireRuntimeId(options), agentId: requireAgentId(options) };
  return await withClaimLock(options, async () => {
    await requireLiveRuntime(header, owner, options);
    const record = await readContextRecord(header, options);
    if (record === null) return null;
    const failure = await validateContextRecord(header, record, options.signal).then(() => null, error => error as unknown);
    if (!isInvalidAttachment(failure)) return null;
    await rm(contextRecordPath(header, options), { force: true });
    await releaseClaimsOwnedBy(owner, null, options);
    return { worktreeRoot: failure.worktreeRoot, startupRoot: failure.startupRoot };
  });
}

function isInvalidAttachment(error: unknown): error is Error & ReleasedSessionAttachment {
  return error instanceof Error && "code" in error && error.code === INVALID_ATTACHMENT
    && "worktreeRoot" in error && typeof error.worktreeRoot === "string"
    && "startupRoot" in error && typeof error.startupRoot === "string";
}

/** Release one agent's claims except the one it keeps; sibling agents of the runtime are untouched. */
async function releaseClaimsOwnedBy(owner: ClaimOwner, keepGitDir: string | null, options: SessionRepositoryContextOptions): Promise<void> {
  await releaseClaimsWhere(claim => ownedBy(claim, owner) && (keepGitDir === null || !samePath(claim.worktreeGitDir, keepGitDir)), options);
}

/** Release every agent's claims of one runtime; only process exit does this. */
async function releaseRuntimeClaims(runtimeId: string, options: SessionRepositoryContextOptions): Promise<void> {
  await releaseClaimsWhere(claim => claim.runtimeId === runtimeId, options);
}

async function releaseClaimsWhere(release: (claim: WorktreeClaimRecord) => boolean, options: SessionRepositoryContextOptions): Promise<void> {
  const directory = claimsDirectory(options);
  const names = await readdir(directory).catch(() => []);
  if (names.length > MAX_WORKTREES * 4) throw contextError("worktree claim store exceeds its bounded limit", "worktree-claim-limit");
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const path = join(directory, name);
    const claim = await readClaimRecordAt(path);
    if (claim !== null && release(claim)) await rm(path, { force: true });
  }
}

async function removeMatchingClaim(selected: GitWorktreeIdentity, owner: ClaimOwner, options: SessionRepositoryContextOptions): Promise<void> {
  await removeClaimByGitDir(selected.commonDir, selected.gitDir, owner, options);
}

async function removeClaimByGitDir(commonDir: string, gitDir: string, owner: ClaimOwner, options: SessionRepositoryContextOptions): Promise<void> {
  const path = claimRecordPath(commonDir, gitDir, options);
  const claim = await readClaimRecordAt(path);
  if (claim !== null && ownedBy(claim, owner)) await rm(path, { force: true });
}

async function readSessionHeader(identity: SessionRepositoryIdentity): Promise<SessionHeader> {
  if (!validSessionId(identity.sessionId) || !validPath(identity.sessionFile)) throw new Error("active session identity is unavailable");
  const file = await realpath(resolve(identity.sessionFile));
  const handle = await open(file, "r");
  try {
    const buffer = Buffer.alloc(MAX_HEADER_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, buffer.byteLength, 0);
    const newline = buffer.subarray(0, bytesRead).indexOf(0x0a);
    if (newline < 0) throw new Error("session header is unavailable");
    const value: unknown = JSON.parse(buffer.subarray(0, newline).toString("utf8"));
    if (!isRecord(value) || value.type !== "session" || value.id !== identity.sessionId || !validPath(value.cwd)) {
      throw new Error("active session identity does not match its session file");
    }
    return { id: identity.sessionId, cwd: await realpath(resolve(value.cwd)), file };
  } finally {
    await handle.close();
  }
}

async function readGitWorktreeIdentity(path: string, requireWorktreeRoot: boolean, signal?: AbortSignal): Promise<GitWorktreeIdentity> {
  if (!validPath(path)) throw new Error("associated worktree path is invalid");
  const cwd = await realpath(resolve(path));
  const { stdout } = await executeGit(
    ["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-common-dir", "--git-dir"],
    cwd,
    MAX_RECORD_BYTES,
    signal,
  );
  const lines = stdout.split(/\r?\n/u).filter(Boolean);
  if (lines.length !== 3) throw new Error("associated worktree identity is invalid");
  const [rootValue, commonValue, gitValue] = lines;
  if (!rootValue || !commonValue || !gitValue) throw new Error("associated worktree identity is incomplete");
  const root = await realpath(rootValue);
  if (requireWorktreeRoot && !samePath(root, cwd)) throw new Error(NOT_A_WORKTREE_ROOT);
  const commonDir = await realpath(commonValue);
  const gitDir = await realpath(gitValue);
  let branch: string | null = null;
  if (requireWorktreeRoot) {
    const branchResult = await executeGit(["symbolic-ref", "--quiet", "--short", "HEAD"], cwd, 4_096, signal);
    branch = branchResult.stdout.trim();
    if (branch.length === 0 || branch.length > 256) throw new Error("associated worktree has a detached or invalid branch");
  }
  return { root, commonDir, gitDir, branch };
}

async function listGitWorktrees(
  cwd: string,
  commonDir: string,
  signal?: AbortSignal,
): Promise<readonly (GitWorktreeIdentity | StaleGitWorktree)[]> {
  const { stdout } = await executeGit(["worktree", "list", "--porcelain", "-z"], cwd, MAX_RECORD_BYTES * 16, signal);
  const records: Array<{ root: string; branch: string | null }> = [];
  let current: { root: string; branch: string | null } | null = null;
  for (const field of stdout.split("\0")) {
    if (field.length === 0) {
      if (current !== null) records.push(current);
      current = null;
      continue;
    }
    if (field.startsWith("worktree ")) current = { root: field.slice("worktree ".length), branch: null };
    else if (current !== null && field.startsWith("branch refs/heads/")) current.branch = field.slice("branch refs/heads/".length);
  }
  if (current !== null) records.push(current);
  return await Promise.all(records.map(async (record): Promise<GitWorktreeIdentity | StaleGitWorktree> => {
    try {
      const root = await realpath(record.root).catch(error => { if (isMissingPathError(error)) return null; throw error; });
      if (root === null) return { stale: true, root: resolve(record.root), branch: record.branch };
      const dotGit = join(root, ".git");
      const metadata = await lstat(dotGit).catch(error => { if (isMissingPathError(error)) return null; throw error; });
      if (metadata === null) return { stale: true, root, branch: record.branch };
      let gitDir: string;
      if (metadata.isDirectory() && !metadata.isSymbolicLink()) gitDir = await realpath(dotGit);
      else if (metadata.isFile() && !metadata.isSymbolicLink() && metadata.size > 0 && metadata.size <= MAX_RECORD_BYTES) {
        const pointer = (await readFile(dotGit, { signal })).toString("utf8").trim();
        if (!pointer.startsWith("gitdir: ")) throw new Error("worktree Git pointer is invalid");
        gitDir = await realpath(resolve(root, pointer.slice("gitdir: ".length)));
      } else throw new Error("worktree Git identity is invalid");
      if (!samePath(gitDir, commonDir)) {
        const common = await realpath(resolve(gitDir, (await readFile(join(gitDir, "commondir"), "utf8")).trim()));
        if (!samePath(common, commonDir)) throw new Error("registered worktree points to a different repository");
      }
      return { root, commonDir, gitDir, branch: record.branch };
    } catch {
      signal?.throwIfAborted();
      // Invariant: a broken unrelated registration is one unverifiable row, not a repository-wide veto.
      return { stale: true, root: resolve(record.root), branch: record.branch };
    }
  }));
}

/** True for the errors a deleted directory or file produces, which mark a registered worktree as stale rather than broken. */
function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR");
}

async function executeGit(
  arguments_: readonly string[],
  cwd: string,
  maxBuffer: number,
  signal?: AbortSignal,
): Promise<{ readonly stdout: string }> {
  const { execFile } = await import("node:child_process");
  const execute = promisify(execFile);
  return await execute("git", [...arguments_], { cwd, windowsHide: true, timeout: GIT_TIMEOUT_MS, maxBuffer, encoding: "utf8", signal });
}

async function withClaimLock<T>(options: SessionRepositoryContextOptions, operation: () => Promise<T>): Promise<T> {
  return await withSessionClaimLock(claimStoreRoot(options), options, operation);
}

async function atomicWrite(path: string, value: unknown): Promise<void> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

async function readJsonRecord<T>(path: string, validator: (value: unknown) => value is T): Promise<T | null> {
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size === 0 || metadata.size > MAX_RECORD_BYTES) return null;
    const value: unknown = JSON.parse((await readFile(path)).toString("utf8"));
    return validator(value) ? value : null;
  } catch {
    return null;
  }
}

function contextRecordPath(header: Pick<SessionHeader, "id" | "file">, options: SessionRepositoryContextOptions): string {
  const dataDir = options.dataDir ?? resolveProductPaths().dataDir;
  const digest = createHash("sha256").update(header.id).update("\0").update(pathKey(header.file)).digest("hex");
  return join(dataDir, PRODUCT_IDENTITY.state.sessionRepositoryDirectory, `${digest}.json`);
}

function claimStoreRoot(options: SessionRepositoryContextOptions): string {
  return join(options.dataDir ?? resolveProductPaths().dataDir, PRODUCT_IDENTITY.state.sessionWorktreeClaimDirectory);
}

function runtimesDirectory(options: SessionRepositoryContextOptions): string {
  return join(claimStoreRoot(options), "runtimes");
}

// Compatibility: the primary agent keeps the single-agent file name, so a version-1 runtime record is its record.
function runtimeRecordPath(owner: ClaimOwner, options: SessionRepositoryContextOptions): string {
  const key = owner.agentId === PRIMARY_SESSION_AGENT_ID ? owner.runtimeId : `${owner.runtimeId}\0${owner.agentId}`;
  return join(runtimesDirectory(options), `${digest(key)}.json`);
}

function claimsDirectory(options: SessionRepositoryContextOptions): string {
  return join(claimStoreRoot(options), "worktrees");
}

function claimRecordPath(commonDir: string, gitDir: string, options: SessionRepositoryContextOptions): string {
  return join(claimsDirectory(options), `${digest(`${pathKey(commonDir)}\0${pathKey(gitDir)}`)}.json`);
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function requireRuntimeId(options: SessionRepositoryContextOptions): string {
  const runtimeId = options.runtimeId;
  assertRuntimeId(runtimeId);
  return runtimeId;
}

function requireAgentId(options: SessionRepositoryContextOptions): string {
  const agentId = options.agentId ?? PRIMARY_SESSION_AGENT_ID;
  if (!validSessionId(agentId)) throw contextError("session agent identity is invalid", "session-agent-invalid");
  return agentId;
}

function ownedBy(record: ClaimOwner, owner: ClaimOwner): boolean {
  return record.runtimeId === owner.runtimeId && record.agentId === owner.agentId;
}

function requireInspector(options: SessionRepositoryContextOptions): (pid: number) => Promise<ProcessIdentity | null> {
  return options.inspectProcess ?? inspectLiveProcess;
}

function processIdentityOf(record: SessionRuntimeRecord): ProcessIdentity {
  return { pid: record.pid, startIdentity: record.startIdentity };
}

function requireBranch(identity: GitWorktreeIdentity): string {
  if (identity.branch === null) throw new Error("associated worktree branch is unavailable");
  return identity.branch;
}

function claimMatchesWorktree(claim: WorktreeClaimRecord, worktree: GitWorktreeIdentity): boolean {
  return samePath(claim.worktreeRoot, worktree.root)
    && samePath(claim.worktreeCommonDir, worktree.commonDir)
    && samePath(claim.worktreeGitDir, worktree.gitDir);
}

function samePath(left: string, right: string): boolean {
  return pathKey(left) === pathKey(right);
}

function pathKey(value: string): string {
  const normalized = resolve(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function assertRuntimeId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(value)) {
    throw contextError("active session runtime identity is unavailable", "session-runtime-unavailable");
  }
}

function assertProcessIdentity(value: ProcessIdentity): void {
  if (!Number.isSafeInteger(value.pid) || value.pid <= 0 || typeof value.startIdentity !== "string"
    || value.startIdentity.length === 0 || value.startIdentity.length > 512 || value.startIdentity.includes("\0")) {
    throw contextError("native process identity is invalid", "process-identity-invalid");
  }
}

function validSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(value);
}

function validPath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 32_768 && !value.includes("\0") && isAbsolute(value);
}

function isContextRecord(value: unknown): value is SessionRepositoryRecord {
  return isRecord(value) && value.schema === CONTEXT_SCHEMA && validSessionId(value.sessionId)
    && (value.revision === undefined || validSessionId(value.revision))
    && validPath(value.sessionFile) && validPath(value.startupRoot) && validPath(value.startupCommonDir)
    && validPath(value.worktreeRoot) && validPath(value.worktreeCommonDir) && validPath(value.worktreeGitDir)
    && typeof value.updatedAt === "string";
}

/** A record as stored: version 1 omits the format version and the agent id. */
type Stored<T extends { readonly formatVersion: number; readonly agentId: string }> =
  Omit<T, "formatVersion" | "agentId"> & { readonly formatVersion?: T["formatVersion"]; readonly agentId?: string };

function isStoredRuntimeRecord(value: unknown): value is Stored<SessionRuntimeRecord> {
  return isRecord(value) && value.schema === RUNTIME_SCHEMA && validRecordVersion(value) && validSessionId(value.runtimeId)
    && validSessionId(value.sessionId) && validPath(value.sessionFile) && Number.isSafeInteger(value.pid) && Number(value.pid) > 0
    && typeof value.startIdentity === "string" && value.startIdentity.length > 0 && value.startIdentity.length <= 512
    && !value.startIdentity.includes("\0") && typeof value.updatedAt === "string";
}

function isStoredClaimRecord(value: unknown): value is Stored<WorktreeClaimRecord> {
  return isRecord(value) && value.schema === CLAIM_SCHEMA && validRecordVersion(value) && validSessionId(value.runtimeId)
    && validSessionId(value.sessionId)
    && validPath(value.worktreeRoot) && validPath(value.worktreeCommonDir) && validPath(value.worktreeGitDir)
    && Number.isSafeInteger(value.pid) && Number(value.pid) > 0
    && typeof value.startIdentity === "string" && value.startIdentity.length > 0 && value.startIdentity.length <= 512
    && !value.startIdentity.includes("\0") && typeof value.updatedAt === "string";
}

function validRecordVersion(value: Record<string, unknown>): boolean {
  if (value.formatVersion === undefined) return value.agentId === undefined;
  return value.formatVersion === RECORD_FORMAT_VERSION && validSessionId(value.agentId);
}

function normalizeClaim(stored: Stored<WorktreeClaimRecord>): WorktreeClaimRecord {
  return { ...stored, formatVersion: RECORD_FORMAT_VERSION, agentId: stored.agentId ?? PRIMARY_SESSION_AGENT_ID };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function contextError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}
