import {
  updateSessionRepositoryContext,
  type SessionContextRequest,
} from "../features/launch/index.js";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../product-identity.js";

export type { SessionContextRequest } from "../features/launch/index.js";

export interface SessionContextCommandOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly inspectProcess?: (pid: number) => Promise<{ readonly pid: number; readonly startIdentity: string } | null>;
  readonly stdout?: (message: string) => void;
  readonly stderr?: (message: string) => void;
}

/** Apply repository context only when invoked by an exact live A1 shell-tool runtime. */
export async function runSessionContextCommand(
  request: SessionContextRequest,
  options: SessionContextCommandOptions = {},
): Promise<number> {
  const environment = options.environment ?? process.env;
  const stdout = options.stdout ?? (message => process.stdout.write(message));
  const stderr = options.stderr ?? (message => process.stderr.write(message));
  const identity = readIdentity(environment);
  if (identity === null) {
    stderr(`${PRODUCT_TEXT.diagnostic("session context requires an active A1 shell-tool session runtime.")}\n`);
    return 2;
  }
  try {
    if (options.inspectProcess === undefined) throw Object.assign(
      new Error("native process identity inspection is unavailable"),
      { code: "process-inspection-unavailable" },
    );
    const outcome = await updateSessionRepositoryContext(
      { sessionId: identity.sessionId, sessionFile: identity.sessionFile },
      request,
      { runtimeId: identity.runtimeId, inspectProcess: options.inspectProcess },
    );
    if (outcome.kind === "unlinked") stdout("Session worktree context cleared.\n");
    if (outcome.kind === "linked") stdout(`Session worktree context linked: ${outcome.cwd}\n`);
    if (outcome.kind === "worktrees") {
      for (const entry of outcome.entries) stdout(`${entry.status}: ${entry.cwd} (${entry.branch})\n`);
    }
    return 0;
  } catch (error) {
    const code = errorCode(error);
    const detail = error instanceof Error ? error.message : String(error);
    stderr(`${PRODUCT_TEXT.diagnostic(`could not update session context${code === null ? "" : ` (${code})`}: ${detail}`)}\n`);
    return 1;
  }
}

function readIdentity(environment: NodeJS.ProcessEnv): {
  readonly sessionId: string;
  readonly sessionFile: string;
  readonly runtimeId: string;
} | null {
  const sessionId = environment.PI_SESSION_ID;
  const sessionFile = environment.PI_SESSION_FILE;
  const runtimeId = environment[PRODUCT_IDENTITY.environment.sessionRuntimeId];
  if (!sessionId || !sessionFile || !runtimeId) return null;
  return { sessionId, sessionFile, runtimeId };
}

function errorCode(error: unknown): string | null {
  if (error instanceof Error && "code" in error && typeof error.code === "string") return error.code;
  return null;
}
