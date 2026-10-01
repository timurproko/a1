## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- The failure is not in the package tests. The nightly packed `0.2.2-dev.644` with only `dist/native/win32-x64`, so `package-surface.test.ts` correctly failed on Linux and macOS, which expect their own guardian; both Windows lanes passed because their native is present.
- #617 (`790138c1`) made `plan` depend on `approval`, which skips outside stable and candidate modes. `plan` restates `always()`, but `guardians` and `documentation` did not, so GitHub's implicit `success()` skipped both on every nightly. `package` accepted a skipped `guardians`, and `download-artifact` with a pattern matching nothing succeeds, so the Windows packing job packed only the guardian its own `npm ci` build produced. The skipped `documentation` job also meant nightly ran no full documentation review.
- `guardians` and `documentation` now restate `always() && needs.plan.result == 'success'`, matching every other job below `plan`. `package` accepts a skipped `guardians` only when no build is needed or stable adopts the candidate, and a skipped `documentation` only outside nightly and candidate modes, so a future skip fails the run instead of packing an incomplete package. No test, budget, or package assertion changes.
- `release-pipeline-policy.test.ts` now requires every job after `approval` to start its condition with `always()` and pins the tightened `package` prerequisites. No spec requirement changes.

## Evidence

- The `release-package-0.2.2-dev.644` artifact of the failed run holds 629 entries whose only native payload is `dist/native/win32-x64/{manifest.json,process-guardian.exe}`; the job list shows `Build process guardian` and `Full documentation review` skipped. [Publish #1](https://github.com/timurproko/a1/actions/runs/36552387091) on `dade587` failed the same Linux and macOS lanes with the same two jobs skipped, so every nightly since #617 was affected; `0.2.2-dev.644` never reached the registry.
- Against the unfixed `publish.yml`, the new policy test fails on `documentation: expected 'needs.plan.result == …' to match /^always()/` and the guardians condition; with the fix, `release-pipeline-policy.test.ts` (21 tests) passes on Windows/Node 24, as do `tsgo -p tsconfig.json --noEmit` and the `documentation-changed` tier. Publish runs only on schedule or `workflow_call`, so the next nightly is the end-to-end proof.

- Run [Publish #2](https://github.com/timurproko/a1/actions/runs/36698444509) (attempt 1, schedule) on `38530ce` at 2026-09-30T09:48:21Z:
  - `vitest-package-smoke-1` (`package-smoke`) failed on darwin-node24, linux-node24 with exit 1.
    - Tests: `test/foundation/release/package-surface.test.ts`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 937^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 2246^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 315^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 872^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mrecovers from corrupt codec input and never forwards arbitrary error text ^[[33m 311^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m merged branch cleanup workflow^[[2m > ^[[22mfails on deletion API errors and failed post-delete verification ^[[33m 307^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/ui/settings/persistence.integration.test.ts ^[[2m(^[[22m^[[2m13 tests^[[22m^[[2m)^[[22m^[[32m 34^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/features/launch/pi-tui-identity.test.ts ^[[2m(^[[22m^[[2m8 tests^[[22m^[[2m)^[[22m^[[32m 44^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/app/session-shell/quit-outro.test.ts ^[[2m(^[[22m^[[2m15 tests^[[22m^[[2m)^[[22m^[[32m 202^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/ui/settings/resolution.test.ts ^[[2m(^[[22m^[[2m13 tests^[[22m^[[2m)^[[22m^[[32m 7^[[2mms^[[22m^[[39m
      ^[[2m Test Files ^[[22m ^[[1m^[[32m375 passed^[[39m^[[22m^[[2m | ^[[22m^[[33m3 skipped^[[39m^[[90m (378)^[[39m
      ^[[2m      Tests ^[[22m ^[[1m^[[32m4160 passed^[[39m^[[22m^[[2m | ^[[22m^[[33m11 skipped^[[39m^[[90m (4171)^[[39m
      ^[[2m   Start at ^[[22m 09:52:08
      ^[[2m   Duration ^[[22m 209.26s^[[2m (transform 6.42s, setup 3.12s, collect 86.98s, tests 249.31s, environment 54ms, prepare 20.12s)^[[22m
      ... 33 more lines in the run log
      ```

  - Lane Publication result failed in job `Publication result` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
      ##[error]Process completed with exit code 1.
      ```

  - No successful Publish run is retained on `develop`; the suspect range is unbounded, start from the failed head.
