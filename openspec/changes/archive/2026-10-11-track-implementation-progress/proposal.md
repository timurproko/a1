## Why

Implementation progress is currently hidden behind OpenSpec task files and free-form PR prose. GitHub can surface native `completed / total tasks` progress directly in pull-request lists, but the repository's ordinary version-3 PR format does not consistently use task-list items for implementation scope.

## What Changes

- Make the `## Implementation` section of newly authored version-3 delivery PRs a two-to-ten-item Markdown task list derived from the approved scope.
- Require agents to check an item only after its associated implementation, focused evidence, and task bookkeeping are complete.
- Keep task wording stable after approval; additions, removals, reordering, or wording changes remain scope refinements rather than progress updates.
- Require every implementation-progress item to be checked before ready/finalization while preserving final `## Acceptance` as plain behavior-and-result bullets.
- Preserve read compatibility for historical version-3 PRs whose Implementation section used plain bullets.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: New implementation-bound PRs expose native GitHub implementation progress through a scoped task list without turning acceptance into checkbox state.

## Impact

The change affects delivery policy, the change-delivery skill, the OpenSpec delivery runbook, version-3 body parsing/finalization safeguards, and focused repository-governance tests. It does not change acceptance provenance, CI status semantics, GitHub integration authority, OpenSpec `tasks.md` as the detailed ledger, or historical delivery records.
