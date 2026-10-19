## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- **What failed:** one node test inside `local-cleanup.test.ts`, `a paused candidate does not block disjoint cleanup`, hit its own `{ timeout: 30000 }` after 30.86 s (`testTimeoutFailure`); every other local-cleanup case passed. The child run failed, so `fast-resource-sensitive` failed, and `Complete regression required` saw incomplete lane evidence.
- **Why:** environmental. The suite runs its cases four at a time (`describe(..., { concurrency: 4 })`), and this was the only case with a test-level wall-clock bound. That bound also covered the shared-runner cost of creating two Git worktree fixtures and the released purge pass. On this run the same child took 183 s, against 67–121 s on the three previous nightly runs, and its untimed neighbors took 25–40 s each (`sweep defers a held candidate` 39.7 s). No suspect commit touches the local-cleanup scripts or tests. Locally on `dc61c51` the case passes in 9.6 s.
- **Fix:** the case keeps a 30 s bound, now only on the disjoint pass that runs while the candidate is paused. A blocking regression hangs exactly there and still fails, with the named error `disjoint cleanup blocked by the paused candidate`. Fixture setup and the released pass fall under the suite's 240 s child hang detector, like every other concurrent case. Assertions, the bound's value, concurrency, and coverage are unchanged.

## Evidence

- Run [Full regression #67](https://github.com/timurproko/a1/actions/runs/39186903355) (attempt 1, schedule) on `dc61c51` at 2026-10-19T01:46:47Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node22 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/foundation/supervision/foreground-terminal-lease.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/repository-governance/local-cleanup.test.ts`, `test/foundation/storage/storage.test.ts`, `test/foundation/release/cohort-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/foundation/release/update-live-cohort.test.ts`, and 13 more
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/repository-governance/local-cleanup.test.ts ^[[2m(^[[22m^[[2m1 test^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 182932^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m verifies local cleanup identity, archive authority, ownership, recovery, and bounded watch behavior^[[39m^[[33m 182931^[[2mms^[[22m^[[39m
      ^[[31m     → Command failed: C:\hostedtoolcache\windows\node\22.23.3\x64\node.exe --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs
      TAP version 13
      # Subtest: verifies canonical, ordinary, root, archived and existing-change documentation integration
      ok 1 - verifies canonical, ordinary, root, archived and existing-change documentation integration
        ---
      # Subtest: pagination, response, request and time budgets fail closed without exposing tokens
      ok 12 - pagination, response, request and time budgets fail closed without exposing tokens
        ---
        duration_ms: 33.9798
        type: 'test'
        ...
      # Subtest: accepted heads are the merged head or a GitHub-known ancestor; unknown commits and budgets are not silently accepted
      ok 17 - accepted heads are the merged head or a GitHub-known ancestor; unknown commits and budgets are not silently accepted
        ---
        duration_ms: 0.9848
        type: 'test'
        ...
          # Subtest: failed relocation replacement retains the prior drive-bound journal
          ok 3 - failed relocation replacement retains the prior drive-bound journal
            ---
            duration_ms: 1872.2653
            type: 'test'
            ...
          # Subtest: failed atomic replacement retains the previous complete journal
          ok 7 - failed atomic replacement retains the previous complete journal
            ---
            duration_ms: 2505.7785
            type: 'test'
            ...
          # Subtest: expected-SHA remote deletion uses a lease and verifies absence
          ok 24 - expected-SHA remote deletion uses a lease and verifies absence
            ---
            duration_ms: 1.3086
            type: 'test'
            ...
      ... 121 more lines in the run log
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
      git version 2.55.0
      Temporarily overriding HOME='/home/runner/work/_temp/4cfa0b9f-20de-4dcc-b004-1a3cfc203259' before making global git config changes
      ```

  - Last successful Full regression run: [#65](https://github.com/timurproko/a1/actions/runs/38991464211) on `2148ffa`; 16 `develop` commits since:
    - `dc61c51` fix(build): make normal build resident-ready (#806)
    - `fc6c905` feat(governance): allow requested agent merges (#805)
    - `163e831` fix: make session clipboard reliable (#802)
    - `3513efa` chore(regression): repair the 2026-10-18 full regression failure (#803)
    - `a57b841` chore(release): wait thirty minutes for npm to serve an upload (#804)
    - `cc0a011` feature(native): host every native component inside the Node runtime (#794)
    - `19f3479` chore(delivery): allow unbounded progress items (#800)
    - `d132acf` fix: stabilize resident multi-agent UX (#798)
    - `321b834` chore(delivery): re-promote a finalized pull request returned to draft (#799)
    - `488a97f` fix(tabs): read the attach settings file without creating it (#797)
    - `ce3e1b3` fix(resident): restore solo interaction parity (#792)
    - `a1ac477` chore(delivery): link Claude Code worktrees through a repository hook (#796)
    - `e5bcf46` feat(tabs): polish resident tab strip (#791)
    - `f370434` feature: copy prompt and status selections (#793)
    - `ee097cf` chore(ci): cut the CI critical path (#789)
    - `0b6ef5e` fix: send image prompts in resident tabs (#790)
- Focused implementation evidence on Windows with the fix (Node 22), before finalization:
  - `node --test` over the three local-cleanup node files passed four times (112 pass, 0 fail, 176–178 s each), so the full concurrent load matches the failed CI child (183 s).
  - The CI wrapper `npx vitest run test/repository-governance/local-cleanup.test.ts --testTimeout=30000` passed three of four runs (183–184 s). The first run failed without its output being captured, so its cause is a known gap left to the exact-head PR Full regression.
  - `git log 2148ffa..dc61c51` over `scripts/governance/local-cleanup-*.mjs`, `scripts/governance/local-worktree-cleanup.mjs`, and `test/repository-governance/local-cleanup*` is empty. The 30 s case bound dates from `51a30d4` (#725).
