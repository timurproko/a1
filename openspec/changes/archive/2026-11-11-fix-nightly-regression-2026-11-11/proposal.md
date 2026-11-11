## Why

The Full regression run of 2026-11-11 failed on `develop` at `3d3c767` (https://github.com/timurproko/a1/actions/runs/42950411894). Failed: `vitest-fast-resource-sensitive` (fast-resource-sensitive) on windows-2025-node22 (resource shard), windows-2025-node24 (resource shard); `vitest-full-without-isolated` (architecture, dependency-policy, dist-integration, documentation-full, fast-remainder, fast-resource-sensitive, history-compatibility, image-compatibility, launch-integration, naming-full, package-contracts, package-smoke, package-startup, pi-engine-conformance, release-update, rendering-stability, typecheck, unix-release, update-performance, update-predecessor) on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard). Orchestration failures: lane Full regression / Complete regression required in job `Full regression / Complete regression required`. The nightly triage opened this change so the fix starts from the recorded evidence instead of the failure email.

## What Changes

- Reproduce the failure on the failed lane from the listed tests or commands and identify the introducing change among the suspect commits.
- Restore pinned command-outcome fixture compatibility, truthful extension-update summaries, and changelog version selection after the Pi 1.5.1 upgrade.
- Guard deferred-selector frame holds before runtime start and refresh the public API consumer inventory after the UX dialog change.
- Preserve independent parity assertions and add update-summary, per-operation isolation, immutable-result, and prerelease/invalid-version regression cases without reducing budgets, timeouts, or coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. These changes restore existing pinned transcript, changelog, terminal lifecycle, and public API inventory requirements; `skip_specs: true` remains appropriate.

## Impact

Recorded in the pull request's triage comment and this change's design: failed commands per lane, their test files, a bounded log excerpt, and the `develop` commits since the last successful run (12 since `47397a0`).
