## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #25](https://github.com/timurproko/a1/actions/runs/35433536822) (attempt 1, workflow_dispatch) on `b779478` at 2026-09-19T09:00:56Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on windows-2025-node22 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 711^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 1482^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 650^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22mawaits termination of a busy real worker during disposal ^[[33m 753^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22maborts active off-thread conversion and releases the slot for subsequent work ^[[33m 978^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m release-gating N-1 update transitions^[[2m > ^[[22mhandles idle, busy, stale, failed, rollback, and blocker-exit transitions without duplicate ownership ^[[33m 927^[[2mms^[[22m^[[39m
      [validation-phase] {"schema":"a1-validation-phase-v1","fixture":"release-command-fixture","invocation":"de265c89-0ebd-446f-a4be-e95a7a177687","nodeVersion":"v22.23.2","platform":"win32","architecture":"x64","head":"b77947818a99322d8b3cc0a771f2f25dc2531120","runId":"35433536822","runAttempt":"1","...
      [validation-phase] {"schema":"a1-validation-phase-v1","fixture":"release-command-fixture","invocation":"de265c89-0ebd-446f-a4be-e95a7a177687","nodeVersion":"v22.23.2","platform":"win32","architecture":"x64","head":"b77947818a99322d8b3cc0a771f2f25dc2531120","runId":"35433536822","runAttempt":"1","...
      [validation-phase] {"schema":"a1-validation-phase-v1","fixture":"release-command-fixture","invocation":"de265c89-0ebd-446f-a4be-e95a7a177687","nodeVersion":"v22.23.2","platform":"win32","architecture":"x64","head":"b77947818a99322d8b3cc0a771f2f25dc2531120","runId":"35433536822","runAttempt":"1","...
      ... 44 more lines in the run log
      ```

  - `vitest-package-startup` (`package-startup`) failed on windows-2025-node24 with exit 1.
    - Tests: `test/foundation/release/package-startup.integration.test.ts`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 1272^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 3197^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 650^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 1524^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22muses the highest-fitting JPEG quality without upscaling and honors encoded limits ^[[33m 304^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mrejects impossible output budgets instead of shrinking into an unreadable success ^[[33m 328^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mrecovers from corrupt codec input and never forwards arbitrary error text ^[[33m 557^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22mawaits termination of a busy real worker during disposal ^[[33m 1489^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22maborts active off-thread conversion and releases the slot for subsequent work ^[[33m 1377^[[2mms^[[22m^[[39m
      [validation-phase] {"schema":"a1-validation-phase-v1","fixture":"package-message-parity","invocation":"4e200c29-de85-4768-a8d8-6ec74f8b8232","nodeVersion":"v24.20.0","platform":"win32","architecture":"x64","head":"b77947818a99322d8b3cc0a771f2f25dc2531120","runId":"35433536822","runAttempt":"1","r...
      ... 83 more lines in the run log
      ```

  - Last successful Full regression run: [#3](https://github.com/timurproko/a1/actions/runs/32616699736) on `6c97783`; 0 `develop` commits since:
