## Context

`package-startup.integration.test.ts` measures both profiles and all three launch kinds once on Windows and writes `a1-startup-performance-evidence-v1` when `STARTUP_PERFORMANCE_RESULT` is set; `STARTUP_BUDGET_ENFORCEMENT` decides whether an overrun throws (`fail`) or is appended to `budgetViolations` with a `::warning::` (`record`). Today `ci.yml` and development previews record, while `full-regression.yml`, nightly publication, and stable publication fail. Full regression sets no `STARTUP_PERFORMANCE_RESULT`, so its measurements exist only in the job log.

Samples from six Windows runs (2026-09-18 to 2026-09-19, Full regression #23 to #28; near-identical bytes):

| Lane | Kind | Samples | Median | Max | Budget |
| --- | --- | ---: | ---: | ---: | ---: |
| Node 24 | post-update | 10 | 1.25 s | 2.01 s | 2.0 s |
| Node 24 | no-live-supervisor | 10 | 1.35 s | 1.67 s | 2.5 s |
| Node 24 | warm | 10 | 1.18 s | 1.58 s | 2.0 s |
| Node 22 | post-update | 5 | 1.63 s | 1.72 s | 2.0 s |
| Node 22 | no-live-supervisor | 5 | 1.96 s | 2.72 s | 2.5 s |
| Node 22 | warm | 3 | 1.59 s | 1.87 s | 2.0 s |

Three of 43 samples overran (7%), by 12, 32, and 215 ms, each on a run whose other measurements were typical. With two Windows lanes and six measurements each, a nightly that fails on any single overrun fails about 40% of nights on noise alone; the observed rate across the last six runs was four of six.

## Decisions

- **Single-sample enforcement stays only where a human runs it:** stable publication is a manual dispatch that produces a release; an overrun there is rerun by the operator with the numbers in front of them. Every scheduled channel records.
- **Persistence, not statistics within a run:** the specs forbid retrying a measurement to obtain a warmed result, and repeating the only truly cold scenario (post-update) would need another exact-package install. Persistence across three consecutive `develop` runs of the same workflow keeps every run single-attempt and cold-as-declared while pushing the noise-failure rate per key from about 7% to about 0.03% (independent samples) and per nightly to well under 1%. Two-of-three was rejected: about 17% per nightly on the same data.
- **Trend inputs are the uploaded evidence, never re-measurement:** `evaluateStartupTrend(runs)` takes the newest-first list of `{ runId, headSha, lanes: [{ lane, measurements }] }` read from `startup-*.json` artifacts and returns, per `(lane, profileId, launchKind)`, the last three `elapsedMs`/`budgetMs` pairs and `persistent: true` when all three exist and all three overran. A key with fewer than three measurements (lane added, workflow file changed, artifact expired) is `insufficient`, never persistent. The current run's evidence is read from its own artifacts; the two previous runs are the two most recent completed runs of the same workflow on `develop`, whatever their conclusion, so a night lost to an unrelated failure does not reset the window.
- **The triage owns the verdict:** it already downloads the current run's artifacts and knows the workflow and branch. `nightly-regression-triage.yml` runs on every completed `develop` run of the two workflows; `proposeRegressionFix` adds a `startup-budget` failure with scopes `["package-startup"]`, lanes from the persistent keys, and the trend table as the excerpt when the verdict is persistent, and otherwise records `startup: within budget` or `startup: single overrun on <keys>, not persistent` in its report and summary. Because the key includes `package-startup`, a persistent overrun refreshes the candidate that already carries it or opens `fix/nightly-regression-<date>` for it, and never attaches to a candidate for another failure.
- **Full regression evidence:** the lanes set `STARTUP_PERFORMANCE_RESULT: .artifacts/validation/startup-<os>-node<n>.json`, upload it in the existing evidence artifact, and render the same run-summary table publication renders, so the nightly page shows the numbers whether or not anything failed.
- **One spec statement:** `a1-shell` keeps the budgets and says which channel judges them how; `isolated-regression-testing` drops its restated 5 s / 3 s numbers and describes the record-and-trend gate; `continuous-integration` adds the triage's trend evaluation. `docs/validation.md`'s table gains the `record` rows and a `trend` column.

## Risks / Trade-offs

- A regression that lands on one night is a warning that night, a candidate on the third; the byte baseline fails the introducing pull request the same day for graph growth, so the delay covers only non-graph causes (native start, filesystem, supervisor). Accepted; a single-night failure never distinguished those from noise either.
- Persistence needs three nightlies of artifacts (30-day retention covers it) and a stable workflow name; renaming a workflow resets the window to `insufficient`.
- The triage now runs on green nights too: one short Linux job per nightly, reads only.
