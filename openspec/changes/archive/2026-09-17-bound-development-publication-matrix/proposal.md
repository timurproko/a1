## Why

A green development publication still takes about 10.5 minutes. Its critical path is `guardians -> package -> validate -> publish`, and inside it two costs are avoidable for a numbered preview: the Windows Rust guardian build runs uncached and gates the `package` job at about 60 seconds, and the two Windows validation lanes run in parallel so the slower `win32-node22` lane (6 m 41 s on `0.1.8-dev.444`, against 4 m 40 s for `win32-node24`) sets the job duration. Nightly publication already runs every development head on all four lanes within a day, so a preview does not need the second Windows runtime to keep Node 22 covered. Separately, the shared exact-package preparation records one lump duration, which hid the fact that the Defender reorder saved nothing; the next latency decision needs the installation, proxy synchronization, and identity walk timed apart.

## What Changes

- Derive the publication validation matrix from the publication mode through one reviewed repository script: development previews validate the exact package on the three Node 24 lanes; nightly and stable publication keep all four lanes, and Full regression is unchanged.
- Cache the Rust guardian compiler intermediates in the publication `guardians` job with the same pinned cache action the development workflow already uses, keeping the locked release build, its artifact manifest, and its identity recording unchanged.
- Time the installation, proxy synchronization, and installed-identity walk separately inside the exact-package preparation receipt and evidence, keeping the existing total.
- Update the governance pins that read the publication matrix from the workflow literal so they read the matrix script instead, and state the lane policy in the CI runbook.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Bound development-preview validation to the Node 24 lanes with Node 22 coverage from nightly and complete regression, allow a warm native guardian compiler cache under the existing compiler-intermediate rule, and attribute shared preparation cost by phase.

## Impact

Implementation affects `.github/workflows/release.yml` (`plan`, `guardians`, and `validate` jobs), a new `scripts/release/publication-validation-matrix.mjs`, `scripts/release/exact-package-preparation.mjs` and its declaration, the governance tests that pin the publication matrix and preparation receipt, `docs/ci-release-runbook.md`, and `docs/validation.md`. It does not change which scopes a preview runs on any lane, the pack-once and exact-byte authority, the startup budgets or their enforcement modes, Full regression, or the nightly matrix.
