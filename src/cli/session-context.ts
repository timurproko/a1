import {
  updateSessionRepositoryContext,
  type SessionContextRequest,
} from "../features/launch/index.js";
import { PRODUCT_TEXT } from "../product-identity.js";

export type { SessionContextRequest } from "../features/launch/index.js";

export interface SessionContextCommandOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly stdout?: (message: string) => void;
  readonly stderr?: (message: string) => void;
}

/** Apply repository presentation context only when invoked by an active Pi session shell tool. */
export async function runSessionContextCommand(
  request: SessionContextRequest,
  options: SessionContextCommandOptions = {},
): Promise<number> {
  const environment = options.environment ?? process.env;
  const stdout = options.stdout ?? (message => process.stdout.write(message));
  const stderr = options.stderr ?? (message => process.stderr.write(message));
  const identity = readIdentity(environment);
  if (identity === null) {
    stderr(`${PRODUCT_TEXT.diagnostic("session context requires an active A1 shell-tool session.")}\n`);
    return 2;
  }
  try {
    const cwd = await updateSessionRepositoryContext(identity, request);
    stdout(cwd === null ? "Session worktree context cleared.\n" : `Session worktree context linked: ${cwd}\n`);
    return 0;
  } catch (error) {
    stderr(`${PRODUCT_TEXT.diagnostic(`could not update session context: ${error instanceof Error ? error.message : String(error)}`)}\n`);
    return 1;
  }
}

function readIdentity(environment: NodeJS.ProcessEnv): { readonly sessionId: string; readonly sessionFile: string } | null {
  const sessionId = environment.PI_SESSION_ID;
  const sessionFile = environment.PI_SESSION_FILE;
  if (!sessionId || !sessionFile) return null;
  return { sessionId, sessionFile };
}
