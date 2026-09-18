## Why

Pi 0.85.1 is published and A1 pins 0.84.2. The nightly upstream sync proposed this upgrade with every derived artifact refreshed so the reviewer evaluates a diff, not a migration.

## What Changes

- Pin `@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` at 0.85.1 (upstream commit d981de1229ef899957bbe968bc8dcda02a21f477).
- Re-merge the vendored copies with A1's recorded deviations, regenerate the source ledger and provenance headers, re-resolve the inventories, and refresh parity evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: the pinned Pi identity moves to 0.85.1.

## Impact

Recorded in the pull-request body: merge conflicts, orphaned or unmapped inventory entries, and failed gates are the review items; user-visible Pi behavior changes go to the changelog's breaking-changes section when this merges.
