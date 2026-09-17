## Why

Every OpenSpec-driven pull request carries an `openspec-implementation` link, and the trusted router turns that into `implementation_bound=true`. `scripts/release/validation-impact.mjs` feeds that flag into `manualNoComparison`, which forces `mode: "conservative"`: all 316 PR-core tests, all 21 resource-sensitive tests, and every pull-request integration owner, on every PR. The six consecutive successful PR runs on 2026-09-16 were all conservative with reason `manual-no-comparison`; PR #441, a governance-and-documentation change, would have selected 109 tests, 4 resource tests, and zero integration owners under impact mode. The flag was introduced to stop a finalized archive-shaped diff from taking the documentation-only shortcut, which the `docsOnly` and `versionOnly` guards already do on their own; the `simplify-openspec-single-pr-delivery` design and the `continuous-integration` capability both say impact selection retains only the affected owners.

Separately, all nine modular matrix entries are scheduled on every code PR. In impact mode an inactive entry still checks out, sets up Node, downloads the impact artifact, and then exits after `resolve-validation-job.mjs` reports `active=false`; that is about one runner-minute each and a `windows-2025` queue slot for seven of them. Run 35126055417 waited ten minutes for a Windows runner before its startup job could start.

## What Changes

- Stop feeding `implementationBound` into `manualNoComparison` for both the PR-core and integration selections so an implementation-bound PR is selected by impact; the association still disables the documentation-only and version-only exemptions.
- Declare every Development modular job in one reviewed repository script, derive the active subset from the trusted impact selection in the `changes` job, and let the `modular` job take its matrix from that output so inactive entries are never scheduled; each scheduled job keeps resolving its own owners from the uploaded artifact, and the aggregate keeps requiring evidence for every selected owner.
- Share the owner-to-job mapping between the per-job resolver and the aggregate through that script, register the script as a selection invalidator, and repoint the governance pins that read the matrix literal at the declared list.
- Replace the fixture that asserted conservative selection for an implementation-bound documentation-shaped diff with fixtures for impact selection, an owned-source implementation-bound diff, a replay of PR #441's change list, matrix derivation per selection mode, and an aggregate that rejects a scheduled entry with no evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: An implementation-bound association disables only the documentation-only and version-only exemptions and never selects conservative ownership by itself; the modular matrix is derived from the trusted selection by a reviewed script and inactive entries are not scheduled.
- `change-delivery-workflow`: The finalized implementation candidate's applicable scopes come from the same impact classification as any other pull request.

## Impact

Implementation affects `scripts/release/validation-impact.mjs`, a new `scripts/release/validation-matrix.mjs` with its declaration, `scripts/release/resolve-validation-job.mjs`, `scripts/release/require-modular-validation.mjs`, `config/validation-ownership.json`, the `changes` and `modular` jobs in `.github/workflows/ci.yml`, the governance tests that pin the selector and the matrix, `docs/validation.md`, and `docs/ci-release-runbook.md`. It does not change which scopes a selected job runs, the resource-sensitive partition, the startup budget or its enforcement mode, the finalized-delivery validation lane, documentation auto-merge eligibility, Full regression, or publication.
