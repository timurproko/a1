# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/record-startup-budget-on-development-publication`. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Focused tests

| Command | Outcome |
| --- | --- |
| `npx vitest run test/foundation/startup` | 2 files, 8 tests passed. Covers evaluation, budget resolution, formatted message text, the thrown assertion, and the unchanged trace and compile-cache behavior. |
| `npx vitest run test/repository-governance/package-suite-ownership.test.ts test/repository-governance/full-regression-policy.test.ts test/repository-governance/ci-release-runbook.test.ts test/repository-governance/validation-tier.test.ts` | 4 files, 37 tests passed. Covers the retained Defender, profile, launch-kind, warmup, and workload pins plus the new per-channel enforcement pins. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `node scripts/governance/check-architecture.mjs` | `Architecture boundaries OK`. |
| `node scripts/governance/product-identifier-policy.mjs --check` | `944 files; 0 violations`. |
| `node scripts/governance/check-code-documentation.mjs --mode full` | `Code documentation governance OK: no violations`. |
| `node scripts/governance/check-docs-governance.mjs` | `Docs-sensitive governance OK`. |

## Startup graph

Moving the release-gate budget owner out of the `startup-runtime.ts` root reduced the eagerly reachable graph from 2 624 606 to 2 622 607 source bytes at an unchanged 142 files, measured with `inspectStartupReachability`. The baseline maximum in `config/startup-graph-baseline.json` was left untouched so this change does not compete with concurrent graph work for the same headroom.

## Typechecking

`npx tsgo -p tsconfig.json --noEmit` reports no error in any file changed by this delivery. The isolated worktree additionally reports pre-existing unrelated `#pi-tui` alias resolution errors that do not occur in the primary `develop` checkout, where the same command is clean.

## Not verified locally

The recorded and enforced publication lanes themselves run only on hosted Windows runners. The first exact-head workflow run is the evidence that the development lane resolves `record`, annotates an overrun, uploads `startup-<platform>.json`, and still publishes.
