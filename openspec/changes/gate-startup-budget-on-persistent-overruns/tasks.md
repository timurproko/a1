## 1. Trend verdict

- [ ] 1.1 Add `scripts/release/startup-budget-trend.mjs` (pure) with `evaluateStartupTrend(runs, { window: 3 })` returning per-key history, `persistent`, and `insufficient`, plus `renderStartupTrend` for the evidence table; add its `.d.mts`.
- [ ] 1.2 Unit-test the verdict: three consecutive overruns, two of three, a missing middle run, a lane with fewer than three samples, mixed profiles and kinds, and a run whose evidence is absent.

## 2. Evidence on every channel

- [ ] 2.1 Set `STARTUP_BUDGET_ENFORCEMENT: record` and `STARTUP_PERFORMANCE_RESULT` on the Full regression lanes, upload the evidence in the lane artifact, and render the startup table in the run summary; switch nightly publication to `record` while stable keeps `fail`.
- [ ] 2.2 Extend `ci-release-runbook.test.ts` and the workflow governance tests to pin the enforcement value per channel and the evidence path.

## 3. Triage integration

- [ ] 3.1 Run `nightly-regression-triage.yml` on every completed `develop` run of the two workflows; in `proposeRegressionFix`, download the current run's startup evidence and the two previous completed runs' evidence, evaluate the trend, add the `startup-budget` failure with scopes `["package-startup"]` when persistent, and record the verdict in the report and summary otherwise.
- [ ] 3.2 Test the script paths: persistent overrun on a green run opens a candidate; single overrun records only; a failed run with a persistent overrun carries both; evidence missing on one previous run yields `insufficient`.

## 4. Specification and documentation

- [ ] 4.1 Apply the `a1-shell`, `isolated-regression-testing`, and `continuous-integration` deltas and update `docs/validation.md` and `docs/ci-release-runbook.md`.
- [ ] 4.2 Prove on `develop`: the next scheduled nightly records its measurements and the triage reports the verdict; dispatch the triage on the two previous nightlies' run ids to confirm the window reads their artifacts.
