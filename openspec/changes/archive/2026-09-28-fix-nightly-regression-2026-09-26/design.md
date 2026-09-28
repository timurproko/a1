## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- The failed product assertion completed, then the suite's one-shot fixture cleanup received `EBUSY` while removing `a1-pi-resume-hint-*` on Windows/Node 24. The same exact package and suite passed on Windows/Node 22, none of the three suspect commits changed this cleanup or runtime disposal path, and repeated focused runs with unchanged one-shot cleanup passed locally on Windows/Node 24. The failure is a transient Windows filesystem-release race rather than a product regression or an introducing commit in the suspect range.
- Keep runtime disposal, product assertions, test deadlines, and coverage unchanged. Give only this suite's recursive temporary-directory removal the documented `fs.rm` handling for transient `EBUSY`/`EPERM`/`ENOTEMPTY` failures: five retries with 100 ms linear backoff, consistent with other Pi integration cleanup.
- No implementation gap is known. The selected exact-head PR Full regression and `Development validation required` remain pending trusted finalization; numbered-package nightly recovery remains independent and is not claimed by this repair.

## Evidence

- Release #167 reached 3,932 passing tests before the Windows/Node 24 lane reported its sole failure from `afterEach`: `EBUSY: resource busy or locked, rmdir '...\\a1-pi-resume-hint-*'`. Windows/Node 22 and both non-Windows Node 24 lanes passed.
- Before the fix, the same test file with unchanged one-shot cleanup passed 60 focused Windows/Node 24 runs, confirming the recorded failure is intermittent rather than a reproducible product assertion failure.
- With retry-bounded cleanup, 20 focused Windows/Node 24 runs passed under four concurrent stress loops; every runtime-integration assertion body remained unchanged.
- `npm run build` and `npm run typecheck` passed.
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
