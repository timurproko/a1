import {
  clearSessionRepositoryContext,
  listSessionRepositoryWorktrees,
  setSessionRepositoryContext,
  type NativeProcessIdentity,
  type SessionRepositoryIdentity,
  type SessionWorktreeInventoryEntry,
} from "../../foundation/lifecycle/index.js";

export { PRIMARY_SESSION_AGENT_ID } from "../../foundation/lifecycle/index.js";

export type SessionContextRequest =
  | { readonly action: "link-worktree"; readonly path: string }
  | { readonly action: "unlink-worktree" }
  | { readonly action: "worktrees" };

export type SessionContextOutcome =
  | { readonly kind: "linked"; readonly cwd: string }
  | { readonly kind: "unlinked" }
  | { readonly kind: "worktrees"; readonly entries: readonly SessionWorktreeInventoryEntry[] };

export interface SessionContextRuntime {
  readonly runtimeId: string;
  readonly inspectProcess: (pid: number) => Promise<NativeProcessIdentity | null>;
}

export async function updateSessionRepositoryContext(
  identity: SessionRepositoryIdentity,
  request: SessionContextRequest,
  runtime: SessionContextRuntime,
): Promise<SessionContextOutcome> {
  const options = { runtimeId: runtime.runtimeId, inspectProcess: runtime.inspectProcess };
  if (request.action === "unlink-worktree") {
    await clearSessionRepositoryContext(identity, options);
    return { kind: "unlinked" };
  }
  if (request.action === "worktrees") {
    return { kind: "worktrees", entries: await listSessionRepositoryWorktrees(identity, options) };
  }
  return { kind: "linked", cwd: (await setSessionRepositoryContext(identity, request.path, options)).cwd };
}
