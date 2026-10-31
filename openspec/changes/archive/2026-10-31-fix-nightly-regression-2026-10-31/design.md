## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- The failure is environmental, not introduced by `b5cba40` (#852) or `27f992a` (#853): neither touches dependencies, and the registry deprecated the locked transitive `@smithy/core@3.36.2` (reached through `@earendil-works/pi-ai@1.4.0` -> `@aws-sdk/client-bedrock-runtime@3.1127.0`) for a custom-logger redaction bug (aws/aws-sdk-js-v3#8393) after Full regression #78 passed. Every dependent declares a caret `^3.x` range, so `npm update @smithy/core` re-resolves only that lockfile entry to the current non-deprecated `3.38.1` with no manifest, override, or Pi pin change. The deprecated-dependency policy stays unchanged and caught the upstream deprecation as designed, so no regression evidence gap was exposed.
- The dependency failure masked a second, code-caused failure that the exact-head PR Full regression exposed: `validation-ownership.test.ts` > "selects filesystem-heavy release cleanup only in the resource partition". It was introduced by `b5cba40` (#852), whose new `automatic-update-window.test.ts` and `update-child-window.test.ts` raised the tests reaching `src/foundation/release/bootstrap.ts` from 45 to 47. The selector keeps at most 24 reaching tests per changed path and ordered them alphabetically, so `release-gc.test.ts` moved from index 23 to 24 and fell out of the bound. The same ordering also dropped a module's own direct test: a change to `release-gc.ts` selected neither `release-gc.test.ts` partition. Order reaching tests by import distance, then name, so the bounded prefix keeps the nearest consumers. The 24-test bound, the 40-test UI selection budget, critical-test floors, and every assertion stay unchanged. A raised bound broke that budget, and a sixth release critical test exceeds the five-test owner limit, so neither was used. A new regression test pins that a widely imported module's direct test survives the bound.
- The next exact head then failed `test/composition/shared-settings-watch.test.ts` > "applies a setting saved by another tab to every running tab" on macos-15-node24 in two consecutive attempts. This is a product race in `watchSharedSettings`, not in the test. `fs.watchFile` takes its baseline stat asynchronously on the libuv thread pool. When the pool is busy, as in the parallel full suite, a peer save made right after watching starts lands before that baseline, becomes it, and is never reported. A running tab could miss another tab's setting change until the next save. Replace it with a synchronous stat baseline polled every 250 ms on an unref'd timer, keyed by inode and modification time (each atomic save renames a new file into place), and keep the existing tolerance for an unreadable or absent document. The startup graph had no byte headroom, so the new watcher is smaller than the old one rather than raising the baseline. A new test saturates the thread pool before the peer save; it fails on the previous watcher and passes on the new one.

## Evidence

- Reproduced locally on the draft head after merging current `develop` (`1d472e88`) with `npm ci --ignore-scripts && npm run check:deprecated`: the same single `@smithy/core@3.36.2 [registry]` violation with the identical path and reason.
- After `npm update @smithy/core`, the lockfile diff is exactly the one `node_modules/@smithy/core` entry (`3.36.2` -> `3.38.1`). `npm run check:deprecated` reports `Deprecated dependency policy OK (lockfile + registry)`, `npm ls @smithy/core --all` resolves every dependent to `3.38.1` without invalid entries, a clean `npm ci --ignore-scripts` succeeds, `npx tsgo -p tsconfig.json --noEmit` passes, and `npx vitest run test/repository-governance/deprecated-dependencies.test.ts` passes (5 tests). No Full regression dispatch was started on the draft; exact-head PR-selected Full regression remains the post-finalization gate. The orchestration failure of `Complete regression required` is the aggregate consequence of the failed lanes, not a separate cause. No known gaps; numbered-package nightly recovery is independent.
- PR-selected Full regression on finalized head `8b359894` (Development validation run 41188705758) confirmed `dependency-policy` passing on every lane and failed only `test/repository-governance/validation-ownership.test.ts` (1 of 5207 tests) on macos-15-node24, ubuntu-24.04-node24, and the windows-2025 node22/node24 core shards. It reproduced locally on the same head. Exported trees of `9fccb71` and `27f992a` showed 45 and 47 tests reaching `bootstrap.ts` with `release-gc.test.ts` at index 23 and 24, which places the cause in `b5cba40`. After the distance ordering, `release-gc.test.ts` is at index 13 of 47 for a `release-gc.ts` change and is selected in the resource partition. The nine ownership, impact, efficiency, refinement, replay, registry, and Full-regression policy test files pass (124 tests), including the previously failing test and the new regression test.
- Development validation run 41217041537 on `ef48877b`: the selector fix held on every lane. macos-15-node24 failed only `shared-settings-watch.test.ts` (1 of 5208 tests) in attempts 1 and 2. The windows-2025 node22 package shard failed attempt 1 in its Defender setup step (`Set-MpPreference` HRESULT `0x800106ba`) before any test ran. The failing test passed locally in isolation three times. A reproduction that saturates the thread pool with eight `pbkdf2` jobs before the peer save failed three of three runs on the old watcher with the CI assertion. After the fix the watch file passes five of five runs. The composition suite and the startup/module-graph and prompt-history boundary policy tests pass (13 files, 92 tests). `npm run check:architecture` passes with `src/composition/owned-settings.ts` at 2136 bytes against 2143 before. `npx tsgo -p tsconfig.json --noEmit` and code-documentation governance also pass.

- Run [Full regression #79](https://github.com/timurproko/a1/actions/runs/41161344675) (attempt 1, schedule) on `27f992a` at 2026-10-31T02:44:31Z:
  - `deprecated-dependencies` (`dependency-policy`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npm run check:deprecated`
    - Log excerpt:

      ```text
      Deprecated dependency policy failed (1):
      - @smithy/core@3.36.2 [registry]
          path: @timurproko/a1@0.2.7-dev -> @earendil-works/pi-coding-agent@1.4.0 -> @earendil-works/pi-ai@1.4.0 -> @aws-sdk/client-bedrock-runtime@3.1127.0 -> @smithy/core@3.36.2
          reason: Deprecated due to a bug in custom logger data redaction. See https://github.com/aws/aws-sdk-js-v3/issues/8393.
              "build-prerequisite"
      ##[error]Process completed with exit code 1.
      ##[group]Run if [ -f .artifacts/validation/full-regression.json ]; then
      ^[[36;1mif [ -f .artifacts/validation/full-regression.json ]; then^[[0m
      ^[[36;1m  node --input-type=module <<'NODE' >> "$GITHUB_STEP_SUMMARY"^[[0m
      ^[[36;1mimport { readFile } from "node:fs/promises";^[[0m
      ^[[36;1m  echo "Validation orchestration failed before producing owned outcomes." >> "$GITHUB_STEP_SUMMARY"^[[0m
      ^[[36;1mfi^[[0m
      shell: /bin/bash --noprofile --norc -e -o pipefail {0}
      env:
        FULL_SOURCE: 27f992af0ceff4dfc40d49586bdc3cf02956f435
      ```

  - Lane Full regression / Complete regression required failed in job `Full regression / Complete regression required` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
        if (jobsResult !== "success" || records.length !== FULL_LANES.length) throw new Error("complete-regression jobs or evidence are incomplete");
                                                                                    ^
      Error: complete-regression jobs or evidence are incomplete
          at requireFullLanes (file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:131:79)
          at file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:174:20
          at ModuleJob.run (node:internal/modules/esm/module_job:561:25)
          at async node:internal/modules/esm/loader:647:26
      ##[error]Process completed with exit code 1.
      Post job cleanup.
      [command]/usr/bin/git version
      git version 2.56.0
      Temporarily overriding HOME='/home/runner/work/_temp/250c868d-f172-4d8e-943a-507852333128' before making global git config changes
      ```

  - Last successful Full regression run: [#78](https://github.com/timurproko/a1/actions/runs/40994783155) on `9fccb71`; 2 `develop` commits since:
    - `27f992a` fix: dim entire modal backdrop (#853)
    - `b5cba40` fix: refine automatic update feedback (#852)
