## Why

The Full regression run of 2026-09-23 failed on `develop` at `c37f420` (https://github.com/timurproko/a1/actions/runs/35834483448).  Orchestration failures: lane macos-15-node24 in job `Full regression / Complete non-physical regression (macos-15, node 24)`; lane ubuntu-24.04-node24 in job `Full regression / Complete non-physical regression (ubuntu-24.04, node 24)`; lane Full regression / Complete regression required in job `Full regression / Complete regression required`. The nightly triage opened this change so the fix starts from the recorded evidence instead of the failure email.

## What Changes

- Validate repository directories before launching Git branch or GitHub pull-request probes, so missing contexts fail closed without creating an incompletely spawned child.
- Preserve bounded branch and pull-request discovery while preventing immediate disposal of a missing repository context from reaching POSIX `kill(0, SIGTERM)` and terminating the validation runner's process group.
- Remove the disproven worker-cap workaround and retain every selected test, assertion, timeout, isolated partition, native lane, and zero-retry failure semantic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: require a missing repository context to fail closed before branch or pull-request subprocess launch.

## Impact

Recorded in the pull-request body: failed commands per lane, their test files, a bounded log excerpt, and the `develop` commits since the last successful run (28 since `95216f1`).
