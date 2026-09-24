## Why

The Full regression run of 2026-09-24 failed on `develop` at `93f6928` (https://github.com/timurproko/a1/actions/runs/35971693488). Failed: `vitest-full-without-isolated` (architecture, dependency-policy, dist-integration, documentation-full, fast-remainder, fast-resource-sensitive, history-compatibility, image-compatibility, launch-integration, naming-full, package-contracts, package-smoke, package-startup, pi-engine-conformance, release-update, rendering-stability, typecheck, unix-containment, update-performance, update-predecessor) on windows-2025-node22. Orchestration failures: lane Full regression / Complete regression required in job `Full regression / Complete regression required`. The nightly triage opened this change so the fix starts from the recorded evidence instead of the failure email.

## What Changes

- Isolate the streamed-content frame-count test from independently scheduled lifecycle status rendering that can race on slower Windows lanes.
- Preserve the exact stream-frame bounds, strengthen the post-input and final-frame assertions, and record repeated focused evidence without changing product behavior.
- Bind readiness to current pull-request metadata for the event head so finalization push/body event reordering cannot leave the finalized candidate deferred.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Resolve mutable readiness metadata from the current pull request while retaining exact-head freshness and fail-closed behavior.

## Impact

Recorded in the pull-request body: failed commands per lane, their test files, a bounded log excerpt, and the `develop` commits since the last successful run (51 since `95216f1`).
