import {
  clearSessionRepositoryContext,
  enterSessionRepositoryWorktree,
  listSessionRepositoryWorktrees,
  requestSessionWorktreeCompletion,
  requestSessionWorktreeLocalRemoval,
  retrySessionCoordination,
  setSessionRepositoryContext,
  type ProcessIdentity,
  type SessionRepositoryIdentity,
  type SessionRepositoryContextOptions,
  type SessionWorktreeInventoryEntry,
} from "../../foundation/lifecycle/index.js";

export { PRIMARY_SESSION_AGENT_ID } from "../../foundation/lifecycle/index.js";

export type SessionContextRequest =
  | { readonly action: "link-worktree"; readonly path: string }
  | { readonly action: "enter-worktree"; readonly branch: string; readonly base?: string }
  | { readonly action: "unlink-worktree" }
  | { readonly action: "complete-worktree"; readonly change?: string; readonly pr?: number }
  | { readonly action: "remove-local-worktree" }
  | { readonly action: "worktrees" };

export type SessionContextOutcome =
  | { readonly kind: "linked"; readonly cwd: string; readonly branch: string }
  | { readonly kind: "unlinked" }
  | { readonly kind: "completing"; readonly cwd: string; readonly branch: string; readonly startupRoot: string }
  | { readonly kind: "worktrees"; readonly entries: readonly SessionWorktreeInventoryEntry[] };

export interface SessionContextRuntime {
  readonly runtimeId: string;
  readonly inspectProcess: (pid: number) => Promise<ProcessIdentity | null>;
  readonly dataDir?: string;
  readonly signal?: AbortSignal;
  readonly retryBudgetMs?: number;
}

export async function updateSessionRepositoryContext(
  identity: SessionRepositoryIdentity,
  request: SessionContextRequest,
  runtime: SessionContextRuntime,
): Promise<SessionContextOutcome> {
  const options: SessionRepositoryContextOptions = {
    runtimeId: runtime.runtimeId, inspectProcess: runtime.inspectProcess,
    ...(runtime.dataDir === undefined ? {} : { dataDir: runtime.dataDir }),
    ...(runtime.signal === undefined ? {} : { signal: runtime.signal }),
  };
  return await retrySessionCoordination(async () => {
    if (request.action === "enter-worktree") {
      return { kind: "linked", ...await enterSessionRepositoryWorktree(identity, request.branch, request.base, options) };
    }
    if (request.action === "unlink-worktree") {
      await clearSessionRepositoryContext(identity, options);
      return { kind: "unlinked" };
    }
    if (request.action === "complete-worktree") {
      return { kind: "completing", ...await requestSessionWorktreeCompletion(identity, {
        ...(request.change === undefined ? {} : { change: request.change }),
        ...(request.pr === undefined ? {} : { pr: request.pr }),
      }, options) };
    }
    if (request.action === "remove-local-worktree") {
      return { kind: "completing", ...await requestSessionWorktreeLocalRemoval(identity, options) };
    }
    if (request.action === "worktrees") {
      return { kind: "worktrees", entries: await listSessionRepositoryWorktrees(identity, options) };
    }
    return { kind: "linked", ...await setSessionRepositoryContext(identity, request.path, options) };
  }, runtime.retryBudgetMs ?? 8_000, runtime.signal);
}
