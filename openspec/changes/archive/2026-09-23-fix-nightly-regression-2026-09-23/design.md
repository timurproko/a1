## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- Treat both generated repairs as one validation-capacity defect. Full regression #38 and Release #155 ran the same `full-release` plan at `c37f420`; on both attempts the macOS runner shut down one to two seconds after the complete ordinary Vitest partition started, while Linux shut down at different points in that same partition. No assertion, timeout, or owner outcome failed first, and both Windows lanes completed the unchanged coverage. That repeatable boundary identifies unbounded ordinary-partition worker fanout and its process/memory pressure, not a product test or the native process-containment integration, as the common cause.
- Keep file parallelism but cap the complete ordinary partition at two Vitest workers on every platform. Two is already the effective capacity of the successful Windows hosted lane, keeps the retained forty-minute job bound viable, and prevents the three/four-worker POSIX fanout that shut down the runner. Do not move tests, retry failures, increase timeouts, or weaken assertions.
- Put the cap in the authoritative `full-release` plan rather than one workflow so scheduled/manual Full regression, selected repair PR regression, and release validation all receive the same behavior. Record the cap as invocation evidence and lock it with the validation-tier contract test.

## Evidence

- Both attempts of Full regression #38 and Release #155 reached `vitest-full-without-isolated`; every macOS lane then shut down before completing a test file. The Full regression Linux lane shut down after different amounts of the deterministic suite on its two attempts, and Release Linux failed once before passing its rerun only after a much longer complete-partition execution. This variability excludes one deterministic failing test as the cause and localizes the defect to complete-suite runner pressure.
- The same Full regression attempt completed Windows Node 24 and Node 22. Windows Node 24 ran all 360 ordinary-partition files in 807.22 seconds and completed the whole lane within its existing forty-minute bound, showing that a two-worker effective lane retains viable timing without reducing coverage.
- Release #154 on the same `c37f420` source passed because impact selection ran focused package owners rather than the complete 360-file ordinary partition; Release #155 selected `full-release` and reproduced the Full regression shutdown. This distinguishes candidate bytes from complete-suite orchestration pressure.
- Focused implementation evidence after adding the worker bound:
  - `validation-tier.test.ts`: 23/23 passed and verifies `--maxWorkers=2` plus bounded-parallel plan evidence.
  - `full-regression-policy.test.ts`, `validation-suite-policy.test.ts`, and `resource-sensitive-validation.test.ts`: 28/28 passed, preserving full selection and the separate serial resource-sensitive partition.
  - OpenSpec acceptance policy/checklist tests: 29/29 passed; strict validation of this change passed.
  - TypeScript build prerequisite and `npm run typecheck` passed; full code-documentation governance reported no violations.
- Known gap before finalization: local Windows/WSL validation proves plan shape and focused contracts but cannot reproduce a GitHub-hosted macOS shutdown. The selected exact-head PR Full regression remains the required native proof and blocks handoff until all four lanes pass.

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
