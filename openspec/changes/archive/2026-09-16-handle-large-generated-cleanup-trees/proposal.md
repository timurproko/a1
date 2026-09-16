## Why

Live retained PR #438 cleanup exposed ignored native Cargo `target` output outside the exact disposable policy. While this change was in progress, merged PR #437 independently deployed a dedicated 100,000-entry generated-content allowance that resolves PR #435's large dependency-tree blocker, so this corrective PR must preserve that stronger base behavior and add only the remaining exact native roots.

## What Changes

- Add only `native/process-guardian/target` and `native/terminal-host/target` to the central generated-content policy and registration schema.
- Keep the deployed separate 20,000-entry ordinary and 100,000-entry generated allowances, wall-clock deadline, and full structural checks unchanged.
- Verify native Cargo output uses the generated allowance while arbitrary, sibling, and near-match `target` paths remain blocking.
- Record post-deployment retry commands for retained PR #435 and PR #438 worktrees.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Recognize the repository's two exact native Cargo build roots without authorizing arbitrary `target` directories or weakening deployed generated-content inspection bounds.

## Impact

Affected areas are the central completion policy and registration schema, cleanup CLI/help and documentation, focused disposable-repository fixtures, and implementation evidence. There are no product runtime, remote mutation, dependency, or public API changes.
