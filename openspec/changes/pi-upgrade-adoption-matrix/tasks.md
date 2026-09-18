## 1. Re-run safety

- [ ] 1.1 In `.github/workflows/pi-upstream-sync.yml`, read the remote proposal branch before pushing: recreate and force-push only when every commit above `develop` is the bot's; otherwise post the fresh report as a pull-request comment and leave the branch. Add the `refresh` dispatch input that checks out the existing proposal branch and runs the derived steps and gates on its head.
- [ ] 1.2 In `pi-upgrade-report.mjs` and `propose-pi-upgrade.mjs`, wrap the generated report in `<!-- pi-upgrade-report -->` markers, refresh only between them when the body already has them, and write the OpenSpec scaffold only when the change directory is absent.
- [ ] 1.3 Skip by label: before proposing, the workflow lists closed pull requests for `chore/pi-<version>` carrying the `pi-upgrade-skipped` label and treats those versions as skipped; the driver takes the skipped set (`--skip <version>...`) and proposes the newest published version newer than the pin that is not skipped, or none. A closed proposal without the label is proposed again; manual dispatch with `version` ignores skips. Declare the label in `config/github-repository-governance.json` and add an optional `PI_UPGRADE_FREEZE_UNTIL` repository variable the workflow honours before running the driver.

## 2. Public API surface

- [ ] 2.1 Add `scripts/pi/update-pinned-pi-public-api.mjs` (TypeScript compiler API over both package-root declaration entries; export kind, normalized declaration hash, A1 consumers from `src/` imports) and commit `config/baselines/pinned-pi-public-api.json` for the current pin; `--check` reports drift.
- [ ] 2.2 Add the driver's `public-api` step: refresh against the candidate into the artifact, diff against the baseline, list added, removed, and changed exports with consumers as adoption items; keep the evaluator's full compile output in the artifact and summarize it per file in the body.

## 3. Feature adoption matrix

- [ ] 3.1 Add `scripts/pi/update-pi-feature-adoption-matrix.mjs` and `config/baselines/pi-feature-adoption-matrix.json`: rows from the interactive baseline manifests, the presented settings, and the changelog "New Features" entries; dispositions `pinned`, `owned`, `diverged`, `declined`, `pending`, and `retired`; the refresher rewrites the upstream side only.
- [ ] 3.2 Record a disposition for every current row (the 0.85.1 additions included) with its behavior id, test, deviation id, or reason.
- [ ] 3.3 Add `test/repository-governance/pi-feature-adoption-matrix.test.ts`: no `pending` row on `develop`, evidence exists for `owned` and `diverged` rows, every manifest entry has a row, no row names a feature upstream no longer has unless `retired`.
- [ ] 3.4 Add the driver's `matrix` step: new rows become the body's "new upstream features" section, retired rows become review items.

## 4. Merge strategy and gate cascade

- [ ] 4.1 Add `upgradeStrategy` to every `owned-presentation` ledger record (`keep-owned` for the owned editor, theme unit, text helpers, and theme controller; `three-way` elsewhere); the ledger updater preserves it and the ledger check requires it.
- [ ] 4.2 In the driver, skip the merge for `keep-owned` copies, write their upstream delta to the artifact, and list them in the body; after the merge, record `parity`, `typecheck`, `architecture`, and `parity-suites` as `blocked` with the conflicted paths when markers remain; add the startup-graph baseline re-pin step.

## 5. Proof

- [ ] 5.1 Extend `test/repository-governance/pi-upgrade-report.test.ts` for the API delta section, the new-features section, blocked verdicts, kept copies, and marker-bounded refresh; add cases for the two refreshers' `--check` modes.
- [ ] 5.2 Run the driver against the current pin (`is current`) and, with `--version`, against the previous pin from a scratch checkout so the API delta and the new-feature rows for 0.85.1 are produced by the tooling; record the counts here.
- [ ] 5.3 Document the baselines, the strategies, the blocked verdicts, and the re-run rules in `docs/architecture/toolchain.md` and `docs/ci-release-runbook.md`; run `npm run typecheck`, `check:architecture`, `check:code-documentation`, the changed-documentation check, and the repository-governance suite.
