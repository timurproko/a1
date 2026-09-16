## Why

The cleanup tool intentionally preserves closed-unmerged pull-request worktrees because its only standard operation requires merged-delivery evidence. Even after a maintainer explicitly decides to discard rejected work, agents currently have no repository-owned path to remove the exact local worktree, local topic branch, and unchanged remote topic branch without bypassing cleanup safeguards.

## What Changes

- Add an explicit exact-candidate discard operation for same-repository pull requests that are closed without merge.
- Require deliberate discard confirmation plus exact PR, head, branch, repository, local ownership, filesystem identity, and clean-content evidence; open, merged, forked, protected, advanced, ambiguous, or active candidates remain blocking.
- Delete only the unchanged remote topic ref using expected-SHA compare-and-delete semantics, verify absence, then reuse journaled non-force worktree removal and atomic unchanged local-ref deletion.
- Make interruption and partial outcomes resumable and auditable without enabling queue scans or granting authority over unrelated worktrees.
- Document and test successful discard, idempotency, remote/local races, unsafe content, ownership conflicts, and refusal boundaries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Add explicit, candidate-scoped cleanup authority for a confirmed closed-unmerged PR, including guarded remote and local topic-ref removal.
- `github-repository-governance`: Permit exact-head remote topic-branch deletion for an explicitly confirmed closed-unmerged discard while retaining all existing protected/ref/repository safeguards.

## Impact

Affected areas are the local cleanup CLI, state/journal model, GitHub evidence reader, remote/local deletion primitives, repository governance policy, focused cleanup fixtures, and operator documentation. Existing merged-delivery `complete`, persistent queue/watch behavior, automatic merged-branch cleanup, product runtime, publication, and merge authority remain unchanged.
