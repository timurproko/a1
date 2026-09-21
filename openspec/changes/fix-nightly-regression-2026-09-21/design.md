## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Release #144](https://github.com/timurproko/a1/actions/runs/35581107041) (attempt 1, schedule) on `95216f1` at 2026-09-21T09:03:00Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on win32-node22 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 1115^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 2706^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 519^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 1123^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mprefers lossless PNG and preserves visible EXIF orientation during conversion ^[[33m 302^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m release-gating N-1 update transitions^[[2m > ^[[22mhandles idle, busy, stale, failed, rollback, and blocker-exit transitions without duplicate ownership ^[[33m 2238^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/foundation/supervision/foreground-terminal-lease.test.ts ^[[2m(^[[22m^[[2m6 tests^[[22m^[[2m)^[[22m^[[33m 7348^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m plural launch-instance supervision^[[2m > ^[[22mtracks several authenticated owners and completes them independently ^[[33m 1387^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m plural launch-instance supervision^[[2m > ^[[22mreconciles only instances owned by a disconnected socket ^[[33m 1112^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m plural launch-instance supervision^[[2m > ^[[22mreconciles each disconnected instance single-flight without globally serializing siblings ^[[33m 1601^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m launch selection across update completion^[[2m > ^[[22mdoes not promote installed candidate bytes after an update is failed ^[[33m 546^[[2mms^[[22m^[[39m
      ... 25 more lines in the run log
      ```

  - Lane Publication result failed in job `Publication result` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
      ##[error]Process completed with exit code 1.
      ```

  - Last successful Release run: [#143](https://github.com/timurproko/a1/actions/runs/35500168747) on `7d26554`; 3 `develop` commits since:
    - `95216f1` feat(development): report missing build prerequisites by name (#524)
    - `f603b30` Remove pull request integration section from README (#525)
    - `49293b9` Update README.md (#523)
