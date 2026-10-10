import { PiEngineAdapter } from "./adapter.js";
import { configureOwnedHttpDispatcher } from "./http-dispatcher.js";
import { markStartupPhase, type StartupPhase } from "../../../foundation/startup/startup-runtime.js";
import type { PiEngineHostSessionPorts } from "./host-ports.js";
import type { PiEnginePackageUpdateProbe, PiEngineRuntimeFactory, PiRepositoryContextReader } from "./session-runtime.js";
import type { PiProjectTrustPreflightPrompt } from "./project-trust-preflight.js";
import type { PiSessionForkPrompt, PiSessionSelection } from "./session-selection.js";
import type { PiWorkflowHost } from "./workflows.js";
import type { OwnedUiSessionFactory, OwnedUiSessionRequest, UiAccentColor } from "../../../contracts/owned-ui/index.js";

/** The theme singletons the host applies. Composition supplies them so the engine owns no presentation module. */
export interface PiEngineHostThemeApplier {
  /** Apply the base theme in the engine's grammar: a theme name, or a `light/dark` pair meaning "follow the terminal". */
  base(setting: string | undefined): void;
  accentColor(color: UiAccentColor): void;
  packageBorderProjection(enabled: boolean): void;
}

export interface PiEngineHostTheme {
  /** `dark` pins bare A1's one base; `engine-configured` follows the theme the first session is configured with. */
  readonly base: "dark" | "engine-configured";
  readonly accentColor: UiAccentColor;
  readonly packageBorderProjection: boolean;
  readonly apply: PiEngineHostThemeApplier;
}

export interface PiEngineHostOptions {
  readonly productMode: "bare" | "comparison";
  readonly theme: PiEngineHostTheme;
  /** Themes installed on this machine, listed by the component adapter that owns the theme unit. */
  readonly availableThemes?: () => readonly string[];
  /** Comparison profiles preserve Pi's startup changelog; bare A1 owns release-note startup. Defaults to on. */
  readonly announceStartupChangelog?: boolean;
  readonly projectTrustPrompt?: PiProjectTrustPreflightPrompt;
  readonly checkPackageUpdates?: PiEnginePackageUpdateProbe;
  readonly workflowHost?: PiWorkflowHost;
  readonly createRuntime?: PiEngineRuntimeFactory;
  /** Installs the process HTTP dispatcher; defaults to the owned undici seam. */
  readonly installHttpDispatcher?: (timeoutMs: number) => void;
  /** Records one startup trace phase; defaults to the process startup trace. */
  readonly markStartupPhase?: (phase: StartupPhase) => Promise<void>;
}

/** A session request as the Pi host takes it: the neutral request plus how the Pi session is opened. */
export interface PiEngineSessionRequest extends OwnedUiSessionRequest {
  readonly sessionPath?: string;
  readonly sessionSelection?: PiSessionSelection;
  readonly sessionForkPrompt?: PiSessionForkPrompt;
  readonly repositoryContextReader?: PiRepositoryContextReader;
}

/** The dispatcher policy in force for the process and the session that put it there. */
export interface PiEngineHttpPolicy {
  readonly timeoutMs: number;
  readonly sessionId: string;
  readonly origin: "startup" | "setting";
}

/**
 * The process-level owner of everything in the engine integration that is process-wide: the undici
 * dispatcher, the theme singletons, the one-time changelog and package-update announcements, and
 * the startup trace. Sessions come only from `create`, so their ids are unique per process.
 */
export interface PiEngineHost extends OwnedUiSessionFactory {
  /** Aborted on disposal; every host-level timer and probe stops with it. */
  readonly signal: AbortSignal;
  readonly disposed: boolean;
  create(request: PiEngineSessionRequest): Promise<PiEngineAdapter>;
  /** Ids of the sessions this host created that are not yet disposed. */
  liveSessionIds(): readonly string[];
  /** The dispatcher policy in force, or null before any session loaded one. */
  httpPolicy(): PiEngineHttpPolicy | null;
  /** Re-apply the owned accent; the live setting change from composition lands here. */
  setAccentColor(color: UiAccentColor): void;
  /** Abort the signal and dispose every session still live. */
  dispose(): Promise<void>;
}

export function createPiEngineHost(options: PiEngineHostOptions): PiEngineHost {
  return new ProcessPiEngineHost(options);
}

const SESSION_ID_PREFIX = "owned-session-";

class ProcessPiEngineHost implements PiEngineHost {
  readonly #options: PiEngineHostOptions;
  readonly #abort = new AbortController();
  readonly #sessions = new Map<string, PiEngineAdapter>();
  readonly #tracedPhases = new Set<StartupPhase>();
  readonly #sessionPorts: PiEngineHostSessionPorts;
  readonly #installHttpDispatcher: (timeoutMs: number) => void;
  readonly #markStartupPhase: (phase: StartupPhase) => Promise<void>;
  #accentColor: UiAccentColor;
  #nextSessionNumber = 1;
  #httpPolicy: PiEngineHttpPolicy | null = null;
  #themeApplied = false;
  #announced = false;
  #disposed = false;

  constructor(options: PiEngineHostOptions) {
    this.#options = options;
    this.#accentColor = options.theme.accentColor;
    this.#installHttpDispatcher = options.installHttpDispatcher ?? configureOwnedHttpDispatcher;
    this.#markStartupPhase = options.markStartupPhase ?? (phase => markStartupPhase(process.env, phase));
    this.#sessionPorts = {
      signal: this.#abort.signal,
      markStartupPhase: phase => this.#tracePhase(phase),
      httpPolicyLoaded: (timeoutMs, sessionId) => { this.#applyHttpPolicy(timeoutMs, sessionId, "startup"); },
      httpPolicyChanged: (timeoutMs, sessionId) => { this.#applyHttpPolicy(timeoutMs, sessionId, "setting"); },
    };
  }

  get signal(): AbortSignal {
    return this.#abort.signal;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  liveSessionIds(): readonly string[] {
    this.#forgetDisposedSessions();
    return [...this.#sessions.keys()];
  }

  httpPolicy(): PiEngineHttpPolicy | null {
    return this.#httpPolicy;
  }

  setAccentColor(color: UiAccentColor): void {
    this.#accentColor = color;
    if (this.#themeApplied) this.#options.theme.apply.accentColor(color);
  }

  async create(request: PiEngineSessionRequest): Promise<PiEngineAdapter> {
    if (this.#disposed) throw new Error("engine host is disposed");
    const sessionId = this.#claimSessionId(request.sessionId);
    const options = this.#options;
    const adapter = new PiEngineAdapter({
      cwd: request.cwd,
      sessionId,
      engineHost: this.#sessionPorts,
      settingsProductMode: options.productMode,
      ...(options.availableThemes === undefined ? {} : { availableThemes: options.availableThemes }),
      ...(options.projectTrustPrompt === undefined ? {} : { projectTrustPrompt: options.projectTrustPrompt }),
      ...(options.checkPackageUpdates === undefined ? {} : { checkPackageUpdates: options.checkPackageUpdates }),
      ...(options.workflowHost === undefined ? {} : { workflowHost: options.workflowHost }),
      ...(options.createRuntime === undefined ? {} : { createRuntime: options.createRuntime }),
      ...(request.sessionPath === undefined ? {} : { sessionPath: request.sessionPath }),
      ...(request.sessionSelection === undefined ? {} : { sessionSelection: request.sessionSelection }),
      ...(request.sessionForkPrompt === undefined ? {} : { sessionForkPrompt: request.sessionForkPrompt }),
      ...(request.repositoryContextReader === undefined ? {} : { repositoryContextReader: request.repositoryContextReader }),
    });
    this.#sessions.set(sessionId, adapter);
    try {
      await adapter.start();
    } catch (error) {
      this.#sessions.delete(sessionId);
      throw error;
    }
    this.#applyThemeOnce(adapter);
    await this.#announceOnce(adapter);
    return adapter;
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#abort.abort();
    const live = [...this.#sessions.values()].filter(session => !session.disposed);
    this.#sessions.clear();
    await Promise.all(live.map(session => session.dispose()));
  }

  // Invariant: an id names one live session; a disposed session's id may be reused by a caller, never by generation.
  #claimSessionId(requested: string | undefined): string {
    this.#forgetDisposedSessions();
    if (requested !== undefined) {
      if (requested.length === 0) throw new TypeError("engine session id is required");
      if (this.#sessions.has(requested)) throw new Error(`engine session id is already live: ${requested}`);
      return requested;
    }
    let candidate = `${SESSION_ID_PREFIX}${this.#nextSessionNumber++}`;
    while (this.#sessions.has(candidate)) candidate = `${SESSION_ID_PREFIX}${this.#nextSessionNumber++}`;
    return candidate;
  }

  #forgetDisposedSessions(): void {
    for (const [sessionId, session] of this.#sessions) if (session.disposed) this.#sessions.delete(sessionId);
  }

  // Rationale: the profile's timeout is installed once, by whichever session loads it first; a written
  // setting re-installs from any session because the dispatcher is process-wide either way.
  #applyHttpPolicy(timeoutMs: number, sessionId: string, origin: PiEngineHttpPolicy["origin"]): void {
    if (this.#disposed || (origin === "startup" && this.#httpPolicy !== null)) return;
    this.#installHttpDispatcher(timeoutMs);
    this.#httpPolicy = { timeoutMs, sessionId, origin };
  }

  async #tracePhase(phase: StartupPhase): Promise<void> {
    if (this.#tracedPhases.has(phase)) return;
    this.#tracedPhases.add(phase);
    await this.#markStartupPhase(phase);
  }

  // Compatibility: bare A1 ships one base visual target while its UI is being completed: dark, regardless
  // of terminal detection or a stored Pi theme, with its owned accent projected over it. Comparison keeps
  // Pi's configured theme and unmodified semantic accent. The base is read from the first session.
  #applyThemeOnce(adapter: PiEngineAdapter): void {
    if (this.#themeApplied) return;
    this.#themeApplied = true;
    const theme = this.#options.theme;
    theme.apply.packageBorderProjection(theme.packageBorderProjection);
    theme.apply.accentColor(this.#accentColor);
    theme.apply.base(theme.base === "dark" ? "dark" : adapter.configuredTheme());
  }

  async #announceOnce(adapter: PiEngineAdapter): Promise<void> {
    if (this.#announced) return;
    this.#announced = true;
    if (this.#options.announceStartupChangelog !== false) await adapter.announceStartupChangelog();
    void adapter.announcePackageUpdates();
  }
}
