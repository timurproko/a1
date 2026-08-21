# Rollout validation evidence

Status: **partial; enforcement intentionally not applied**

## Completed evidence

- Final cross-cutting pull-request advisory run: [Development validation 32463470010](https://github.com/timurproko/a1/actions/runs/32463470010), commit `cb4ec6ab098bbad5f2e1c13f0846d3d790b4dccf`, successful.
  - Impact planner correctly selected fail-closed `full-release` because the change contains workflow/toolchain changes and a deleted package test.
  - Planner job: 22s.
  - Owned validation: 162.103s.
  - Validation job wall time: 3m40s including checkout, setup, `npm ci`, artifact handling, and post-job work.
  - Required aggregator: 5s, successful as `Development validation required`.
  - Tier timing: pack 1.268s; typecheck 5.745s; architecture 2.193s; customization 0.414s; Pi report 1.257s; dependency policy 3.360s; broad Vitest 52.036s; package smoke 3.169s; clean package installation 92.658s.
- Earlier cross-cutting advisory run 32459418547 completed owned validation in 193.96s, including 129.00s for the previous package-install implementation. The final run reduced owned validation by 31.857s (16.4%) while preserving the fail-closed complete suite.
- Final local complete non-physical release validation passed on Windows:
  - broad suite: 139 files / 752 tests;
  - package smoke: 2 tests, 1.54s Vitest duration;
  - clean package installation: 1 test, 13.25s Vitest duration;
  - exact release verdict emitted for `win32-x64`.
- Stable no-publish plan dry run passed for a synthetic exact certified `@timurproko/a1@1.2.0` tarball via `scripts/dry-run-stable-publication.mjs`. The command emitted a plan only and did not invoke npm.
- GitHub ruleset API dry run reported zero live rulesets and proposed two creates (`a1-protect-develop`, `a1-protect-master`) with `mutationPerformed=false`.
- `openspec validate optimize-ci-release-validation --strict` passed.
- Governance assertions prove candidate/certification workflows contain no npm publication and both publishers contain no checkout, install, build, or test path.

## Advisory budget interpretation

The under-two-minute development target applies to ordinary feature-only changes. This change is intentionally cross-cutting and selected complete package validation; its 162.103s owned validation is therefore recorded as a full fallback baseline, not a feature-only budget failure. Clean npm installation remains the dominant hosted-runner cost and is excluded from ordinary non-package-sensitive development plans.

The publication-under-one-minute target cannot be measured safely until the immutable-artifact publisher exists on the default branch and an approved candidate is available. Publication workflows are thin by construction; no timing is inferred from source validation.

## Required post-merge evidence

The following cannot be completed from a pull-request-only workflow definition and remain unchecked in `tasks.md`:

1. Merge the workflows to default branch `develop`.
2. Run a representative feature-only advisory scenario and compare its selection with a complete run (task 3.3).
3. Dispatch a preview candidate dry run from `develop` without invoking its publisher.
4. Prepare an actual final SemVer commit and run the Windows/Linux/macOS stable candidate matrix. Run independent isolated physical evidence only on configured `a1-physical-*` workers.
5. Obtain explicit maintainer authorization, apply the reviewed rulesets, and capture post-apply API evidence (task 6.3).
6. Record final candidate/publication wall timings and mark task 6.4 only after all preceding evidence succeeds.

No ruleset mutation was performed during this evidence collection. No certification command in this validation invoked either npm publisher.
