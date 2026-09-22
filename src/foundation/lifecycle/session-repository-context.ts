import { createHash, randomUUID } from "node:crypto";
import { open, lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { resolveProductPaths } from "./paths.js";

const SCHEMA = "a1-session-repository-context-v1";
const MAX_RECORD_BYTES = 16 * 1024;
const MAX_HEADER_BYTES = 64 * 1024;
const GIT_TIMEOUT_MS = 5_000;

export interface SessionRepositoryIdentity {
  readonly sessionId: string;
  readonly sessionFile: string;
}

export interface SessionRepositoryContext {
  readonly cwd: string;
  readonly branch: string;
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
  readonly schema: typeof SCHEMA;
  readonly sessionId: string;
  readonly sessionFile: string;
  readonly startupRoot: string;
  readonly startupCommonDir: string;
  readonly worktreeRoot: string;
  readonly worktreeCommonDir: string;
  readonly worktreeGitDir: string;
  readonly updatedAt: string;
}

export interface SessionRepositoryContextOptions {
  readonly dataDir?: string;
  readonly signal?: AbortSignal;
}

/** Persist one explicit same-repository worktree association for a stable Pi session. */
export async function setSessionRepositoryContext(
  identity: SessionRepositoryIdentity,
  worktreePath: string,
  options: SessionRepositoryContextOptions = {},
): Promise<SessionRepositoryContext> {
  const header = await readSessionHeader(identity);
  const startup = await readGitWorktreeIdentity(header.cwd, false, options.signal);
  const selected = await readGitWorktreeIdentity(worktreePath, true, options.signal);
  if (!samePath(startup.commonDir, selected.commonDir)) {
    throw new Error("associated worktree belongs to a different Git repository");
  }
  const record: SessionRepositoryRecord = {
    schema: SCHEMA,
    sessionId: header.id,
    sessionFile: header.file,
    startupRoot: startup.root,
    startupCommonDir: startup.commonDir,
    worktreeRoot: selected.root,
    worktreeCommonDir: selected.commonDir,
    worktreeGitDir: selected.gitDir,
    updatedAt: new Date().toISOString(),
  };
  const destination = recordPath(header, options);
  const directory = dirname(destination);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
  return { cwd: selected.root, branch: requireBranch(selected) };
}

/** Remove only the association belonging to the supplied stable session. */
export async function clearSessionRepositoryContext(
  identity: SessionRepositoryIdentity,
  options: SessionRepositoryContextOptions = {},
): Promise<void> {
  const header = await readSessionHeader(identity);
  await rm(recordPath(header, options), { force: true });
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
  try {
    const path = recordPath(header, options);
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size === 0 || metadata.size > MAX_RECORD_BYTES) return null;
    const bytes = await readFile(path, { signal: options.signal });
    const value: unknown = JSON.parse(bytes.toString("utf8"));
    if (!isRecord(value)
      || value.schema !== SCHEMA
      || value.sessionId !== header.id
      || value.sessionFile !== header.file
      || !validPath(value.startupRoot)
      || !validPath(value.startupCommonDir)
      || !validPath(value.worktreeRoot)
      || !validPath(value.worktreeCommonDir)
      || !validPath(value.worktreeGitDir)
      || typeof value.updatedAt !== "string") return null;
    const startup = await readGitWorktreeIdentity(header.cwd, false, options.signal);
    const selected = await readGitWorktreeIdentity(value.worktreeRoot, true, options.signal);
    if (!samePath(startup.root, value.startupRoot)
      || !samePath(startup.commonDir, value.startupCommonDir)
      || !samePath(selected.root, value.worktreeRoot)
      || !samePath(selected.commonDir, value.worktreeCommonDir)
      || !samePath(selected.gitDir, value.worktreeGitDir)
      || !samePath(startup.commonDir, selected.commonDir)) return null;
    return { cwd: selected.root, branch: requireBranch(selected) };
  } catch {
    return null;
  }
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
    const branchResult = await executeGit(
      ["symbolic-ref", "--quiet", "--short", "HEAD"],
      cwd,
      4_096,
      signal,
    );
    branch = branchResult.stdout.trim();
    if (branch.length === 0 || branch.length > 256) throw new Error("associated worktree has a detached or invalid branch");
  }
  return { root, commonDir, gitDir, branch };
}

async function executeGit(
  arguments_: readonly string[],
  cwd: string,
  maxBuffer: number,
  signal?: AbortSignal,
): Promise<{ readonly stdout: string }> {
  const { execFile } = await import("node:child_process");
  const execute = promisify(execFile);
  return await execute("git", [...arguments_], {
    cwd,
    windowsHide: true,
    timeout: GIT_TIMEOUT_MS,
    maxBuffer,
    encoding: "utf8",
    signal,
  });
}

function requireBranch(identity: GitWorktreeIdentity): string {
  if (identity.branch === null) throw new Error("associated worktree branch is unavailable");
  return identity.branch;
}

function recordPath(header: Pick<SessionHeader, "id" | "file">, options: SessionRepositoryContextOptions): string {
  const dataDir = options.dataDir ?? resolveProductPaths().dataDir;
  const digest = createHash("sha256").update(header.id).update("\0").update(pathKey(header.file)).digest("hex");
  return join(dataDir, PRODUCT_IDENTITY.state.sessionRepositoryDirectory, `${digest}.json`);
}

function samePath(left: string, right: string): boolean {
  return pathKey(left) === pathKey(right);
}

function pathKey(value: string): string {
  const normalized = resolve(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function validSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(value);
}

function validPath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 32_768 && !value.includes("\0") && isAbsolute(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
