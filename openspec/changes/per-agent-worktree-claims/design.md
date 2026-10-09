## Context

Eighth preparatory change for multi-agent tabs. Independent of the UI sequence; it can land at any point after `multi-agent-prep-hygiene`. Evidence from `develop` at `337ad3e7`:

- `session-repository-context.ts` keeps three JSON record kinds (context, runtime, claim) under the data dir, guarded by a `wx`-created `mutation.lock` polled every two seconds (`:555-580`). The lock stores no owner identity; while it exists, `listSessionRepositoryWorktrees` reports every entry `unverifiable` (`:240-247`).
- `activateSessionRepositoryContext` ends with `releaseClaimsOwnedBy(runtimeId, selected.gitDir)` (`:140`, `:436`), so a runtime holds exactly one claim.
- `composition/owned-ui.ts:75` reads one `runtimeId` from the environment and `:114` keeps one `activeSessionIdentity`; the thirty-second refresh re-registers that one identity.
- `readSessionRepositoryContext` collapses every error to `null` (`:205-216`), and validation runs `git rev-parse` per read (`:470-490`).
- The `local-worktree-cleanup` capability already specifies "A dead holder's mutation lock is evicted only on proof" for its own lock; the same proof (pid plus start identity, verified through the native inspector) applies here.

## Goals / Non-Goals

**Goals:** N agents in one runtime hold N independent claims; a runtime's exit releases all of them; a crashed lock holder is evicted on proof; one session keeps today's behavior exactly.

**Non-Goals:** cross-runtime claim transfer; changing what a claim authorizes; the supervisor control store (claims remain file records under the data dir); the tabs UI.

## Decisions

### Composite key, versioned records

Claim and runtime records gain `agentId` and a `formatVersion: 2`. Readers accept version 1 by treating the record as `agentId: "primary"`; the first write by a version-2 writer rewrites it. `releaseClaimsOwnedBy(runtimeId, agentId, gitDir)` releases only the matching agent's prior claim; a new `releaseRuntimeClaims(runtimeId)` releases all agents and is what `releaseSessionRepositoryRuntime` calls.

### Composition keeps a map

`activeSessionIdentity` becomes `Map<agentId, { sessionId, sessionFile }>`; the refresh timer iterates it. The engine's `repositoryContextReader` callback receives the agent id from the session backend's identity port, which the `pi-engine-host` change makes unique per session.

### Lock owner and eviction

The lock file content becomes `{ pid, startIdentity, acquiredAt }`. On contention, the waiter inspects the owner through the injected `inspectProcess`; if the process is proven dead (pid absent or start identity mismatch) the lock is replaced atomically with `rename`, otherwise the waiter keeps polling up to the existing bound. Unverifiable owners are never evicted.

### Listing shows agents

`a1 session worktrees` rows gain an `agent` column; a worktree claimed by two agents of one runtime lists both. The footer repository context shows the active presenter's claim.

## Risks / Trade-offs

- Record migration must be atomic per file; readers of the old shape in an older running release only see `primary`, which is the single-session behavior.
- Eviction on proof adds an `inspectProcess` call to the contention path; it is already injected for runtime verification, so no new native dependency.
- The CLI presenter change is small but touches the `cli-session-resume` tests.

## Planned Evidence

`test/foundation/lifecycle` claim tests: two agents of one runtime hold two claims; activating agent B keeps agent A's claim; runtime release clears both; version-1 records read as `primary`; a dead-holder lock is evicted and a live-holder lock is not. CLI listing tests; composition refresh test with two identities; strict OpenSpec validation.
