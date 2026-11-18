## Why

Change delivery (draft promotion, OpenSpec finalization, the delivery check, ready pull-request refresh, merged-branch deletion, agent guidance and local cleanup) now lives in the shared `timurproko/MyGitWorkflows` repository, and #976 already routes this repository's pull-request events to it. The repository still carries its own copy of that automation: about forty scripts, their tests, three runbooks, an agent skill and three capability specifications. Two copies of one workflow drift, and a workflow update should not need a change here.

## What Changes

- Remove the repository's delivery, acceptance, archive, association, ready-refresh and merged-branch scripts with their tests, and the delivery and cleanup runbooks.
- Reduce pull-request validation to tests: remove the acceptance-record and finalized-delivery jobs and the acceptance route. Readiness still defers a linked pull request until the shared workflow records its finalized head, using a small local reader of that record.
- **BREAKING** Remove documentation auto-merge. Documentation pull requests follow the ordinary path. Automatic merging remains only for verified release reopening pull requests, and the manager no longer disarms auto-merge on other pull requests.
- Remove the local worktree cleanup tooling, the Claude worktree hooks and `.a1/worktree.json`. `a1 worktree complete` still leaves the checkout; removal is done with the shared `delivery cleanup` command.
- Replace the repository's delivery skill and the delivery sections of `AGENTS.md` and `openspec/config.yaml` with a pointer to the shared skill.
- Retire the `change-delivery-workflow`, `local-worktree-cleanup` and `openspec-acceptance-review` capabilities and the delivery requirements of `github-repository-governance` and `continuous-integration`.

Not in this change: requiring the shared `delivery / Delivery check` in the `develop` ruleset and the owner bypass, which need a live ruleset update, and removing `worktree complete` from the product.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: retired; the shared workflow owns these rules.
- `local-worktree-cleanup`: retired; the shared `delivery cleanup` command replaces it.
- `openspec-acceptance-review`: retired; acceptance is the plain list the shared workflow validates.
- `github-repository-governance`: delivery, archive, acceptance and documentation auto-merge requirements removed; release reopening auto-merge restated; delegation to the shared workflow added.
- `continuous-integration`: documentation auto-merge removed; final validation and release reopening restated without repository-owned delivery checks.

## Impact

- `.github/workflows/ci.yml`, `.github/workflows/documentation-auto-merge.yml` (renamed), `.github/workflows/delivery.yml`.
- `scripts/governance/**`, `scripts/release/development-validation-readiness.mjs`, `scripts/release/pr-full-regression.mjs`, `test/repository-governance/**`.
- `config/github-repository-governance.json`, `config/validation-ownership.json`, naming and identity inventories.
- `AGENTS.md`, `.agents/skills/change-delivery`, `.claude/settings.json`, `.a1/worktree.json`, `openspec/config.yaml`, `docs/**`.
- No product source under `src/` changes.
