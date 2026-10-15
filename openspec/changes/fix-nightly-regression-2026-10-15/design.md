## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #62](https://github.com/timurproko/a1/actions/runs/38667962522) (attempt 1, schedule) on `ff11eab` at 2026-10-15T01:52:12Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on macos-15-node24 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mhandles another actor merging the expected head (armed=true) ^[[33m 350^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mdoes not hide merge refusal when refreshed PR is open ^[[33m 307^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mdoes not hide merge refusal when refreshed PR is closed unmerged ^[[33m 432^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mdoes not hide merge refusal when refreshed PR is different merged head ^[[33m 517^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mrejects a successful HTTP response that did not actually merge ^[[33m 491^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 852^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 2257^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 417^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 965^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22mawaits termination of a busy real worker during disposal ^[[33m 1134^[[2mms^[[22m^[[39m
       ^[[31m❯^[[39m test/features/resident-tab/resident-tab.test.ts ^[[2m(^[[22m^[[2m7 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[32m 12^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m resident tab auto naming^[[2m > ^[[22mnormalizes and bounds names^[[32m 1^[[2mms^[[22m^[[39m
      ... 32 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/b5173037-9002-4efa-85df-11ad2a5e6e08' before making global git config changes
      ```

  - Last successful Full regression run: [#61](https://github.com/timurproko/a1/actions/runs/38499680233) on `6b59573`; 1 `develop` commit since:
    - `ff11eab` feature(tabs): resident tabs milestone 5 — complete tab UX (#749)
