## Why

Every CI repair on a version-3 pull request costs three commits. Finalization moves the active change into its dated archive and digests the archived tasks, evidence, and synchronized specs into `acceptance.md`, so a fix that records itself in `tasks.md` or `implementation-evidence.md` drifts from the manifest and the developer must revert the finalization, push the fix, and finalize again. PR #428 carried nine finalize/revert pairs in thirty commits; the last forty merged PRs average 4.7 commits each and the `Revert "docs(openspec): finalize ..."` shape appears in every high-churn one. The manifest also binds the target baseline, so a PR that was finalized before another merge cannot be revalidated without the same three commits. Developers spend their attention on a mechanical step whose inputs are all in the branch.

## What Changes

- Add a trusted `OpenSpec finalization` workflow on `pull_request_target` that, for a ready implementation-bound version-3 PR, runs the default-branch finalization policy against the PR head's OpenSpec tree and commits the result to the PR branch with the repository's archive App identity so ordinary exact-head validation runs on the finalized head. A draft PR is never finalized.
- Make finalization repeatable from the archived form: an already-finalized candidate whose archived tasks, evidence, deltas, acceptance list, or target baseline changed is re-finalized in place, keeping its archive date, instead of failing with drift. A candidate whose head is behind `develop` receives a merge of `develop` before re-finalization so the synchronized specs are rebuilt against the fresh baseline.
- Keep the PR body current: the workflow writes the emitted archive and manifest paths into the existing `openspec-implementation` fence only after the finalization commit is on the branch, and only when the body is unchanged since it was read.
- Keep the existing local `finalize-openspec-delivery.mjs` as an optional path with the same re-finalization behavior; a locally finalized head is verified by the workflow and left alone.
- Report an unfinalized ready head from the ordinary `Finalized delivery validation` job as awaiting automated finalization rather than as a bare `delivery-not-finalized` failure, and update the delivery runbook, skill, and governance inventory for the new authority.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Finalization is performed by trusted automation on the ready PR and is repeatable from the archived form; developers finalize locally only by choice.
- `github-repository-governance`: A trusted default-branch workflow commits finalization to the implementation branch with the event-triggering App identity, restricted to the change's OpenSpec paths and the PR body fence.
- `openspec-acceptance-review`: Candidate validation names automated finalization as the pending action for an unfinalized ready head and re-evaluates the head the automation publishes.

## Impact

Implementation affects `scripts/governance/openspec-delivery-finalization.mjs` and `finalize-openspec-delivery.mjs`, the new `scripts/governance/openspec-delivery-git.mjs`, `openspec-finalization-publication.mjs`, and `publish-openspec-finalization.mjs`, a new `.github/workflows/openspec-finalization.yml`, the `delivery` job summary in `.github/workflows/ci.yml`, `config/github-repository-governance.json` and `github-repository-governance.mjs`, `openspec/config.yaml`, `.agents/skills/change-delivery/SKILL.md`, `docs/openspec-archive-automation.md`, `docs/ci-release-runbook.md`, `docs/validation.md`, the finalization, publication, workflow, guidance, and governance tests, and the three capabilities above. It does not change what finalization produces, the conditional manifest schema, the manual-merge acceptance rule, the post-merge read-only verification, documentation auto-merge, or legacy version-1/version-2 publication.
