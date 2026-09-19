## 1. Triage report

- [ ] 1.1 Add `scripts/release/regression-triage-report.mjs` with pure functions for the dedupe key, the failed-owner table from lane results, owner-to-test mapping, bounded log-excerpt extraction, the pull-request body in the repository layout, and the OpenSpec scaffold files; add its `.d.mts`.
- [ ] 1.2 Unit-test the report against recorded fixtures: a four-lane run with two failed owners on one lane, a lane that failed before producing `full-regression.json`, a run with no prior success, and a body that stays bounded with long logs.

## 2. Proposal script

- [ ] 2.1 Add `scripts/release/propose-regression-fix.mjs`: resolve the run, download lane artifacts, read logs, find the last green run and suspect commits, decide between refresh and new candidate, write the scaffold, `report.json`, and `body.md`, and emit `changed`, `branch`, and `pr` outputs.
- [ ] 2.2 Test the script with injected `gh` and `git` executors for the new-candidate, refresh, cancelled-run, and no-evidence paths.

## 3. Workflow and governance

- [ ] 3.1 Add `.github/workflows/nightly-regression-triage.yml` triggered by `workflow_run` on `Full regression` and `Release`, gated to failures and scheduled release runs, with the App identity, the commit/push step, and the open-or-refresh step; add the `workflow_dispatch` run-id input.
- [ ] 3.2 Register the workflow in `config/github-repository-governance.json`, recognise the `nightly-regression-triage` authority in `github-repository-governance.mjs`, and extend the governance tests.
- [ ] 3.3 Document the workflow in `docs/ci-release-runbook.md` (validation-by-trigger table and the failure section).
- [ ] 3.4 Dry-run the workflow against a real failed run and confirm the draft pull request, its body layout, and that finalization accepts the scaffolded change without a spec delta.
