## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #50](https://github.com/timurproko/a1/actions/runs/36987347412) (attempt 1, schedule) on `bf95b96` at 2026-10-02T09:01:03Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/integrations/pi/components/editor-autocomplete-placement.test.ts ^[[2m(^[[22m^[[2m18 tests^[[22m^[[2m | ^[[22m^[[31m2 failed^[[39m^[[2m)^[[22m^[[33m 4021^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m above-prompt autocomplete (history=false)^[[2m > ^[[22mkeeps the bottom-aligned input steady through menu changes^[[32m 51^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m above-prompt autocomplete (history=false)^[[2m > ^[[22mmatches the live prompt border color and width without copying border labels^[[39m^[[32m 111^[[2mms^[[22m^[[39m
      ^[[31m     → expected 1 to be greater than 1^[[39m
         ^[[32m✓^[[39m above-prompt autocomplete (history=false)^[[2m > ^[[22mkeeps wrapped, Unicode, atomic, and scrolled body rows intact with padding 0^[[32m 294^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m above-prompt autocomplete (history=false)^[[2m > ^[[22mkeeps wrapped, Unicode, atomic, and scrolled body rows intact with padding 2^[[32m 285^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m above-prompt autocomplete (history=false)^[[2m > ^[[22mmoves argument, path, resource, and extension lists without changing sizing or navigation ^[[33m 643^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m above-prompt autocomplete (history=false)^[[2m > ^[[22mrelocates the counter without stale values, duplicate rows, or narrow-width overflow^[[32m 120^[[2mms^[[22m^[[39m
      ^[[31m     → expected 1 to be greater than 1^[[39m
         ^[[32m✓^[[39m above-prompt autocomplete (history=true)^[[2m > ^[[22mkeeps wrapped, Unicode, atomic, and scrolled body rows intact with padding 0^[[32m 282^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m above-prompt autocomplete (history=true)^[[2m > ^[[22mkeeps wrapped, Unicode, atomic, and scrolled body rows intact with padding 2^[[32m 289^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m above-prompt autocomplete (history=true)^[[2m > ^[[22mmoves argument, path, resource, and extension lists without changing sizing or navigation ^[[33m 517^[[2mms^[[22m^[[39m
      ... 42 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/96ab72ee-7abd-401c-952c-8e7e062a94f0' before making global git config changes
      ```

  - Last successful Full regression run: [#48](https://github.com/timurproko/a1/actions/runs/36842668266) on `96c6c4b`; 8 `develop` commits since:
    - `bf95b96` fix(release): verify exact npm resources (#659)
    - `d6923b6` fix(update): resolve bundled npm entry (#657)
    - `7426574` fix(validation): bound Windows backlog setup (#656)
    - `f1e4872` refactor(release): rename stable wrapper (#655)
    - `60a300a` fix(release): allow development publication startup (#654)
    - `d546ab7` chore(pi): upgrade pinned Pi to 0.99.2 (#652)
    - `e42eb4d` chore(pi): upgrade pinned Pi to 0.99.1 (#642)
    - `94ae197` fix(ci): restore documentation auto-merge (#653)
