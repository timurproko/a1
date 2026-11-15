## Why

Publication runs 43732033913 (0.2.7-dev.1313) and 43738961066 (0.2.7-dev.1316) both staged successfully and then failed only the Windows published pair at stage `update-predecessor`: the harness's ten-minute command deadline killed `a1 update` while the public predecessor 0.2.7-dev.1307 was still replacing itself. The retained evidence shows the updater header, an npm log that stops mid-unpack without an exit record, and nothing else. The same exact pair completes locally on Windows in about seventy seconds under the runner's Node 24.22.2/npm 11.19.1, so the stall is hosted-runner specific and the current evidence cannot locate it.

Two harness defects keep every recurrence undiagnosable. The published updater owns a fifteen-minute protected-replacement deadline, yet the smoke kills it after ten minutes, so the updater can never report its own timeout, cancellation, or recovery outcome. And failure evidence keeps only npm log tails: it records neither which fixture-owned processes were alive at the deadline, nor the update journal and recovery-capsule records, nor npm log identities that date each phase, nor how long each smoke stage took.

## What Changes

- Give the Windows published-predecessor update a command budget above the updater's own protected-replacement deadline so the published updater settles or reports before the harness intervenes; other platforms and stages keep their current budgets.
- Record stall evidence at failure time: the fixture-owned process inventory captured before settlement, bounded sanitized update journal and recovery-capsule records, npm log identities with sizes and modification times, and per-stage durations in both success and failure evidence.
- Stop the evidence redaction from erasing short ordinary words that happen to equal a short environment value, while still redacting credentials.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: the published-pair smoke lets the published updater reach its own deadline on Windows and retains stall evidence that locates the stage, live process set, and update records when the predecessor update fails.

## Impact

Published installer smoke budgets, failure evidence, and process inventory in `scripts/release/smoke-published-installer.mjs` and `scripts/release/published-smoke-processes.mjs`, with their focused regression tests. No product updater code, registry state, dist-tag, promotion gate, or smoke assertion changes. No publication retry or merge is authorized by this proposal.
