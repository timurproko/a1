import {
  executeSessionWorktreeControl, requestSessionWorktreeControl, retrySessionCoordination,
  type ProcessIdentity, type SessionRepositoryIdentity, type SessionRepositoryContextOptions,
  type SessionWorktreeControlRequest, type SessionWorktreeControlOutcome,
} from "../../foundation/lifecycle/index.js";

export { PRIMARY_SESSION_AGENT_ID } from "../../foundation/lifecycle/index.js";
export type SessionContextRequest = SessionWorktreeControlRequest;
export type SessionContextOutcome = SessionWorktreeControlOutcome | { readonly kind: "queued" };

export interface SessionContextRuntime {
  readonly runtimeId: string;
  readonly inspectProcess: (pid: number) => Promise<ProcessIdentity | null>;
  readonly dataDir?: string;
  readonly signal?: AbortSignal;
  readonly retryBudgetMs?: number;
}

/** Shell mutations finish through the runtime, after the issuing process releases its working directory. */
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
    if (request.action === "worktrees" || request.action === "worktree-status") return await executeSessionWorktreeControl(identity, request, options);
    await requestSessionWorktreeControl(identity, request, options);
    return { kind: "queued" };
  }, runtime.retryBudgetMs ?? 8_000, runtime.signal);
}
