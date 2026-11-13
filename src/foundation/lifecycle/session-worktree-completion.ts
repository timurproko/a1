import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  detachSessionRepositoryContextForCompletion, readActiveSessionRepositoryContext, readSessionStartupRoot,
  sessionWorktreeClaimState, sessionWorktreeCompletionPath,
  type SessionRepositoryContextOptions, type SessionRepositoryIdentity,
} from "./session-repository-context.js";

const SCHEMA = "a1-session-worktree-completion-v1";
const CLEANUP_DECLARATION = ".a1/worktree.json";
const MAX_RECORD_BYTES = 16 * 1024;
const MAX_REPORT_CHARACTERS = 4_000;
/** A request the runtime did not settle promptly is dropped, never run later by surprise. */
const REQUEST_LIFETIME_MS = 5 * 60_000;
const CLEANUP_TIMEOUT_MS = 5 * 60_000;

export interface WorktreeCompletionSelectors {
  readonly change?: string;
  readonly pr?: number;
}

export interface WorktreeCompletionRequest {
  readonly operation?: "remove-local";
  readonly startupRoot: string;
  readonly cwd: string;
  readonly branch: string;
}

/**
 * `cleanup-finished` relays the repository command's own report, which stays authoritative:
 * A1 never claims a removal it did not perform.
 */
export interface WorktreeCompletionResult extends WorktreeCompletionRequest {
  readonly kind: "cleanup-finished" | "cleanup-failed" | "cleanup-unavailable" | "cleanup-skipped";
  readonly detail: string;
}

export interface WorktreeCompletionSettleOptions extends SessionRepositoryContextOptions {
  readonly now?: () => number;
  /** Test seam for the repository cleanup command; production runs it without a shell. */
  readonly run?: (command: string, arguments_: readonly string[], cwd: string, signal?: AbortSignal) => Promise<string>;
}

interface CompletionRecord extends WorktreeCompletionSelectors {
  readonly operation?: "remove-local";
  readonly adapterDigest?: string;
  readonly schema: typeof SCHEMA;
  readonly sessionId: string;
  readonly startupRoot: string;
  readonly commonDir: string;
  readonly worktreeRoot: string;
  readonly worktreeGitDir: string;
  readonly branch: string;
  readonly requestedAt: number;
}

/** Inspect publication/preservation through the trusted exact adapter before releasing this session's attachment. */
export async function requestSessionWorktreeLocalRemoval(
  identity: SessionRepositoryIdentity,
  options: WorktreeCompletionSettleOptions,
): Promise<WorktreeCompletionRequest> {
  const attached = await readActiveSessionRepositoryContext(identity, options);
  if (attached === null) throw failure("worktree-not-attached", "no task worktree is attached");
  if (attached.branch === null) throw failure("worktree-local-removal-unavailable", "published local removal requires a named task branch");
  const startup = await realpath(await readSessionStartupRoot(identity));
  const adapter = await readLocalRemovalAdapter(join(startup, CLEANUP_DECLARATION));
  if (adapter === null || adapter === "invalid") throw failure("worktree-local-removal-unavailable", "this repository declares no compatible exact local-removal adapter; the attachment and files were retained");
  const values: Readonly<Record<string, string>> = { primary: startup, worktree: attached.cwd, branch: attached.branch };
  const expand = (parts: readonly string[]) => parts.map(part => part.replace(/\{([a-z]+)\}/gu, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) throw failure("worktree-local-removal-unavailable", "the exact local-removal adapter uses an unavailable selector");
    return value;
  }));
  const expanded = expand(adapter.preflight);
  expand(adapter.execute);
  const command = expanded[0];
  if (command === undefined) throw failure("worktree-local-removal-unavailable", "the exact preflight command is missing");
  let output: string, succeeded = true;
  try { output = await (options.run ?? execute)(command, expanded.slice(1), startup, options.signal); }
  catch (error) { succeeded = false; output = isRecord(error) && typeof error.stdout === "string" ? error.stdout : ""; }
  let report: unknown;
  try { report = JSON.parse(output); }
  catch { throw failure("worktree-local-removal-preflight", "the repository local-removal preflight failed; the attachment and files were retained"); }
  const rows = isRecord(report) && report.operation === "remove-local" && report.preflight === true ? report.results : null;
  if (!succeeded || !Array.isArray(rows) || rows.length !== 1 || !isRecord(rows[0]) || rows[0].disposition !== "eligible"
    || typeof rows[0].path !== "string" || !samePath(rows[0].path, attached.cwd)) {
    const reason = Array.isArray(rows) && isRecord(rows[0]) && typeof rows[0].reason === "string" && /^[a-z0-9-]{1,80}$/u.test(rows[0].reason) ? ` (${rows[0].reason})` : "";
    throw failure("worktree-local-removal-preflight", `the exact checkout did not pass repository publication/preservation preflight${reason}; the attachment and files were retained`);
  }
  const fresh = await readLocalRemovalAdapter(join(startup, CLEANUP_DECLARATION));
  if (fresh === null || fresh === "invalid" || fresh.digest !== adapter.digest) throw failure("worktree-context-changed", "the local-removal adapter changed during preflight");
  return await requestWorktreeOperation(identity, {}, options, { cwd: attached.cwd, branch: attached.branch, digest: adapter.digest });
}

/**
 * Leave the attached checkout so its cleanup can run after the issuing shell has exited.
 * Unpublished content, a Git lock, or uncertain ownership keeps the session attached.
 */
export async function requestSessionWorktreeCompletion(
  identity: SessionRepositoryIdentity,
  selectors: WorktreeCompletionSelectors,
  options: SessionRepositoryContextOptions,
): Promise<WorktreeCompletionRequest> {
  return await requestWorktreeOperation(identity, selectors, options);
}

async function requestWorktreeOperation(
  identity: SessionRepositoryIdentity, selectors: WorktreeCompletionSelectors, options: SessionRepositoryContextOptions,
  localRemoval?: { cwd: string; branch: string; digest: string },
): Promise<WorktreeCompletionRequest> {
  if (selectors.change !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(selectors.change)) {
    throw failure("worktree-completion-selector", "the change selector must be a kebab-case change id");
  }
  if (selectors.pr !== undefined && (!Number.isSafeInteger(selectors.pr) || selectors.pr < 1)) {
    throw failure("worktree-completion-selector", "the pull-request selector must be a positive number");
  }
  const attached = await readActiveSessionRepositoryContext(identity, options);
  if (attached === null) throw failure("worktree-not-attached", "no task worktree is attached");
  if (localRemoval && (!samePath(localRemoval.cwd, attached.cwd) || localRemoval.branch !== attached.branch)) throw failure("worktree-context-changed", "the attachment changed during local-removal preflight");
  const status = await execute("git", ["-c", "core.hooksPath=/dev/null", "status", "--porcelain", "--untracked-files=all"], attached.cwd, options.signal);
  const changed = status.split(/\r?\n/u).filter(Boolean);
  if (changed.length > 0) {
    const listed = changed.slice(0, 5).map(line => line.slice(3)).join(", ");
    throw failure("worktree-content", `the attached worktree holds uncommitted or untracked content (${listed}${changed.length > 5 ? ", ..." : ""})`);
  }
  const path = sessionWorktreeCompletionPath(identity, options);
  const detached = await detachSessionRepositoryContextForCompletion(identity, options, async left => {
    if (!samePath(left.worktreeRoot, attached.cwd)) throw failure("worktree-context-changed", "the attachment changed during completion");
    const record: CompletionRecord = {
      schema: SCHEMA, sessionId: identity.sessionId, startupRoot: left.startupRoot, commonDir: left.commonDir,
      ...(localRemoval ? { operation: "remove-local" as const, adapterDigest: localRemoval.digest } : {}),
      worktreeRoot: left.worktreeRoot, worktreeGitDir: left.worktreeGitDir, branch: left.branch,
      ...(selectors.change === undefined ? {} : { change: selectors.change }),
      ...(selectors.pr === undefined ? {} : { pr: selectors.pr }),
      requestedAt: Date.now(),
    };
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
      await rename(temporary, path);
    } finally { await rm(temporary, { force: true }).catch(() => undefined); }
  });
  return { startupRoot: detached.startupRoot, cwd: detached.worktreeRoot, branch: detached.branch,
    ...(localRemoval ? { operation: "remove-local" as const } : {}) };
}

/**
 * Run a pending completion's repository cleanup from the startup checkout. The request is consumed
 * before anything runs, so it executes at most once; null means nothing was pending.
 */
export async function settleSessionWorktreeCompletion(
  identity: SessionRepositoryIdentity,
  options: WorktreeCompletionSettleOptions,
): Promise<WorktreeCompletionResult | null> {
  const path = sessionWorktreeCompletionPath(identity, options);
  const record = await readRecord(path);
  await rm(path, { force: true });
  if (record === null || record.sessionId !== identity.sessionId) return null;
  const request = { startupRoot: record.startupRoot, cwd: record.worktreeRoot, branch: record.branch,
    ...(record.operation === "remove-local" ? { operation: "remove-local" as const } : {}) };
  const result = (kind: WorktreeCompletionResult["kind"], detail: string): WorktreeCompletionResult => ({ ...request, kind, detail });
  try {
    if ((options.now ?? Date.now)() - record.requestedAt > REQUEST_LIFETIME_MS) return result("cleanup-skipped", "the completion request expired before the runtime could settle it");
    const startup = await realpath(await readSessionStartupRoot(identity));
    if (!samePath(startup, record.startupRoot)) return result("cleanup-skipped", "the session's startup checkout is not the recorded primary checkout");
    const claim = await sessionWorktreeClaimState(record.commonDir, record.worktreeGitDir, options);
    if (claim === "live") return result("cleanup-skipped", "a live session attached the checkout again");
    if (claim === "unverifiable") return result("cleanup-skipped", "the checkout's editing claim cannot be verified");
    // Security: the command is the primary checkout's committed declaration, never a file of the task checkout being left.
    const localAdapter = record.operation === "remove-local" ? await readLocalRemovalAdapter(join(startup, CLEANUP_DECLARATION)) : null;
    if (record.operation === "remove-local" && (localAdapter === null || localAdapter === "invalid" || localAdapter.digest !== record.adapterDigest)) {
      return result("cleanup-unavailable", "the exact local-removal adapter is unavailable or changed since preflight; no other operation was substituted");
    }
    const declared = localAdapter && localAdapter !== "invalid" ? localAdapter.execute : await readCleanupDeclaration(join(startup, CLEANUP_DECLARATION));
    if (declared === null) return result("cleanup-unavailable", `this repository declares no cleanup command in ${CLEANUP_DECLARATION}; the checkout was retained`);
    if (declared === "invalid") return result("cleanup-unavailable", `${CLEANUP_DECLARATION} must hold {"cleanup": ["program", "argument", ...]}; the checkout was retained`);
    const values: Readonly<Record<string, string | undefined>> = {
      primary: startup, worktree: record.worktreeRoot, branch: record.branch,
      change: record.change, pr: record.pr === undefined ? undefined : String(record.pr),
    };
    const missing = new Set<string>();
    const [command, ...arguments_] = declared.map(part => part.replace(/\{([a-z]+)\}/gu, (_match, name: string) => {
      const value = values[name];
      if (value === undefined) missing.add(name);
      return value ?? "";
    }));
    if (missing.size > 0 || command === undefined) {
      return result("cleanup-unavailable", `the declared cleanup needs ${[...missing].map(name => `{${name}}`).join(" and ")}; run completion with the matching selector or the repository cleanup from primary`);
    }
    const run = options.run ?? execute;
    try {
      return result("cleanup-finished", bounded(await run(command, arguments_, startup, options.signal)));
    } catch (error) {
      const output = isRecord(error) ? [error.stdout, error.stderr].filter(value => typeof value === "string" && value.length > 0).join("\n") : "";
      return result("cleanup-failed", bounded(output || (error instanceof Error ? error.message : String(error))));
    }
  } catch (error) {
    return result("cleanup-skipped", error instanceof Error ? error.message : String(error));
  }
}

/** The agent-facing account of a settled completion; the session is on the startup checkout in every case. */
export function describeWorktreeCompletion(result: WorktreeCompletionResult): string {
  const headline: Readonly<Record<WorktreeCompletionResult["kind"], string>> = {
    "cleanup-finished": "the repository cleanup command ran; its report below is authoritative",
    "cleanup-failed": "the repository cleanup command failed; the checkout may remain and is retried with repository cleanup from primary",
    "cleanup-unavailable": "cleanup is unavailable; the checkout was retained",
    "cleanup-skipped": "cleanup was skipped; the checkout was retained",
  };
  return [
    `Worktree ${result.operation === "remove-local" ? "local removal" : "completion"} (${result.kind}): ${headline[result.kind]}.`,
    `Session uses ${result.startupRoot}; left ${result.cwd} (${result.branch}). Do not attach it again while cleanup is partial.`,
    result.detail,
  ].join("\n");
}

/** Null when the repository declares nothing; "invalid" when the declaration cannot be used as an argument list. */
async function readCleanupDeclaration(path: string): Promise<readonly string[] | "invalid" | null> {
  const metadata = await lstat(path).catch(error => { if (isRecord(error) && (error.code === "ENOENT" || error.code === "ENOTDIR")) return null; throw error; });
  if (metadata === null) return null;
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size === 0 || metadata.size > MAX_RECORD_BYTES) return "invalid";
  try {
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    const cleanup = isRecord(value) ? value.cleanup : undefined;
    return Array.isArray(cleanup) && cleanup.length > 0 && cleanup.length <= 64
      && cleanup.every(part => typeof part === "string" && part.length > 0 && part.length <= 2_048 && !part.includes("\0"))
      // Compatibility: the element check above establishes the string array.
      ? cleanup as readonly string[] : "invalid";
  } catch {
    return "invalid";
  }
}

interface LocalRemovalAdapter { readonly preflight: readonly string[]; readonly execute: readonly string[]; readonly digest: string }

async function readLocalRemovalAdapter(path: string): Promise<LocalRemovalAdapter | "invalid" | null> {
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size === 0 || metadata.size > MAX_RECORD_BYTES) return "invalid";
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    const adapter = isRecord(value) ? value.localRemoval : undefined;
    if (adapter === undefined) return null;
    const valid = (parts: unknown): parts is readonly string[] => Array.isArray(parts) && parts.length > 0 && parts.length <= 64
      && parts.every(part => typeof part === "string" && part.length > 0 && part.length <= 2_048 && !part.includes("\0"));
    if (!isRecord(adapter) || !valid(adapter.preflight) || !valid(adapter.execute)) return "invalid";
    const command = { preflight: adapter.preflight, execute: adapter.execute };
    return { ...command, digest: createHash("sha256").update(JSON.stringify(command)).digest("hex") };
  } catch (error) { return isRecord(error) && error.code === "ENOENT" ? null : "invalid"; }
}

async function readRecord(path: string): Promise<CompletionRecord | null> {
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size === 0 || metadata.size > MAX_RECORD_BYTES) return null;
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!isRecord(value) || value.schema !== SCHEMA) return null;
    if (value.operation !== undefined && (value.operation !== "remove-local" || typeof value.adapterDigest !== "string" || !/^[a-f0-9]{64}$/u.test(value.adapterDigest))) return null;
    const text = (name: string) => typeof value[name] === "string" && value[name].length > 0 && value[name].length <= 32_768;
    if (!["sessionId", "startupRoot", "commonDir", "worktreeRoot", "worktreeGitDir", "branch"].every(text)) return null;
    if (typeof value.requestedAt !== "number" || !Number.isFinite(value.requestedAt)) return null;
    if (value.change !== undefined && typeof value.change !== "string") return null;
    if (value.pr !== undefined && (typeof value.pr !== "number" || !Number.isSafeInteger(value.pr) || value.pr < 1)) return null;
    // Compatibility: the checks above establish every field of the stored shape.
    return value as unknown as CompletionRecord;
  } catch {
    return null;
  }
}

async function execute(command: string, arguments_: readonly string[], cwd: string, signal?: AbortSignal): Promise<string> {
  const { execFile } = await import("node:child_process");
  const { stdout } = await promisify(execFile)(command, [...arguments_], {
    cwd, encoding: "utf8", windowsHide: true, timeout: CLEANUP_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, signal,
  });
  return stdout;
}

function bounded(text: string): string {
  const trimmed = text.trim();
  return trimmed.length <= MAX_REPORT_CHARACTERS ? trimmed : `...${trimmed.slice(-MAX_REPORT_CHARACTERS)}`;
}

function samePath(left: string, right: string): boolean {
  const key = (value: string) => process.platform === "win32" ? resolve(value).toLowerCase() : resolve(value);
  return key(left) === key(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}
