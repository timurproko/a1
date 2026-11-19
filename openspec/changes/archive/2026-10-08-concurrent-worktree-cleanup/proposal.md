## Why

Local cleanup holds one repository-wide mutation lock throughout remote evidence reads, content inspection, retry waits, and worktree removal. Cleaning one slow or locked worktree therefore makes unrelated exact-candidate cleanup commands fail with `mutation-busy`, preventing several independent worktrees from being cleaned at the same time.

## What Changes

- Replace long-lived repository-wide cleanup serialization with brief atomic state transactions plus scoped locks for the exact worktree and topic ref being evaluated or mutated.
- Allow cleanup operations for disjoint worktrees and refs to run concurrently while preserving mutual exclusion for the same candidate and for any shared resource.
- Keep ownership transitions, journals, stop controls, stale-lock recovery, non-force removal, and compare-and-delete behavior fail closed under concurrent state updates.
- Add deterministic overlap and interruption fixtures, reporting, and operator guidance for concurrent exact-candidate cleanup and sweep/queue interaction.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Permit unrelated candidates to be evaluated and removed concurrently without weakening candidate-scoped ownership, state, identity, or destructive-step safeguards.

## Impact

The local cleanup state store, reconciler, exact completion/discard/redundant operations, branch and empty-directory pruning coordination, CLI reporting, focused governance fixtures, and local cleanup documentation are affected. Cleanup evidence rules, remote deletion authority, disposable-path policy, GitHub APIs, and product runtime behavior remain unchanged.
