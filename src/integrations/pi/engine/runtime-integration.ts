import { unlinkSync } from "node:fs";
import { validateRuntimeLaunchOptions, type RuntimeLaunchOptions } from "../../../foundation/launch-context/index.js";
import {
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  SessionManager,
  SettingsManager,
  type AgentSession,
  type AgentSessionRuntime,
  type AgentSessionServices,
  type CreateAgentSessionRuntimeFactory,
} from "../startup-public.js";
import {
  resolvePiProjectTrustPreflight,
  resolvePiSessionDirectory,
  resolveSessionArgumentPath,
  type PiProjectTrustPreflightPrompt,
  type PiProjectTrustUi,
} from "./project-trust-preflight.js";
import type { PiSessionForkPrompt, PiSessionSelection } from "./session-selection.js";
import { SessionWriterCoordinator, takeSelectedSessionWriter } from "./session-writers.js";
import { markStartupPhase, type StartupPhase } from "../../../foundation/startup/startup-runtime.js";
import { createWindowsNulCleanupExtension } from "./windows-filesystem-hygiene.js";
import type { PiWorktreeCwdReader } from "./worktree-tools.js";
import { acquireSessionWriter } from "../../../foundation/session-writer-lock/index.js";

export interface PiRuntimeIntegrationOptions {
  readonly cwd: string;
  readonly runtimeOptions?: RuntimeLaunchOptions;
  /** Only the bare claim-owning product supplies this; comparison tools keep their ordinary cwd. */
  readonly worktreeCwdReader?: PiWorktreeCwdReader;
  readonly agentDir: string;
  readonly sessionDir?: string;
  readonly sessionPath?: string;
  readonly sessionSelection?: PiSessionSelection;
  readonly sessionForkPrompt?: PiSessionForkPrompt;
  readonly projectTrustPrompt?: PiProjectTrustPreflightPrompt;
  readonly projectTrustUi?: PiProjectTrustUi;
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

const runtimeSessionWriters = new WeakMap<AgentSessionRuntime, SessionWriterCoordinator>();

export async function createPiRuntimeServicesAfterTrust(
  options: Pick<PiRuntimeIntegrationOptions, "agentDir" | "projectTrustPrompt" | "projectTrustUi" | "preflightDependencies" | "markStartupPhase" | "runtimeOptions"> & { readonly cwd: string },
): Promise<{
  readonly services: AgentSessionServices;
  readonly trust: Awaited<ReturnType<typeof resolvePiProjectTrustPreflight>>;
}> {
  const resolveTrust = options.preflightDependencies?.resolveTrust ?? resolvePiProjectTrustPreflight;
  const createSettingsManager = options.preflightDependencies?.createSettingsManager
    ?? ((targetCwd: string, agentDir: string, projectTrusted: boolean) => SettingsManager.create(targetCwd, agentDir, { projectTrusted }));
  const createServices = options.preflightDependencies?.createServices ?? createAgentSessionServices;
  const markPhase = options.markStartupPhase ?? defaultStartupPhaseMarker;
  let trust: Awaited<ReturnType<typeof resolveTrust>> | undefined;
  const settingsManager = createSettingsManager(options.cwd, options.agentDir, false);
  await markPhase("settings-loaded");
  const cleanupExtension = createWindowsNulCleanupExtension();
  const services = await createServices({
    cwd: options.cwd,
    agentDir: options.agentDir,
    settingsManager,
    resourceLoaderReloadOptions: {
      resolveProjectTrust: async ({ extensionsResult }) => {
        trust = await resolveTrust({
          cwd: options.cwd, agentDir: options.agentDir, extensionsResult,
          ...(options.projectTrustPrompt === undefined ? {} : { prompt: options.projectTrustPrompt }),
          ...(options.projectTrustUi === undefined ? {} : { trustUi: options.projectTrustUi }),
          ...(options.runtimeOptions?.projectTrust === undefined ? {} : { trustOverride: options.runtimeOptions.projectTrust }),
        });
        return trust.trusted;
      },
    },
    ...(options.runtimeOptions?.extensionFlagValues === undefined ? {} : { extensionFlagValues: new Map(options.runtimeOptions.extensionFlagValues) }),
    resourceLoaderOptions: {
      ...(options.runtimeOptions?.extensionPaths === undefined ? {} : { additionalExtensionPaths: [...options.runtimeOptions.extensionPaths] }),
      ...(cleanupExtension === null ? {} : { extensionFactories: [cleanupExtension] }),
    },
  });
  await markPhase("pi-services");
  await markPhase("resource-discovery");
  if (trust === undefined) throw new Error("Resource services did not resolve project trust");
  return { services, trust };
}

export async function createPiRuntimeIntegration(options: PiRuntimeIntegrationOptions): Promise<AgentSessionRuntime> {
  if (options.runtimeOptions !== undefined) options = { ...options, runtimeOptions: validateRuntimeLaunchOptions(options.runtimeOptions) };
  const sessionDir = options.runtimeOptions?.noSession ? undefined : resolvePiSessionDirectory(options);
  const selection = options.sessionSelection ?? (options.sessionPath === undefined ? undefined : { target: resolveSessionArgumentPath(options.sessionPath, options.cwd) });
  const { manager: sessionManager, releaseReservation } = await createPiLaunchManager(options, sessionDir, selection);
  const sessionWriters = new SessionWriterCoordinator(acquireSessionWriter);
  let initialInvocation = true;
  let invocationKeyProvider: string | undefined;
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
        ...(options.runtimeOptions === undefined ? {} : { runtimeOptions: options.runtimeOptions }),
        ...(options.projectTrustPrompt === undefined ? {} : { projectTrustPrompt: options.projectTrustPrompt }),
        ...(options.projectTrustUi === undefined ? {} : { projectTrustUi: options.projectTrustUi }),
        ...(options.preflightDependencies === undefined ? {} : { preflightDependencies: options.preflightDependencies }),
        ...(options.markStartupPhase === undefined ? {} : { markStartupPhase: options.markStartupPhase }),
      });
      const launch = options.runtimeOptions === undefined && !services.settingsManager.getEnabledModels()?.length ? undefined : await import("./launch-options.js");
      if (options.runtimeOptions !== undefined) launch!.assertPiInvocationResources(services, options.runtimeOptions);
      // Explicit credentials must be available before scope resolution. Reapply keys
      // only to their original provider; later UI model/effort choices remain intact.
      const explicitInvocation = options.runtimeOptions === undefined || (options.runtimeOptions.model === undefined && invocationKeyProvider === undefined) ? undefined
        : await launch!.resolvePiInvocationModel(services, options.runtimeOptions, undefined, invocationKeyProvider, initialInvocation);
      const modelScope = launch === undefined ? { scopedModels: [], model: undefined, thinkingLevel: undefined, diagnostics: [] }
        : await launch.resolveConfiguredModelScope(services, options.signal, options.runtimeOptions?.modelPatterns);
      const invocation = explicitInvocation ?? (options.runtimeOptions === undefined ? undefined
        : await launch!.resolvePiInvocationModel(services, options.runtimeOptions, modelScope.model, invocationKeyProvider, initialInvocation));
      invocationKeyProvider = invocation?.keyProvider;
      const hasExistingSession = targetSessionManager.buildSessionContext().messages.length > 0;
      const worktree = options.worktreeCwdReader === undefined ? undefined : await import("./worktree-tools.js");
      const created = await createAgentSessionFromServices({
        services,
        sessionManager: targetSessionManager,
        ...(options.worktreeCwdReader === undefined ? {} : {
          // Performance: comparison and non-claiming runtimes do not load attachment/recovery definitions.
          customTools: worktree!.createSessionWorktreeTools(...worktree!.runtimeWorktreeToolArguments(services, targetSessionManager, options.worktreeCwdReader, options.signal))
            .filter(tool => !services.resourceLoader.getExtensions().extensions.some(extension => extension.tools.has(tool.name))),
        }),
        ...(sessionStartEvent ? { sessionStartEvent } : {}),
        ...(modelScope.model && !hasExistingSession ? { model: modelScope.model } : {}),
        ...(modelScope.thinkingLevel && !hasExistingSession ? { thinkingLevel: modelScope.thinkingLevel } : {}),
        ...(modelScope.scopedModels.length > 0 ? { scopedModels: [...modelScope.scopedModels] } : {}),
        ...(invocation?.model === undefined ? {} : { model: invocation.model }),
        ...(invocation?.thinkingLevel === undefined ? {} : { thinkingLevel: invocation.thinkingLevel }),
        ...(options.runtimeOptions?.excludeTools === undefined ? {} : { excludeTools: [...options.runtimeOptions.excludeTools] }),
      });
      try {
        if (initialInvocation && options.runtimeOptions?.sessionName !== undefined) created.session.setSessionName(options.runtimeOptions.sessionName);
        await (options.markStartupPhase ?? defaultStartupPhaseMarker)("session-created");
      }
      catch (error) { created.session.dispose(); throw error; }
      sessionWriters.activate(pendingWriter);
      initialInvocation = false;
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
  } finally {
    releaseReservation();
  }
}

async function createPiLaunchManager(options: PiRuntimeIntegrationOptions, sessionDir: string | undefined, selection: PiSessionSelection | undefined): Promise<{ manager: SessionManager; releaseReservation(): void }> {
  const request = {
    cwd: options.cwd,
    ...(selection === undefined ? {} : { selection }),
    ...(sessionDir === undefined ? {} : { sessionDir }),
    ...(options.runtimeOptions === undefined ? {} : { runtimeOptions: options.runtimeOptions }),
    ...(options.sessionForkPrompt === undefined ? {} : { forkPrompt: options.sessionForkPrompt }),
  };
  // Default and existing explicit resumes do not load the optional selector/picker implementation.
  if (options.runtimeOptions !== undefined && ["continueSession", "resumeSession", "forkSession", "sessionId", "noSession"].some(key => key in options.runtimeOptions!)) {
    return await (await import("./session-launch.js")).selectPiLaunchSession(request);
  }
  const manager = selection === undefined ? SessionManager.create(options.cwd, sessionDir)
    : await (await import("./session-selection.js")).openSelectedPiSession({ ...request, selection, guardWriter: true });
  return { manager, releaseReservation() {} };
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
