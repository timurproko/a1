## 1. Matrix Script

- [ ] 1.1 Add `scripts/release/publication-validation-matrix.mjs` exporting the frozen lane list and a mode-to-matrix function, with a `--mode` CLI that prints the matrix JSON; verify `develop` returns the three Node 24 lanes, `nightly` and `stable` return all four, and an unknown mode throws.
- [ ] 1.2 Emit `validate_matrix` from the `plan` job through that script and consume it with `fromJson` in the `validate` job in place of the literal include list; verify no other job or artifact name depends on a specific lane.

## 2. Guardian Cache

- [ ] 2.1 Add the pinned `Swatinem/rust-cache` step to the publication `guardians` job before the locked release build with the `native/process-guardian` workspace; verify the build command, artifact upload, and artifact manifest are unchanged.

## 3. Preparation Phase Timing

- [ ] 3.1 Record `installMs`, `proxySynchronizationMs`, and `installedIdentityMs` under `preparation.phases` in the exact-package preparation receipt while keeping `durationMs` as the outer total, require them in `assertReceipt`, and copy them into the preparation evidence and the prepare command printed summary; verify the receipt digest still covers them and the existing receipt tests keep passing.

## 4. Governance, Documentation, And Evidence

- [ ] 4.1 Replace the publication-matrix literal pin in `test/repository-governance/full-regression-policy.test.ts` with assertions that the `validate` job consumes the plan output and that the matrix script returns the expected lanes per mode; verify the Full regression matrix pin is unchanged.
- [ ] 4.2 Add a governance assertion that the publication `guardians` job caches the guardian workspace with the same pinned action as the development workflow; verify the pin matches exactly.
- [ ] 4.3 State the preview lane policy in `docs/ci-release-runbook.md` and the phase attribution in `docs/validation.md`; verify the runbook table pins in `ci-release-runbook.test.ts` still hold.
- [ ] 4.4 Run focused matrix, receipt, tier, and governance tests plus typechecking and record the commands and outcomes; record the first post-merge `npm run develop` lane count, guardian duration, and preparation phase split as the post-merge evidence.
