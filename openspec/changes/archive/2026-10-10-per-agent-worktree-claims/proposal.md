## Why

A session's cooperative worktree claim is keyed by the runtime id, which is one environment value per UI process, and activating a repository context ends by releasing every other claim that runtime holds. With one session that is correct. With several agent sessions in one process, agent B linking a worktree silently drops agent A's claim, and composition's single mutable active-session identity cannot represent both. The mutation lock that guards claim records also has no owner-liveness check, so a crashed holder makes every later mutation time out.

## What Changes

- Key claims and runtime records by `(runtimeId, agentId)`; existing records migrate with `agentId: "primary"`.
- Make `activateSessionRepositoryContext` release only the prior claim of the same agent, and make `releaseSessionRepositoryRuntime` release every agent of the runtime at process exit.
- Replace the single `activeSessionIdentity` in composition with a per-agent map and expose the agent id through the repository context reader.
- Record owner process identity in the mutation lock and evict it only on proven holder death, reusing the proof already specified for local worktree cleanup.
- Show the agent dimension in `a1 session worktrees` output and in the footer repository context.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None at the requirement level: the existing claim semantics (cooperative, live-session, exact-worktree, release on clean unlink) keep their meaning, applied per agent rather than per process. The spec delta is deferred to the tabs feature that introduces agent identity to users.

## Impact

No user-visible change for one session. Touches `src/foundation/lifecycle/session-repository-context.ts`, `src/composition/owned-ui.ts`, the CLI `session worktrees` presenter, `scripts/governance/local-worktree-cleanup.mjs` lock handling if shared, and `test/foundation/lifecycle`. The record format version is bumped and migrated in place.
