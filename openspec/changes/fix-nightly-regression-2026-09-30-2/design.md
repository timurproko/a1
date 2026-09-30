## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

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
