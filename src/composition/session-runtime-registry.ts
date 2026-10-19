import type { NativeProcessIdentity } from "../foundation/lifecycle/model.js";

const SESSION_RUNTIME_REFRESH_MS = 30_000;

export interface SessionRuntimeRegistryOptions {
  /** This runtime's id from the environment; absent outside a runtime that claims worktrees. */
  readonly runtimeId: string | undefined;
  /** Exact native process inspection; absent SDK seams publish no claims. */
  readonly inspectProcess: ((pid: number) => Promise<NativeProcessIdentity | null>) | undefined;
  readonly refreshMs?: number;
}

type SessionIdentity = { readonly sessionId: string; readonly sessionFile: string };

/**
 * The live worktree claims this runtime's agents hold: each agent's session identity, the heartbeat
 * that keeps the claims fresh, and their release when the runtime is disposed.
 */
export class SessionRuntimeRegistry {
  readonly #options: SessionRuntimeRegistryOptions;
  // Invariant: one entry per agent of this runtime; each agent holds its own claim, and the runtime's exit releases all.
  readonly #identities = new Map<string | undefined, SessionIdentity>();
  #owner: Promise<NativeProcessIdentity | null> | null = null;
  #timer: NodeJS.Timeout | null = null;
  #refresh = Promise.resolve();
  #disposed = false;

  constructor(options: SessionRuntimeRegistryOptions) {
    this.#options = options;
  }

  /** The repository context reader for one agent; undefined names the primary agent. */
  readerFor(agentId: string | undefined) {
    return async (sessionId: string, sessionFile: string, signal: AbortSignal) => {
      const { runtimeId, inspectProcess } = this.#options;
      const owner = await this.#ownerIdentity();
      if (owner === null || runtimeId === undefined || inspectProcess === undefined) return null;
      const identity = { sessionId, sessionFile };
      this.#identities.set(agentId, identity);
      const { activateSessionRepositoryContext } = await import("../foundation/lifecycle/session-repository-context.js");
      const context = await activateSessionRepositoryContext(identity, runtimeId, owner, {
        signal,
        inspectProcess,
        ...(agentId === undefined ? {} : { agentId }),
      });
      this.#arm();
      return context;
    };
  }

  /** Stops the heartbeat, waits for an in-flight refresh, and releases every claim this runtime holds. */
  async dispose(): Promise<void> {
    this.#disposed = true;
    if (this.#timer !== null) clearInterval(this.#timer);
    this.#timer = null;
    await this.#refresh;
    const { runtimeId } = this.#options;
    const owner = await this.#ownerIdentity();
    if (runtimeId === undefined || owner === null) return;
    await import("../foundation/lifecycle/session-repository-context.js")
      .then(module => module.releaseSessionRepositoryRuntime(runtimeId, owner))
      .catch(() => undefined);
  }

  async #ownerIdentity(): Promise<NativeProcessIdentity | null> {
    const { runtimeId, inspectProcess } = this.#options;
    if (runtimeId === undefined || inspectProcess === undefined) return null;
    this.#owner ??= inspectProcess(process.pid).catch(() => null);
    return await this.#owner;
  }

  #arm(): void {
    if (this.#timer !== null) return;
    this.#timer = setInterval(() => this.#queueRefresh(), this.#options.refreshMs ?? SESSION_RUNTIME_REFRESH_MS);
    this.#timer.unref();
  }

  #queueRefresh(): void {
    const { runtimeId, inspectProcess } = this.#options;
    if (this.#disposed || this.#identities.size === 0 || runtimeId === undefined || inspectProcess === undefined) return;
    this.#refresh = this.#refresh.then(async () => {
      if (this.#disposed) return;
      const owner = await this.#ownerIdentity();
      if (owner === null) return;
      const { registerSessionRepositoryRuntime } = await import("../foundation/lifecycle/session-repository-context.js");
      for (const [agentId, identity] of this.#identities) {
        if (this.#disposed) return;
        await registerSessionRepositoryRuntime(identity, runtimeId, owner, {
          inspectProcess,
          ...(agentId === undefined ? {} : { agentId }),
        }).catch(() => undefined);
      }
    }).catch(() => undefined);
  }
}
