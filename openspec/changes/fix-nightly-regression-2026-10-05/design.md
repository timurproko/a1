## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #53](https://github.com/timurproko/a1/actions/runs/37291195028) (attempt 1, schedule) on `34b97d2` at 2026-10-05T09:36:47Z:
  - `vitest-update-predecessor` (`update-predecessor`) failed on windows-2025-node24 (package shard) with exit 1.
    - Tests: `test/foundation/release/update-predecessor.integration.test.ts`
    - Log excerpt:

      ```text
      ^[[2m Test Files ^[[22m ^[[1m^[[32m1 passed^[[39m^[[22m^[[90m (1)^[[39m
      ^[[2m      Tests ^[[22m ^[[1m^[[32m3 passed^[[39m^[[22m^[[90m (3)^[[39m
      ^[[2m   Start at ^[[22m 09:42:18
      ^[[2m   Duration ^[[22m 20.06s^[[2m (transform 334ms, setup 21ms, collect 492ms, tests 19.29s, environment 0ms, prepare 60ms)^[[22m
      ^[[1m^[[46m RUN ^[[49m^[[22m ^[[36mv3.2.7 ^[[39m^[[90mD:/a/a1/a1^[[39m
      ^[[2m Test Files ^[[22m ^[[1m^[[32m1 passed^[[39m^[[22m^[[90m (1)^[[39m
      ^[[2m      Tests ^[[22m ^[[1m^[[32m6 passed^[[39m^[[22m^[[90m (6)^[[39m
      ^[[2m   Start at ^[[22m 09:42:39
      ^[[2m   Duration ^[[22m 2.77s^[[2m (transform 66ms, setup 23ms, collect 44ms, tests 2.44s, environment 0ms, prepare 60ms)^[[22m
      ^[[1m^[[46m RUN ^[[49m^[[22m ^[[36mv3.2.7 ^[[39m^[[90mD:/a/a1/a1^[[39m
      ^[[2m Test Files ^[[22m ^[[1m^[[32m1 passed^[[39m^[[22m^[[90m (1)^[[39m
      ^[[2m      Tests ^[[22m ^[[1m^[[32m7 passed^[[39m^[[22m^[[90m (7)^[[39m
      ^[[2m   Start at ^[[22m 09:42:42
      ^[[2m   Duration ^[[22m 49.71s^[[2m (transform 353ms, setup 24ms, collect 1.24s, tests 48.19s, environment 0ms, prepare 59ms)^[[22m
      ^[[1m^[[46m RUN ^[[49m^[[22m ^[[36mv3.2.7 ^[[39m^[[90mD:/a/a1/a1^[[39m
      [startup-budget] node=v24.21.0 profile=a1 kind=post-update elapsed=1257ms budget=2000ms
      [validation-phase] {"schema":"a1-validation-phase-v1","fixture":"package-startup","invocation":"9f1dbf3e-f657-40c3-99a0-ad4e7469312f","nodeVersion":"v24.21.0","platform":"win32","architecture":"x64","head":"34b97d22e10f4f733190c5b6c00cd41ab5057c84","runId":"37291195028","runAttempt":"1","runnerOS...
      [validation-phase] {"schema":"a1-validation-phase-v1","fixture":"package-startup","invocation":"9f1dbf3e-f657-40c3-99a0-ad4e7469312f","nodeVersion":"v24.21.0","platform":"win32","architecture":"x64","head":"34b97d22e10f4f733190c5b6c00cd41ab5057c84","runId":"37291195028","runAttempt":"1","runnerOS...
      ... 72 more lines in the run log
      ```

  - Lane Full regression / Complete regression required failed in job `Full regression / Complete regression required` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
        if (jobsResult !== "success" || records.length !== FULL_LANES.length) throw new Error("complete-regression jobs or evidence are incomplete");
                                                                                    ^
      Error: complete-regression jobs or evidence are incomplete
          at requireFullLanes (file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:123:79)
          at file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:166:20
          at ModuleJob.run (node:internal/modules/esm/module_job:561:25)
          at async node:internal/modules/esm/loader:647:26
      ##[error]Process completed with exit code 1.
      Post job cleanup.
      [command]/usr/bin/git version
      git version 2.55.0
      Temporarily overriding HOME='/home/runner/work/_temp/3dbf9c08-4583-4e6f-9a03-2663265ccece' before making global git config changes
      ```

  - Last successful Full regression run: [#52](https://github.com/timurproko/a1/actions/runs/37190100443) on `7dafde8`; 1 `develop` commit since:
    - `34b97d2` fix(release): align progress with Pi accent (#671)
