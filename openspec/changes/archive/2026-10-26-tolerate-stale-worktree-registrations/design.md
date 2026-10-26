## Context and approval

The maintainer hit this on 2026-10-26: a worktree created by another tool had been deleted without pruning, `a1 session worktrees` threw `ENOENT`, and agents refused to continue an unrelated pull request. The maintainer approved the fix and requested its implementation in the same interaction.

## Decisions

### Report stale registrations instead of failing

`listGitWorktrees` resolves each `git worktree list --porcelain` record with `realpath` and `lstat`. A missing directory or `.git` pointer (`ENOENT`, `ENOTDIR`) now yields a stale record carrying Git's recorded path and branch; every other error still fails as before. The inventory reports a stale record as `unverifiable` with no agent, the status the delivery rules already treat as "do not use". It is not silently dropped, so an agent can see what needs `git worktree prune`.

### Leave linking and claims untouched

`link-worktree` validates its one target directly and never consulted the inventory, so it already succeeded for a live worktree while the inventory failed. Only the inventory loop changes; no claim, record, lock, or cleanup logic is touched.

## Validation

Typecheck, the focused `session-repository-context` test, and strict validation of this change.
