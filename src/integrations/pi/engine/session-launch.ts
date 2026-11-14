import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { RuntimeLaunchOptions } from "../../../foundation/launch-context/index.js";
import { acquireSessionWriter, SessionWriterConflict, type SessionWriterHandle } from "../../../foundation/session-writer-lock/index.js";
import { SessionManager, getAgentDir, type SessionInfo } from "../startup-public.js";
import { forkSelectedPiSession, openSelectedPiSession, PiSessionSelectionError, type PiSessionForkPrompt, type PiSessionSelection, resolvePiSessionDirectory } from "./session-selection.js";

export interface PiSessionPickerRequest {
  readonly sessions: readonly SessionInfo[];
}

/** The caller owns presentation; listing never opens a session or acquires its writer. */
export async function pickPiLaunchSession(options: {
  readonly cwd: string;
  readonly sessionDir?: string;
  readonly pick: (request: PiSessionPickerRequest) => Promise<string | null>;
  readonly hasUI?: boolean;
  readonly agentDir?: string;
  readonly runtimeOptions?: RuntimeLaunchOptions;
}): Promise<string> {
  if (options.hasUI === false) throw new PiSessionSelectionError("--resume requires an interactive terminal");
  const sessionDir = resolvePiSessionDirectory({ ...options, agentDir: options.agentDir ?? getAgentDir() });
  const local = await SessionManager.list(options.cwd, sessionDir);
  const all = await SessionManager.listAll(sessionDir);
  const sessions = [...new Map([...local, ...all].map(session => [session.path, session])).values()];
  const path = await options.pick({ sessions });
  if (path === null) throw new PiSessionSelectionError("No session selected", 0);
  if (!sessions.some(session => session.path === path)) throw new PiSessionSelectionError("Session picker returned an unknown session");
  return path;
}

export { resolvePiSessionDirectory } from "./session-selection.js";

/** CLI precedence over the existing guarded selector, with no alternate persistence service. */
export async function selectPiLaunchSession(options: {
  readonly cwd: string;
  readonly sessionDir?: string;
  readonly selection?: PiSessionSelection;
  readonly forkPrompt?: PiSessionForkPrompt;
  readonly runtimeOptions?: RuntimeLaunchOptions;
}): Promise<{ readonly manager: SessionManager; readonly releaseReservation: () => void }> {
  const invocation = options.runtimeOptions ?? {};
  const done = (manager: SessionManager, releaseReservation = (): void => {}) => ({ manager, releaseReservation });
  const id = invocation.sessionId;
  if (invocation.noSession) return done(SessionManager.inMemory(options.cwd, id === undefined ? undefined : { id }));
  if (options.selection !== undefined) {
    if (id || invocation.forkSession) throw new PiSessionSelectionError("--session cannot be combined with --fork or --session-id");
    return done(await openSelectedPiSession({ ...options, selection: options.selection, guardWriter: true }));
  }
  if (invocation.resumeSession) throw new PiSessionSelectionError("--resume requires an interactive session picker");
  if (invocation.continueSession) {
    const recent = (await SessionManager.list(options.cwd, options.sessionDir))[0];
    return recent === undefined ? done(SessionManager.create(options.cwd, options.sessionDir))
      : done(await openSelectedPiSession({ ...options, selection: { target: recent.path }, guardWriter: true }));
  }
  // Concurrency: a custom-ID lookup/create is serialized until the real guarded session header exists.
  // This reservation creates no synthetic session file and never replaces the real writer.
  const newManager = SessionManager.create(options.cwd, options.sessionDir, id === undefined ? undefined : { id });
  const directory = newManager.getSessionDir();
  if (id !== undefined) mkdirSync(directory, { recursive: true });
  let reservation: SessionWriterHandle | undefined;
  try {
    reservation = id === undefined ? undefined : acquireSessionWriter(resolve(directory, `.session-id-${id}`));
  } catch (error) {
    if (error instanceof SessionWriterConflict) throw new PiSessionSelectionError("Session ID is currently being selected by another A1 process");
    throw error;
  }
  try {
    const existing = id === undefined ? undefined : (await SessionManager.list(options.cwd, options.sessionDir)).find(session => session.id === id);
    if (invocation.forkSession) {
      if (existing !== undefined) throw new PiSessionSelectionError("A project session already exists with that ID");
      return done(await forkSelectedPiSession({ ...options, selection: { target: invocation.forkSession }, ...(id === undefined ? {} : { id }) }), () => reservation?.release());
    }
    const manager = existing === undefined ? newManager
      : await openSelectedPiSession({ ...options, selection: { target: existing.path }, guardWriter: true });
    return done(manager, () => reservation?.release());
  } catch (error) {
    reservation?.release();
    throw error;
  }
}
