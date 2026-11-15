## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #94](https://github.com/timurproko/a1/actions/runs/43670935944) (attempt 1, schedule) on `74b2e6f` at 2026-11-15T03:07:48Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m ready pull-request refresh command^[[2m > ^[[22mreports each candidate and fails when a candidate failed ^[[33m 447^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/composition/session-runtime-registry.test.ts ^[[2m(^[[22m^[[2m19 tests^[[22m^[[2m)^[[22m^[[33m 651^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m SessionRuntimeRegistry^[[2m > ^[[22mreactivates a missing registration or absent claim instead of remaining permanently poisoned ^[[33m 305^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/foundation/release/automatic-update.test.ts ^[[2m(^[[22m^[[2m17 tests^[[22m^[[2m)^[[22m^[[33m 689^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m active release observation^[[2m > ^[[22mannounces only approved newer releases on the executing channel ^[[33m 392^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m Herdr supplied screenshots in the production shell^[[2m > ^[[22mremoves a failed file reservation and reports only the fixed retry message ^[[33m 346^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/features/owned-ui/pi-event-frame-parity.test.ts ^[[2m(^[[22m^[[2m27 tests^[[22m^[[2m)^[[22m^[[33m 8032^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m pinned Pi scripted event and terminal-frame parity^[[2m > ^[[22mproduces one truecolor diagnostic hash under opposing ambient capabilities (normal) ^[[33m 508^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m pinned Pi scripted event and terminal-frame parity^[[2m > ^[[22mproduces one truecolor diagnostic hash under opposing ambient capabilities (delayed) ^[[33m 3008^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m pinned Pi scripted event and terminal-frame parity^[[2m > ^[[22mkeeps exact evidence with due paints at before-flush ^[[33m 450^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m worktree completion^[[2m > ^[[22mreports a failed cleanup with the command's output and never as removal ^[[33m 599^[[2mms^[[22m^[[39m
      ... 101 more lines in the run log
      ```

  - Lane Full regression / Complete regression required failed in job `Full regression / Complete regression required` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
        if (jobsResult !== "success" || records.length !== FULL_LANES.length) throw new Error("complete-regression jobs or evidence are incomplete");
                                                                                    ^
      Error: complete-regression jobs or evidence are incomplete
          at requireFullLanes (file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:131:79)
          at file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:174:20
          at ModuleJob.run (node:internal/modules/esm/module_job:561:25)
          at async node:internal/modules/esm/loader:647:26
      ##[error]Process completed with exit code 1.
      Post job cleanup.
      [command]/usr/bin/git version
      git version 2.56.1
      Temporarily overriding HOME='/home/runner/work/_temp/c9188fa6-e1b0-4ce7-983b-bb72fb34e300' before making global git config changes
      ```

  - Last successful Full regression run: [#93](https://github.com/timurproko/a1/actions/runs/43552568568) on `c362c4e`; 11 `develop` commits since:
    - `74b2e6f` fix(ui): hide attachment chip identity metadata (#934)
    - `98631e3` fix(selection): omit prompt chrome in bulk copy (#935)
    - `e7de9ab` feat(cli): make A1 Pi-compatible by default (#928)
    - `347d8fc` fix(ui): align transcript pictograph cells (#932)
    - `ad443f2` fix(ui): contain over-width terminal rows (#933)
    - `ac3f499` fix(ui): normalize content emoji presentation (#931)
    - `36e783c` fix(selection): preserve copied block alignment (#929)
    - `64a2430` fix(clipboard): preserve dropped image filenames (#930)
    - `2d5c364` fix(api): unify normal and compatible runtime integrations (#927)
    - `9ff2383` fix(clipboard): restore Herdr image paste (#926)
    - `82d030b` fix(ux): refine input padding and jump shortcuts (#925)
