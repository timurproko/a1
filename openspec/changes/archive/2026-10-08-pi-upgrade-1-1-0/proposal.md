## Why

Pi 1.1.0 is published and A1 pins 1.0.4. The nightly upstream sync proposed this upgrade with every derived artifact refreshed so the reviewer evaluates a diff, not a migration.

## What Changes

- Pin `@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` at 1.1.0 (upstream commit abe508e1b89912adde45528136c3221eb69acdd7).
- Re-merge the vendored copies that follow upstream with A1's recorded deviations, regenerate the source ledger and provenance headers, re-resolve the inventories, refresh the public API and feature adoption baselines, and refresh parity evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: the pinned Pi identity moves to 1.1.0.

## Impact

Recorded in the pull-request body: merge conflicts, kept copies with an upstream delta, orphaned or unmapped inventory entries, public API adoption items, pending feature rows, and failed or blocked gates are the review items; user-visible Pi behavior changes go to the changelog's breaking-changes section when this merges.
