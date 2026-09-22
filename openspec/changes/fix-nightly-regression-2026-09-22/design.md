## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #33](https://github.com/timurproko/a1/actions/runs/35702168801) (attempt 1, schedule) on `6ae0615` at 2026-09-22T07:56:47Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22, windows-2025-node24 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/integrations/pi/components/prompt-input-ux.test.ts ^[[2m(^[[22m^[[2m15 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[32m 93^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned shared input and status presentation^[[2m > ^[[22mmatches search and submitted-prefix foreground in dark^[[32m 31^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned shared input and status presentation^[[2m > ^[[22mmatches search and submitted-prefix foreground in light^[[32m 3^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned shared input and status presentation^[[2m > ^[[22mkeeps owned rules neutral across every level and bash mode while preserving pinned borders^[[32m 4^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned shared input and status presentation^[[2m > ^[[22mkeeps pointer selection aligned with the shared content inset and never copies chrome^[[32m 2^[[2mms^[[22m^[[39m
      ^[[31m     → expected { foreground: 'palette:66', …(1) } to deeply equal { foreground: '90;128;128', …(1) }^[[39m
         ^[[32m✓^[[39m owned level and model keybindings^[[2m > ^[[22mcycles once without opening model selection for "\f"^[[32m 2^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned level and model keybindings^[[2m > ^[[22mcycles once without opening model selection for "\u001b[108;5u"^[[32m 1^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned level and model keybindings^[[2m > ^[[22mcycles once without opening model selection for "\u001b[27;5;108~"^[[32m 1^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned level and model keybindings^[[2m > ^[[22mleaves reverse Tab "\u001b[Z" unassigned and inert for drafts and suggestions^[[32m 3^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 804^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 1831^[[2mms^[[22m^[[39m
      ... 44 more lines in the run log
      ```

  - Last successful Full regression run: [#30](https://github.com/timurproko/a1/actions/runs/35576685488) on `95216f1`; 6 `develop` commits since:
    - `6ae0615` fix(ui): stabilize touchpad scroll direction (#533)
    - `5f5a349` fix(ui): correct thinking selector presentation (#529)
    - `2226c9d` fix(regression): repair the 2026-09-21 release failure (#527)
    - `ba79473` chore(pi): upgrade pinned Pi to 0.86.1 (#526)
    - `8e22b03` fix(shell): offer /thinking and order the command menu like the engine (#528)
    - `d8a3db0` chore(pi): upgrade pinned Pi to 0.86.0 (#522)
