## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Release #148](https://github.com/timurproko/a1/actions/runs/35705803548) (attempt 1, schedule) on `6ae0615` at 2026-09-22T08:37:16Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on darwin-node24, linux-node24, win32-node22, win32-node24 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mdefers unknown without pretending validation failed ^[[33m 366^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mbounds repeated arming rejections and performs a final fresh read ^[[33m 342^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mdoes not reuse eligibility after refreshed draft changes ^[[33m 344^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mrejects a successful HTTP response that did not actually merge ^[[33m 394^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mhandles a different head PR after the arming rejection ^[[33m 332^[[2mms^[[22m^[[39m
       ^[[31m❯^[[39m test/integrations/pi/components/prompt-input-ux.test.ts ^[[2m(^[[22m^[[2m15 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[32m 173^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned shared input and status presentation^[[2m > ^[[22mmatches search and submitted-prefix foreground in dark^[[32m 47^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned shared input and status presentation^[[2m > ^[[22mmatches search and submitted-prefix foreground in light^[[32m 4^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned shared input and status presentation^[[2m > ^[[22mkeeps owned rules neutral across every level and bash mode while preserving pinned borders^[[32m 15^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned shared input and status presentation^[[2m > ^[[22mkeeps pointer selection aligned with the shared content inset and never copies chrome^[[32m 5^[[2mms^[[22m^[[39m
      ^[[31m     → expected { foreground: 'palette:66', …(1) } to deeply equal { foreground: '90;128;128', …(1) }^[[39m
         ^[[32m✓^[[39m owned level and model keybindings^[[2m > ^[[22mcycles once without opening model selection for "\f"^[[32m 2^[[2mms^[[22m^[[39m
      ... 58 more lines in the run log
      ```

  - Lane Publication result failed in job `Publication result` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
      ##[error]Process completed with exit code 1.
      ```

  - Last successful Release run: [#143](https://github.com/timurproko/a1/actions/runs/35500168747) on `7d26554`; 9 `develop` commits since:
    - `6ae0615` fix(ui): stabilize touchpad scroll direction (#533)
    - `5f5a349` fix(ui): correct thinking selector presentation (#529)
    - `2226c9d` fix(regression): repair the 2026-09-21 release failure (#527)
    - `ba79473` chore(pi): upgrade pinned Pi to 0.86.1 (#526)
    - `8e22b03` fix(shell): offer /thinking and order the command menu like the engine (#528)
    - `d8a3db0` chore(pi): upgrade pinned Pi to 0.86.0 (#522)
    - `95216f1` feat(development): report missing build prerequisites by name (#524)
    - `f603b30` Remove pull request integration section from README (#525)
    - `49293b9` Update README.md (#523)
