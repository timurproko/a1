## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #58](https://github.com/timurproko/a1/actions/runs/38104464578) (attempt 1, schedule) on `2a8be16` at 2026-10-11T02:13:44Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node24 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/foundation/supervision/foreground-terminal-lease.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/repository-governance/local-cleanup.test.ts`, `test/foundation/storage/storage.test.ts`, `test/foundation/release/cohort-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/foundation/release/update-live-cohort.test.ts`, and 13 more
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/paste-executor.test.ts ^[[2m(^[[22m^[[2m26 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 16754^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m isolated paste executor^[[2m > ^[[22mkeeps bounded non-path inline preparation for "hello"^[[32m 1^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m isolated paste executor^[[2m > ^[[22mkeeps bounded non-path inline preparation for "https://example.com"^[[32m 0^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m isolated paste executor^[[2m > ^[[22mkeeps bounded non-path inline preparation for "\ntext\nmore"^[[32m 0^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m isolated paste executor^[[2m > ^[[22mkeeps bounded non-path inline preparation for "   "^[[32m 0^[[2mms^[[22m^[[39m
      ^[[31m     → expected 1633.192 to be less than 500^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m isolated paste executor^[[2m > ^[[22mtakes the warm spare (announced: false), prepares through it, and replenishes it after the paste ^[[33m 3188^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m isolated paste executor^[[2m > ^[[22mprepares 16 MiB text as a compact chip description while parent timers advance ^[[33m 4985^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m isolated paste executor^[[2m > ^[[22mrejects oversized source fragments without crashing the UI callback^[[32m 1^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m isolated paste executor^[[2m > ^[[22mkeeps existing image preparation and canonicalization in the isolated process ^[[33m 675^[[2mms^[[22m^[[39m
      ^[[31m⎯⎯⎯⎯⎯⎯⎯^[[39m^[[1m^[[41m Failed Tests 1 ^[[49m^[[22m^[[31m⎯⎯⎯⎯⎯⎯⎯^[[39m
      ^[[41m^[[1m FAIL ^[[22m^[[49m test/app/session-shell/paste-executor.test.ts^[[2m > ^[[22misolated paste executor^[[2m > ^[[22mtakes the warm spare (announced: true), prepares through it, and replenishes it after the paste
      ^[[31m^[[1mAssertionError^[[22m: expected 1633.192 to be less than 500^[[39m
      ^[[36m ^[[2m❯^[[22m test/app/session-shell/paste-executor.test.ts:^[[2m80:60^[[22m^[[39m
          ^[[90m 78| ^[[39m      ^[[35mtry^[[39m {
      ... 21 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/bbe64649-b1f1-403d-9430-126492bfea51' before making global git config changes
      ```

  - Last successful Full regression run: [#57](https://github.com/timurproko/a1/actions/runs/38018259379) on `a525dfb`; 10 `develop` commits since:
    - `2a8be16` chore(release): open 0.2.7-dev (#754)
    - `b94d7a4` fix(release): retry Windows lock release contention (#753)
    - `6ef60f1` test(settings): follow the menu opening on the value in effect (#752)
    - `395529e` docs(openspec): remove the stale merged-backlog report (#751)
    - `1a2dbc7` docs(openspec): retire the multi-agent workspace roadmap (#745)
    - `4a59f56` docs(openspec): retire obsolete retained-tail and launcher plans (#744)
    - `bfb757d` fix(governance): recognize method-specific auto-merge enables (#743)
    - `16f7c15` fix(ui): open value menus over their anchor (#742)
    - `0a9c1af` refactor(lifecycle): key worktree claims by agent (#736)
    - `d7fa345` refactor(shell): split the terminal host from the session presenter (#735)
