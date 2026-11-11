import {
  PRIMARY_SESSION_AGENT_ID,
  updateSessionRepositoryContext,
  type SessionContextRequest,
} from "../features/launch/index.js";
import { inspectLiveProcess } from "../foundation/lifecycle/index.js";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../product-identity.js";

export type { SessionContextRequest } from "../features/launch/index.js";

interface SessionContextCommandOptions {
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
    const outcome = await updateSessionRepositoryContext(
      { sessionId: identity.sessionId, sessionFile: identity.sessionFile },
      request,
      { runtimeId: identity.runtimeId, inspectProcess: options.inspectProcess ?? inspectLiveProcess },
    );
    if (outcome.kind === "unlinked") stdout("Session worktree context cleared.\n");
    if (outcome.kind === "linked") stdout(`Session worktree context linked: ${outcome.cwd} (${outcome.branch})\n`);
    if (outcome.kind === "worktrees") {
      for (const entry of outcome.entries) {
        // Compatibility: the primary agent is the only agent of a single-session runtime, so it stays unnamed.
        const agent = entry.agentId === null || entry.agentId === PRIMARY_SESSION_AGENT_ID ? "" : ` [agent ${entry.agentId}]`;
        stdout(`${entry.status}: ${entry.cwd} (${entry.branch})${agent}\n`);
      }
    }
    return 0;
  } catch (error) {
    const code = errorCode(error);
    const detail = recoveryDetail(code) ?? (error instanceof Error ? error.message : String(error));
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

/** Known coordination failures must not expose internal paths or another session's identity. */
function recoveryDetail(code: string | null): string | undefined {
  const details: Readonly<Record<string, string>> = {
    "worktree-claim-busy": "coordination did not settle within the operation budget; no ownership was changed; retry this link shortly if the system remains busy",
    "worktree-legacy-recovery-required": "an older-format worktree lock requires safe recovery; stop all older A1 processes, move only session-worktree-claims/mutation.lock to a backup while stopped, then start the updated A1; keep all sessions and worktree claims",
    "worktree-coordination-unavailable": "worktree coordination is unavailable; repair or update this A1 installation, then retry",
    "worktree-coordination-io": "worktree coordination could not access its files; check A1 data-directory permissions and filesystem availability, then retry",
    "worktree-coordination-boundary": "unexpected worktree coordination entry; retain it for inspection, and do not delete the claim store",
    "session-runtime-unverifiable": "runtime identity could not be verified; retry; no ownership was overridden",
    "session-runtime-unavailable": "this session has not registered yet; updated A1 retries registration automatically; retry shortly and follow any specific coordination error if it persists",
    "session-runtime-stopped": "this shell belongs to a stopped runtime; resume in a running A1 session before linking",
    "worktree-active-in-another-session": "another live agent owns this worktree; use a different worktree or wait for its owner to release it",
    "worktree-owner-unverifiable": "worktree ownership cannot be verified; retain the claim and use another worktree rather than forcing recovery",
    "worktree-primary-checkout": "attach a task worktree, not the primary checkout; use worktree enter to create one",
    "worktree-git-locked": "Git has locked this worktree; retain it and ask its owner to release the lock",
    "worktree-foreign-repository": "the selected worktree belongs to a different repository; the previous attachment was preserved",
    "worktree-context-changed": "the attachment changed during the operation; no ownership was overridden",
  };
  return code === null ? undefined : details[code];
}

function errorCode(error: unknown): string | null {
  if (error instanceof Error && "code" in error && typeof error.code === "string") return error.code;
  return null;
}
