## Why

The nightly regression triage listens for every completed `Full regression` run, so the Full regression a fixer dispatches on a `fix/nightly-regression-<date>` branch to prove the fix opened a new candidate pull request each time it failed (#503, #504, #505 from proving #502). The proof run belongs to the candidate it was dispatched for; the work must stay in that one pull request.

## What Changes

- Triage only runs whose head branch is `develop`: the workflow's job condition and the proposal script's decision both skip any other branch with the reason recorded, so a candidate's own proof runs open and refresh nothing.
- State the branch rule in the `continuous-integration` requirement and the runbook.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: the triage proposes a fix only for failures on `develop`; a run on a candidate's branch is that candidate's evidence.

## Impact

`.github/workflows/nightly-regression-triage.yml`, `scripts/release/propose-regression-fix.mjs`, `scripts/release/regression-triage-report.mjs` and its declaration, their tests, and `docs/ci-release-runbook.md`. The three duplicate candidates were closed and their bot branches deleted; #502 keeps the work.
