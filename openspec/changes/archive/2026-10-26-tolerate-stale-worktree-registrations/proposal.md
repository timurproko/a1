## Why

`a1 session worktrees` resolves every registered Git worktree's directory and `.git` pointer before reporting anything. One registration whose directory was deleted without `git worktree prune` (Git lists it as prunable) therefore fails the whole inventory, and the delivery rules then stopped agents from editing their correctly linked worktree. Pull request #838 relaxed the rules; this change removes the trigger.

## What Changes

- Report a registered worktree whose directory or `.git` pointer no longer exists as `unverifiable` with Git's recorded path and branch, instead of failing the inventory.
- Keep every other inventory, link, and claim behavior unchanged; a stale registration still cannot be linked or reused.
- Add a regression for an inventory that contains a deleted worktree.

## Capabilities

### Modified Capabilities

- `owned-pi-ui-foundation`: the worktree inventory tolerates stale registrations.

## Impact

`src/foundation/lifecycle/session-repository-context.ts` and its focused test. No CLI surface, record format, claim, or cleanup behavior changes.
