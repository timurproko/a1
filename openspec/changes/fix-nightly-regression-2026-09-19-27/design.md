## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #27](https://github.com/timurproko/a1/actions/runs/35436785254) (attempt 1, workflow_dispatch) on `19f1c42` at 2026-09-19T10:12:58Z:
  - `vitest-package-startup` (`package-startup`) failed on windows-2025-node22 with exit 1.
    - Tests: `test/foundation/release/package-startup.integration.test.ts`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 1471^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 3270^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 16x16 PNG byte-for-byte without decoding it ^[[33m 359^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 723^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 1726^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mrejects impossible output budgets instead of shrinking into an unreadable success ^[[33m 412^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mrecovers from corrupt codec input and never forwards arbitrary error text ^[[33m 793^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22mawaits termination of a busy real worker during disposal ^[[33m 1227^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22maborts active off-thread conversion and releases the slot for subsequent work ^[[33m 1566^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/repository-governance/project-structure-policy.test.ts ^[[2m(^[[22m^[[2m18 tests^[[22m^[[2m)^[[22m^[[32m 29^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m release-gating N-1 update transitions^[[2m > ^[[22mhandles idle, busy, stale, failed, rollback, and blocker-exit transitions without duplicate ownership ^[[33m 984^[[2mms^[[22m^[[39m
      ... 71 more lines in the run log
      ```

  - Last successful Full regression run: [#3](https://github.com/timurproko/a1/actions/runs/32616699736) on `6c97783`; 0 `develop` commits since:
