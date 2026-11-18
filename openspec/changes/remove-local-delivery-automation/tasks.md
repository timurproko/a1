# Tasks

## 1. Pull-request validation runs tests only

- [ ] 1.1 Add `scripts/release/delivery-record.mjs` with its test: read the linked change, archive path and finalized head from a pull-request body, and a minimal read-only GitHub reader.
- [ ] 1.2 Rewire `development-validation-readiness.mjs`, `pr-full-regression.mjs` and the nightly-triage and Pi-upgrade report tests to it; drop the association check from readiness.
- [ ] 1.3 Remove the `acceptance` and `delivery` jobs, the acceptance route step and their outputs from `ci.yml`, and `acceptance-validation-route.mjs` with its test; keep the required aggregate's semantics for every remaining job.

## 2. Automatic merging covers release reopening only

- [ ] 2.1 Rename the manager and workflow to release reopening, remove documentation classification, archive handling and auto-merge disarming for other pull requests, and delete the exact merged head directly.
- [ ] 2.2 Move the merge planner next to the reopening classifier with its tests; delete `documentation-auto-merge.mjs`, `documentation-lifecycle.mjs` and their tests.
- [ ] 2.3 Update the Delivery caller's forwarded workflow name and the workflow inventory.

## 3. The repository's delivery scripts are gone

- [ ] 3.1 Delete the delivery, acceptance, archive, association, finalization, ready-refresh and merged-branch scripts, declarations and tests.
- [ ] 3.2 Delete the local cleanup scripts, the Claude worktree hooks, `.a1/worktree.json` and their tests; remove the hooks from `.claude/settings.json`.
- [ ] 3.3 Update `config/validation-ownership.json`, the naming and identity inventories, the governance inventory and package scripts so no removed file is named.

## 4. Guidance points at the shared workflow

- [ ] 4.1 Replace the delivery sections of `AGENTS.md` and `openspec/config.yaml` with the shared skill pointer; delete `.agents/skills/change-delivery` and the guidance tests.
- [ ] 4.2 Delete `docs/openspec-archive-automation.md` and `docs/local-worktree-cleanup.md`; correct every remaining reference in `docs/**`.

## 5. Specifications match

- [ ] 5.1 Confirm `npx openspec validate remove-local-delivery-automation --strict`, the architecture, naming, documentation and repository-governance checks pass.
