## Why

The version-3 delivery format currently requires two to ten `## Implementation` checklist items. A one-outcome change is forced to split or invent scope, while a large pull request must combine independently completable outcomes to stay below ten, making progress less truthful and less useful.

## What Changes

- Require at least one implementation-specific checklist item in a newly authored version-3 delivery PR.
- Remove the fixed maximum number of Implementation items so the approved scope determines the checklist length.
- Preserve per-item wording, size, uniqueness, implementation-only, completion, and body-size safeguards.
- Align delivery guidance and focused governance tests with the new item-count rule.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Implementation progress uses one or more outcome-sized items without an arbitrary maximum.

## Impact

The change affects the canonical delivery specification, OpenSpec configuration, the change-delivery skill, the delivery runbook, version-3 body parsing, and repository-governance tests. It does not alter Acceptance limits, historical body compatibility, progress completion semantics, finalization, or integration authority.
