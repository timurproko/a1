## Why

The footer currently drops its linked pull-request badge as soon as GitHub reports that pull request as merged. Delivery agents can still be completing post-merge verification and cleanup in the same associated worktree, so removing the link at merge time hides the identity they still need.

## What Changes

- Treat an exact branch-associated GitHub pull request as footer metadata while it is open or merged, without changing the badge presentation.
- Keep worktree and branch identity authoritative: changing the selected repository context or branch shall remove the old badge unless the new context independently resolves a matching pull request.
- Continue rejecting closed-unmerged, mismatched-branch, malformed, or unsafe pull-request results.
- Cover open-to-merged continuity, merged-session restoration, and stale-badge removal when repository context changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Keep the linked PR badge available through post-merge work while preserving exact worktree/branch association and existing failure behavior.

## Impact

Implementation is expected to remain within pull-request discovery, its focused runtime tests, and the linked-footer specification. It will not change footer rendering, add PR state text, retain rejected pull requests, alter session/tool cwd, or weaken repository-context validation.

This change contains planning artifacts only, not implementation.
