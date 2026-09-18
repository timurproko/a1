import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { PRODUCT_IDENTITY } from "../../../product-identity.js";
import { observeCompactionProgress, type CompactionProgressObserver } from "./compaction-progress.js";
import { createPiRuntimeIntegration } from "./runtime-integration.js";
import { PiSessionCommandIntegration } from "./session-integration.js";
import { DefaultPackageManager, VERSION, type AgentSession, type AgentSessionRuntime, type AgentSessionServices } from "../startup-public.js";
import type { PiProjectTrustPreflightPrompt } from "./project-trust-preflight.js";
import type { PiSessionForkPrompt, PiSessionSelection } from "./session-selection.js";
import type { OwnedUiDiagnostics } from "../../../contracts/owned-ui/index.js";
import type { PiSessionResumeMetadata, PiWorkflowHost } from "./workflows.js";

const execFileAsync = promisify(execFile);

export interface PiEngineRuntimeFactoryInput {
  readonly cwd: string;
  readonly agentDir: string;
  readonly sessionId: string;
  readonly sessionPath?: string;
  readonly sessionSelection?: PiSessionSelection;
  readonly sessionForkPrompt?: PiSessionForkPrompt;
  readonly projectTrustPrompt?: PiProjectTrustPreflightPrompt;
}

export type PiEngineRuntimeFactory = (input: PiEngineRuntimeFactoryInput) => Promise<AgentSessionRuntime>;

export type PiEnginePackageUpdateProbe = (settingsManager: AgentSessionServices["settingsManager"]) => Promise<readonly string[]>;

export interface PiEngineRuntimeOptions {
  readonly cwd: string;
  readonly agentDir: string;
  readonly sessionId: string;
  readonly sessionPath: string | undefined;
  readonly sessionSelection: PiSessionSelection | undefined;
  readonly sessionForkPrompt: PiSessionForkPrompt | undefined;
  readonly projectTrustPrompt: PiProjectTrustPreflightPrompt | undefined;
  readonly createRuntime: PiEngineRuntimeFactory | undefined;
  readonly checkPackageUpdates: PiEnginePackageUpdateProbe | undefined;
  readonly host: PiWorkflowHost;
}

export interface PiEngineRuntimePorts {
  disposed(): boolean;
  /** The runtime exists and its cwd and git branch are known; nothing is bound yet. */
  started(runtime: AgentSessionRuntime): void;
  /** True while a runtime-initiated rebind must be ignored: delivery overload, stopped admission, or disposal. */
  rebindBlocked(): boolean;
  /** The current session is about to be replaced; admitted work that belongs to it is cancelled here. */
  sessionReplacing(): void;
  /** A session was bound and subscribed under a new generation; the adapter rebuilds the state it derives from one. */
  sessionReplaced(session: AgentSession): void;
  /** A runtime-initiated rebind completed; the adapter publishes the rebuilt view. */
  rebound(): void;
  /** A pinned Pi session event for the current generation. */
  event(event: unknown): void;
  compactionProgress(percent: number): void;
  diagnostic(severity: OwnedUiDiagnostics["severity"], code: string, message: string, recoverable: boolean): void;
  emitView(): void;
}

/**
 * The pinned Pi runtime and the session bound to it: creation through the runtime factory, the
 * session generation that stamps and invalidates events, the subscription that forwards session
 * events, compaction progress observation, the queued-input integration, and disposal order. The
 * adapter derives its view state from the session it is handed and never touches these directly.
 */
export class PiEngineRuntime {
  readonly #options: PiEngineRuntimeOptions;
  readonly #ports: PiEngineRuntimePorts;
  readonly #runtimeFactory: PiEngineRuntimeFactory;
  readonly #checkPackageUpdates: PiEnginePackageUpdateProbe;
  #cwd: string;
  #runtime: AgentSessionRuntime | undefined;
  #session: AgentSession | undefined;
  #unsubscribe: (() => void) | undefined;
  #sessionGeneration = 0;
  #sessionBindingGeneration = 0;
  #sessionCommands: PiSessionCommandIntegration | undefined;
  #compactionProgress: CompactionProgressObserver | null = null;
  #gitBranch: string | null = null;

  constructor(options: PiEngineRuntimeOptions, ports: PiEngineRuntimePorts) {
    this.#options = options;
    this.#ports = ports;
    this.#cwd = options.cwd;
    this.#runtimeFactory = options.createRuntime ?? createDefaultPiRuntime;
    this.#checkPackageUpdates = options.checkPackageUpdates
      ?? (options.createRuntime
        ? async () => []
        : settingsManager => checkDefaultPiPackageUpdates(this.#cwd, options.agentDir, settingsManager));
  }

  get runtime(): AgentSessionRuntime | undefined {
    return this.#runtime;
  }

  get session(): AgentSession | undefined {
    return this.#session;
  }

  /** Bumped on every bind and on overload recovery; events from an earlier generation are invalid. */
  get generation(): number {
    return this.#sessionGeneration;
  }

  /** Actual session replacements, excluding delivery-only invalidation of callbacks. */
  get bindingGeneration(): number {
    return this.#sessionBindingGeneration;
  }

  get cwd(): string {
    return this.#runtime?.cwd ?? this.#cwd;
  }

  get gitBranch(): string | null {
    return this.#gitBranch;
  }

  get sessionCommands(): PiSessionCommandIntegration | undefined {
    return this.#sessionCommands;
  }

  get started(): boolean {
    return this.#runtime !== undefined;
  }

  /** Create the runtime, bind its first session, and announce the changelog; startup failures propagate. */
  async start(): Promise<AgentSessionRuntime> {
    const runtime = await this.#runtimeFactory({
      cwd: this.#cwd,
      agentDir: this.#options.agentDir,
      sessionId: this.#options.sessionId,
      ...(this.#options.sessionPath === undefined ? {} : { sessionPath: this.#options.sessionPath }),
      ...(this.#options.sessionSelection === undefined ? {} : { sessionSelection: this.#options.sessionSelection }),
      ...(this.#options.sessionForkPrompt === undefined ? {} : { sessionForkPrompt: this.#options.sessionForkPrompt }),
      ...(this.#options.projectTrustPrompt === undefined ? {} : { projectTrustPrompt: this.#options.projectTrustPrompt }),
    });
    this.#runtime = runtime;
    this.#cwd = runtime.cwd ?? this.#cwd;
    this.#gitBranch = await readGitBranch(this.#cwd);
    this.#ports.started(runtime);
    runtime.setRebindSession(async session => {
      if (this.#ports.rebindBlocked()) return;
      this.bindSession(session);
      this.#ports.rebound();
    });
    for (const diagnostic of [...runtime.diagnostics, ...runtime.services.diagnostics]) {
      this.#ports.diagnostic(
        diagnostic.type === "error" ? "error" : diagnostic.type === "warning" ? "warning" : "info",
        "engine-startup",
        diagnostic.message,
        diagnostic.type !== "error",
      );
    }
    this.bindSession(runtime.session);
    await this.#announceChangelog(runtime.services.settingsManager);
    return runtime;
  }

  /** Probe extension packages for updates after startup and report them as an informational diagnostic. */
  async announcePackageUpdates(): Promise<void> {
    const runtime = this.#runtime;
    if (process.env.PI_OFFLINE || runtime === undefined) return;
    let updates: readonly string[];
    try {
      updates = await this.#checkPackageUpdates(runtime.services.settingsManager);
    } catch {
      return;
    }
    if (this.#ports.disposed() || updates.length === 0) return;
    const packages = updates.map(name => `- ${name}`).join("\n");
    this.#ports.diagnostic(
      "info",
      "package-updates",
      `Package updates are available. Run ${PRODUCT_IDENTITY.commandName} pi update --extensions\nPackages:\n${packages}`,
      true,
    );
    this.#ports.emitView();
  }

  currentSessionFile(): string | null {
    const value = this.#session?.sessionManager?.getSessionFile?.();
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  currentSessionResumeMetadata(): PiSessionResumeMetadata | null {
    const manager = this.#session?.sessionManager;
    if (manager === undefined
      || typeof manager.isPersisted !== "function"
      || typeof manager.getSessionId !== "function"
      || typeof manager.getSessionDir !== "function"
      || typeof manager.usesDefaultSessionDir !== "function"
      || manager.isPersisted() !== true
      || !existsSync(this.currentSessionFile() ?? "")) return null;
    const sessionId = manager.getSessionId();
    const sessionDir = manager.getSessionDir();
    if (!sessionId || !sessionDir) return null;
    return { sessionId, sessionDir, usesDefaultSessionDir: manager.usesDefaultSessionDir() };
  }

  /** Replace the bound session under a new generation and subscribe to its events. */
  bindSession(session: AgentSession): void {
    this.#unsubscribe?.();
    this.#ports.sessionReplacing();
    this.#sessionGeneration += 1;
    this.#sessionBindingGeneration += 1;
    this.#session = session;
    this.#sessionCommands = new PiSessionCommandIntegration(session);
    this.#compactionProgress?.dispose();
    this.#compactionProgress = observeCompactionProgress(session, percent => {
      if (this.#session === session && !this.#ports.disposed()) this.#ports.compactionProgress(percent);
    });
    // Invariant: the subscription is live before the adapter rebuilds its state so the extension
    // rebind that finishes the rebuild cannot emit an event nobody is listening to.
    this.#subscribe();
    this.#ports.sessionReplaced(session);
  }

  /** Stop forwarding the current session's events and open a new generation; overload recovery resumes or abandons it. */
  suspend(): void {
    this.#unsubscribe?.(); this.#unsubscribe = undefined;
    this.#compactionProgress?.dispose(); this.#compactionProgress = null;
    ++this.#sessionGeneration;
  }

  /** Forward the current session's events again under the current generation. */
  resume(): void {
    if (this.#session === undefined) return;
    this.#subscribe();
  }

  compactionStarted(): void {
    this.#compactionProgress?.begin();
  }

  compactionEnded(): void {
    this.#compactionProgress?.end();
  }

  // Rationale: a manual compaction ends with an idle session, so the engine would never consume
  // the messages queued during it; automatic compaction returns to a run or a pending prompt.
  deliverQueuedAfterCompaction(): void {
    const commands = this.#sessionCommands;
    const generation = this.#sessionGeneration;
    if (commands === undefined) return;
    const report = (error: unknown): void => {
      if (generation !== this.#sessionGeneration || this.#ports.disposed()) return;
      this.#ports.diagnostic("error", "engine-command", `Queued input could not be sent after compaction: ${error instanceof Error ? error.message : String(error)}`, true);
      this.#ports.emitView();
    };
    commands.deliverQueuedAfterCompaction(report).catch(report);
  }

  /** Unsubscribe, stop observing compaction, and dispose the runtime; the session reference is kept for final reads. */
  async dispose(): Promise<void> {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#compactionProgress?.dispose();
    this.#compactionProgress = null;
    await this.#runtime?.dispose();
  }

  #subscribe(): void {
    const session = this.#session;
    if (session === undefined) return;
    const generation = this.#sessionGeneration;
    this.#unsubscribe = session.subscribe(event => {
      if (generation === this.#sessionGeneration && !this.#ports.disposed()) this.#ports.event(event);
    });
  }

  async #announceChangelog(settingsManager: AgentSessionServices["settingsManager"]): Promise<void> {
    if (!settingsManager || typeof settingsManager.getLastChangelogVersion !== "function"
      || typeof settingsManager.setLastChangelogVersion !== "function") return;
    if ((this.#session?.messages.length ?? 0) > 0) return;
    const lastVersion = settingsManager.getLastChangelogVersion();
    if (lastVersion === VERSION) return;
    if (!lastVersion) {
      settingsManager.setLastChangelogVersion(VERSION);
      await settingsManager.flush();
      return;
    }
    const markdown = await this.#options.host.readChangelog(lastVersion).catch(() => "");
    if (markdown.trim().length > 0) {
      this.#ports.diagnostic(
        "info",
        settingsManager.getCollapseChangelog() ? "changelog-collapsed" : "changelog-expanded",
        markdown,
        true,
      );
      settingsManager.setLastChangelogVersion(VERSION);
      await settingsManager.flush();
    }
  }
}

async function createDefaultPiRuntime(input: PiEngineRuntimeFactoryInput): Promise<AgentSessionRuntime> {
  return createPiRuntimeIntegration({
    cwd: input.cwd,
    agentDir: input.agentDir,
    ...(input.sessionPath === undefined ? {} : { sessionPath: input.sessionPath }),
    ...(input.sessionSelection === undefined ? {} : { sessionSelection: input.sessionSelection }),
    ...(input.sessionForkPrompt === undefined ? {} : { sessionForkPrompt: input.sessionForkPrompt }),
    ...(input.projectTrustPrompt === undefined ? {} : { projectTrustPrompt: input.projectTrustPrompt }),
  });
}

async function checkDefaultPiPackageUpdates(
  cwd: string,
  agentDir: string,
  settingsManager: AgentSessionServices["settingsManager"],
): Promise<readonly string[]> {
  const packageManager = new DefaultPackageManager({ cwd, agentDir, settingsManager });
  const updates = await packageManager.checkForAvailableUpdates();
  return updates.map(update => update.displayName);
}

async function readGitBranch(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["branch", "--show-current"], { cwd, windowsHide: true });
    const branch = stdout.trim();
    return branch.length > 0 ? branch : null;
  } catch {
    return null;
  }
}
