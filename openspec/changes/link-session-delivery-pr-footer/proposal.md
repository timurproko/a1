## Why

The linked-PR footer currently probes only the branch of the directory where A1 started. A1 delivery sessions normally start in the primary `develop` checkout and create a dedicated worktree afterward, so several sessions can each own a different open pull request while every footer continues probing `develop` and shows nothing. Long worktree paths can also push an otherwise valid PR badge beyond the row's truncation boundary.

## What Changes

- Add an explicit, session-scoped repository-context association that a running A1 coding session can set to its delivery worktree without changing the session's tool working directory.
- Persist the validated association by stable Pi session identity so the same session restores its linked worktree after restart or resume, while invalid, missing, foreign-repository, or detached contexts fail closed to the startup repository.
- Refresh repository branch and open-PR identity when the association changes and while the session runs, rather than permanently binding discovery to the startup branch.
- Integrate delivery setup with the association command immediately after creating its owned worktree, keeping independent concurrent sessions mapped to their own worktrees and PRs.
- Make the bare-A1 footer reserve room for `PR #<number>` before truncating long path/branch text; keep hyperlink/style boundaries and the `a1 pi` comparison unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: The linked-PR footer follows an explicit session-associated repository context, survives session resume, and keeps the badge visible when path text must be truncated.

## Impact

Implementation is expected to affect session identity/context plumbing, a small local association store and CLI operation, Pi runtime repository metadata refresh, delivery-agent guidance, footer width allocation, and focused lifecycle/contract/rendering tests. It will not infer ownership from arbitrary shell command text, scan all worktrees and guess among multiple PRs, change the actual tool cwd, mutate Git or GitHub, expose association in `a1 pi`, or revive the held multi-agent workspace scope.

This change contains planning artifacts only, not implementation.
