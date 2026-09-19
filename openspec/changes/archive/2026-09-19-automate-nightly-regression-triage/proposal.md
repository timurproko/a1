## Why

A failed nightly run (`Full regression` at 02:47 UTC or the scheduled `Release` validation at 03:17 UTC) currently reaches the maintainer only as a GitHub failure email. Starting the fix then means opening the run, reading four lane summaries, downloading the evidence artifacts, and reconstructing which owners, tests, and merges since the last green night are involved before any implementation can begin. The repository already turns a nightly Pi upstream check into a draft pull request with its evidence and an OpenSpec scaffold; nightly regression failures should get the same treatment so the maintainer starts from a scoped fix candidate instead of an inbox.

## What Changes

- Add a `Nightly regression triage` workflow that runs when `Full regression` or a scheduled `Release` run completes with a failure, minting the archive App identity so it can push a branch and open a pull request without touching `develop`.
- Add a repository script that reads the failed run: it downloads the lane evidence artifacts, lists every failed validation command with its owning scopes per platform/Node lane from the tier result (`full-regression.json`, or the release lane's `<platform>.json`), takes the test files from the failed command's own arguments, extracts a bounded excerpt of failing test names and assertion lines from the failed job logs, and lists the `develop` commits between the last successful run of that workflow and the failed head as suspect merges.
- Open one draft pull request `fix/nightly-regression-<date>` from the failed head's `develop` with an OpenSpec change `fix-nightly-regression-<date>` scaffolded (proposal, design, tasks) and a repository-layout body: `## Proposal`, `## Implementation` carrying the evidence, and the `## Automation` fence. The maintainer continues implementation in that same pull request under the ordinary delivery rules.
- Refresh instead of duplicate: a later failure whose failed owner set matches an open triage pull request appends that night's evidence to the existing body and change; a different failed owner set opens a new candidate. A run that is cancelled, that fails before any lane produced evidence, or a manually dispatched publication records why it proposed nothing.
- Add the delivery rule that a `fix/nightly-regression-<date>` candidate is handed off only after a dispatched Full regression of the completed fix head passes and is recorded in the change's design evidence, because ordinary pull-request validation does not run the exhaustive owners the nightly failed on; the scaffolded tasks name that step.
- Register the workflow in `config/github-repository-governance.json` with its triggers, permissions, trusted source, and a `nightly-regression-triage` authority, and document it in the CI release runbook.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: a failed nightly regression or scheduled release validation proposes its fix as a draft pull request with the failure evidence, without changing publication authority or the failure's own visibility.

## Impact

New files: `.github/workflows/nightly-regression-triage.yml`, `scripts/release/propose-regression-fix.mjs` with a pure `regression-triage-report.mjs` (body and scaffold rendering, log-excerpt extraction, dedupe key) and its `.d.mts`, and tests under `test/repository-governance/`. Modified: `config/github-repository-governance.json`, `scripts/governance/github-repository-governance.mjs` (recognise the new authority), `docs/ci-release-runbook.md`, `openspec/config.yaml` and `.agents/skills/change-delivery/SKILL.md` (the Full regression proof rule), and the `continuous-integration` spec. The triage reads artifacts and logs through `gh` with the App token; it never re-runs validation, never edits `develop`, never marks the pull request ready, and never merges. Both nightly workflows keep failing exactly as they do today; the triage only adds the proposal. The scaffolded change carries no spec delta because the automation cannot know which capability the fix touches; it sets `skip_specs: true`, which strict validation and finalization both accept, and the maintainer replaces the skip with a delta when the fix changes a requirement.
