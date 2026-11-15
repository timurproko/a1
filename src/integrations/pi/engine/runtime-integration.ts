import { unlinkSync } from "node:fs";
import { validateRuntimeLaunchOptions } from "../../../foundation/launch-context/index.js";
import { acquireSessionWriter } from "../../../foundation/session-writer-lock/index.js";
import { createAgentSessionRuntime, SessionManager, type AgentSession, type AgentSessionRuntime } from "../startup-public.js";
import { resolvePiSessionDirectory, resolveSessionArgumentPath } from "./project-trust-preflight.js";
import type { PiSessionSelection } from "./session-selection.js";
import { SessionWriterCoordinator, takeSelectedSessionWriter } from "./session-writers.js";
import type { PiRuntimeIntegrationOptions, PiSessionReplacement } from "./runtime-options.js";

/** Public service preparation stays lazy until a session actually needs project resources. */
export async function createPiRuntimeServicesAfterTrust(
  options: Parameters<typeof import("./runtime-services.js").createPiRuntimeServicesAfterTrust>[0],
): ReturnType<typeof import("./runtime-services.js").createPiRuntimeServicesAfterTrust> {
  return await (await import("./runtime-services.js")).createPiRuntimeServicesAfterTrust(options);
}
export type { PiRuntimeIntegrationOptions, PiRuntimePreflightDependencies, PiSessionReplacement, PiStartupPhaseMarker } from "./runtime-options.js";

const runtimeSessionWriters = new WeakMap<AgentSessionRuntime, SessionWriterCoordinator>();
const runtimeWorktreeTransitions = new WeakMap<AgentSessionRuntime, import("./worktree-transitions.js").PiWorktreeTransitions>();

export async function createPiRuntimeIntegration(options: PiRuntimeIntegrationOptions): Promise<AgentSessionRuntime> {
  if (options.runtimeOptions !== undefined) options = { ...options, runtimeOptions: validateRuntimeLaunchOptions(options.runtimeOptions) };
  const sessionDir = options.runtimeOptions?.noSession ? undefined : resolvePiSessionDirectory(options);
  const selection = options.sessionSelection ?? (options.sessionPath === undefined ? undefined : { target: resolveSessionArgumentPath(options.sessionPath, options.cwd) });
  const { manager: sessionManager, releaseReservation } = await createPiLaunchManager(options, sessionDir, selection);
  const sessionWriters = new SessionWriterCoordinator(acquireSessionWriter);
  let transitions: import("./worktree-transitions.js").PiWorktreeTransitions | undefined;
  try {
    if (options.worktreeCwdReader?.applyControl !== undefined) transitions = (await import("./worktree-transitions.js")).createPiWorktreeTransitions(options);
    const { createPiSessionFactory } = await import("./runtime-factory.js");
    const runtime = await createAgentSessionRuntime(createPiSessionFactory(options, sessionWriters, transitions), {
      cwd: sessionManager.getCwd(), agentDir: options.agentDir, sessionManager,
    });
    runtimeSessionWriters.set(runtime, sessionWriters);
    if (transitions !== undefined) runtimeWorktreeTransitions.set(runtime, transitions);
    const dispose = runtime.dispose.bind(runtime);
    let disposal: Promise<void> | undefined;
    // Invariant: every public runtime consumer uses the writer-owning teardown, including the adapter.
    runtime.dispose = () => disposal ??= (async () => {
      try { await dispose(); }
      finally {
        transitions?.dispose(); runtimeWorktreeTransitions.delete(runtime);
        sessionWriters.release(); runtimeSessionWriters.delete(runtime);
      }
    })();
    return runtime;
  } catch (error) {
    transitions?.dispose();
    takeSelectedSessionWriter(sessionManager)?.release();
    sessionWriters.release();
    throw error;
  } finally { releaseReservation(); }
}

async function createPiLaunchManager(options: PiRuntimeIntegrationOptions, sessionDir: string | undefined, selection: PiSessionSelection | undefined): Promise<{ manager: SessionManager; releaseReservation(): void }> {
  const request = {
    cwd: options.cwd,
    ...(selection === undefined ? {} : { selection }),
    ...(sessionDir === undefined ? {} : { sessionDir }),
    ...(options.runtimeOptions === undefined ? {} : { runtimeOptions: options.runtimeOptions }),
    ...(options.sessionForkPrompt === undefined ? {} : { forkPrompt: options.sessionForkPrompt }),
  };
  // Performance: default and existing explicit resumes do not load the optional selector/picker implementation.
  if (options.runtimeOptions !== undefined && ["continueSession", "resumeSession", "forkSession", "sessionId", "noSession"].some(key => key in options.runtimeOptions!)) {
    return await (await import("./session-launch.js")).selectPiLaunchSession(request);
  }
  const manager = selection === undefined ? SessionManager.create(options.cwd, sessionDir)
    : await (await import("./session-selection.js")).openSelectedPiSession({ ...request, selection, guardWriter: true });
  return { manager, releaseReservation() {} };
}

/** Switch to an independent copy; an extension veto or failed switch must not leave a stray fork. */
export async function switchToRecoveredFork(
  runtime: AgentSessionRuntime, sourcePath: string, cwd: string,
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
  return replacement.kind === "new" ? runtime.newSession() : runtime.switchSession(replacement.sessionPath);
}

/** Called by the idle host, never by the requesting tool's execution frame. */
export async function settlePiWorktreeTransition(runtime: AgentSessionRuntime, signal: AbortSignal): Promise<string | null> {
  return await runtimeWorktreeTransitions.get(runtime)?.settle(runtime, signal) ?? null;
}

export async function disposePiRuntimeIntegration(runtime: AgentSessionRuntime): Promise<void> {
  runtime.setRebindSession(undefined);
  runtime.setBeforeSessionInvalidate(undefined);
  try { await runtime.dispose(); }
  finally { runtimeSessionWriters.get(runtime)?.release(); runtimeSessionWriters.delete(runtime); }
}
