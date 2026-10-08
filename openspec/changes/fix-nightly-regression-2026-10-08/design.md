## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #56](https://github.com/timurproko/a1/actions/runs/37756869404) (attempt 1, schedule) on `9bc003b` at 2026-10-08T09:28:16Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on macos-15-node24, ubuntu-24.04-node24 with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/foundation/supervision/foreground-terminal-lease.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/repository-governance/local-cleanup.test.ts`, `test/foundation/storage/storage.test.ts`, `test/foundation/release/cohort-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/foundation/release/update-live-cohort.test.ts`, and 13 more
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 807^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 1798^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 631^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22mawaits termination of a busy real worker during disposal ^[[33m 997^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22maborts active off-thread conversion and releases the slot for subsequent work ^[[33m 859^[[2mms^[[22m^[[39m
      ^[[2m Test Files ^[[22m ^[[1m^[[32m382 passed^[[39m^[[22m^[[2m | ^[[22m^[[33m3 skipped^[[39m^[[90m (385)^[[39m
      ^[[2m      Tests ^[[22m ^[[1m^[[32m4351 passed^[[39m^[[22m^[[2m | ^[[22m^[[33m13 skipped^[[39m^[[90m (4364)^[[39m
      ^[[2m   Start at ^[[22m 09:29:47
      ^[[2m   Duration ^[[22m 137.57s^[[2m (transform 3.63s, setup 1.56s, collect 53.54s, tests 170.78s, environment 40ms, prepare 12.20s)^[[22m
      ^[[1m^[[46m RUN ^[[49m^[[22m ^[[36mv3.2.7 ^[[39m^[[90m/Users/runner/work/a1/a1^[[39m
       ^[[31m❯^[[39m test/repository-governance/local-cleanup.test.ts ^[[2m(^[[22m^[[2m1 test^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 13495^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m verifies local cleanup identity, archive authority, ownership, recovery, and bounded watch behavior^[[39m^[[33m 13495^[[2mms^[[22m^[[39m
      ^[[31m     → Command failed: /Users/runner/hostedtoolcache/node/24.20.0/arm64/bin/node --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs
      ✔ verifies canonical, ordinary, root, archived and existing-change documentation integration (19.195708ms)
      ... 151 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/665dd7cb-cc3f-43a6-8385-40d49bc1d0ae' before making global git config changes
      ```

  - Last successful Full regression run: [#55](https://github.com/timurproko/a1/actions/runs/37599580613) on `885df1a`; 17 `develop` commits since:
    - `9bc003b` Merge pull request #716 from timurproko/fix/cleanup-standalone-docs
    - `09d5aa8` Merge pull request #713 from timurproko/feature/remove-disposable-root-links
    - `45d2e9b` docs(openspec): describe silent installer (#714)
    - `43d34a7` Merge pull request #711 from timurproko/feature/human-enabled-auto-merge
    - `230ee61` Merge pull request #705 from timurproko/refactor/windows-release-validation
    - `bddc405` Merge pull request #709 from timurproko/fix/resume-selection-style
    - `28ea6dc` Merge pull request #710 from timurproko/fix/modal-open-flash
    - `8c2d639` Merge pull request #708 from timurproko/fix/release-reopening-validation-route
    - `852ba46` Merge pull request #707 from timurproko/fix/changelog-command-title
    - `f0b7a33` chore(release): open 0.2.6-dev (#706)
    - `fd1458a` Merge pull request #704 from timurproko/fix/session-search-hints
    - `59de511` Merge pull request #701 from timurproko/fix/settings-value-undo
    - `8c5bdfa` Merge pull request #703 from timurproko/fix/tree-time-toggle-state
    - `dc47266` Merge pull request #702 from timurproko/fix/typing-search-shortcut-hint
    - `41383a1` Merge pull request #700 from timurproko/fix/slash-command-completion-spacing
    - `21d1387` Merge pull request #698 from timurproko/fix/session-tree-system-root-collapse
    - `b5def03` Merge pull request #699 from timurproko/fix/hide-skill-menu-prefix
