## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- Treat both generated repairs as one orchestration defect because Full regression #38 and Release #155 run the same `full-release` plan and terminate only after the complete ordinary Vitest partition starts. Do not infer a test assertion failure from the absent owner result.
- Withdraw the hosted-runner capacity hypothesis. A two-worker exact-head run reproduced the shutdown, module-start evidence narrowed it to `adapter.test.ts`, and local syscall tracing reproduced a worker calling `kill(0, SIGTERM)` while adapter disposal canceled repository metadata discovery.
- Reject a missing repository directory before starting Git branch or GitHub pull-request discovery. The failing adapter uses the intentionally synthetic cross-platform path `D:/work`; on POSIX it must fail closed rather than enter Node's AbortSignal spawn-failure race. Preserve the probes' existing time bounds, output bounds, asynchronous behavior, and lifecycle cancellation for valid repositories.
- Retain the explicit two-worker bound, not as the POSIX root-cause fix but as deadline protection for the complete ordinary partition. Classify `foreground-terminal-lease.test.ts` in the existing serial resource-sensitive partition because it owns shared SQLite/process lifecycle state and failed only while sharing a worker window with the eight-minute predecessor update test. Remove the temporary progress reporter. The final change does not alter test selection, assertions, retries, or timeouts.

## Evidence

- PR Full regression run `35897923519` on finalized head `c2b2399e` reproduced the macOS shutdown with `--maxWorkers=2`; the capacity conclusion is withdrawn.
- Diagnostic run `35899141418` recorded `workflows.test.ts` and `adapter.test.ts` as active. One-worker run `35899855509` then recorded only `adapter.test.ts` immediately before shutdown.
- Local WSL reproduction of `adapter.test.ts` exited with signal 15. `strace` identified the test worker issuing `kill(0, SIGTERM)`, and a preload trace identified repeated `ChildProcess.kill()` calls with `pid === undefined` from `PiEngineRuntime.dispose()` and `#resetRepositoryRefresh()` through Node's AbortSignal child-process path.
- The 49-test adapter suite uses the synthetic `D:/work` repository path and passed three consecutive Linux runs after the missing-directory guard; merged pull-request parsing/probing remains covered by its focused suite.
- `adapter.test.ts` then passed 49/49 three consecutive times under Linux with the production fix and without instrumentation, where the unmodified path had reproduced process-group termination.
- Exact-head run `35904835461` did not reach Vitest because the added helper module exceeded the startup architecture budget; all four complete lanes failed the same two architecture checks. The repair was reduced to pre-launch repository-directory validation without increasing the startup graph.
- Exact-head run `35906721478` proved the root-cause repair: macOS, Linux, and Windows Node 22 completed the unchanged suite. Windows Node 24 completed its 361-file ordinary partition and four later partitions but the job deadline canceled it during the final partition; its ordinary partition took 1,355.82 seconds. Retain the explicit two-worker bound to restore deadline margin while preserving the forty-minute timeout.
- Exact-head run `35911964088` passed macOS, Linux, and Windows Node 22. Windows Node 24 completed in time but `foreground-terminal-lease.test.ts` exhausted its ownership-release deadline while the ordinary partition concurrently ran `update-predecessor.integration.test.ts`; cleanup also reported its SQLite control file busy. The same six tests passed 6/6 in 607 ms on Windows when run in the existing non-file-parallel resource-sensitive class.
- Known gap before finalization: one new exact-head run must prove all four lanes with the repository guard, worker bound, and corrected resource ownership.

- Run [Full regression #38](https://github.com/timurproko/a1/actions/runs/35834483448) (attempt 1, schedule) on `c37f420` at 2026-09-23T07:57:58Z:
  - Lane macos-15-node24 failed in job `Full regression / Complete non-physical regression (macos-15, node 24)` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
      ##[error]Process completed with exit code 143.
      ##[error]The runner has received a shutdown signal. This can happen when the runner service is stopped, or a manually started runner is canceled.
      Cleaning up orphan processes
      ```

  - Lane ubuntu-24.04-node24 failed in job `Full regression / Complete non-physical regression (ubuntu-24.04, node 24)` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
      ##[error]The runner has received a shutdown signal. This can happen when the runner service is stopped, or a manually started runner is canceled.
      ##[error]The operation was canceled.
      Cleaning up orphan processes
      ```

  - Lane Full regression / Complete regression required failed in job `Full regression / Complete regression required` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
        if (jobsResult !== "success" || records.length !== FULL_LANES.length) throw new Error("complete-regression jobs or evidence are incomplete");
                                                                                    ^
      Error: complete-regression jobs or evidence are incomplete
          at requireFullLanes (file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:44:79)
          at file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:67:20
          at ModuleJob.run (node:internal/modules/esm/module_job:561:25)
          at async node:internal/modules/esm/loader:647:26
      ##[error]Process completed with exit code 1.
      Post job cleanup.
      [command]/usr/bin/git version
      git version 2.55.0
      Temporarily overriding HOME='/home/runner/work/_temp/a68d2f2c-ad10-4e7e-a522-869018473727' before making global git config changes
      ```

  - Last successful Full regression run: [#30](https://github.com/timurproko/a1/actions/runs/35576685488) on `95216f1`; 28 `develop` commits since:
    - `c37f420` style(modals): unify shortcut hint presentation (#546)
    - `99b7eb8` fix(ui): link session delivery PR in footer (#552)
    - `8653fa4` fix(ui): align steering above live status (#554)
    - `9d2074c` fix(ui): hide image resize guidance from prompts (#549)
    - `9ecb438` fix(ui): place command errors above prompt (#548)
    - `39b8df5` fix(ui): place thinking default after checkmark (#547)
    - `65f7e7c` fix(session-ui): restore prompt suggestion after draft deletion (#550)
    - `9fa1e23` fix(ci): limit PR full regression to CI repairs (#551)
    - `91acd99` fix(ui): compact compaction progress label (#553)
    - `f7df762` fix(ui): place collapsed skills after settings (#545)
    - `b867271` feature(ci): run full regression inside repair and publishing PRs (#543)
    - `7e48174` fix(update): support owned non-default npm prefixes (#544)
    - `d24718c` fix(regression): restore publishing and consolidate nightly failures (#536)
    - `7b80f6a` chore(pi): upgrade pinned Pi to 0.87.0 (#537)
    - `6f8aa6f` feature(ui): show linked PR in status bar (#540)
    - `b26ad5d` fix(settings): remove search bottom gap (#541)
    - `98b88f3` fix(ui): mute selected autocomplete descriptions (#531)
    - `4605f4a` fix(release): gate startup profiles by the candidate's own capabilities (#532)
    - `b711d23` chore(github): add sponsor funding link (#539)
    - `535caf5` style(ui): align shortcut section headings (#535)
    - `3484636` fix(governance): clean generated settings metadata (#534)
    - `12d2944` style(settings): frame screen hierarchy (#530)
    - `6ae0615` fix(ui): stabilize touchpad scroll direction (#533)
    - `5f5a349` fix(ui): correct thinking selector presentation (#529)
    - `2226c9d` fix(regression): repair the 2026-09-21 release failure (#527)
    - `ba79473` chore(pi): upgrade pinned Pi to 0.86.1 (#526)
    - `8e22b03` fix(shell): offer /thinking and order the command menu like the engine (#528)
    - `d8a3db0` chore(pi): upgrade pinned Pi to 0.86.0 (#522)
- Run [Full regression #38](https://github.com/timurproko/a1/actions/runs/35834483448) (attempt 2, schedule) on `c37f420` at 2026-09-23T07:57:58Z:
  - Lane ubuntu-24.04-node24 failed in job `Full regression / Complete non-physical regression (ubuntu-24.04, node 24)` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 1275^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 3035^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 489^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 1208^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mkeeps source limits separate from canonical final limits ^[[33m 324^[[2mms^[[22m^[[39m
      ##[error]The runner has received a shutdown signal. This can happen when the runner service is stopped, or a manually started runner is canceled.
      ##[error]The operation was canceled.
      Cleaning up orphan processes
      ```

  - Lane macos-15-node24 failed in job `Full regression / Complete non-physical regression (macos-15, node 24)` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
      ##[error]The runner has received a shutdown signal. This can happen when the runner service is stopped, or a manually started runner is canceled.
      ##[error]The operation was canceled.
      Cleaning up orphan processes
      ```

  - Lane Full regression / Complete regression required failed in job `Full regression / Complete regression required` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
        if (jobsResult !== "success" || records.length !== FULL_LANES.length) throw new Error("complete-regression jobs or evidence are incomplete");
                                                                                    ^
      Error: complete-regression jobs or evidence are incomplete
          at requireFullLanes (file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:44:79)
          at file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:67:20
          at ModuleJob.run (node:internal/modules/esm/module_job:561:25)
          at async node:internal/modules/esm/loader:647:26
      ##[error]Process completed with exit code 1.
      Post job cleanup.
      [command]/usr/bin/git version
      git version 2.55.0
      Temporarily overriding HOME='/home/runner/work/_temp/8dd828bb-b9d1-4c0d-9218-a229cb4f0b76' before making global git config changes
      ```

  - Last successful Full regression run: [#30](https://github.com/timurproko/a1/actions/runs/35576685488) on `95216f1`; 28 `develop` commits since:
    - `c37f420` style(modals): unify shortcut hint presentation (#546)
    - `99b7eb8` fix(ui): link session delivery PR in footer (#552)
    - `8653fa4` fix(ui): align steering above live status (#554)
    - `9d2074c` fix(ui): hide image resize guidance from prompts (#549)
    - `9ecb438` fix(ui): place command errors above prompt (#548)
    - `39b8df5` fix(ui): place thinking default after checkmark (#547)
    - `65f7e7c` fix(session-ui): restore prompt suggestion after draft deletion (#550)
    - `9fa1e23` fix(ci): limit PR full regression to CI repairs (#551)
    - `91acd99` fix(ui): compact compaction progress label (#553)
    - `f7df762` fix(ui): place collapsed skills after settings (#545)
    - `b867271` feature(ci): run full regression inside repair and publishing PRs (#543)
    - `7e48174` fix(update): support owned non-default npm prefixes (#544)
    - `d24718c` fix(regression): restore publishing and consolidate nightly failures (#536)
    - `7b80f6a` chore(pi): upgrade pinned Pi to 0.87.0 (#537)
    - `6f8aa6f` feature(ui): show linked PR in status bar (#540)
    - `b26ad5d` fix(settings): remove search bottom gap (#541)
    - `98b88f3` fix(ui): mute selected autocomplete descriptions (#531)
    - `4605f4a` fix(release): gate startup profiles by the candidate's own capabilities (#532)
    - `b711d23` chore(github): add sponsor funding link (#539)
    - `535caf5` style(ui): align shortcut section headings (#535)
    - `3484636` fix(governance): clean generated settings metadata (#534)
    - `12d2944` style(settings): frame screen hierarchy (#530)
    - `6ae0615` fix(ui): stabilize touchpad scroll direction (#533)
    - `5f5a349` fix(ui): correct thinking selector presentation (#529)
    - `2226c9d` fix(regression): repair the 2026-09-21 release failure (#527)
    - `ba79473` chore(pi): upgrade pinned Pi to 0.86.1 (#526)
    - `8e22b03` fix(shell): offer /thinking and order the command menu like the engine (#528)
    - `d8a3db0` chore(pi): upgrade pinned Pi to 0.86.0 (#522)
