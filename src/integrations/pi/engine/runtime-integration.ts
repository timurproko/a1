import { closeSync, mkdirSync, openSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  resolveModelScopeWithDiagnostics,
  SessionManager,
  SettingsManager,
  type AgentSession,
  type AgentSessionRuntime,
  type AgentSessionServices,
  type CreateAgentSessionRuntimeFactory,
  type ScopedModel,
} from "../startup-public.js";
import {
  resolvePiProjectTrustPreflight,
  type PiProjectTrustPreflightPrompt,
} from "./project-trust-preflight.js";
import { openSelectedPiSession, resolveSessionArgumentPath, takeSelectedSessionWriter, type PiSessionForkPrompt, type PiSessionSelection } from "./session-selection.js";
import { markStartupPhase, type StartupPhase } from "../../../foundation/startup/startup-runtime.js";
import { createWindowsNulCleanupExtension } from "./windows-filesystem-hygiene.js";
import { createSessionWorktreeTools, type PiWorktreeCwdReader } from "./worktree-tools.js";
import {
  acquireSessionWriter,
  type SessionWriterHandle,
} from "../../../foundation/session-writer-lock/index.js";

export interface PiRuntimeIntegrationOptions {
  readonly cwd: string;
  /** Only the bare claim-owning product supplies this; comparison tools keep their ordinary cwd. */
  readonly worktreeCwdReader?: PiWorktreeCwdReader;
  readonly agentDir: string;
  readonly sessionDir?: string;
  readonly sessionPath?: string;
  readonly sessionSelection?: PiSessionSelection;
  readonly sessionForkPrompt?: PiSessionForkPrompt;
  readonly projectTrustPrompt?: PiProjectTrustPreflightPrompt;
  readonly preflightDependencies?: PiRuntimePreflightDependencies;
  /** Host signal; model-scope resolution stops with it. Absent means only the resolver's own timeout applies. */
  readonly signal?: AbortSignal;
  /** Startup trace sink; the host supplies one that records each phase once per process. */
  readonly markStartupPhase?: PiStartupPhaseMarker;
}

export type PiStartupPhaseMarker = (phase: StartupPhase) => Promise<void>;

export interface PiRuntimePreflightDependencies {
  readonly resolveTrust?: typeof resolvePiProjectTrustPreflight;
  readonly createSettingsManager?: (cwd: string, agentDir: string, projectTrusted: boolean) => SettingsManager;
  readonly createServices?: typeof createAgentSessionServices;
}

export type PiSessionReplacement =
  | { readonly kind: "new" }
  | { readonly kind: "resume"; readonly sessionPath: string };

interface PendingSessionWriter {
  readonly handle: SessionWriterHandle;
  readonly alreadyCurrent: boolean;
}

class SessionWriterCoordinator {
  #current: SessionWriterHandle | undefined;

  prepare(manager: SessionManager): PendingSessionWriter | undefined {
    const selected = takeSelectedSessionWriter(manager);
    if (selected !== undefined) return { handle: selected, alreadyCurrent: false };
    const path = manager.getSessionFile();
    if (path === undefined) return undefined;
    if (this.#current?.path === path) return { handle: this.#current, alreadyCurrent: true };
    const handle = acquireSessionWriter(path);
    try {
      if (!handle.bound) {
        const header = manager.getHeader();
        if (header === null) throw new Error("new session is missing its generated header");
        mkdirSync(dirname(path), { recursive: true });
        const descriptor = openSync(path, "wx", 0o600);
        try {
          handle.bind(path);
          writeFileSync(descriptor, `${JSON.stringify(header)}\n`);
        } finally {
          closeSync(descriptor);
        }
        manager.setSessionFile(path);
      }
      return { handle, alreadyCurrent: false };
    } catch (error) {
      handle.release();
      throw error;
    }
  }

  activate(pending: PendingSessionWriter | undefined): void {
    if (pending === undefined || pending.alreadyCurrent) return;
    const previous = this.#current;
    this.#current = pending.handle;
    previous?.release();
  }

  abandon(pending: PendingSessionWriter | undefined): void {
    if (pending !== undefined && !pending.alreadyCurrent) pending.handle.release();
  }

  release(): void {
    this.#current?.release();
    this.#current = undefined;
  }
}

const runtimeSessionWriters = new WeakMap<AgentSessionRuntime, SessionWriterCoordinator>();

interface ConfiguredModelScope {
  readonly scopedModels: readonly ScopedModel[];
  readonly model: ScopedModel["model"] | undefined;
  readonly thinkingLevel: ScopedModel["thinkingLevel"];
  readonly diagnostics: readonly { type: "info" | "warning" | "error"; message: string }[];
}

/**
 * Mirrors pinned Pi's CLI startup: resolve the `models` patterns from settings
 * into a scoped model list, keep the resolver's warnings (e.g. "No models match
 * pattern ..."), and pick the same initial model pinned Pi would pick — the
 * saved authenticated default, otherwise the first scoped model.
 */
export async function resolveConfiguredModelScope(
  services: Pick<AgentSessionServices, "settingsManager" | "modelRuntime">,
  signal?: AbortSignal,
): Promise<ConfiguredModelScope> {
  const patterns = services.settingsManager.getEnabledModels();
  if (!patterns || patterns.length === 0) {
    return { scopedModels: [], model: undefined, thinkingLevel: undefined, diagnostics: [] };
  }
  const { scopedModels, diagnostics } = await resolveModelScopeWithDiagnostics(
    [...patterns],
    services.modelRuntime,
    { signal: signal === undefined ? AbortSignal.timeout(15_000) : AbortSignal.any([signal, AbortSignal.timeout(15_000)]) },
  );
  const savedProvider = services.settingsManager.getDefaultProvider();
  const savedModelId = services.settingsManager.getDefaultModel();
  const savedModel = savedProvider && savedModelId
    ? services.modelRuntime.getAvailableSnapshot().find(model => model.provider === savedProvider && model.id === savedModelId)
    : undefined;
  const fallback = scopedModels[0];
  return {
    scopedModels,
    model: savedModel ?? fallback?.model,
    thinkingLevel: savedModel
      ? services.settingsManager.getModelThinkingLevel(savedModel.provider, savedModel.id)
        ?? services.settingsManager.getDefaultThinkingLevel()
      : fallback?.thinkingLevel,
    diagnostics: diagnostics.map(diagnostic => ({ type: diagnostic.type, message: diagnostic.message })),
  };
}

export async function createPiRuntimeServicesAfterTrust(
  options: Pick<PiRuntimeIntegrationOptions, "agentDir" | "projectTrustPrompt" | "preflightDependencies" | "markStartupPhase"> & { readonly cwd: string },
): Promise<{
  readonly services: AgentSessionServices;
  readonly trust: Awaited<ReturnType<typeof resolvePiProjectTrustPreflight>>;
}> {
  const resolveTrust = options.preflightDependencies?.resolveTrust ?? resolvePiProjectTrustPreflight;
  const createSettingsManager = options.preflightDependencies?.createSettingsManager
    ?? ((targetCwd: string, agentDir: string, projectTrusted: boolean) => SettingsManager.create(targetCwd, agentDir, { projectTrusted }));
  const createServices = options.preflightDependencies?.createServices ?? createAgentSessionServices;
  const markPhase = options.markStartupPhase ?? defaultStartupPhaseMarker;
  const trust = await resolveTrust({
    cwd: options.cwd,
    agentDir: options.agentDir,
    ...(options.projectTrustPrompt === undefined ? {} : { prompt: options.projectTrustPrompt }),
  });
  const settingsManager = createSettingsManager(options.cwd, options.agentDir, trust.trusted);
  await markPhase("settings-loaded");
  const cleanupExtension = createWindowsNulCleanupExtension();
  const services = await createServices({
    cwd: options.cwd,
    agentDir: options.agentDir,
    settingsManager,
    ...(cleanupExtension === null ? {} : {
      resourceLoaderOptions: { extensionFactories: [cleanupExtension] },
    }),
  });
  await markPhase("pi-services");
  await markPhase("resource-discovery");
  return { services, trust };
}

export async function createPiRuntimeIntegration(options: PiRuntimeIntegrationOptions): Promise<AgentSessionRuntime> {
  const directory = options.sessionDir ?? process.env.PI_CODING_AGENT_SESSION_DIR;
  const sessionDir = directory === undefined ? undefined : resolveSessionArgumentPath(directory, options.cwd);
  const selection = options.sessionSelection ?? (options.sessionPath === undefined ? undefined : { target: resolveSessionArgumentPath(options.sessionPath, options.cwd) });
  const sessionManager = selection === undefined
    ? SessionManager.create(options.cwd, sessionDir)
    : await openSelectedPiSession({
      cwd: options.cwd, selection,
      ...(sessionDir === undefined ? {} : { sessionDir }),
      ...(options.sessionForkPrompt === undefined ? {} : { forkPrompt: options.sessionForkPrompt }),
      guardWriter: true,
    });
  const sessionWriters = new SessionWriterCoordinator();
  const createRuntime: CreateAgentSessionRuntimeFactory = async ({
    cwd,
    sessionManager: targetSessionManager,
    sessionStartEvent,
  }) => {
    const pendingWriter = sessionWriters.prepare(targetSessionManager);
    try {
      const { services, trust } = await createPiRuntimeServicesAfterTrust({
        cwd,
        agentDir: options.agentDir,
        ...(options.projectTrustPrompt === undefined ? {} : { projectTrustPrompt: options.projectTrustPrompt }),
        ...(options.preflightDependencies === undefined ? {} : { preflightDependencies: options.preflightDependencies }),
        ...(options.markStartupPhase === undefined ? {} : { markStartupPhase: options.markStartupPhase }),
      });
      const modelScope = await resolveConfiguredModelScope(services, options.signal);
      const hasExistingSession = targetSessionManager.buildSessionContext().messages.length > 0;
      const created = await createAgentSessionFromServices({
        services,
        sessionManager: targetSessionManager,
        ...(options.worktreeCwdReader === undefined ? {} : {
          customTools: createSessionWorktreeTools(cwd, signal => options.worktreeCwdReader!(
            targetSessionManager.getSessionId(), targetSessionManager.getSessionFile()!,
            signal ?? options.signal ?? new AbortController().signal,
          ), options.worktreeCwdReader.settleShell === undefined ? undefined : signal => options.worktreeCwdReader!.settleShell!(
            targetSessionManager.getSessionId(), targetSessionManager.getSessionFile()!,
            signal ?? options.signal ?? new AbortController().signal,
          )).filter(tool => !services.resourceLoader.getExtensions().extensions.some(extension => extension.tools.has(tool.name))),
        }),
        ...(sessionStartEvent ? { sessionStartEvent } : {}),
        ...(modelScope.model && !hasExistingSession ? { model: modelScope.model } : {}),
        ...(modelScope.thinkingLevel && !hasExistingSession ? { thinkingLevel: modelScope.thinkingLevel } : {}),
        ...(modelScope.scopedModels.length > 0 ? { scopedModels: [...modelScope.scopedModels] } : {}),
      });
      try { await (options.markStartupPhase ?? defaultStartupPhaseMarker)("session-created"); }
      catch (error) { created.session.dispose(); throw error; }
      sessionWriters.activate(pendingWriter);
      return {
        ...created,
        services,
        diagnostics: [
          ...(trust.diagnostic === null ? [] : [{ type: "warning" as const, code: "project-trust", message: trust.diagnostic }]),
          ...modelScope.diagnostics,
        ],
      };
    } catch (error) {
      sessionWriters.abandon(pendingWriter);
      throw error;
    }
  };
  try {
    const runtime = await createAgentSessionRuntime(createRuntime, {
      cwd: sessionManager.getCwd(),
      agentDir: options.agentDir,
      sessionManager,
    });
    runtimeSessionWriters.set(runtime, sessionWriters);
    const dispose = runtime.dispose.bind(runtime);
    let disposal: Promise<void> | undefined;
    // Invariant: every public runtime consumer uses the writer-owning teardown, including the adapter.
    runtime.dispose = () => disposal ??= (async () => {
      try { await dispose(); }
      finally { sessionWriters.release(); runtimeSessionWriters.delete(runtime); }
    })();
    return runtime;
  } catch (error) {
    takeSelectedSessionWriter(sessionManager)?.release();
    sessionWriters.release();
    throw error;
  }
}

function defaultStartupPhaseMarker(phase: StartupPhase): Promise<void> {
  return markStartupPhase(process.env, phase);
}

/** Switch to an independent copy; an extension veto or failed switch must not leave a stray fork. */
export async function switchToRecoveredFork(
  runtime: AgentSessionRuntime,
  sourcePath: string,
  cwd: string,
  options?: Parameters<AgentSessionRuntime["switchSession"]>[1],
): Promise<{ readonly cancelled: boolean; readonly message: string }> {
  const source = resolveSessionArgumentPath(sourcePath, process.cwd());
  const fork = SessionManager.forkFrom(source, cwd, runtime.session.sessionManager.getSessionDir());
  const path = fork.getSessionFile();
  if (path === undefined) throw new Error("Fork did not create a session file");
  try {
    const result = await runtime.switchSession(path, options);
    if (result.cancelled) unlinkSync(path);
    return { cancelled: result.cancelled, message: `Forked into new session ${fork.getSessionId()} in ${cwd}` };
  } catch (error) {
    // Security: a replacement callback can throw after the fork became active; never delete that active file.
    if (runtime.session.sessionManager.getSessionFile() !== path) unlinkSync(path);
    throw error;
  }
}

export function bindPiRuntimeSession(runtime: AgentSessionRuntime, rebind: (session: AgentSession) => Promise<void>): () => void {
  runtime.setRebindSession(rebind);
  return () => runtime.setRebindSession(undefined);
}

export async function replacePiRuntimeSession(runtime: AgentSessionRuntime, replacement: PiSessionReplacement): Promise<{ readonly cancelled: boolean }> {
  return replacement.kind === "new"
    ? runtime.newSession()
    : runtime.switchSession(replacement.sessionPath);
}

export async function disposePiRuntimeIntegration(runtime: AgentSessionRuntime): Promise<void> {
  runtime.setRebindSession(undefined);
  runtime.setBeforeSessionInvalidate(undefined);
  try {
    await runtime.dispose();
  } finally {
    runtimeSessionWriters.get(runtime)?.release();
    runtimeSessionWriters.delete(runtime);
  }
}
