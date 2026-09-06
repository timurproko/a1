import { accessSync, constants, existsSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { SessionManager, type SessionInfo } from "@earendil-works/pi-coding-agent";

// Invariant: the engine accepts a storage request, not launch/control infrastructure.
// Public argv validation remains at CLI, guardian, and UI entry boundaries.
export interface PiSessionSelection {
  readonly target: string;
  readonly sessionDir?: string;
}

export type PiSessionForkPrompt = (request: { readonly sourceCwd: string }) => Promise<boolean>;

/** Expected resume outcomes are concise CLI diagnostics, not engine crashes. */
export class PiSessionSelectionError extends Error {
  constructor(message: string, readonly exitCode = 1) {
    super(message);
    this.name = "PiSessionSelectionError";
  }
}

interface SessionSelectionOptions {
  readonly cwd: string;
  readonly selection: PiSessionSelection;
  readonly sessionDir?: string;
  readonly forkPrompt?: PiSessionForkPrompt;
  /** Public API seam for deterministic lookup/open race and listing-order evidence. */
  readonly sessions?: Pick<typeof SessionManager, "list" | "open" | "forkFrom"> & {
    readonly listAll: (sessionDir?: string) => Promise<SessionInfo[]>;
  };
}

/** Pinned Pi 0.84.2 main.ts policy, using SDK APIs rather than importing the CLI. */
export async function openSelectedPiSession(options: SessionSelectionOptions): Promise<SessionManager> {
  try {
    const sessions = options.sessions ?? SessionManager;
    const cwd = resolve(options.cwd);
    const directory = options.selection.sessionDir ?? options.sessionDir ?? process.env.PI_CODING_AGENT_SESSION_DIR;
    const sessionDir = directory === undefined ? undefined : resolveSessionArgumentPath(directory, cwd);
    const target = options.selection.target;
    let path: string;
    let global: SessionInfo | undefined;
    if (target.includes("/") || target.includes("\\") || target.endsWith(".jsonl")) {
      path = resolveSessionArgumentPath(target, cwd);
    } else {
      const local = matchSession(await sessions.list(cwd, sessionDir), target);
      const globalMatch = local ? undefined : matchSession(await sessions.listAll(sessionDir), target);
      // Compatibility: macOS may expose one temporary directory as /var to one process
      // and /private/var to another. Physical path identity must not turn that alias into
      // a cross-project fork prompt.
      global = globalMatch && !sameProjectDirectory(globalMatch.cwd, cwd) ? globalMatch : undefined;
      const matched = local ?? globalMatch;
      if (!matched) throw new PiSessionSelectionError(`No session found matching '${target}'`);
      path = matched.path;
    }
    assertResumeFile(path);
    if (global) {
      if (!options.forkPrompt || !await options.forkPrompt({ sourceCwd: global.cwd })) {
        throw new PiSessionSelectionError("Session resume cancelled.", 0);
      }
      assertResumeFile(path);
      assertCwd(cwd);
      return sessions.forkFrom(path, cwd, sessionDir);
    }
    // Invariant: no await between the final guard and SDK open. A disappeared target
    // can otherwise produce a new in-memory header instead of an existing session.
    const manager = sessions.open(path, sessionDir);
    assertResumeFile(path);
    assertCwd(manager.getCwd());
    return manager;
  } catch (error) {
    if (error instanceof PiSessionSelectionError) throw error;
    throw new PiSessionSelectionError(`Could not resume session: ${error instanceof Error ? error.message : String(error)}`);
  }
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

function assertResumeFile(path: string): void {
  if (!existsSync(path)) throw new PiSessionSelectionError(`Session file does not exist: ${path}`);
  const metadata = statSync(path);
  if (!metadata.isFile() || metadata.size === 0) throw new PiSessionSelectionError(`Session file is empty or not a regular file: ${path}`);
  accessSync(path, constants.R_OK);
}

function assertCwd(cwd: string): void {
  if (!existsSync(cwd) || !statSync(cwd).isDirectory()) throw new PiSessionSelectionError(`Session working directory does not exist: ${cwd}`);
}
