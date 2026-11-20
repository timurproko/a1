import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import type { WorktreeControlRequest as SessionWorktreeControlRequest, WorktreeControlOutcome as SessionWorktreeControlOutcome } from "../../../contracts/agent-engine/index.js";
import type { AgentSessionRuntime, AgentSessionServices, ExtensionFactory, SessionManager } from "../startup-public.js";
import type { PiProjectTrustPreflightResult } from "./project-trust-preflight.js";
import type { PiWorktreeCwdReader } from "./worktree-tools.js";
import type { PiRuntimeIntegrationOptions } from "./runtime-options.js";

type Prepared = { readonly services: AgentSessionServices; readonly trust: PiProjectTrustPreflightResult };
type Identity = { readonly sessionId: string; readonly sessionFile: string };
type Pending = { readonly identity: Identity; readonly request: SessionWorktreeControlRequest };

/** Keep optional project-transition preparation out of non-claiming runtimes. */
export function createPiWorktreeTransitions(options: PiRuntimeIntegrationOptions): PiWorktreeTransitions {
  const transitions: PiWorktreeTransitions = new PiWorktreeTransitions(options.worktreeCwdReader!, async (cwd, trusted): Promise<Prepared> => {
    const { createPiRuntimeServicesAfterTrust } = await import("./runtime-services.js");
    return await createPiRuntimeServicesAfterTrust({
      ...options, cwd, worktreeExtension: transitions.extension,
      ...(trusted === undefined ? {} : { runtimeOptions: { ...options.runtimeOptions, projectTrust: trusted } }),
    });
  }, createRepositoryTrustAnswer(options));
  return transitions;
}

/**
 * Whether the person already trusts a repository, answered from saved and invocation decisions.
 * Security: no prompt is passed, so a repository that would need a trust question counts as not
 * trusted, and a repository's declared start command does not run for it.
 */
export function createRepositoryTrustAnswer(
  options: Pick<PiRuntimeIntegrationOptions, "agentDir" | "preflightDependencies" | "runtimeOptions">,
): (primaryRoot: string) => Promise<boolean> {
  return async primaryRoot => {
    const resolveTrust = options.preflightDependencies?.resolveTrust ?? (await import("./project-trust-preflight.js")).resolvePiProjectTrustPreflight;
    return (await resolveTrust({
      cwd: primaryRoot, agentDir: options.agentDir,
      ...(options.runtimeOptions?.projectTrust === undefined ? {} : { trustOverride: options.runtimeOptions.projectTrust }),
    })).trusted;
  };
}

/** A tool requests a transition; only the idle host recreates Pi and commits the attachment. */
export class PiWorktreeTransitions {
  readonly #reader: PiWorktreeCwdReader;
  readonly #prepare: (cwd: string, trusted?: boolean) => Promise<Prepared>;
  readonly #repositoryTrusted: ((primaryRoot: string) => Promise<boolean>) | undefined;
  #pending: Pending | undefined;
  #running = false;
  #blocked: string | undefined;
  #prepared: Prepared | undefined;
  #disposed = false;

  constructor(reader: PiWorktreeCwdReader, prepare: (cwd: string, trusted?: boolean) => Promise<Prepared>, repositoryTrusted?: (primaryRoot: string) => Promise<boolean>) {
    this.#reader = reader;
    this.#prepare = prepare;
    this.#repositoryTrusted = repositoryTrusted;
  }

  /** The final turn boundary prevents a sibling nonterminating result from starting another provider request. */
  readonly extension: ExtensionFactory = pi => {
    pi.on("tool_call", event => (this.#pending || this.#running || this.#blocked)
      && !["worktree", "worktree_detach"].includes(event.toolName)
      ? { block: true, terminate: true, reason: "Worktree project context is transitioning; no ordinary work ran." } : undefined);
    pi.on("turn_end", (_event, ctx) => {
      if (ctx.signal?.aborted) this.#pending = undefined;
      else if (this.#pending || this.#blocked) ctx.abort();
    });
  };

  takePrepared(cwd: string): Prepared | undefined {
    const prepared = this.#prepared;
    if (prepared === undefined || !samePath(prepared.services.cwd, cwd)) return undefined;
    this.#prepared = undefined;
    return prepared;
  }

  /** Bind controls to one conversation while ordinary tools remain guarded by the effective project cwd. */
  toolsReader(manager: SessionManager, cwd: string): PiWorktreeCwdReader {
    const identity = { sessionId: manager.getSessionId(), sessionFile: manager.getSessionFile() };
    const requireIdentity = (): Identity => {
      if (this.#disposed) throw new Error("worktree runtime is disposed");
      if (!identity.sessionFile || !existsSync(identity.sessionFile)) throw new Error("Worktree controls require a saved persistent conversation");
      return { sessionId: identity.sessionId, sessionFile: identity.sessionFile };
    };
    const control = async (request: SessionWorktreeControlRequest, signal: AbortSignal) => {
      signal.throwIfAborted();
      const selected = requireIdentity();
      if (request.action === "worktree-status" || request.action === "worktrees") {
        const result = await this.#reader.applyControl!(selected.sessionId, selected.sessionFile, request, async () => {}, signal);
        return { text: describe(result), queued: false };
      }
      if (this.#pending || this.#running) throw new Error("a worktree context transition is already pending");
      this.#pending = { identity: selected, request };
      return { text: "Worktree transition requested. After this tool batch finishes, A1 resolves target trust and reloads project context; attachment is not yet confirmed.", queued: true };
    };
    return Object.assign(async (id: string, file: string, signal: AbortSignal) => {
      if (this.#pending || this.#running || this.#blocked) throw new Error(this.#blocked ?? "worktree project context transition is pending");
      try {
        const selected = await this.#reader(id, file, signal);
        if (!samePath(selected, cwd)) throw new Error(`worktree project context ${selected} differs from loaded project ${cwd}; use worktree attach or detach to reload it`);
        return selected;
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "worktree-attachment-invalid") {
          this.#pending = { identity: requireIdentity(), request: { action: "unlink-worktree" } };
        }
        throw error;
      }
    }, {
      ...(this.#reader.detach === undefined ? {} : { detach: this.#reader.detach }),
      ...(this.#reader.applyControl === undefined ? {} : { control }),
      transitionPending: () => this.#pending !== undefined,
      settleShell: async (id: string, file: string, signal: AbortSignal) => {
        const request = await this.#reader.takeControl?.(id, file, signal);
        if (request) return (await control(request, signal)).text;
        return await this.#reader.settleShell?.(id, file, signal) ?? null;
      },
    });
  }

  /** Settle after agent_settled, never from inside the tool whose result must first be persisted. */
  async settle(runtime: AgentSessionRuntime, signal: AbortSignal): Promise<string | null> {
    if (this.#running || this.#pending === undefined || this.#disposed) return null;
    const pending = this.#pending;
    this.#pending = undefined;
    const old = runtime.session, oldCwd = runtime.cwd;
    if (old.sessionId !== pending.identity.sessionId || old.sessionFile !== pending.identity.sessionFile) return "Worktree transition discarded: the active conversation changed.";
    this.#running = true;
    const trusted = runtime.services.settingsManager.isProjectTrusted();
    let replacementAttempted = false;
    let trustDiagnostic: string | undefined;
    const prepareContext = async (cwd: string) => {
      signal.throwIfAborted();
      if (this.#disposed || runtime.session.sessionId !== pending.identity.sessionId) throw new Error("worktree session changed during transition");
      this.#prepared = await this.#prepare(cwd);
      if (!this.#prepared.trust.trusted && (pending.request.action === "link-worktree" || pending.request.action === "enter-worktree")) {
        this.#prepared = undefined;
        throw new Error("target project was not trusted; previous worktree context was retained");
      }
      if (!this.#prepared.trust.trusted) trustDiagnostic = this.#prepared.trust.diagnostic ?? "Startup project resources were withheld because that directory was not trusted.";
      if (this.#prepared.services.resourceLoader.getExtensions().errors.length > 0) throw new Error("target project extensions could not be loaded; previous worktree context was retained");
      signal.throwIfAborted();
      if (this.#disposed || runtime.session.sessionId !== pending.identity.sessionId || runtime.session.sessionFile !== pending.identity.sessionFile) throw new Error("worktree conversation changed during preparation");
      replacementAttempted = true;
      const result = await runtime.switchSession(pending.identity.sessionFile, { cwdOverride: cwd });
      if (result.cancelled) {
        replacementAttempted = false;
        throw new Error("project context transition was cancelled by an extension");
      }
    };
    try {
      await old.waitForIdle();
      signal.throwIfAborted();
      if (old.pendingMessageCount > 0 || old.hasPendingBashMessages) throw new Error("queued input must finish before project-context replacement; pending messages were preserved");
      const result = await this.#reader.applyControl!(pending.identity.sessionId, pending.identity.sessionFile, pending.request, prepareContext, signal, this.#repositoryTrusted);
      this.#blocked = undefined;
      const cleanup = pending.request.action === "complete-worktree"
        ? await this.#reader.settleShell?.(pending.identity.sessionId, pending.identity.sessionFile, signal) : null;
      return `${describe(result)}${trustDiagnostic ? `\n${trustDiagnostic}` : ""}${cleanup ? `\n${cleanup}` : ""}`;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      // Security: Pi replacement can fail after invalidating the old agent. Recreate its resources before permitting more work.
      if (runtime.session.sessionId !== pending.identity.sessionId || runtime.session.sessionFile !== pending.identity.sessionFile) {
        return `Worktree transition cancelled: ${detail}. The newer conversation was preserved.`;
      }
      if (replacementAttempted) {
        try {
          this.#prepared = await this.#prepare(oldCwd, trusted);
          const restored = await runtime.switchSession(pending.identity.sessionFile, { cwdOverride: oldCwd });
          if (restored.cancelled) throw new Error("restoration was cancelled");
        } catch (restoreError) {
          this.#blocked = `Worktree context restoration failed: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}. Use worktree attach or detach; ordinary tools remain blocked.`;
        }
      }
      return `Worktree transition failed: ${detail}.${this.#blocked ? ` ${this.#blocked}` : " Previous attachment and project context were retained."}`;
    } finally {
      this.#prepared = undefined;
      this.#running = false;
    }
  }

  dispose(): void { this.#disposed = true; this.#pending = undefined; this.#prepared = undefined; }
}

function samePath(left: string, right: string): boolean {
  const normalize = (path: string) => {
    let canonical: string;
    try { canonical = realpathSync.native(path); } catch { canonical = resolve(path); }
    return process.platform === "win32" ? canonical.toLowerCase() : canonical;
  };
  return normalize(left) === normalize(right);
}

function describe(result: SessionWorktreeControlOutcome): string {
  if (result.kind === "linked") return `Session worktree attached: ${result.cwd} (${result.branch}). Project instructions, settings, skills and extensions reloaded after trust resolution; conversation preserved.`;
  if (result.kind === "unlinked") return `Session detached. Tools and project resources now use ${result.cwd}. No files or branches were deleted.`;
  if (result.kind === "completing") return `Session returned to ${result.startupRoot}; left ${result.cwd} (${result.branch}).`;
  if (result.kind === "status") return JSON.stringify(result);
  const inventory = result.entries.map(entry => `${entry.status}: ${entry.cwd} (${entry.branch})`).join("\n");
  return inventory.length > 48_000 ? `${inventory.slice(0, 48_000)}\n[Inventory truncated at 48KB]` : inventory;
}
