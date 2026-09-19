## Why

The nightly Full regression and the nightly publication fail whenever one first-attempt startup measurement on a hosted Windows runner exceeds its budget. Recent samples (43 Windows measurements across six runs of near-identical bytes, 2026-09-18 to 2026-09-19) sit at a median of about 1.3 to 1.6 seconds against budgets of 2.0 and 2.5 seconds, with a tail to 2.7 seconds; three of the 43 single samples overran, each by 12 to 215 milliseconds, on runs whose other lanes and profiles were well inside budget. Four consecutive proof runs of one fix candidate (#502) each lost a different Windows lane to this noise while every deterministic scope passed. The startup graph itself is already gated deterministically at pull-request time by the startup-graph byte baseline, so a single hosted-runner wall-clock sample adds noise, not information: the nightly should fail on a startup regression that persists, and on nothing else.

## What Changes

- Nightly publication, the scheduled and dispatched Full regression, and development previews record every first-attempt startup measurement as evidence with a warning annotation and a run-summary table; they no longer fail the run on one overrun. Stable publication keeps enforcing the declared budgets on the first attempt.
- Add a persistent-overrun verdict: for each Windows lane, profile, and launch kind, the last three consecutive `develop` measurements of the same workflow are compared with the declared budget, and the nightly is judged regressed only when all three overran. The verdict is computed from the uploaded startup evidence of the current and the two previous runs, never from re-measurement.
- Feed that verdict to the nightly regression triage: the triage evaluates every completed `develop` run of `Full regression` and the scheduled `Release`, not only failed ones, and opens or refreshes a fix candidate for a persistent overrun with the three-run trend table as its evidence, under a `startup-budget` scope key so it never merges with an unrelated failure's candidate.
- Full regression uploads its startup evidence alongside the tier outcome so the trend has data on every lane; the run summary renders the measurements on every channel the way publication already does.
- Reconcile the three specs that state the budgets and their channels (`a1-shell`, `isolated-regression-testing`, `continuous-integration`) so one rule describes enforcement: single-attempt measurement everywhere, stable enforces, every other channel records and the trend gates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `a1-shell`: the startup budgets remain the product promise; nightly and complete regression judge them by a three-run persistent overrun, stable publication by the first attempt.
- `isolated-regression-testing`: the Windows startup gate records on nightly and complete regression and fails on a persistent overrun; the contradictory restated numbers are removed in favour of the declared budgets.
- `continuous-integration`: the nightly triage evaluates completed runs for persistent startup overruns and proposes a fix for them.

## Impact

Workflows: `full-regression.yml` (record mode, `STARTUP_PERFORMANCE_RESULT`, evidence upload, summary table), `release.yml` (record mode for the nightly mode), `nightly-regression-triage.yml` (run on completion regardless of conclusion for `develop`). Scripts: new pure `scripts/release/startup-budget-trend.mjs` with its declaration and tests; `propose-regression-fix.mjs` and `regression-triage-report.mjs` gain the trend evaluation, evidence download of the two previous runs, and the `startup-budget` failure shape. Docs: `docs/validation.md` enforcement table and `docs/ci-release-runbook.md`. Not changed: the budget numbers, the single-attempt measurement, the no-retry rule, the input-ready functional failure, the startup-graph byte baseline, and stable publication's enforcement. Trade-off: a genuine regression that appears on one night is reported as a warning that night and as a candidate on the third consecutive night; the byte baseline still catches graph growth at pull-request time the same day.
