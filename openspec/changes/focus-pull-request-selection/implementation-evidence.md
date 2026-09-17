# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/focus-pull-request-selection` on top of `develop` at `c17efd7b` after `npm ci --ignore-scripts`. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Baseline this change is measured against

PR #455 (run 35204508906, mode `impact`): 323 PR-core tests, 21 resource-sensitive tests, all nine pull-request integration owners; every core owner carried `shared-support` for `test/fixtures/prompt-suggestion-conversations.ts` and every integration owner `coarse-owner` through it. Full regression had only `workflow_dispatch`; `update-predecessor` was the only exhaustive owner.

## Local replay

| Selection | Before | After |
| --- | --- | --- |
| `test/fixtures/prompt-suggestion-conversations.ts` alone | 8 owners, 324 tests, 21 resource, 10 integration owners linked | `pi`, 80 tests, 8 resource, 3 integration owners (`history-compatibility`, `image-compatibility`, `pi-release-resume`) |
| PR #455 change list (13 paths) | 8 owners, 323 tests, 21 resource, 9 pull-request integration owners | `release-package-update` + `pi`, 104 tests, 12 resource, 5 pull-request integration owners (`update-performance` and `update-predecessor` deferred as exhaustive) |
| `test/support/session-resume-fixture.ts` | 8 owners | `release-package-update` + `pi` |
| `test/support/no-such-helper.ts` (unreferenced) | 8 owners | 8 owners, reason `shared-support-declared` |

The graph scans 454 files under `test/`; `loadValidationOwnership` still completes well inside the classifier's existing budget (the self-selection run on this branch reported `classifierMs` in the same range as before).

## Focused tests

| Command | Outcome |
| --- | --- |
| `npx vitest run test/repository-governance/validation-ownership.test.ts` | 19 passed, including the import-graph attribution, transitive reach, declared fallback, missing-graph fallback, and PR #455 replay cases. |
| `npx vitest run test/repository-governance/integration-owner-registry.test.ts test/repository-governance/full-regression-policy.test.ts test/repository-governance/github-repository-governance.test.ts test/repository-governance/integration-impact.test.ts test/repository-governance/validation-impact.test.ts test/repository-governance/impact-aware-validation-workflows.test.ts test/repository-governance/ci-release-runbook.test.ts` | 58 passed: both exhaustive owners listed, the nightly cron pinned in the workflow and governance inventory, the runbook text pinned. |
| `npx vitest run test/repository-governance` | See the recorded run below. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx openspec validate focus-pull-request-selection --strict` | `Change 'focus-pull-request-selection' is valid`. |
| `npx tsgo -p tsconfig.json --noEmit` | 0 errors. |
| `node scripts/governance/check-architecture.mjs` | `Architecture boundaries OK`. |
| `node scripts/governance/check-docs-governance.mjs` | `Docs-sensitive governance OK`. |
| `node scripts/governance/check-code-documentation.mjs --mode full` | `Code documentation governance OK: no violations`. |
| `node scripts/governance/product-identifier-policy.mjs --check` | `967 files; 0 violations`. |
| `node scripts/release/select-validation-impact.mjs --base origin/develop --head HEAD` | `conservative` (this branch changes selector authority and the owner registry), as the bootstrap rule requires. |

## Not verified locally

Runner minutes are a hosted-runner property. Post-merge evidence: the first ordinary PR that touches a file under `test/support/` or `test/fixtures/` should show `shared-support` reasons naming the importing tests and fewer owners than the declared set; the first scheduled Full regression run (02:47 UTC) should appear in the Actions history with `update-performance` and `update-predecessor` executed and `STARTUP_BUDGET_ENFORCEMENT: fail`.
