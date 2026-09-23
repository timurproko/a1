## Why

The Full regression run of 2026-09-23 failed on `develop` at `c37f420` (https://github.com/timurproko/a1/actions/runs/35834483448).  Orchestration failures: lane macos-15-node24 in job `Full regression / Complete non-physical regression (macos-15, node 24)`; lane ubuntu-24.04-node24 in job `Full regression / Complete non-physical regression (ubuntu-24.04, node 24)`; lane Full regression / Complete regression required in job `Full regression / Complete regression required`. The nightly triage opened this change so the fix starts from the recorded evidence instead of the failure email.

## What Changes

- Bound the worker fanout of the complete ordinary Vitest partition so its hundreds of files cannot exhaust a hosted runner while preserving file parallelism.
- Retain every selected test, assertion, timeout, isolated partition, and native lane, and record the worker bound in validation-plan evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: require bounded, evidenced worker fanout for the complete ordinary test partition without reducing coverage or failure semantics.

## Impact

Recorded in the pull-request body: failed commands per lane, their test files, a bounded log excerpt, and the `develop` commits since the last successful run (28 since `95216f1`).
