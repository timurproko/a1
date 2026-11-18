import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { readPullRequest, type PiPullRequestIdentity, type PiPullRequestProbe } from "./repository-pr.js";

const execFileAsync = promisify(execFile);
const PULL_REQUEST_REFRESH_MS = 60_000;
const REPOSITORY_CONTEXT_POLL_MS = 5_000;
const GIT_BRANCH_TIMEOUT_MS = 5_000;
const GIT_BRANCH_MAX_BUFFER_BYTES = 4 * 1024;

interface PiRepositoryContextSelection {
  readonly cwd: string;
  readonly branch: string;
  readonly revision?: string;
}
export type PiRepositoryContextReader = (sessionId: string, sessionFile: string, signal: AbortSignal) => Promise<PiRepositoryContextSelection | null>;
type PiGitBranchReader = (cwd: string, signal: AbortSignal) => Promise<string | null>;

export interface RepositoryMetadataOptions {
  readonly pullRequestProbe?: PiPullRequestProbe;
  readonly pullRequestRefreshMs?: number;
  readonly repositoryContextPollMs?: number;
  readonly repositoryContextReader?: PiRepositoryContextReader;
  readonly gitBranchReader?: PiGitBranchReader;
}

export interface RepositoryMetadataPorts {
  /** The session binding generation; a probe started under an older one is dropped. */
  bindingGeneration(): number;
  /** The bound session's id and file, when its session manager exposes them. */
  sessionIdentity(): { readonly sessionId: unknown; readonly sessionFile: unknown };
  /** The engine cwd, used when no associated repository context is known. */
  fallbackCwd(): string;
  disposed(): boolean;
  /** The branch, pull request or repository path changed. */
  changed(): void;
}

/**
 * The branch and pull request shown for the bound session: a poll loop with one probe in flight,
 * a pending flag for a refresh requested meanwhile, a slower pull-request clock, and a guard that
 * drops results from an aborted probe, an older binding or a disposed engine.
 */
export class RepositoryMetadataPoller {
  readonly #ports: RepositoryMetadataPorts;
  readonly #pullRequestProbe: PiPullRequestProbe;
  readonly #pullRequestRefreshMs: number;
  readonly #pollMs: number;
  readonly #contextReader: PiRepositoryContextReader;
  readonly #branchReader: PiGitBranchReader;
  #cwd: string;
  #selection: { branch: string | null; revision: string | null } = { branch: null, revision: null };
  #pullRequest: PiPullRequestIdentity | null = null;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #abort: AbortController | undefined;
  #task: Promise<void> | undefined;
  #pending = false;
  #lastPullRequestProbeAt: number | null = null;
  #enabled = false;

  constructor(options: RepositoryMetadataOptions, ports: RepositoryMetadataPorts) {
    this.#ports = ports;
    this.#cwd = ports.fallbackCwd();
    this.#pullRequestProbe = options.pullRequestProbe ?? readPullRequest;
    this.#pullRequestRefreshMs = options.pullRequestRefreshMs ?? PULL_REQUEST_REFRESH_MS;
    this.#pollMs = options.repositoryContextPollMs ?? REPOSITORY_CONTEXT_POLL_MS;
    this.#contextReader = options.repositoryContextReader ?? (async () => null);
    this.#branchReader = options.gitBranchReader ?? readGitBranch;
  }

  get cwd(): string {
    return this.#cwd;
  }

  get branch(): string | null {
    return this.#selection.branch;
  }

  get revision(): string | null { return this.#selection.revision; }

  get pullRequest(): PiPullRequestIdentity | null {
    return this.#pullRequest;
  }

  /** Enable polling and probe now. */
  start(): void {
    this.#enabled = true;
    this.refresh();
  }

  /** Probe now while polling is enabled; a request made during a probe runs once it settles. */
  refresh(): void {
    if (!this.#enabled || this.#ports.disposed()) return;
    if (this.#task !== undefined) {
      this.#pending = true;
      return;
    }
    const task = this.#probe();
    this.#task = task;
    const settled = (): void => {
      if (this.#task === task) this.#task = undefined;
      if (!this.#pending) return;
      this.#pending = false;
      this.refresh();
    };
    void task.then(settled, settled);
  }

  /** Abort the running probe and forget the previous binding's metadata. */
  reset(): void {
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#abort?.abort();
    this.#cwd = this.#ports.fallbackCwd();
    this.#selection = { branch: null, revision: null };
    this.#pullRequest = null;
    this.#lastPullRequestProbeAt = null;
  }

  /** Stop polling; resolves once the running probe has settled. */
  async dispose(): Promise<void> {
    this.#enabled = false;
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#pending = false;
    this.#abort?.abort();
    await this.#task;
  }

  #current(controller: AbortController, generation: number): boolean {
    return !controller.signal.aborted && generation === this.#ports.bindingGeneration() && this.#enabled && !this.#ports.disposed();
  }

  async #probe(): Promise<void> {
    if (this.#abort !== undefined || this.#ports.disposed()) return;
    const controller = new AbortController();
    const generation = this.#ports.bindingGeneration();
    this.#abort = controller;
    let associatedContext: PiRepositoryContextSelection | null = null;
    const { sessionId, sessionFile } = this.#ports.sessionIdentity();
    try {
      if (typeof sessionId === "string" && sessionId.length > 0 && typeof sessionFile === "string" && sessionFile.length > 0) {
        associatedContext = await this.#contextReader(sessionId, sessionFile, controller.signal);
      }
      const nextCwd = associatedContext?.cwd ?? this.#ports.fallbackCwd();
      let nextBranch: string | null = associatedContext?.branch ?? null;
      if (associatedContext === null) {
        try {
          nextBranch = await this.#branchReader(nextCwd, controller.signal);
        } catch {
          nextBranch = null;
        }
      }
      const nextRevision = associatedContext?.revision ?? null;
      const metadataChanged = nextCwd !== this.#cwd || nextBranch !== this.#selection.branch || nextRevision !== this.#selection.revision;
      const remoteDue = metadataChanged || this.#lastPullRequestProbeAt === null
        || Date.now() - this.#lastPullRequestProbeAt >= this.#pullRequestRefreshMs;
      if (remoteDue) {
        let nextPullRequest: PiPullRequestIdentity | null = null;
        try {
          nextPullRequest = nextBranch === null
            ? null
            : await this.#pullRequestProbe(nextCwd, nextBranch, controller.signal);
        } catch {
          nextPullRequest = null;
        }
        if (!this.#current(controller, generation)) return;
        this.#apply(nextCwd, nextBranch, nextPullRequest, nextRevision);
      }
    } catch {
      // Invariant: unverifiable context is not evidence of an exit; retain the last verified selection.
    } finally {
      if (this.#abort === controller) this.#abort = undefined;
    }
    if (!this.#current(controller, generation)) return;
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      this.refresh();
    }, this.#pollMs);
    this.#timer.unref?.();
  }

  #apply(cwd: string, branch: string | null, pullRequest: PiPullRequestIdentity | null, revision: string | null): void {
    const changed = cwd !== this.#cwd || branch !== this.#selection.branch || revision !== this.#selection.revision || !samePullRequest(this.#pullRequest, pullRequest);
    this.#cwd = cwd;
    this.#selection = { branch, revision };
    this.#pullRequest = pullRequest;
    this.#lastPullRequestProbeAt = Date.now();
    if (changed) this.#ports.changed();
  }
}

function samePullRequest(left: PiPullRequestIdentity | null, right: PiPullRequestIdentity | null): boolean {
  return left?.number === right?.number && left?.url === right?.url;
}

async function readGitBranch(cwd: string, signal: AbortSignal): Promise<string | null> {
  if (!existsSync(cwd)) return null;
  try {
    const { stdout } = await execFileAsync("git", ["branch", "--show-current"], {
      cwd,
      windowsHide: true,
      timeout: GIT_BRANCH_TIMEOUT_MS,
      maxBuffer: GIT_BRANCH_MAX_BUFFER_BYTES,
      signal,
      encoding: "utf8",
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}
