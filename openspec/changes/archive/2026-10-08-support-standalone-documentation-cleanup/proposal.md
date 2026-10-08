## Why

A successfully validated standalone OpenSpec documentation PR can be squash-merged by the repository's trusted documentation route and have its remote branch deleted, yet local cleanup still interprets the missing `openspec-implementation` fence as a broken implementation delivery. PR #714 exposed this mismatch: its clean released worktree is retained with `association-repair` even though the PR changed one canonical spec, passed required exact-head validation, merged through the authorized documentation path, reached `develop`, and has no remote topic ref.

## What Changes

- Recognize a registered candidate as standalone documentation only when its complete changed-file set and immutable lifecycle classification satisfy the existing documentation auto-merge policy and carry no implementation or acceptance association.
- Verify the exact same-repository PR head, successful required current-head validation, merge into `develop`, current `develop` ancestry, and absent topic ref before local cleanup becomes eligible.
- Preserve corrective-association handling for genuinely unassociated implementation deliveries and fail closed for mixed/code paths, newly introduced active changes, acceptance records, malformed metadata, incomplete diffs, stale validation, wrong heads/refs, or unavailable evidence.
- Reuse the existing registered ownership, cleanliness, generated-content, journaling, non-force worktree removal, and compare-and-delete local-ref safeguards without adding a manual deletion path.
- After the corrected tooling is integrated into `develop`, rerun exact cleanup for PR #714 and remove its worktree and unchanged local branch only if every live gate passes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Extend completed-candidate evidence to verified standalone documentation integrations without weakening implementation-bound delivery or local deletion safeguards.

## Impact

Expected implementation areas are the cleanup evidence reader, focused evidence and end-to-end cleanup fixtures, `docs/local-worktree-cleanup.md`, and the canonical cleanup contract. No GitHub merge authority, remote-ref deletion authority, documentation allowlist, implementation acceptance rule, queue enablement, force removal, or manual cleanup fallback changes.
