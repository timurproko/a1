# Rollout validation evidence

Status: **validation and branch enforcement complete**

## Completed evidence

- Final cross-cutting pull-request advisory run: [Development validation 32463470010](https://github.com/timurproko/a1/actions/runs/32463470010), commit `cb4ec6ab098bbad5f2e1c13f0846d3d790b4dccf`, successful.
  - Impact planner correctly selected fail-closed `full-release` because the change contains workflow/toolchain changes and a deleted package test.
  - Planner job: 22s.
  - Owned validation: 162.103s.
  - Validation job wall time: 3m40s including checkout, setup, `npm ci`, artifact handling, and post-job work.
  - Required aggregator: 5s, successful as `Development validation required`.
  - Tier timing: pack 1.268s; typecheck 5.745s; architecture 2.193s; customization 0.414s; Pi report 1.257s; dependency policy 3.360s; broad Vitest 52.036s; package smoke 3.169s; clean package installation 92.658s.
- Earlier cross-cutting advisory run 32459418547 completed owned validation in 193.96s, including 129.00s for the previous package-install implementation. The final run reduced owned validation by 31.857s (16.4%) while preserving the fail-closed complete suite.
- Feature-only advisory comparison used temporary non-merge PR #2 at exact commit `4500be53f12cc18f27faafa6bd9b55881f43944a`:
  - scoped run [32464447485](https://github.com/timurproko/a1/actions/runs/32464447485) selected only `invariants`, `fast`, and `structured-runtime-integration`; it passed in 44.453s owned validation and 1m40s validation-job wall time;
  - the scope correctly omitted package smoke, clean package installation, dependency policy, launch, Pi, and release/update gates for a workspace-only comment change;
  - explicit full override run [32464644718](https://github.com/timurproko/a1/actions/runs/32464644718) passed every non-physical tier on the same commit;
  - full owned validation was 422.316s under concurrent runner/network load, of which clean npm installation consumed 349.198s; all relevant scoped outcomes also passed in the full run;
  - no missing or unnecessarily broad workspace mapping was found. PR #2 was closed without merge and its temporary remote branch was deleted.
- Post-merge default-branch validation at `2ccb23666c03920fd3112ea2249f2e4152d8f206` passed:
  - automatic `develop` CI run [32464350924](https://github.com/timurproko/a1/actions/runs/32464350924);
  - complete non-physical Full regression run [32464376454](https://github.com/timurproko/a1/actions/runs/32464376454), 179.637s owned validation;
  - preview candidate run [32464378769](https://github.com/timurproko/a1/actions/runs/32464378769), which built `0.1.1-dev.4` once, passed full validation in 207.354s, and uploaded exact immutable evidence marked `uncertified-development-preview`, physical/cross-platform `deferred`, and `stableEligible=false`;
  - no preview publisher was invoked.
- Final three-platform stable dry run: [Build stable candidate 32469289917](https://github.com/timurproko/a1/actions/runs/32469289917), temporary non-merge fixture commit `f8bdec9d2310315b5da443c9dfd32f5cddac5f0b`, successful.
  - packed `@timurproko/a1@0.1.1` once and fanned identical integrity `sha512-XKfJdtUDXTyB4Ht64YbKZeN/ewiapQFflVkspqqi+pVagpXqv6RJQdyTi5C5LZ3MugMT+Fz88wgmMo2AJDGhzQ==` and shasum `5e5af1c1ea2dfdbb492c5e454b25881aee11076e` to all platforms;
  - Windows passed full automated validation and clean installation in 193.956s owned time (53.106s broad suite, 125.909s clean install), 4m09s platform-job wall time;
  - Linux passed in 52.381s owned time (33.994s broad suite, 6.012s clean install), 1m18s platform-job wall time;
  - macOS passed in 48.435s owned time (32.520s broad suite, 4.905s clean install), 1m11s platform-job wall time;
  - the complete aggregator accepted exactly `win32`, `linux`, and `darwin`, while retaining `stableEligible=false` and `physical=required` because this was a non-develop dry run;
  - preliminary fail-closed dry runs exposed and led to corrections for same-step digest environment handling, Unix socket length, Windows path simulation, portable ANSI/CWD fixture normalization, Unix npm global layout, macOS realpath entry identity, and one-element evidence extraction;
  - npm still returned 404 for `@timurproko/a1@0.1.1`; no stable tag, physical certification, publisher, or npm upload was invoked. The temporary fixture branch is not eligible for `.github/workflows/certify-stable.yml`, which requires the automated run head branch to be `develop`.
- Final local complete non-physical release validation passed on Windows:
  - broad suite: 139 files / 752 tests;
  - package smoke: 2 tests, 1.54s Vitest duration;
  - clean package installation: 1 test, 13.25s Vitest duration;
  - exact release verdict emitted for `win32-x64`.
- Stable no-publish plan dry run passed for a synthetic exact certified `@timurproko/a1@1.2.0` tarball via `scripts/dry-run-stable-publication.mjs`. The command emitted a plan only and did not invoke npm.
- The pre-authorization GitHub ruleset API dry run reported zero live rulesets and proposed two creates (`a1-protect-develop`, `a1-protect-master`) with `mutationPerformed=false`.
- After the reviewed solo-maintainer safeguard was merged to `develop` and post-merge development CI run [32471216096](https://github.com/timurproko/a1/actions/runs/32471216096) passed, the maintainer explicitly authorized ruleset application.
- `scripts/check-github-rulesets.mjs --apply --confirm apply-a1-ci-rulesets` created and API-verified active rulesets `a1-protect-develop` (ID `21140393`) and `a1-protect-master` (ID `21140395`). The captured machine-readable result is `evidence/github-rulesets-apply.json`.
  - `develop` requires pull requests, an up-to-date successful `Development validation required` status, and resolved review threads; deletion and non-fast-forward updates are blocked.
  - `master` requires pull requests, an up-to-date successful `Stable candidate required` status, and resolved review threads; deletion and non-fast-forward updates are blocked.
  - Both rulesets are active, have no bypass actors, require zero approving reviews, and disable last-push approval. This preserves the authorized release path for the repository's current sole collaborator without permitting direct pushes.
  - An independent post-apply dry run read both live definitions from the API and reported `0 create`, `0 update`, `2 unchanged`, `mutationPerformed=false`, and `liveRulesetCount=2`.
- `openspec validate optimize-ci-release-validation --strict` passed.
- Governance assertions prove candidate/certification workflows contain no npm publication and both publishers contain no checkout, install, build, or test path.

## Advisory budget interpretation

The feature-only owned validation completed in 44.453s and its validation job in 1m40s, within the under-two-minute target. The cross-cutting implementation selected complete package validation; its 162.103s owned validation is recorded as a full fallback baseline, not a feature-only budget failure. Clean npm installation remains the dominant hosted-runner cost and is excluded from ordinary non-package-sensitive development plans.

The publication-under-one-minute target was not measured because no publisher was invoked during certification. Publication workflows are thin by construction; no timing is inferred from source validation.

## Post-merge enforcement result

Task 6.3 is complete. Explicit maintainer authorization was obtained, both reviewed rulesets were applied, and exact post-apply API reconciliation found no drift. No certification command in this validation invoked either npm publisher.
