## Why

Fifty-seven local cleanup reports since 2026-09-16 show eighteen `removed` results and three failure classes that still leave merged worktrees behind after the lock fix in `resume-locked-worktree-removal` (#453). First, a registered worktree whose directory an agent deleted by hand while blocked makes `complete` crash with `local-cleanup-failed` (an unhandled `ENOENT` from `captureWorktree` at step `none`); five merged entries (#404, #425, #428, #432, #436) are stuck that way and their journals can never close. Second, GitHub reported PR #449's `merged` timeline event one second after `merged_at`; `assertManualAcceptanceMerge` requires equality, so the merged delivery reports `invalid-provenance` and cleanup blocks on `acceptance-merge-provenance`. Third, agents write logs, packed tarballs, and diffs under `.artifacts/` outside the two approved subroots; three of the nine `worktree-content` blocks named only such paths, and each of those worktrees was then deleted by hand, feeding the first class.

## What Changes

- Treat a registered candidate whose path is absent at step `none`, with no Git registration for that path (or only a prunable one whose `gitdir` names the removed pointer), as an already-removed worktree: verify the same merge/archive evidence, retire that dangling registration, delete the unchanged local topic ref under the existing compare-and-delete rule, and mark the entry done with `worktree-already-absent`. An unregistered absent path still blocks with a named reason because there is no journaled head to verify.
- Accept a `merged` timeline event whose `created_at` lies within five seconds of the pull request's `merged_at` as the same merge, while still requiring the single event, the same human actor, no App, and the same merge commit.
- Make the exact `.artifacts` root itself part of the central disposable policy, since the repository ignores it as its generated-artifact root, replacing the two subroot entries; the subroots stay accepted as legacy registrations. Every other boundary (ignored, inside the worktree, no link/special/nested content, bounded traversal) is unchanged, and sibling near-matches such as `.artifacts-user` remain blocking.
- Extend the fixtures for each class and update `docs/local-worktree-cleanup.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: an absent registered worktree completes through the journal instead of failing; the `.artifacts` root is disposable.
- `github-repository-governance`: post-merge provenance tolerates a small clock skew between the merge event and `merged_at`.

## Impact

Implementation affects `scripts/governance/local-cleanup-git.mjs`, `scripts/governance/local-cleanup-reconcile.mjs`, `scripts/governance/local-cleanup-complete.mjs`, `scripts/governance/openspec-acceptance-policy.mjs`, their fixtures under `test/repository-governance/`, `docs/local-worktree-cleanup.md`, and the two specifications. It does not change evidence sources, ownership or generation rules, discard's remote-ref procedure, the residue verification added by #453, or which pull requests count as merged.
