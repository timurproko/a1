## 1. Triage report

- [x] 1.1 Add `scripts/release/regression-triage-report.mjs` with pure functions for the triage decision, the failed-command summary from lane results with scopes and test files, the dedupe key, bounded log-excerpt extraction, the pull-request body in the repository layout, and the OpenSpec scaffold files; add its `.d.mts`.
- [x] 1.2 Unit-test the report against recorded fixtures: a four-lane run with two failed commands across lanes, a lane that failed before producing a tier result, a run with no prior success, a body the delivery policy's layout check accepts, and an excerpt that stays bounded with long logs.

## 2. Proposal script

- [x] 2.1 Add `scripts/release/propose-regression-fix.mjs`: resolve the run, download lane artifacts, read logs, find the last green run and suspect commits, decide between refresh and new candidate, write the scaffold, `report.json`, and `body.md`, and emit `changed`, `branch`, and `pr` outputs.
- [x] 2.2 Test the script with injected `gh` and `git` executors for the new-candidate, refresh, cancelled-run, manual-publication, no-artifact dry-run, and download-error paths.

## 3. Workflow and governance

- [x] 3.1 Add `.github/workflows/nightly-regression-triage.yml` triggered by `workflow_run` on `Full regression` and `Release`, gated to failures and scheduled release runs, with the App identity, the commit/push step, and the open-or-refresh step; add the `workflow_dispatch` run-id input.
- [x] 3.2 Register the workflow in `config/github-repository-governance.json`, recognise the `nightly-regression-triage` authority in `github-repository-governance.mjs`, and extend the governance tests.
- [x] 3.3 Document the workflow in `docs/ci-release-runbook.md` (validation-by-trigger table and the failure section) and add the Full regression proof rule for fix candidates to `openspec/config.yaml`, the change-delivery skill, the runbook, and the scaffolded tasks.
- [x] 3.4 Dry-run the script against the real failed run #24 and confirm the body layout, the lane and orchestration evidence, and that the scaffold with `skip_specs: true` validates strictly and reports its `specs` artifact as `skipped`; the workflow's own `dry_run` dispatch is exercised after merge, when the file exists on `develop`.
