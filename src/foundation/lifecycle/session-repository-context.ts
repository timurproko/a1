import { createHash, randomUUID } from "node:crypto";
import { open, lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import type { NativeProcessIdentity } from "./model.js";
import { resolveProductPaths } from "./paths.js";

const CONTEXT_SCHEMA = "a1-session-repository-context-v1";
const RUNTIME_SCHEMA = "a1-session-runtime-v1";
const CLAIM_SCHEMA = "a1-session-worktree-claim-v1";
const MAX_RECORD_BYTES = 16 * 1024;
const MAX_HEADER_BYTES = 64 * 1024;
const MAX_WORKTREES = 256;
const GIT_TIMEOUT_MS = 5_000;
const LOCK_TIMEOUT_MS = 2_000;
const LOCK_RETRY_MS = 20;

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

interface SessionRepositoryRecord {
  readonly schema: typeof CONTEXT_SCHEMA;
  readonly sessionId: string;
  readonly sessionFile: string;
  readonly startupRoot: string;
  readonly startupCommonDir: string;
  readonly worktreeRoot: string;
  readonly worktreeCommonDir: string;
  readonly worktreeGitDir: string;
  readonly updatedAt: string;
}

interface SessionRuntimeRecord {
  readonly schema: typeof RUNTIME_SCHEMA;
  readonly runtimeId: string;
  readonly sessionId: string;
  readonly sessionFile: string;
  readonly pid: number;
  readonly startIdentity: string;
  readonly updatedAt: string;
}

interface WorktreeClaimRecord {
  readonly schema: typeof CLAIM_SCHEMA;
  readonly runtimeId: string;
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
  readonly runtimeIdentity?: NativeProcessIdentity;
  readonly inspectProcess?: (pid: number) => Promise<NativeProcessIdentity | null>;
  readonly lockTimeoutMs?: number;
}

/** Publish the exact live runtime that may acquire a delivery worktree. */
export async function registerSessionRepositoryRuntime(
  identity: SessionRepositoryIdentity,
  runtimeId: string,
  runtimeIdentity: NativeProcessIdentity,
  options: SessionRepositoryContextOptions = {},
): Promise<void> {
  const header = await readSessionHeader(identity);
  assertRuntimeId(runtimeId);
  assertProcessIdentity(runtimeIdentity);
  await withClaimLock(options, async () => {
    await writeRuntimeRecord(header, runtimeId, runtimeIdentity, options);
  });
}

/** Revalidate a durable association and acquire its live claim for this runtime. */
export async function activateSessionRepositoryContext(
  identity: SessionRepositoryIdentity,
  runtimeId: string,
  runtimeIdentity: NativeProcessIdentity,
  options: SessionRepositoryContextOptions = {},
): Promise<SessionRepositoryContext | null> {
  const header = await readSessionHeader(identity);
  assertRuntimeId(runtimeId);
  assertProcessIdentity(runtimeIdentity);
  return await withClaimLock(options, async () => {
    await writeRuntimeRecord(header, runtimeId, runtimeIdentity, options);
    const record = await readContextRecord(header, options);
    if (record === null) {
      await releaseClaimsOwnedBy(runtimeId, null, options);
      return null;
    }
    const selected = await validateContextRecord(header, record, options.signal).catch(() => null);
    if (selected === null) {
      await releaseClaimsOwnedBy(runtimeId, null, options);
      return null;
    }
    const status = await claimAvailability(selected, runtimeId, options);
    if (status !== "available" && status !== "current") {
      await releaseClaimsOwnedBy(runtimeId, null, options);
      return null;
    }
    await writeClaim(header, selected, runtimeId, runtimeIdentity, options);
    await releaseClaimsOwnedBy(runtimeId, selected.gitDir, options);
    return { cwd: selected.root, branch: requireBranch(selected) };
  });
}

/** Release only this exact runtime generation's cooperative editing claims. */
export async function releaseSessionRepositoryRuntime(
  runtimeId: string,
  runtimeIdentity: NativeProcessIdentity,
  options: SessionRepositoryContextOptions = {},
): Promise<void> {
  assertRuntimeId(runtimeId);
  assertProcessIdentity(runtimeIdentity);
  await withClaimLock(options, async () => {
    const runtime = await readRuntimeRecord(runtimeId, options);
    if (runtime === null || runtime.pid !== runtimeIdentity.pid || runtime.startIdentity !== runtimeIdentity.startIdentity) return;
    await releaseClaimsOwnedBy(runtimeId, null, options);
    await rm(runtimeRecordPath(runtimeId, options), { force: true });
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
  const runtimeId = requireRuntimeId(options);
  return await withClaimLock(options, async () => {
    const runtime = await requireLiveRuntime(header, runtimeId, options);
    const status = await claimAvailability(selected, runtimeId, options);
    if (status === "busy") throw contextError("worktree is active in another session", "worktree-active-in-another-session");
    if (status === "unverifiable") throw contextError("worktree ownership cannot be verified", "worktree-owner-unverifiable");
    const prior = await readContextRecord(header, options);
    await writeClaim(header, selected, runtimeId, processIdentityOf(runtime), options);
    try {
      await writeContextRecord(header, startup, selected, options);
    } catch (error) {
      if (status !== "current") await removeMatchingClaim(selected, runtimeId, options);
      throw error;
    }
    await releaseClaimsOwnedBy(runtimeId, selected.gitDir, options);
    if (prior !== null && !samePath(prior.worktreeGitDir, selected.gitDir)) {
      await removeClaimByGitDir(prior.worktreeCommonDir, prior.worktreeGitDir, runtimeId, options);
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
    await rm(contextRecordPath(header, options), { force: true });
    return;
  }
  const runtimeId = requireRuntimeId(options);
  await withClaimLock(options, async () => {
    await requireLiveRuntime(header, runtimeId, options);
    await rm(contextRecordPath(header, options), { force: true });
    await releaseClaimsOwnedBy(runtimeId, null, options);
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

/** List same-repository worktrees without acquiring, releasing, or repairing a claim. */
export async function listSessionRepositoryWorktrees(
  identity: SessionRepositoryIdentity,
  options: SessionRepositoryContextOptions = {},
): Promise<readonly SessionWorktreeInventoryEntry[]> {
  const header = await readSessionHeader(identity);
  const runtimeId = requireRuntimeId(options);
  await requireLiveRuntime(header, runtimeId, options);
  const startup = await readGitWorktreeIdentity(header.cwd, false, options.signal);
  const worktrees = await listGitWorktrees(startup.root, startup.commonDir, options.signal);
  if (worktrees.length > MAX_WORKTREES) throw contextError("worktree inventory exceeds its bounded limit", "worktree-inventory-limit");
  const contended = await mutationLockExists(options);
  const entries: SessionWorktreeInventoryEntry[] = [];
  for (const selected of worktrees) {
    if (selected.branch === null) {
      entries.push({ cwd: selected.root, branch: "(detached)", status: "unverifiable" });
      continue;
    }
    entries.push({
      cwd: selected.root,
      branch: selected.branch,
      status: contended ? "unverifiable" : await claimAvailability(selected, runtimeId, options),
    });
  }
  return entries.sort((left, right) => pathKey(left.cwd).localeCompare(pathKey(right.cwd)));
}

async function requireLiveRuntime(
  header: SessionHeader,
  runtimeId: string,
  options: SessionRepositoryContextOptions,
): Promise<SessionRuntimeRecord> {
  const runtime = await readRuntimeRecord(runtimeId, options);
  if (runtime === null || runtime.sessionId !== header.id || runtime.sessionFile !== header.file) {
    throw contextError("active session runtime is unavailable", "session-runtime-unavailable");
  }
  const inspection = requireInspector(options);
  let observed: NativeProcessIdentity | null;
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
  runtimeId: string,
  options: SessionRepositoryContextOptions,
): Promise<SessionWorktreeStatus> {
  const claim = await readClaim(selected, options);
  if (claim === undefined) return "available";
  if (claim === null || !claimMatchesWorktree(claim, selected)) return "unverifiable";
  if (claim.runtimeId === runtimeId) return "current";
  const inspection = requireInspector(options);
  let observed: NativeProcessIdentity | null;
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
  runtimeIdentity: NativeProcessIdentity,
  options: SessionRepositoryContextOptions,
): Promise<void> {
  const existing = await readRuntimeRecord(runtimeId, options);
  if (existing !== null && (existing.pid !== runtimeIdentity.pid || existing.startIdentity !== runtimeIdentity.startIdentity)) {
    const inspection = requireInspector(options);
    let observed: NativeProcessIdentity | null;
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
    runtimeId,
    sessionId: header.id,
    sessionFile: header.file,
    pid: runtimeIdentity.pid,
    startIdentity: runtimeIdentity.startIdentity,
    updatedAt: new Date().toISOString(),
  };
  await atomicWrite(runtimeRecordPath(runtimeId, options), record);
}

async function writeContextRecord(
  header: SessionHeader,
  startup: GitWorktreeIdentity,
  selected: GitWorktreeIdentity,
  options: SessionRepositoryContextOptions,
): Promise<void> {
  const record: SessionRepositoryRecord = {
    schema: CONTEXT_SCHEMA,
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
  runtimeId: string,
  runtimeIdentity: NativeProcessIdentity,
  options: SessionRepositoryContextOptions,
): Promise<void> {
  const claim: WorktreeClaimRecord = {
    schema: CLAIM_SCHEMA,
    runtimeId,
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

async function readRuntimeRecord(runtimeId: string, options: SessionRepositoryContextOptions): Promise<SessionRuntimeRecord | null> {
  return await readJsonRecord(runtimeRecordPath(runtimeId, options), isRuntimeRecord);
}

/** Undefined means absent; null means present but invalid. */
async function readClaim(selected: GitWorktreeIdentity, options: SessionRepositoryContextOptions): Promise<WorktreeClaimRecord | null | undefined> {
  const path = claimRecordPath(selected.commonDir, selected.gitDir, options);
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size === 0 || metadata.size > MAX_RECORD_BYTES) return null;
    const value: unknown = JSON.parse((await readFile(path, { signal: options.signal })).toString("utf8"));
    return isClaimRecord(value) ? value : null;
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
  const selected = await readGitWorktreeIdentity(record.worktreeRoot, true, signal);
  if (!samePath(startup.root, record.startupRoot)
    || !samePath(startup.commonDir, record.startupCommonDir)
    || !samePath(selected.root, record.worktreeRoot)
    || !samePath(selected.commonDir, record.worktreeCommonDir)
    || !samePath(selected.gitDir, record.worktreeGitDir)
    || !samePath(startup.commonDir, selected.commonDir)) throw new Error("associated worktree identity changed");
  return selected;
}

async function releaseClaimsOwnedBy(runtimeId: string, keepGitDir: string | null, options: SessionRepositoryContextOptions): Promise<void> {
  const directory = claimsDirectory(options);
  const names = await readdir(directory).catch(() => []);
  if (names.length > MAX_WORKTREES * 4) throw contextError("worktree claim store exceeds its bounded limit", "worktree-claim-limit");
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const path = join(directory, name);
    const claim = await readJsonRecord(path, isClaimRecord);
    if (claim?.runtimeId === runtimeId && (keepGitDir === null || !samePath(claim.worktreeGitDir, keepGitDir))) {
      await rm(path, { force: true });
    }
  }
}

async function removeMatchingClaim(selected: GitWorktreeIdentity, runtimeId: string, options: SessionRepositoryContextOptions): Promise<void> {
  await removeClaimByGitDir(selected.commonDir, selected.gitDir, runtimeId, options);
}

async function removeClaimByGitDir(commonDir: string, gitDir: string, runtimeId: string, options: SessionRepositoryContextOptions): Promise<void> {
  const path = claimRecordPath(commonDir, gitDir, options);
  const claim = await readJsonRecord(path, isClaimRecord);
  if (claim?.runtimeId === runtimeId) await rm(path, { force: true });
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
  if (requireWorktreeRoot && !samePath(root, cwd)) throw new Error("associated path must be a Git worktree root");
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

async function listGitWorktrees(cwd: string, commonDir: string, signal?: AbortSignal): Promise<readonly GitWorktreeIdentity[]> {
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
  return await Promise.all(records.map(async record => {
    const root = await realpath(record.root);
    const dotGit = join(root, ".git");
    const metadata = await lstat(dotGit);
    let gitDir: string;
    if (metadata.isDirectory() && !metadata.isSymbolicLink()) gitDir = await realpath(dotGit);
    else if (metadata.isFile() && !metadata.isSymbolicLink() && metadata.size > 0 && metadata.size <= MAX_RECORD_BYTES) {
      const pointer = (await readFile(dotGit, { signal })).toString("utf8").trim();
      if (!pointer.startsWith("gitdir: ")) throw new Error("worktree Git pointer is invalid");
      gitDir = await realpath(resolve(root, pointer.slice("gitdir: ".length)));
    } else throw new Error("worktree Git identity is invalid");
    return { root, commonDir, gitDir, branch: record.branch };
  }));
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

async function mutationLockExists(options: SessionRepositoryContextOptions): Promise<boolean> {
  try {
    await lstat(join(claimStoreRoot(options), "mutation.lock"));
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    return true;
  }
}

async function withClaimLock<T>(options: SessionRepositoryContextOptions, operation: () => Promise<T>): Promise<T> {
  const directory = claimStoreRoot(options);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, "mutation.lock");
  const deadline = Date.now() + (options.lockTimeoutMs ?? LOCK_TIMEOUT_MS);
  let handle;
  while (handle === undefined) {
    try {
      handle = await open(path, "wx", 0o600);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
      if (Date.now() >= deadline) throw contextError("worktree claim mutation is busy", "worktree-claim-busy");
      await new Promise(resolvePromise => setTimeout(resolvePromise, LOCK_RETRY_MS));
    }
  }
  try {
    await handle.writeFile(`${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`);
    return await operation();
  } finally {
    await handle.close().catch(() => undefined);
    await rm(path, { force: true }).catch(() => undefined);
  }
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

function runtimeRecordPath(runtimeId: string, options: SessionRepositoryContextOptions): string {
  return join(claimStoreRoot(options), "runtimes", `${digest(runtimeId)}.json`);
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

function requireInspector(options: SessionRepositoryContextOptions): (pid: number) => Promise<NativeProcessIdentity | null> {
  if (options.inspectProcess === undefined) throw contextError("native process identity inspection is unavailable", "process-inspection-unavailable");
  return options.inspectProcess;
}

function processIdentityOf(record: SessionRuntimeRecord): NativeProcessIdentity {
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

function assertProcessIdentity(value: NativeProcessIdentity): void {
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
    && validPath(value.sessionFile) && validPath(value.startupRoot) && validPath(value.startupCommonDir)
    && validPath(value.worktreeRoot) && validPath(value.worktreeCommonDir) && validPath(value.worktreeGitDir)
    && typeof value.updatedAt === "string";
}

function isRuntimeRecord(value: unknown): value is SessionRuntimeRecord {
  return isRecord(value) && value.schema === RUNTIME_SCHEMA && validSessionId(value.runtimeId) && validSessionId(value.sessionId)
    && validPath(value.sessionFile) && Number.isSafeInteger(value.pid) && Number(value.pid) > 0
    && typeof value.startIdentity === "string" && value.startIdentity.length > 0 && value.startIdentity.length <= 512
    && !value.startIdentity.includes("\0") && typeof value.updatedAt === "string";
}

function isClaimRecord(value: unknown): value is WorktreeClaimRecord {
  return isRecord(value) && value.schema === CLAIM_SCHEMA && validSessionId(value.runtimeId) && validSessionId(value.sessionId)
    && validPath(value.worktreeRoot) && validPath(value.worktreeCommonDir) && validPath(value.worktreeGitDir)
    && Number.isSafeInteger(value.pid) && Number(value.pid) > 0
    && typeof value.startIdentity === "string" && value.startIdentity.length > 0 && value.startIdentity.length <= 512
    && !value.startIdentity.includes("\0") && typeof value.updatedAt === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function contextError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}
