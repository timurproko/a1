# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/bound-development-publication-matrix` on top of `develop` at `4a70bf20`. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Focused tests

| Command | Outcome |
| --- | --- |
| `node scripts/release/publication-validation-matrix.mjs --mode develop` / `--mode nightly` / `--mode bogus` | Three Node 24 lanes; four lanes; `unknown publication mode: bogus`. |
| `npx vitest run test/repository-governance/exact-package-preparation.test.ts test/repository-governance/validation-tier.test.ts test/repository-governance/package-install-fixture.test.ts` | 32 tests passed. The real-install fixture now asserts the three phase durations exist and sum to at most the recorded total. |
| `npx vitest run test/repository-governance/full-regression-policy.test.ts test/repository-governance/ci-release-runbook.test.ts test/repository-governance/release-pipeline-policy.test.ts test/repository-governance/integration-owner-registry.test.ts` | 38 tests passed. The publication matrix pins now read the script per mode and assert the `validate` job consumes `needs.plan.outputs.validate_matrix`; the guardian cache pin matches the development workflow's action pin exactly. |
| `npx vitest run test/repository-governance` | 1024 of 1025 passed. The one failure, `terminal-architecture-policy.test.ts > passes the production tree`, passes in isolation and `node scripts/governance/check-architecture.mjs` reports `Architecture boundaries OK`; it is load-sensitive under the full parallel suite and unrelated to this change. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx tsgo -p tsconfig.json --noEmit` | 0 errors. |
| `node scripts/governance/check-architecture.mjs` | `Architecture boundaries OK`. |
| `node scripts/governance/check-docs-governance.mjs` | `Docs-sensitive governance OK`. |
| `node scripts/governance/check-code-documentation.mjs --mode full` | `Code documentation governance OK: no violations`. |
| `node scripts/governance/product-identifier-policy.mjs --check` | `946 files; 0 violations`. |

## Baseline this change is measured against

`0.1.8-dev.444` (run 35188466180, green, 10 m 24 s): `Build process guardian (windows-2025)` 59 s with no cache; `Validate win32-node24` 4 m 40 s; `Validate win32-node22` 6 m 41 s; `exact-package-preparation` 99 s and 152 s on those lanes as a single lump.

## Not verified locally

The lane count, the warm guardian duration, and the preparation phase split are hosted-runner properties. The first `npm run develop` after merge is the evidence: three `Validate` jobs, a warm `Build process guardian (windows-2025)` well under the 59 s baseline on the second run, and `phases.installMs` carrying almost all of `exact-package-preparation` on Windows.
