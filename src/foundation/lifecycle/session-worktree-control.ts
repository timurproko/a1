import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import {
  assertSessionRepositoryRuntime, clearSessionRepositoryContext, listSessionRepositoryWorktrees,
  readActiveSessionRepositoryContext, readSessionStartupRoot, readSessionRepositoryRoot, sessionWorktreeCompletionPath, setSessionRepositoryContext,
  type SessionRepositoryContextOptions, type SessionRepositoryIdentity,
} from "./session-repository-context.js";
import { enterSessionRepositoryWorktree } from "./session-worktree-entry.js";
import { requestSessionWorktreeCompletion, requestSessionWorktreeLocalRemoval } from "./session-worktree-completion.js";

import type { WorktreeControlRequest as SessionWorktreeControlRequest, WorktreeControlOutcome as SessionWorktreeControlOutcome } from "../../contracts/agent-engine/index.js";
export type { WorktreeControlRequest as SessionWorktreeControlRequest, WorktreeControlOutcome as SessionWorktreeControlOutcome } from "../../contracts/agent-engine/index.js";

/** Dispatch only inside the owner runtime, where project-context preparation can be supplied. */
export async function executeSessionWorktreeControl(
  identity: SessionRepositoryIdentity,
  request: SessionWorktreeControlRequest,
  options: SessionRepositoryContextOptions,
): Promise<SessionWorktreeControlOutcome> {
  await assertSessionRepositoryRuntime(identity, options);
  if (request.action === "link-worktree") return { kind: "linked", ...await setSessionRepositoryContext(identity, request.path, options) };
  if (request.action === "enter-worktree") return { kind: "linked", ...await enterSessionRepositoryWorktree(identity, request.branch, request.base, { ...options, ...(request.repo === undefined ? {} : { repo: request.repo }) }) };
  if (request.action === "unlink-worktree") {
    await clearSessionRepositoryContext(identity, options);
    return { kind: "unlinked", cwd: await readSessionStartupRoot(identity) };
  }
  if (request.action === "complete-worktree") return { kind: "completing", ...await requestSessionWorktreeCompletion(identity, request, options) };
  if (request.action === "remove-local-worktree") return { kind: "completing", ...await requestSessionWorktreeLocalRemoval(identity, options) };
  if (request.action === "worktrees") return { kind: "worktrees", entries: await listSessionRepositoryWorktrees(identity, { ...options, ...(request.repo === undefined ? {} : { repo: request.repo }) }) };
  const startupDirectory = await readSessionStartupRoot(identity);
  try {
    const active = await readActiveSessionRepositoryContext(identity, options);
    let repositoryRoot: string | null = null;
    try { repositoryRoot = (await readSessionRepositoryRoot(identity, options)).root; }
    catch (error) { if (!(error instanceof Error && "code" in error && error.code === "worktree-startup-not-repository")) throw error; }
    return { kind: "status", startupDirectory, cwd: active?.cwd ?? startupDirectory, repositoryRoot, branch: active?.branch ?? null, health: active === null ? "detached" : "attached" };
  } catch {
    options.signal?.throwIfAborted();
    return { kind: "status", startupDirectory, cwd: null, repositoryRoot: null, branch: null, health: "invalid" };
  }
}

/** Queue, never apply, a shell's mutation: resources cannot change while its process pins the old cwd. */
export async function requestSessionWorktreeControl(
  identity: SessionRepositoryIdentity,
  request: SessionWorktreeControlRequest,
  options: SessionRepositoryContextOptions,
): Promise<void> {
  await assertSessionRepositoryRuntime(identity, options);
  const path = controlPath(identity, options);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  parseRequest(request);
  const value = JSON.stringify({ sessionId: identity.sessionId, sessionFile: identity.sessionFile, requestedAt: Date.now(), request });
  if (Buffer.byteLength(value) > 16 * 1024) throw new Error("worktree request exceeds its bounded size");
  // Concurrency: exclusive creation preserves the first pending request instead of silently replacing it.
  try { await writeFile(path, `${value}\n`, { flag: "wx", mode: 0o600, signal: options.signal }); }
  catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") throw Object.assign(new Error("a worktree context request is already pending; wait for runtime confirmation"), { code: "worktree-request-pending" });
    throw error;
  }
}

/** Consume at most one exact-session request. Stale records never execute after a later unrelated turn. */
export async function takeSessionWorktreeControl(
  identity: SessionRepositoryIdentity,
  options: SessionRepositoryContextOptions,
): Promise<SessionWorktreeControlRequest | null> {
  await assertSessionRepositoryRuntime(identity, options);
  const path = controlPath(identity, options);
  const consumed = `${path}.${randomUUID()}.consumed`;
  try { await rename(path, consumed); }
  catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") return null; throw error; }
  try {
    const metadata = await lstat(consumed);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 16 * 1024) throw new Error("invalid worktree control request");
    const value = JSON.parse(await readFile(consumed, "utf8")) as { sessionId?: unknown; sessionFile?: unknown; requestedAt?: unknown; request?: unknown };
    if (value.sessionId !== identity.sessionId || value.sessionFile !== identity.sessionFile || typeof value.requestedAt !== "number"
      || Date.now() - value.requestedAt > 5 * 60_000 || value.requestedAt > Date.now() + 1_000) throw new Error("worktree control request expired or changed identity");
    return parseRequest(value.request);
  } finally { await rm(consumed, { force: true }); }
}

function controlPath(identity: SessionRepositoryIdentity, options: SessionRepositoryContextOptions): string {
  const completion = sessionWorktreeCompletionPath(identity, options);
  return join(dirname(dirname(completion)), "controls", basename(completion));
}

function parseRequest(value: unknown): SessionWorktreeControlRequest {
  if (typeof value !== "object" || value === null || !("action" in value)) throw new Error("invalid worktree control request");
  const request = value as Record<string, unknown>;
  const text = (key: string) => typeof request[key] === "string" && request[key].length > 0 && request[key].length <= 4096 && !request[key].includes("\0");
  const optional = (key: string) => request[key] === undefined || text(key);
  const valid = request.action === "link-worktree" ? text("path")
    : request.action === "enter-worktree" ? text("branch") && optional("base") && optional("repo")
    : request.action === "complete-worktree" ? optional("change") && (request.pr === undefined || Number.isSafeInteger(request.pr) && Number(request.pr) > 0)
    : request.action === "worktrees" ? optional("repo")
    : request.action === "unlink-worktree" || request.action === "worktree-status" || request.action === "remove-local-worktree";
  if (!valid) throw new Error("invalid worktree control request");
  return value as SessionWorktreeControlRequest;
}
