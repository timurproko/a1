# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/enable-defender-only-for-startup-launches` after rebasing onto the merged `develop` that contains the recorded startup budget delivery. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Focused tests

| Command | Outcome |
| --- | --- |
| `npx vitest run test/repository-governance/validation-tier.test.ts` | 23 tests passed. Four are new: one shared preparation written and handed off, one refusal without a planned consumer, a verified build, or an exact candidate, one handoff consumed without a second install, and one contradictory and one unverifiable handoff rejected without installing or executing an owner. |
| `npx vitest run test/repository-governance/full-regression-policy.test.ts test/repository-governance/ci-release-runbook.test.ts test/repository-governance/package-suite-ownership.test.ts test/foundation/startup` | 26 tests passed. The workflow order pins now assert that Defender follows preparation and precedes the consuming command in both workflows. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `node scripts/governance/check-docs-governance.mjs` | `Docs-sensitive governance OK`. |
| `node scripts/governance/check-code-documentation.mjs --mode full` | `Code documentation governance OK: no violations`. |
| `node scripts/governance/product-identifier-policy.mjs --check` | `946 files; 0 violations`. |

## Typechecking

`npx tsgo -p tsconfig.json --noEmit` reports no error in any file changed by this delivery. The isolated worktree additionally reports pre-existing unrelated `#pi-tui` alias resolution errors that do not occur in the primary `develop` checkout.

## Behaviour preserved

The installation policy, the single preparation count, the per-owner verification before and after each invocation, the end-of-run cleanup owner, and the `defender-prerequisite` phase are unchanged. Without `--exact-package-handoff` the lazy path is untouched, which the retained shared-preparation, contradictory-consumer, preparation-failure, and mutation-detection cases continue to prove.

## Not verified locally

The saved time is a hosted Windows property. The first exact-head publication run after merge is the evidence: the `exact-package-preparation` outcome duration on both Windows lanes should fall from 114 to 156 seconds to well under 40 seconds, and `"phase":"defender-prerequisite","status":"passed"` must still appear in the startup gate.
