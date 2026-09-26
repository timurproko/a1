## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Release #167](https://github.com/timurproko/a1/actions/runs/36230472475) (attempt 1, schedule) on `92e3ed3` at 2026-09-26T08:40:16Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on win32-node24 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 1010^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 2516^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 510^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 1264^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mrecovers from corrupt codec input and never forwards arbitrary error text ^[[33m 451^[[2mms^[[22m^[[39m
       ^[[31m❯^[[39m test/integrations/pi/engine/runtime-integration.test.ts ^[[2m(^[[22m^[[2m9 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 849^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m official Pi runtime integration^[[2m > ^[[22mcreates, rebinds, replaces, and disposes an isolated public runtime^[[32m 105^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m official Pi runtime integration^[[2m > ^[[22mloads Windows NUL cleanup inline across session replacement without changing profile extensions ^[[33m 372^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m official Pi runtime integration^[[2m > ^[[22msurfaces pinned Pi's model-scope warnings for unmatched patterns in the enabledModels setting^[[32m 45^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m official Pi runtime integration^[[2m > ^[[22mapplies the scoped model list and initial model from the enabledModels setting^[[32m 33^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m release-gating N-1 update transitions^[[2m > ^[[22mhandles idle, busy, stale, failed, rollback, and blocker-exit transitions without duplicate ownership ^[[33m 986^[[2mms^[[22m^[[39m
      ... 20 more lines in the run log
      ```

  - Lane Publication result failed in job `Publication result` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
      ##[error]Process completed with exit code 1.
      ```

  - Last successful Release run: [#166](https://github.com/timurproko/a1/actions/runs/36115423085) on `b466467`; 3 `develop` commits since:
    - `92e3ed3` fix(ui): correct project trust workflow (#590)
    - `686ba14` fix: add PR REST fallback (#592)
    - `251564e` chore(release): open 0.2.1-dev (#589)
