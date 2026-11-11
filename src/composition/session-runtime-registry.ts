import type { ProcessIdentity } from "../foundation/lifecycle/model.js";

interface SessionRuntimeRegistryOptions {
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
  readonly #activated = new Map<string | undefined, SessionIdentity>();
  /** A released invalid attachment the agent's next tool call must report instead of running elsewhere. */
  readonly #released = new Map<string | undefined, { readonly identity: SessionIdentity; readonly message: string }>();
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
      const previous = this.#identities.get(agentId);
      const identity = previous?.sessionId === sessionId && previous.sessionFile === sessionFile
        ? previous : { sessionId, sessionFile };
      this.#identities.set(agentId, identity);
      // Invariant: initial activation or inspection failure must not disable retries.
      this.#arm();
      return await this.#enqueue(async () => {
        const owner = await this.#ownerIdentity();
        if (owner === null || !this.#current(agentId, identity)) return null;
        const { activateSessionRepositoryContext, readActiveSessionRepositoryContext, releaseInvalidSessionRepositoryContext } = await import("../foundation/lifecycle/session-repository-context.js");
        if (!this.#current(agentId, identity)) return null;
        const options = {
          runtimeId,
          signal: AbortSignal.any([signal, this.#abort.signal]),
          inspectProcess,
          ...(agentId === undefined ? {} : { agentId }),
        };
        if (this.#activated.get(agentId) !== identity) {
          await activateSessionRepositoryContext(identity, runtimeId, owner, options);
          if (!this.#current(agentId, identity)) return null;
          this.#activated.set(agentId, identity);
        }
        try {
          const context = await readActiveSessionRepositoryContext(identity, options);
          if (context === null) return null;
          if (context.branch === null) throw new Error("associated branch unavailable");
          return { cwd: context.cwd, branch: context.branch, revision: context.revision };
        } catch (error) {
          const code = error instanceof Error && "code" in error ? error.code : null;
          if (code === "worktree-attachment-invalid") {
            const released = await releaseInvalidSessionRepositoryContext(identity, options);
            if (released !== null && this.#current(agentId, identity)) {
              this.#released.set(agentId, { identity, message: `attached worktree ${released.worktreeRoot} is no longer a valid Git worktree; `
                + `this session was detached and now uses ${released.startupRoot}. Nothing was deleted and this call did not run; retry it from that directory.` });
              return null;
            }
          }
          if ((code === "session-runtime-unavailable" || code === "worktree-context-changed") && this.#current(agentId, identity)) {
            this.#activated.delete(agentId);
          }
          throw error;
        }
      });
    };
  }

  /** Strict tool cwd lookup: transient startup failure never redirects a write to primary. */
  toolReaderFor(agentId: string | undefined) {
    const read = this.readerFor(agentId);
    /** Run a completion the just-finished shell requested, from this stable process rather than that shell. */
    const settleShell = async (sessionId: string, sessionFile: string, signal: AbortSignal): Promise<string | null> => {
      const { runtimeId, inspectProcess } = this.#options;
      if (this.#disposed || runtimeId === undefined || inspectProcess === undefined) return null;
      const { describeWorktreeCompletion, settleSessionWorktreeCompletion } = await import("../foundation/lifecycle/session-worktree-completion.js");
      const result = await settleSessionWorktreeCompletion({ sessionId, sessionFile }, {
        runtimeId, inspectProcess, signal, ...(agentId === undefined ? {} : { agentId }),
      });
      return result === null ? null : describeWorktreeCompletion(result);
    };
    return Object.assign(async (sessionId: string, sessionFile: string, signal: AbortSignal): Promise<string> => {
      const { retrySessionCoordination } = await import("../foundation/lifecycle/session-context-retry.js");
      return await retrySessionCoordination(async () => {
        signal.throwIfAborted();
        if (this.#disposed || this.#options.runtimeId === undefined) throw new Error("worktree runtime is not active");
        const context = await read(sessionId, sessionFile, signal);
        if (this.#disposed) throw new Error("worktree runtime is not active");
        const active = this.#activated.get(agentId);
        if (active?.sessionId !== sessionId || active.sessionFile !== sessionFile) {
          throw Object.assign(new Error("worktree runtime registration is still recovering"), { code: "session-runtime-unavailable" });
        }
        const released = this.#released.get(agentId);
        if (released !== undefined) {
          this.#released.delete(agentId);
          // Invariant: work addressed to the lost checkout fails once; it is never silently applied to the startup checkout.
          if (released.identity.sessionId === sessionId && released.identity.sessionFile === sessionFile) {
            throw Object.assign(new Error(released.message), { code: "worktree-attachment-invalid" });
          }
        }
        if (context !== null) return context.cwd;
        const { readSessionStartupRoot } = await import("../foundation/lifecycle/session-repository-context.js");
        return await readSessionStartupRoot({ sessionId, sessionFile });
      }, 8_000, signal);
    }, { settleShell });
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
    this.#timer = setInterval(() => this.#queueRefresh(), this.#options.refreshMs ?? 1_000);
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
        if (!this.#current(agentId, identity) || this.#activated.get(agentId) === identity) continue;
        await registerSessionRepositoryRuntime(identity, runtimeId, owner, {
          inspectProcess,
          signal: this.#abort.signal,
          ...(agentId === undefined ? {} : { agentId }),
        }).catch(() => undefined);
      }
    }).catch(() => undefined).finally(() => { this.#refreshPending = false; });
  }
}
