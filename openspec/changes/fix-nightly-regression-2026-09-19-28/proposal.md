## Why

The Full regression run of 2026-09-19-28 failed on `develop` at `19f1c42` (https://github.com/timurproko/a1/actions/runs/35438546283). Failed: `vitest-package-startup` (package-startup) on windows-2025-node22. The nightly triage opened this change so the fix starts from the recorded evidence instead of the failure email.

## What Changes

- Reproduce the failure on the failed lane from the listed tests or commands and identify the introducing change among the suspect commits.
- Fix the cause without weakening assertions, budgets, timeouts, or coverage, and add regression evidence where the failure exposed a gap.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None identified yet. When the cause is known and the fix changes a requirement, add the delta under `specs/<capability>/spec.md` and remove `skip_specs: true` from `.openspec.yaml`; when the fix changes no requirement, leave both as scaffolded.

## Impact

Recorded in the pull-request body: failed commands per lane, their test files, a bounded log excerpt, and the `develop` commits since the last successful run (0 since `6c97783`).
