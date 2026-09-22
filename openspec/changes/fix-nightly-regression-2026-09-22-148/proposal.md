## Why

The Release run of 2026-09-22-148 failed on `develop` at `6ae0615` (https://github.com/timurproko/a1/actions/runs/35705803548). Failed: `vitest-full-without-isolated` (architecture, dependency-policy, dist-integration, documentation-full, fast-remainder, fast-resource-sensitive, history-compatibility, image-compatibility, launch-integration, naming-full, package-contracts, package-smoke, package-startup, pi-engine-conformance, release-update, rendering-stability, typecheck, unix-containment, update-performance, update-predecessor) on darwin-node24, linux-node24, win32-node22, win32-node24. Orchestration failures: lane Publication result in job `Publication result`. The nightly triage opened this change so the fix starts from the recorded evidence instead of the failure email.

## What Changes

- Reproduce the failure on the failed lane from the listed tests or commands and identify the introducing change among the suspect commits.
- Fix the cause without weakening assertions, budgets, timeouts, or coverage, and add regression evidence where the failure exposed a gap.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None identified yet. When the cause is known and the fix changes a requirement, add the delta under `specs/<capability>/spec.md` and remove `skip_specs: true` from `.openspec.yaml`; when the fix changes no requirement, leave both as scaffolded.

## Impact

Recorded in the pull-request body: failed commands per lane, their test files, a bounded log excerpt, and the `develop` commits since the last successful run (9 since `7d26554`).
