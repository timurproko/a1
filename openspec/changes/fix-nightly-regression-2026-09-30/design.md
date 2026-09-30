## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #47](https://github.com/timurproko/a1/actions/runs/36693338614) (attempt 1, schedule) on `38530ce` at 2026-09-30T09:00:47Z:
  - `vitest-package-smoke-2` (`package-smoke`) failed on windows-2025-node22 (package shard) with exit 1.
    - Tests: `test/foundation/release/session-resume.integration.test.ts`
    - Log excerpt:

      ```text
      ^[[2m Test Files ^[[22m ^[[1m^[[32m1 passed^[[39m^[[22m^[[90m (1)^[[39m
      ^[[2m      Tests ^[[22m ^[[1m^[[32m3 passed^[[39m^[[22m^[[90m (3)^[[39m
      ^[[2m   Start at ^[[22m 09:07:31
      ^[[2m   Duration ^[[22m 18.55s^[[2m (transform 413ms, setup 21ms, collect 587ms, tests 17.52s, environment 0ms, prepare 91ms)^[[22m
      ^[[1m^[[46m RUN ^[[49m^[[22m ^[[36mv3.2.7 ^[[39m^[[90mD:/a/a1/a1^[[39m
      ^[[2m Test Files ^[[22m ^[[1m^[[32m1 passed^[[39m^[[22m^[[90m (1)^[[39m
      ^[[2m      Tests ^[[22m ^[[1m^[[32m6 passed^[[39m^[[22m^[[90m (6)^[[39m
      ^[[2m   Start at ^[[22m 09:07:51
      ^[[2m   Duration ^[[22m 3.73s^[[2m (transform 91ms, setup 23ms, collect 63ms, tests 3.30s, environment 0ms, prepare 96ms)^[[22m
      ^[[1m^[[46m RUN ^[[49m^[[22m ^[[36mv3.2.7 ^[[39m^[[90mD:/a/a1/a1^[[39m
      ^[[41m^[[1m FAIL ^[[22m^[[49m test/foundation/release/session-resume.integration.test.ts^[[2m [ test/foundation/release/session-resume.integration.test.ts ]^[[22m
      ^[[31m^[[1mError^[[22m: Hook timed out in 30000ms.
      If this is a long-running hook, pass a timeout value as the last argument or configure it globally with "hookTimeout".^[[39m
      ^[[36m ^[[2m❯^[[22m test/foundation/release/session-resume.integration.test.ts:^[[2m65:1^[[22m^[[39m
          ^[[90m 63| ^[[39m}^[[33m,^[[39m ^[[34m35_000^[[39m)^[[33m;^[[39m
          ^[[90m 64| ^[[39m
      ^[[2m Test Files ^[[22m ^[[1m^[[31m1 failed^[[39m^[[22m^[[90m (1)^[[39m
      ^[[2m      Tests ^[[22m ^[[1m^[[32m7 passed^[[39m^[[22m^[[90m (7)^[[39m
      ^[[2m   Start at ^[[22m 09:07:56
      ^[[2m   Duration ^[[22m 135.38s^[[2m (transform 425ms, setup 22ms, collect 1.77s, tests 123.23s, environment 0ms, prepare 101ms)^[[22m
      ##[error]Error: Hook timed out in 30000ms.
      If this is a long-running hook, pass a timeout value as the last argument or configure it globally with "hookTimeout".
       ❯ test/foundation/release/session-resume.integration.test.ts:65:1
              "build-prerequisite"
              "package-prerequisite"
      ##[error]Process completed with exit code 1.
      ##[group]Run if [ ! -f "$STARTUP_PERFORMANCE_RESULT" ]; then
      ... 8 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/4623b90a-198e-47b2-95d9-b0be32f70205' before making global git config changes
      ```

  - Last successful Full regression run: [#43](https://github.com/timurproko/a1/actions/runs/36400505675) on `51e8492`; 32 `develop` commits since:
    - `38530ce` Merge pull request #644 from timurproko/fix/publish-reuses-validated-candidate
    - `877e326` Merge pull request #641 from timurproko/chore/pi-sync-european-night
    - `7c7572a` Merge pull request #622 from timurproko/feature/configurable-prompt-image-limit
    - `eb88c68` Merge pull request #640 from timurproko/feat/release-tag-cleanup
    - `061d8dc` Merge pull request #638 from timurproko/feat/release-draft-dedupe
    - `edbea05` Merge pull request #639 from timurproko/fix/finalize-release-version-capture
    - `0b5c57f` Merge pull request #637 from timurproko/feat/release-validation-job-progress
    - `0316160` Merge pull request #636 from timurproko/fix/release-draft-refresh-tag
    - `9ffb1ce` Merge pull request #635 from timurproko/feat/refresh-stale-release-draft
    - `92b3bde` Merge pull request #634 from timurproko/fix/release-runtime-error
    - `d451f68` Merge pull request #633 from timurproko/fix/session-resume-release-note
    - `906eda5` Merge pull request #632 from timurproko/fix/windows-lane-artifact-layout
    - `98814fe` Merge pull request #631 from timurproko/fix/wait-for-release-validation
    - `7e814a1` Merge pull request #630 from timurproko/test/parallel-windows-regression
    - `dd9d9ae` Merge pull request #629 from timurproko/feature/publish-on-native-release
    - `5143bd8` Merge pull request #626 from timurproko/fix/nightly-regression-2026-09-29
    - `91b3b19` Merge pull request #625 from timurproko/feature/refresh-ready-prs
    - `fadd03c` Merge pull request #628 from timurproko/fix/nightly-regression-2026-09-29-1
    - `6600cb4` Merge pull request #627 from timurproko/feature/streamline-release-publish-handoff
    - `dade587` Merge pull request #624 from timurproko/fix/pinned-pi-runtime-root
    - `bd9f3e5` Merge pull request #619 from timurproko/fix/recover-release-approval-action
    - `f11d40d` Merge pull request #621 from timurproko/fix/keep-queued-chips-unbroken
    - `7c25be1` Merge pull request #620 from timurproko/docs/use-npm-x-installer-command
    - `694c884` Update README.md (#618)
    - `8a019ce` Merge pull request #617 from timurproko/feature/draft-release-note-review
    - `be0668b` Update README.md (#616)
    - `a9bc0c2` chore(release): review 0.2.2 (#615)
    - `8cd4600` Merge pull request #613 from timurproko/feature/release-changelog-review
    - `6ed84ba` Update README.md (#614)
    - `406da23` Merge pull request #612 from timurproko/chore/rename-release-workflow
    - ... 2 more
