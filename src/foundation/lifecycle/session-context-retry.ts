import { setTimeout as delay } from "node:timers/promises";

/** Transient coordination belongs to the operation, never an agent-authored retry procedure. */
export async function retrySessionCoordination<T>(operation: () => Promise<T>, budgetMs = 8_000, signal?: AbortSignal): Promise<T> {
  const deadline = Date.now() + budgetMs;
  for (;;) {
    signal?.throwIfAborted();
    try { return await operation(); }
    catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : null;
      if (!["worktree-claim-busy", "session-runtime-unavailable", "worktree-context-changed"].includes(String(code)) || Date.now() >= deadline) throw error;
      await delay(Math.min(150, Math.max(1, deadline - Date.now())), undefined, { signal });
    }
  }
}
