## Why

The Full regression run of 2026-09-23 failed on `develop` at `c37f420` (https://github.com/timurproko/a1/actions/runs/35834483448).  Orchestration failures: lane macos-15-node24 in job `Full regression / Complete non-physical regression (macos-15, node 24)`; lane ubuntu-24.04-node24 in job `Full regression / Complete non-physical regression (ubuntu-24.04, node 24)`; lane Full regression / Complete regression required in job `Full regression / Complete regression required`. The nightly triage opened this change so the fix starts from the recorded evidence instead of the failure email.

## What Changes

- Emit each complete-partition test module before execution so runner-level termination leaves the active file set in the job log.
- Identify and fix the process behavior that terminates hosted POSIX runners while retaining every selected test, assertion, timeout, isolated partition, and native lane.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None identified yet. The active diagnostic changes validation evidence only; add a capability delta if the identified root-cause fix changes required behavior.

## Impact

Recorded in the pull-request body: failed commands per lane, their test files, a bounded log excerpt, and the `develop` commits since the last successful run (28 since `95216f1`).
