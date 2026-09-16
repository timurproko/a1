# Reduced development publication latency implementation evidence

## Scope and baseline

Implementation continues in draft PR [#442](https://github.com/timurproko/a1/pull/442) from approved planning commit `402b0388`, based on `origin/develop` commit `e48194b1`. The approved refinement also covers the candidate-receipt mismatch and startup-load isolation identified in the failed publication.

Pre-change hosted evidence is [Release run 35123367882](https://github.com/timurproko/a1/actions/runs/35123367882), Windows Node 22 [job 104887351938](https://github.com/timurproko/a1/actions/runs/35123367882/job/104887351938), source `e48194b1ee7c535bcebe7bce09c664a63f38687e`, candidate `0.1.8-dev.439`, candidate SHA-256 `91b459128a853432847453d99d764ace73af89b9cce668bd67c7c25c6880963e`.

| Pre-change phase | Duration | Finding |
| --- | ---: | --- |
| Lane-local candidate repack | 21,191 ms | The downloaded receipt lacked the lane build-receipt binding, so `candidate-pack` reported `receipt-missing-or-incompatible`. |
| Package-contract clean global install | 158,343 ms | First installation of the exact candidate. |
| Package-startup clean global install | 248,368 ms | Equivalent second installation in the same platform/runtime lane. |
| Complete Windows Node 22 job | 11m 36s | Publication was blocked after `pi` post-update startup measured 3,586 ms against the unchanged 2,000 ms budget. |

The immediately preceding runtime-equivalent source had passed Windows Node 22 `pi` post-update startup at 1,286 ms. The failed source changed governance/docs rather than runtime startup code, so the implementation isolates startup from package-contract load without weakening the gate or adding a retry.

## Implemented structure

- `package-install` planning now declares exactly one `exact-package-preparation` with count `1`, policy `npm-global-ignore-scripts-prefer-offline-v1`, and consumers ordered as `package-startup`, then `package-contracts`.
- The common runner performs one clean global install and one initial proxy synchronization, binds candidate/package/lane/run-attempt/policy/path/consumer identity in a receipt, verifies installed package bytes before and after every consumer, and owns final bounded cleanup.
- Startup executes immediately after preparation and before package contracts. Each consumer still receives a separate temporary mutable root; startup additionally removes inherited Node compile-cache configuration and records absence of data, runtime, configuration, database, and home state before materialization.
- Direct focused test execution retains the existing standalone installation fallback. Any partial or contradictory authoritative handoff fails instead of silently installing again.
- Release validation now rebinds downloaded candidate evidence with `.artifacts/validation/receipts/build.json`, allowing the compatible artifact to report `verified-exact-package` instead of repacking.

The structural plan inspection emitted:

```json
{"preparation":{"id":"exact-package-preparation","count":1,"policy":"npm-global-ignore-scripts-prefer-offline-v1","consumers":["package-startup","package-contracts"]},"invocations":["vitest-package-startup","vitest-package-contracts"]}
```

This deterministically removes one of the two equivalent hosted installs. Against the failed run, the removed second install plus avoided repack represented 269,559 ms (about 4m 30s) of observed lane work. Earlier Windows evidence put each duplicate install around 97-127 seconds, so hosted variance remains material and no guaranteed wall-clock saving is claimed before exact-head CI and a subsequent publication.

## Local verification

Executed from `.worktrees/reduce-develop-publication-latency` on 2026-09-16:

- `npm run typecheck --silent` — passed.
- `npm exec -- vitest run test/repository-governance/exact-package-preparation.test.ts test/repository-governance/package-install-fixture.test.ts test/repository-governance/validation-tier.test.ts test/repository-governance/package-suite-ownership.test.ts test/repository-governance/full-regression-policy.test.ts test/repository-governance/validation-suite-policy.test.ts test/repository-governance/integration-owner-registry.test.ts test/repository-governance/validation-receipt-workflows.test.ts test/repository-governance/release-gate-policy.test.ts test/repository-governance/resource-sensitive-validation.test.ts --no-file-parallelism --testTimeout=30000` — 10 files and 81 tests passed.
- `node scripts/release/run-validation-tier.mjs package-install --plan` plus a bounded structural assertion — one preparation and startup-first owner ordering passed.
- `openspec validate "reduce-develop-publication-latency" --strict` — passed.
- `node --check scripts/release/exact-package-preparation.mjs`, `node --check scripts/release/validation-tier.mjs`, and `git diff --check` — passed.

No prohibited local `test:fast`, `test:full`, or `test:release` aggregate was run. The exact packaged startup workload and publication workflow remain hosted evidence rather than local acceptance.

## Remaining acceptance evidence and gaps

Current finalized-head CI, actual hosted preparation duration/cleanup disposition, and post-merge publication timing remain pending. Those live measurements cannot be produced by focused local policy tests. There is no reviewed behavior gap: supported lanes, Defender prerequisite, startup scenarios, budgets, assertions, no-retry behavior, separate owner outcomes, and fail-closed publication authority remain in place.
