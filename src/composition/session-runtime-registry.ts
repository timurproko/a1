import type { ProcessIdentity } from "../foundation/lifecycle/model.js";

export interface SessionRuntimeRegistryOptions {
  /** Absent outside claim-owning runtimes. */
  readonly runtimeId: string | undefined;
  /** Process liveness inspection; absent SDK seams cannot claim. */
  readonly inspectProcess: ((pid: number) => Promise<ProcessIdentity | null>) | undefined;
  readonly refreshMs?: number;
}

type SessionIdentity = { readonly sessionId: string; readonly sessionFile: string };

/** Lifecycle-owned publication and retries for each agent's current session, serialized with disposal. */
export class SessionRuntimeRegistry {
  readonly #options: SessionRuntimeRegistryOptions;
  readonly #identities = new Map<string | undefined, SessionIdentity>();
  readonly #abort = new AbortController();
  #owner: Promise<ProcessIdentity | null> | null = null;
  #timer: NodeJS.Timeout | null = null;
  #work = Promise.resolve();
  #refreshPending = false;
  #disposed = false;

  constructor(options: SessionRuntimeRegistryOptions) { this.#options = options; }

  /** The repository context reader for one agent; undefined names the primary agent. */
  readerFor(agentId: string | undefined) {
    return async (sessionId: string, sessionFile: string, signal: AbortSignal) => {
      const { runtimeId, inspectProcess } = this.#options;
      if (this.#disposed || runtimeId === undefined || inspectProcess === undefined) return null;
      const identity = { sessionId, sessionFile };
      this.#identities.set(agentId, identity);
      // Invariant: initial activation or inspection failure must not disable retries.
      this.#arm();
      return await this.#enqueue(async () => {
        const owner = await this.#ownerIdentity();
        if (owner === null || !this.#current(agentId, identity)) return null;
        const { activateSessionRepositoryContext } = await import("../foundation/lifecycle/session-repository-context.js");
        if (!this.#current(agentId, identity)) return null;
        return await activateSessionRepositoryContext(identity, runtimeId, owner, {
          signal: AbortSignal.any([signal, this.#abort.signal]),
          inspectProcess,
          ...(agentId === undefined ? {} : { agentId }),
        });
      });
    };
  }

  /** Drain publication before releasing claims; never republish after disposal. */
  async dispose(): Promise<void> {
    this.#disposed = true;
    this.#abort.abort();
    if (this.#timer !== null) clearInterval(this.#timer);
    this.#timer = null;
    await this.#work;
    const { runtimeId } = this.#options;
    const owner = await this.#owner;
    if (runtimeId === undefined || owner === null) return;
    await import("../foundation/lifecycle/session-repository-context.js")
      .then(module => module.releaseSessionRepositoryRuntime(runtimeId, owner))
      .catch(() => undefined);
  }

  async #ownerIdentity(): Promise<ProcessIdentity | null> {
    const { inspectProcess } = this.#options;
    if (this.#disposed || inspectProcess === undefined) return null;
    const pending = this.#owner ??= Promise.resolve().then(() => inspectProcess(process.pid))
      .then(owner => owner?.pid === process.pid && owner.startIdentity.length > 0 ? owner : null)
      .catch(() => null);
    const owner = await pending;
    // Performance: cache success, not failure.
    if (owner === null && this.#owner === pending) this.#owner = null;
    return owner;
  }

  #current(agentId: string | undefined, identity: SessionIdentity): boolean {
    return !this.#disposed && this.#identities.get(agentId) === identity;
  }

  #enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.#work.then(operation);
    this.#work = next.then(() => undefined, () => undefined);
    return next;
  }

  #arm(): void {
    if (this.#timer !== null) return;
    this.#timer = setInterval(() => this.#queueRefresh(), this.#options.refreshMs ?? 30_000);
    this.#timer.unref();
  }

  #queueRefresh(): void {
    const { runtimeId, inspectProcess } = this.#options;
    if (this.#disposed || this.#refreshPending || runtimeId === undefined || inspectProcess === undefined) return;
    this.#refreshPending = true;
    void this.#enqueue(async () => {
      const owner = await this.#ownerIdentity();
      if (owner === null || this.#disposed) return;
      const { registerSessionRepositoryRuntime } = await import("../foundation/lifecycle/session-repository-context.js");
      for (const [agentId, identity] of this.#identities) {
        if (!this.#current(agentId, identity)) continue;
        await registerSessionRepositoryRuntime(identity, runtimeId, owner, {
          inspectProcess,
          signal: this.#abort.signal,
          ...(agentId === undefined ? {} : { agentId }),
        }).catch(() => undefined);
      }
    }).catch(() => undefined).finally(() => { this.#refreshPending = false; });
  }
}
