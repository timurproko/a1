## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #26](https://github.com/timurproko/a1/actions/runs/35435187565) (attempt 1, workflow_dispatch) on `e12ed66` at 2026-09-19T09:37:05Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on ubuntu-24.04-node24 with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/repository-governance/local-cleanup.test.ts`, `test/foundation/storage/storage.test.ts`, `test/foundation/release/cohort-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/foundation/release/update-live-cohort.test.ts`, `test/features/prompt-history/store.test.ts`, `test/app/session-shell/command-message-parity.test.ts`, `test/app/session-shell/command-outcome-parity.test.ts`, and 8 more
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mdefers dirty without pretending validation failed ^[[33m 329^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mreclassifies the complete refreshed diff including renamed-from code (rename=false) ^[[33m 327^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mkeeps wrong PR errors fatal without recovery ^[[33m 310^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/repository-governance/openspec-acceptance-github.test.ts ^[[2m(^[[22m^[[2m13 tests^[[22m^[[2m)^[[22m^[[33m 2877^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m visible acceptance publication and authority^[[2m > ^[[22mretains PR provenance, reconciles pending tasks, and passes all archive and local-cleanup gates ^[[33m 2733^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 1206^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 2939^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 527^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 1426^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mrecovers from corrupt codec input and never forwards arbitrary error text ^[[33m 402^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m merged branch cleanup workflow^[[2m > ^[[22mfails on deletion API errors and failed post-delete verification ^[[33m 427^[[2mms^[[22m^[[39m
      ... 35 more lines in the run log
      ```

  - Last successful Full regression run: [#3](https://github.com/timurproko/a1/actions/runs/32616699736) on `6c97783`; 0 `develop` commits since:
