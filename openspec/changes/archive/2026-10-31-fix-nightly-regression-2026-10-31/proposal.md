## Why

The Full regression run of 2026-10-31 failed on `develop` at `27f992a` (https://github.com/timurproko/a1/actions/runs/41161344675). Failed: `deprecated-dependencies` (dependency-policy) on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard). Orchestration failures: lane Full regression / Complete regression required in job `Full regression / Complete regression required`. The nightly triage opened this change so the fix starts from the recorded evidence instead of the failure email.

## What Changes

- Reproduce the failure on the failed lane from the listed tests or commands and identify the introducing change among the suspect commits.
- Fix the cause without weakening assertions, budgets, timeouts, or coverage, and add regression evidence where the failure exposed a gap.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None identified yet. When the cause is known and the fix changes a requirement, add the delta under `specs/<capability>/spec.md` and remove `skip_specs: true` from `.openspec.yaml`; when the fix changes no requirement, leave both as scaffolded.

## Impact

Recorded in the pull request's triage comment and this change's design: failed commands per lane, their test files, a bounded log excerpt, and the `develop` commits since the last successful run (2 since `9fccb71`).
