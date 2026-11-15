## Why

Development publication currently appends a new line when a running job passes, leaving its old yellow Running row visible. Update the existing row instead so the visible list reflects the latest state without duplicate job entries.

## What Changes

- Maintain one visible row per job in capable interactive terminals, changing its dot and aligned status label in place.
- Preserve yellow Running, green Passed, red Failed, and gray Skipped dots with neutral status text and job names.
- Retain readable append-only transitions for redirected output and dumb terminals, independently respecting color opt-outs.
- Preserve the publication header, log access, meaningful skips, failure summaries, interruption semantics, and all publication gates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: interactive publication job rows update in place instead of duplicating transitions.

## Impact

`scripts/release/publication-client.mjs`, its focused tests, and publication progress guidance in `docs/ci-release-runbook.md`. No workflow dispatch, registry, retry, stable-candidate watcher, or publication authority changes.
