import lockfile from "proper-lockfile";

export interface ClaimGateHandle { release(): void }

/** A stalled mutation loses the gate after this bound instead of holding it until the process ends. */
const CLAIM_GATE_STALE_MS = 10_000;

/**
 * Try once to hold the worktree mutation gate. The gate is a lock directory beside the authority
 * file; contention returns null so the caller keeps its own bounded retry.
 */
export function tryAcquireClaimGate(path: string): ClaimGateHandle | null {
  let release: () => void;
  try {
    release = lockfile.lockSync(path, {
      realpath: false,
      lockfilePath: `${path}.gate`,
      stale: CLAIM_GATE_STALE_MS,
      onCompromised: () => {},
    });
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ELOCKED") return null;
    throw Object.assign(new Error("cannot access the worktree mutation gate; check A1 data-directory permissions and filesystem availability", { cause }), {
      code: "worktree-coordination-io",
    });
  }
  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      try { release(); } catch { /* Compatibility: a reclaimed stale gate is already gone. */ }
    },
  };
}
