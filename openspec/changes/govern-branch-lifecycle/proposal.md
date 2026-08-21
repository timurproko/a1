## Why

Merged topic and milestone branches currently remain in local clones, obscuring which work is active and making branch selection error-prone. Repository workflow should define a safe, repeatable branch lifecycle that keeps only protected long-lived branches and genuinely unmerged work.

## What Changes

- Require each change or milestone to use a branch created from `develop`.
- Require successful validation, merge into `develop`, and push before cleanup.
- Require immediate deletion of a merged local source branch with Git's safe `-d` check.
- Require deletion of a corresponding remote source branch when one exists and is not protected.
- Protect `develop`, `master`, the current branch, and every branch containing commits not merged into the selected integration branch.
- Add deterministic dry-run and apply tooling so cleanup decisions are visible, testable, and do not rely on force deletion.
- Reconcile the existing local branch inventory by deleting only branches Git proves are merged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: Extend executable repository hygiene to cover creation, integration, and safe removal of development branches.

## Impact

This affects repository workflow documentation, OpenSpec task completion, branch-maintenance tooling and tests, and local/remote branch cleanup after merges. It does not affect A1 runtime behavior, public APIs, npm package behavior, or protected release branches.
