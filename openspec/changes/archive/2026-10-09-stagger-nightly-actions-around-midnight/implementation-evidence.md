## Implementation

- Pi upstream sync now starts the staggered nightly sequence at 23:23 UTC, followed by Full regression at 23:47 UTC.
- Nightly development publication now runs at 00:17 UTC, followed by OpenSpec archive reconciliation at 00:43 UTC.
- Each workflow retains its existing non-schedule triggers, permissions, concurrency, jobs, validation, and authority boundaries.
- Focused policy assertions pin all four schedule values so future workflow changes cannot silently undo the sequence.

## Automated Evidence

- YAML parsing verified each workflow exposes exactly its intended daily cron expression.
- Focused workflow and governance coverage passed: 4 files and 41 tests.
- Strict OpenSpec validation passed for `stagger-nightly-actions-around-midnight`.

## Known Gaps

GitHub schedules are best-effort and may still start later than the configured UTC times. Exact midnight execution and DST-adjusted local midnight are intentionally not guaranteed.
