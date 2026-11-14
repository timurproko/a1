import { accessSync, constants, existsSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { RuntimeLaunchOptions } from "../../../foundation/launch-context/index.js";
import { SessionManager, SettingsManager, ProjectTrustStore, type SessionInfo } from "../startup-public.js";
import {
  acquireExisting,
  acquireSessionWriter,
  SessionWriterConflict,
  type SessionWriterHandle,
} from "../../../foundation/session-writer-lock/index.js";

// Invariant: the engine accepts a storage request, not launch/control infrastructure.
// Public argv validation remains at the CLI and UI entry boundaries.
export interface PiSessionSelection {
  readonly target: string;
  readonly sessionDir?: string;
}

export type PiSessionForkPrompt = (request: { readonly sourceCwd: string; readonly fallbackCwd?: string }) => Promise<boolean | "continue" | "fork" | "cancel">;

/** Expected resume outcomes are concise CLI diagnostics, not engine crashes. */
export class PiSessionSelectionError extends Error {
  readonly exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
    this.name = "PiSessionSelectionError";
  }
}

interface SessionSelectionOptions {
  readonly cwd: string;
  readonly selection: PiSessionSelection;
  readonly sessionDir?: string;
  readonly forkPrompt?: PiSessionForkPrompt;
  readonly guardWriter?: boolean;
  /** Public API seam for deterministic lookup/open race and listing-order evidence. */
  readonly sessions?: Pick<typeof SessionManager, "list" | "open" | "forkFrom"> & {
    readonly listAll: (sessionDir?: string) => Promise<SessionInfo[]>;
  };
}

const selectedSessionWriters = new WeakMap<SessionManager, SessionWriterHandle>();

export function takeSelectedSessionWriter(manager: SessionManager): SessionWriterHandle | undefined {
  const writer = selectedSessionWriters.get(manager);
  selectedSessionWriters.delete(manager);
  return writer;
}

function holdSelectedWriter(manager: SessionManager, writer: SessionWriterHandle): SessionManager {
  selectedSessionWriters.set(manager, writer);
  return manager;
}

/** A1 CLI selection policy over pinned SDK APIs, including missing-folder recovery. */
export async function openSelectedPiSession(options: SessionSelectionOptions): Promise<SessionManager> {
  const sessions = options.sessions ?? SessionManager;
  const cwd = resolve(options.cwd);
  const directory = options.selection.sessionDir ?? options.sessionDir ?? process.env.PI_CODING_AGENT_SESSION_DIR;
  const sessionDir = directory === undefined ? undefined : resolveSessionArgumentPath(directory, cwd);
  try {
    const { path, global } = await resolveSelectedTarget(options, cwd, sessionDir);
    assertResumeFile(path);
    if (global && existsSync(global.cwd)) {
      const choice = await options.forkPrompt?.({ sourceCwd: global.cwd });
      if (choice !== true && choice !== "fork") {
        throw new PiSessionSelectionError("Session resume cancelled.", 0);
      }
      assertResumeFile(path);
      assertCwd(cwd);
      const manager = sessions.forkFrom(path, cwd, sessionDir);
      if (!options.guardWriter) return manager;
      const target = manager.getSessionFile();
      if (target === undefined) throw new PiSessionSelectionError("Fork did not create a session file");
      return holdSelectedWriter(manager, acquireSessionWriter(target));
    }
    // Invariant: no await between the final guard and SDK open. A disappeared target
    // can otherwise produce a new in-memory header instead of an existing session.
    const writer = options.guardWriter ? acquireExisting(path) : undefined;
    try {
      let manager = sessions.open(path, sessionDir);
      assertResumeFile(path);
      if (!existsSync(manager.getCwd()) && options.forkPrompt !== undefined) {
        const choice = await options.forkPrompt({ sourceCwd: manager.getCwd(), fallbackCwd: cwd });
        if (choice !== "continue" && choice !== "fork" && choice !== true) throw new PiSessionSelectionError("Session resume cancelled.", 0);
        assertResumeFile(path);
        assertCwd(cwd);
        if (choice === "fork" || choice === true) {
          const fork = sessions.forkFrom(path, cwd, sessionDir);
          writer?.release();
          if (!options.guardWriter) return fork;
          const target = fork.getSessionFile();
          if (target === undefined) throw new PiSessionSelectionError("Fork did not create a session file");
          return holdSelectedWriter(fork, acquireSessionWriter(target));
        }
        manager = sessions.open(path, sessionDir, cwd);
      }
      assertCwd(manager.getCwd());
      return writer === undefined ? manager : holdSelectedWriter(manager, writer);
    } catch (error) {
      writer?.release();
      throw error;
    }
  } catch (error) {
    if (error instanceof PiSessionSelectionError) throw error;
    if (error instanceof SessionWriterConflict) {
      const choice = await options.forkPrompt?.({ sourceCwd: cwd });
      if (choice === true || choice === "fork") {
        const manager = sessions.forkFrom(error.path, cwd, sessionDir);
        if (!options.guardWriter) return manager;
        const target = manager.getSessionFile();
        if (target === undefined) throw new PiSessionSelectionError("Fork did not create a session file");
        return holdSelectedWriter(manager, acquireSessionWriter(target));
      }
      throw new PiSessionSelectionError("session is open in another A1 process");
    }
    throw new PiSessionSelectionError(`Could not resume session: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Explicit fork reads its source without taking or changing the source writer. */
export async function forkSelectedPiSession(options: SessionSelectionOptions & { readonly id?: string }): Promise<SessionManager> {
  try {
    const { path } = await resolveSelectedTarget(options, options.cwd, options.sessionDir);
    assertResumeFile(path);
    assertCwd(options.cwd);
    const manager = (options.sessions ?? SessionManager).forkFrom(path, options.cwd, options.sessionDir, options.id === undefined ? undefined : { id: options.id });
    const target = manager.getSessionFile();
    if (target === undefined) throw new PiSessionSelectionError("Fork did not create a session file");
    return holdSelectedWriter(manager, acquireSessionWriter(target));
  } catch (error) {
    if (error instanceof PiSessionSelectionError) throw error;
    throw new PiSessionSelectionError(`Could not fork session: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function resolveSelectedTarget(options: SessionSelectionOptions, cwd: string, sessionDir?: string): Promise<{ path: string; global?: SessionInfo }> {
  const target = options.selection.target;
  if (target.includes("/") || target.includes("\\") || target.endsWith(".jsonl")) return { path: resolveSessionArgumentPath(target, cwd) };
  const sessions = options.sessions ?? SessionManager;
  const local = matchSession(await sessions.list(cwd, sessionDir), target);
  const globalMatch = local ? undefined : matchSession(await sessions.listAll(sessionDir), target);
  const matched = local ?? globalMatch;
  if (!matched) throw new PiSessionSelectionError(`No session found matching '${target}'`);
  // Compatibility: physical cwd aliases must not manufacture cross-project forks.
  return { path: matched.path, ...(globalMatch && !sameProjectDirectory(globalMatch.cwd, cwd) ? { global: globalMatch } : {}) };
}

function sameProjectDirectory(left: string, right: string): boolean {
  try {
    const first = realpathSync.native(resolve(left));
    const second = realpathSync.native(resolve(right));
    return process.platform === "win32" ? first.toLowerCase() === second.toLowerCase() : first === second;
  } catch {
    return resolve(left) === resolve(right);
  }
}

function matchSession(sessions: readonly SessionInfo[], target: string): SessionInfo | undefined {
  return sessions.find(session => session.id === target) ?? sessions.find(session => session.id.startsWith(target));
}

/** Resolve before switching effective cwd, including quoted home-relative paths. */
export function resolveSessionArgumentPath(path: string, cwd: string): string {
  const expanded = path === "~" ? homedir() : /^~[/\\]/.test(path) ? resolve(homedir(), path.slice(2)) : path;
  return resolve(cwd, expanded);
}

/** CLI, environment, trusted settings, then SDK storage. Lookup never executes project resources. */
export function resolvePiSessionDirectory(options: {
  readonly cwd: string;
  readonly agentDir: string;
  readonly sessionDir?: string;
  readonly runtimeOptions?: RuntimeLaunchOptions;
}): string | undefined {
  const explicit = options.sessionDir ?? options.runtimeOptions?.sessionDir ?? process.env.PI_CODING_AGENT_SESSION_DIR;
  if (explicit !== undefined) return resolveSessionArgumentPath(explicit, options.cwd);
  const global = SettingsManager.create(options.cwd, options.agentDir, { projectTrusted: false });
  const trusted = options.runtimeOptions?.projectTrust ?? new ProjectTrustStore(options.agentDir).get(options.cwd) ?? (global.getDefaultProjectTrust() === "always");
  const directory = trusted ? SettingsManager.create(options.cwd, options.agentDir, { projectTrusted: true }).getSessionDir() : global.getSessionDir();
  return directory === undefined ? undefined : resolveSessionArgumentPath(directory, options.cwd);
}

function assertResumeFile(path: string): void {
  if (!existsSync(path)) throw new PiSessionSelectionError(`Session file does not exist: ${path}`);
  const metadata = statSync(path);
  if (!metadata.isFile() || metadata.size === 0) throw new PiSessionSelectionError(`Session file is empty or not a regular file: ${path}`);
  accessSync(path, constants.R_OK);
}

function assertCwd(cwd: string): void {
  if (!existsSync(cwd) || !statSync(cwd).isDirectory()) throw new PiSessionSelectionError(`Session working directory does not exist: ${cwd}`);
}
