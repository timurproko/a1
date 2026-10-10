## Context

See `proposal.md` for motivation. The cleanup store currently uses `mutation.lock` around an in-memory `state.json` snapshot and keeps that lock through GitHub evidence calls, full worktree traversal, Windows retry delays, Git mutation, branch pruning, report writing, and cursor updates. This makes whole-state writes safe, but it also turns one candidate's slowest operation into a repository-wide exclusion window.

The replacement must preserve three independent invariants: state updates cannot be lost, ownership and cleanup cannot overlap for the same worktree, and destructive Git/filesystem operations must still revalidate every resource they mutate. It must also coexist safely with an already-running cleanup process from the previous implementation.

## Goals / Non-Goals

**Goals:**

- Let separate processes clean disjoint worktrees and topic refs at the same time, including when one candidate is delayed by remote evidence, content inspection, or Windows file-lock retries.
- Keep exact-candidate ownership, journal transitions, branch deletion, and path-reuse defenses mutually exclusive.
- Make shared-state and unavoidable shared-Git coordination brief, atomic, bounded, and safe across process interruption.
- Preserve existing state schema and resumable journals where possible.

**Non-Goals:**

- Run candidates inside one sweep in an unbounded worker pool; concurrency comes from independently invoked cleanup operations and may be extended later behind the same resource protocol.
- Weaken cleanup evidence, cleanliness, disposable-content, confirmation, or remote-ref requirements.
- Make two operations against the same worktree or topic ref proceed concurrently.
- Hide a real same-resource conflict or wait indefinitely for any lock.

## Decisions

### Keep the existing repository lock only for short state transactions

`mutation.lock` remains the compatibility lock for reading, validating, and atomically replacing `state.json`. New code will not hold it across remote requests, worktree inspection, retry sleeps, Git worktree removal, ref mutation, or report retention. State-lock acquisition will use a short bounded retry so ordinary millisecond-scale transaction overlap does not become a user-visible failure.

Retaining the existing lock path makes deployment fail closed with an older `watch`, `sweep`, or exact command that is already running: the older process still excludes new state transactions until it exits. Renaming or immediately ignoring the old lock was rejected because old and new processes could then mutate the same journal under different protocols.

### Lease exact resources for the full candidate operation

Long-running mutual exclusion will use heartbeat-backed resource locks keyed by canonical identity rather than one repository lock. Every candidate operation leases its canonical worktree path; any operation that may mutate a local or remote topic ref also leases that full ref name before mutation. Shared Git resources, such as the remote-tracking `develop` ref updated by fetch, are leased only for the brief command that changes them. Multiple resources are acquired in deterministic key order and released in reverse order.

Ownership commands, hand-off, exact cleanup, sweep reconciliation, redundant retirement, empty-directory removal, and branch pruning will all use the same path/ref key derivation. Therefore the same candidate or ref remains exclusive, while unrelated candidates do not share a long-lived lock. Relying only on Git lockfiles was rejected because they do not protect filesystem purge, cleanup ownership, or journal transitions.

### Re-read state for every journal transition

A long-running operation will carry immutable candidate identity and expected state/generation/step values, not a mutable whole-state snapshot. Each journal transition enters a short state transaction, re-finds the entry by ID and path, verifies the expected identity and transition, applies only that candidate's update, and atomically saves the fresh state. Cursor and enablement changes follow the same read-modify-write rule.

This avoids lost updates when two disjoint candidates advance simultaneously. The path lease prevents claim, release, hand-off, and cleanup from racing for one candidate; the state transaction protects global schema, duplicate path/ref constraints, relocation, cursor, and enablement. Keeping the old pattern of saving a stale in-memory state after releasing the repository lock was rejected because it could erase another worker's transition.

### Make sweep candidate-scoped instead of pass-scoped

A mutating sweep will take a short state snapshot of eligible registration IDs, then evaluate each registration under that candidate's resource lease. If another process owns one candidate lease, sweep reports that row as deferred and continues with later candidates. Coverage and the round-robin cursor are committed through short state transactions. Completed-history verification, unmanaged empty-directory handling, and merged-branch pruning similarly lease only the path or ref they may mutate.

A single sweep remains bounded and sequential internally. This keeps remote budgets and deterministic reporting simple while still allowing another sweep or exact command to make progress on disjoint candidates.

### Revalidate shared and candidate resources at destructive boundaries

Scoped locking does not replace existing revalidation. Immediately before purge, remote deletion, worktree removal, or ref deletion, cleanup will re-read repository identity, candidate state, worktree identity/content, evidence, and the exact ref as applicable. Shared fetches and ref updates receive brief exact-ref coordination, while compare-and-delete remains the final authority.

Git operations that touch distinct worktree administrative directories and refs may overlap. An operation encountering an unavoidable shared Git lock will retry only within its existing deadline and otherwise report a named deferred result without broadening deletion authority.

### Apply the existing heartbeat and proof-based eviction protocol to every durable lock

Resource-lock records will carry process ID, nonce, start time, heartbeat, and a non-secret resource key. A stale lock is evicted only after the existing silence threshold and proof that its process no longer exists; eviction remains audit-journaled and changes no registration or cleanup step. A live same-resource holder produces a scoped deferred reason, while unrelated resource holders are irrelevant.

The legacy `mutation-busy` interpretation remains meaningful only while an old process or an unexpectedly prolonged state transaction owns `mutation.lock`. Normal long candidate work reports candidate/ref scope rather than claiming the whole repository is busy.

### Prove process overlap with deterministic barriers

Focused fixtures will run independent stores/operations with controllable barriers around evidence, purge, state save, and Git mutation. They will prove that one candidate can remain paused while another reaches completion, that same-path and same-ref operations defer, that concurrent journal updates are both retained, and that killed scoped holders follow proof-based eviction. Windows locked-residue coverage will verify that retrying one path does not stall another path.

Timing-only assertions were rejected because scheduler variance would make the concurrency contract flaky and could miss lost-update races.

## Risks / Trade-offs

- **[Risk] Two workers overwrite each other's state transitions** → Re-read and validate fresh state inside every short transaction; never save a detached whole-state snapshot.
- **[Risk] Path and ref lock acquisition deadlocks** → Derive canonical resource keys and acquire every multi-resource set in deterministic sorted order with bounded acquisition.
- **[Risk] A branch pruner races a worktree cleanup for the same ref** → Require both paths to lease the same full-ref resource and retain immediate compare-and-delete validation.
- **[Risk] Concurrent fetches collide on `origin/develop`** → Lease that exact remote-tracking ref only around fetch or boundedly retry its Git lock; do not serialize the surrounding evidence work.
- **[Risk] A new process overlaps an old globally locked worker during rollout** → Continue honoring `mutation.lock`; the old worker may temporarily preserve repository-wide blocking until it exits, after which new operations use short transactions.
- **[Risk] More interleavings complicate reports and cursor fairness** → Use candidate-local rows, atomic cursor updates, unique report files, ENOENT-tolerant retention, and deterministic barrier fixtures.
- **[Trade-off] Same-candidate commands still defer** → Required to preserve ownership and exactly-once journal semantics; the improvement intentionally applies only to disjoint resources.

## Migration Plan

1. Refactor the state store to expose bounded short transactions and heartbeat-backed scoped resource leases while retaining the current state schema and `mutation.lock` compatibility.
2. Convert ownership, hand-off, complete, discard, redundant retirement, and reconciliation to candidate-local snapshots plus atomic transitions.
3. Scope sweep, empty-directory removal, shared fetches, and branch pruning to exact path/ref resources and update reporting/documentation.
4. Add deterministic cross-process overlap, same-resource exclusion, stale-lock, interruption, cursor, and Windows lock fixtures.
5. Roll back by restoring repository-wide locking; existing state entries and journal steps remain readable because no schema or step meaning changes. Any scoped lock files are non-authoritative and become removable only through the same stale-holder proof.
