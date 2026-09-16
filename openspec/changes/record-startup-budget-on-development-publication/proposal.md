## Why

Wall-clock startup budgets are enforced on shared GitHub Windows runners, where the same exact candidate bytes measure anywhere between roughly 0.9 and 4.5 seconds depending on runner load. After the budgets were tightened to 2 s post-update, 2.5 s no-live-supervisor, and 2 s warm, three of four manual development publications on 2026-09-16 failed in `Validate win32-*` at `vitest-package-startup`, and one of them blocked `0.1.8-dev.442` while the other Windows lane measured the identical bytes at 1278 ms. A development preview therefore fails on runner noise rather than on product behavior, while the two canonical specifications still disagree about the numbers: `a1-shell` states 2 s / 2.5 s and `isolated-regression-testing` still states 5 s / 3 s.

## What Changes

- Separate startup budget evaluation from enforcement: a pure evaluation returns a structured violation, and the existing assertion keeps throwing the same formatted message for every current caller.
- Give the exact-package startup gate an explicit enforcement mode read from `STARTUP_BUDGET_ENFORCEMENT`. Development publication and ordinary pull-request validation record overruns as warnings and evidence; nightly publication, stable publication, and Full regression keep failing on them. The default without the variable remains failing enforcement.
- Keep measuring every profile and every launch kind on the first attempt in every mode, retain the existing zero-automatic-retry policy, and keep a missing input-ready render a hard failure in both modes.
- Record enforcement mode and every violation in the startup performance evidence JSON, upload that evidence from the publication lanes, and print a per-measurement summary table plus a `::warning::` annotation on the run.
- Reconcile the contradictory startup budget text in `isolated-regression-testing` with the canonical `a1-shell` budgets and state where each channel enforces them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `isolated-regression-testing`: Replace stale 5-second and 3-second startup budget text with the canonical budgets and require development publication to record, not enforce, an overrun while nightly and Full regression keep failing.
- `a1-shell`: State that development previews record the declared startup budgets as evidence while nightly publication and Full regression enforce them.
- `continuous-integration`: Define the `STARTUP_BUDGET_ENFORCEMENT` contract, its per-channel values, its fail-closed default, and the evidence it produces.

## Impact

Implementation affects the startup budget owner, which moves out of the eagerly reachable `src/foundation/startup/startup-runtime.ts` into `src/foundation/startup/startup-budget.ts`, the exact-package startup integration gate, the `validate` job of `.github/workflows/release.yml`, the startup group of `.github/workflows/ci.yml`, the validation step of `.github/workflows/full-regression.yml`, the governance tests that pin those workflow and test contents, and `docs/validation.md`. It changes no budget number, removes no measurement, adds no retry, and does not alter publication authority or the public API.
