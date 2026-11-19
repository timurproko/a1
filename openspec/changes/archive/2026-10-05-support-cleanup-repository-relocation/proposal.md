# Change: Support cleanup after repository relocation

## Why

Local cleanup persists absolute repository and worktree paths in its state journal. This repository moved from `D:/Git/a1` to `E:/Git/a1`, carrying the otherwise valid journal with it. Repository discovery now succeeds after the origin-rewrite fix, but state loading rejects the stale drive-bound identity with `state-schema`, so no cleanup command can register or remove the merged worktree.

The journal currently contains only completed entries. Cleanup can safely rebind that terminal history to the repository's newly discovered canonical paths without transferring any live deletion authority. A journal with owned, released, or deleting entries must continue to fail closed because relocation can invalidate worktree and filesystem identity.

## What Changes

- Detect a structurally valid cleanup journal whose stable GitHub repository/remote identity matches the current repository but whose absolute repository paths reflect a relocation.
- While holding the repository mutation lock, atomically rebase only fully completed journal history from the old canonical primary/worktree-root prefix to the current canonical prefix.
- Preserve registration IDs, completion state, audit history, queue settings, and every non-path identity field.
- Reject relocation when any entry is active, a path is outside the old worktree root, repository/remote identity differs, topology is malformed, or the state is otherwise invalid.
- Add Windows drive-move fixtures, negative safety fixtures, and recovery documentation.

## Capabilities

### Modified Capabilities

- `local-worktree-cleanup`: cleanup state follows a safely recognized repository relocation without weakening candidate identity or deletion authority.

## Impact

- Affected code: cleanup state loading/migration and the dependency-free cleanup fixtures.
- Affected data: existing version-1 local cleanup journals containing terminal entries only may be atomically path-rebased in place.
- No product runtime, package, remote-ref, GitHub API, or dependency changes.
