# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/restore-impact-selection` on top of `develop` at `35259d4a`. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Selector reproduction

| Command | Outcome |
| --- | --- |
| `node scripts/release/select-validation-impact.mjs --base e48194b1 --head 4c4ba3b2 --implementation-bound` (PR #441's range) | `prCore.mode` `impact`, 109 tests, 4 resource-sensitive tests, `governance` owner only, no integration owner; before the change the same range was `conservative` with 316 / 21 / 9. |
| `node scripts/release/validation-matrix.mjs --impact <that artifact>` | `include` has `core` and `resource`; `inactive` has the other seven entries. |
| Same selector over `5d1b93d7..35259d4a` (#448) and `b7a04300..5d1b93d7` (#447) | Both remain `conservative` with reason `invalidator` (`release.yml`, `validation-tier.mjs`), so validation-authority PRs still schedule all nine entries. |

## Focused tests

| Command | Outcome |
| --- | --- |
| `npx vitest run test/repository-governance/validation-impact.test.ts` | 10 tests passed: an implementation-bound documentation-shaped diff keeps the PR core and `impact` mode with no owner selected; a bound owned-source diff selects only that owner and its linked integration owner while manual dispatch stays `conservative`; the PR #441 replay selects `governance` only with zero integration owners. |
| `npx vitest run test/repository-governance/validation-job-selection.test.ts test/repository-governance/modular-validation-aggregate.test.ts` | 18 tests passed: the conservative matrix is all nine declared entries and covers every registered owner target; an ownerless impact selection schedules only the PR core, plus the resource partition when resource tests are selected, and an exempt selection schedules nothing; the CLI emits only `include` as the workflow output; the aggregate accepts a run with only the active entries' evidence and rejects it once a scheduled entry's evidence is removed (`required modular outcome missing: startup/win32/node22`). |
| `npx vitest run test/repository-governance/impact-aware-validation-workflows.test.ts test/repository-governance/package-suite-ownership.test.ts test/repository-governance/validation-receipt-workflows.test.ts test/repository-governance/development-validation-required.test.ts test/repository-governance/acceptance-validation-route.test.ts` | 48 tests passed with the matrix pins reading `DEVELOPMENT_VALIDATION_MATRIX` and the workflow pinned to `fromJSON(needs.changes.outputs.modular-matrix)`. |
| `npx vitest run test/repository-governance` | 1041 of 1043 passed. `startup-descriptor.test.ts > binds the built artifact` needs `dist/`, which `npm ci --ignore-scripts` does not produce; `terminal-architecture-policy.test.ts > passes the production tree` passes in isolation and is load-sensitive under the full parallel suite. Both are unrelated to this change. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx openspec validate restore-impact-selection --strict` | `Change 'restore-impact-selection' is valid`. |
| `npx tsgo -p tsconfig.json --noEmit` | 0 errors. |
| `node scripts/governance/check-architecture.mjs` | `Architecture boundaries OK`. |
| `node scripts/governance/check-docs-governance.mjs` | `Docs-sensitive governance OK`. |
| `node scripts/governance/check-code-documentation.mjs --mode full` | `Code documentation governance OK: no violations`. |
| `node scripts/governance/product-identifier-policy.mjs --check` | `954 files; 0 violations`. |

## Baseline this change is measured against

Run 35126055417 (PR #441, 17.5 minutes wall clock, about 35 runner-minutes): all nine modular jobs scheduled, selection `conservative` with reason `manual-no-comparison`, 316 PR-core tests, 21 resource-sensitive tests, 9 integration owners; the startup job queued 10 minutes for a `windows-2025` runner. The six successful PR runs 35116715651 through 35128927073 were all conservative for the same reason.

## Not verified locally

This PR edits `ci.yml`, the selector, and the aggregate, so its own validation is conservative by the validation-authority rule and schedules all nine entries. The first ordinary post-merge PR is the evidence: its impact artifact should report `prCore.mode === "impact"` with owners matching its diff, its job list should contain only the scheduled entries, and its `changes` summary should list the unscheduled ones.
