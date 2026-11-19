## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- The failures came from three independently introduced test-evidence gaps, not the status-bar change at `939b152`: `1f02b2e` pushed the delivery skill past its enforced size, while `f465468` changed the default semantic accent from pinned purple to A1 blue without refreshing A1-owned frame fixtures or making exact upstream-comparison tests select purple explicitly.
- Keep both color contracts exact: A1-owned diagnostic fixtures record the blue default byte-for-byte, while tests claiming pinned Pi parity explicitly select the purple comparison accent before comparing full ANSI rows. No ANSI, geometry, assertion, timeout, budget, or coverage normalization is widened.
- Make the installer cancellation fixture hermetic by selecting an empty profile home and truecolor mode; this prevents the developer profile and ambient terminal capability from changing the expected accent.
- The Windows Node 24 update-performance failure is environmental: the same head passed on Windows Node 22, and a focused Windows Node 24 reproduction completed far below the unchanged 30-second budget. Keep the budget unchanged and require the selected exact-head PR Full regression to prove the final candidate.

## Evidence

- Run [Full regression #75](https://github.com/timurproko/a1/actions/runs/40438446686) (attempt 1, schedule) on `939b152` at 2026-10-27T02:26:40Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node22 (resource shard), windows-2025-node24 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/foundation/supervision/foreground-terminal-lease.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/repository-governance/local-cleanup.test.ts`, `test/foundation/storage/storage.test.ts`, `test/foundation/release/cohort-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/foundation/release/update-live-cohort.test.ts`, and 13 more
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/command-outcome-parity.test.ts ^[[2m(^[[22m^[[2m4 tests^[[22m^[[2m | ^[[22m^[[31m2 failed^[[39m^[[2m)^[[22m^[[33m 33009^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m independent command outcome parity^[[2m > ^[[22mmatches real command outputs in truecolor with only the named exceptions^[[39m^[[33m 14754^[[2mms^[[22m^[[39m
      ^[[31m     → command message differences: expected [ …(24) ] to deeply equal []^[[39m
      ^[[31m   ^[[31m×^[[31m independent command outcome parity^[[2m > ^[[22mmatches real command outputs in 256color with only the named exceptions^[[39m^[[33m 14305^[[2mms^[[22m^[[39m
      ^[[31m     → command message differences: expected [ …(24) ] to deeply equal []^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m independent command outcome parity^[[2m > ^[[22mfails on malformed producer input and terminates a nonresponsive producer ^[[33m 689^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m independent command outcome parity^[[2m > ^[[22muses the native missing-executable shape and refuses to widen the wording exception ^[[33m 3260^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/integrations/pi/components/editor-text-paste.test.ts ^[[2m(^[[22m^[[2m28 tests^[[22m^[[2m)^[[22m^[[33m 2306^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m isolated terminal paste with history=false^[[2m > ^[[22mpreserves split closing delimiters, Unicode pairs, opaque controls and following input without a native read ^[[33m 413^[[2mms^[[22m^[[39m
       ^[[31m❯^[[39m test/app/session-shell/command-message-parity.test.ts ^[[2m(^[[22m^[[2m3 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 4438^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m independent pinned command message geometry^[[2m > ^[[22mmatches complete rows and transitions in both capability modes^[[39m^[[33m 2935^[[2mms^[[22m^[[39m
      ^[[31m     → truecolor/dark/0/new/0/0/80: expected { …(3) } to deeply equal { …(3) }^[[39m
      ... 60 more lines in the run log
      ```

  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/transcript-content-retention.test.ts ^[[2m(^[[22m^[[2m32 tests^[[22m^[[2m | ^[[22m^[[31m2 failed^[[39m^[[2m)^[[22m^[[33m 2375^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m transcript content retention across renderer boundaries^[[2m > ^[[22mshows live tool output after the assistant has finished the arguments ^[[33m 302^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m transcript content retention across renderer boundaries^[[2m > ^[[22mkeeps earlier history between a run-local agent_end and delayed settlement^[[32m 66^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m transcript content retention across renderer boundaries^[[2m > ^[[22mdoes not downgrade a completed result when its message is restated^[[32m 16^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m transcript content retention across renderer boundaries^[[2m > ^[[22mmaps argument completion and execution start independently to the public renderer^[[32m 21^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m transcript content retention across renderer boundaries^[[2m > ^[[22mmatches the independent actual edit renderer and retains its authoritative diff after a late failed preview^[[39m^[[32m 85^[[2mms^[[22m^[[39m
      ^[[31m     → expected [ '', …(8) ] to deeply equal [ '', …(8) ]^[[39m
      ^[[31m   ^[[31m×^[[31m transcript content retention across renderer boundaries^[[2m > ^[[22mreplaces an already rendered stale edit preview with the authoritative final diff^[[39m^[[32m 77^[[2mms^[[22m^[[39m
      ^[[31m     → expected [ '', …(9) ] to deeply equal [ '', …(9) ]^[[39m
         ^[[32m✓^[[39m transcript content retention across renderer boundaries^[[2m > ^[[22mupdates image references without replacing the mounted tool or its renderer state^[[32m 10^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m transcript content retention across renderer boundaries^[[2m > ^[[22mschedules a real asynchronous frame, coalesces notifications, and reuses unaffected rows^[[32m 117^[[2mms^[[22m^[[39m
      ... 304 more lines in the run log
      ```

  - `vitest-isolated-timing` (`update-performance`) failed on windows-2025-node24 (package shard) with exit 1.
    - Tests: `test/foundation/release/update-performance.integration.test.ts`
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/foundation/release/update-performance.integration.test.ts ^[[2m(^[[22m^[[2m3 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 47088^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m packaged update activation performance^[[2m > ^[[22mactivates a large payload with one source read and one product-or-layer write per selected file^[[39m^[[33m 47085^[[2mms^[[22m^[[39m
      ^[[31m     → update performance budget failed: post-npm activation took 40584ms; budget is 30000ms^[[39m
         ^[[32m✓^[[39m packaged update activation performance^[[2m > ^[[22mreports the exact operation or duration that exceeds the release budget^[[32m 1^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m packaged update activation performance^[[2m > ^[[22mkeeps bare launch free of installation output after update activation^[[32m 1^[[2mms^[[22m^[[39m
      ^[[31m⎯⎯⎯⎯⎯⎯⎯^[[39m^[[1m^[[41m Failed Tests 1 ^[[49m^[[22m^[[31m⎯⎯⎯⎯⎯⎯⎯^[[39m
      ^[[41m^[[1m FAIL ^[[22m^[[49m test/foundation/release/update-performance.integration.test.ts^[[2m > ^[[22mpackaged update activation performance^[[2m > ^[[22mactivates a large payload with one source read and one product-or-layer write per selected file
      ^[[31m^[[1mError^[[22m: update performance budget failed: post-npm activation took 40584ms; budget is 30000ms^[[39m
      ^[[36m ^[[2m❯^[[22m assertUpdatePerformanceBudget src/foundation/release/update.ts:^[[2m942:34^[[22m^[[39m
          ^[[90m940| ^[[39m  if (evidence.verificationReads > 0) failures.push(`fresh certificati…
          ^[[90m941| ^[[39m  if (evidence.postNpmDurationMs > maximumPostNpmDurationMs) failures.…
      ^[[2m Test Files ^[[22m ^[[1m^[[31m1 failed^[[39m^[[22m^[[90m (1)^[[39m
          ^[[90m942| ^[[39m  if (failures.length > 0) throw new Error(`update performance budget …
      ^[[2m      Tests ^[[22m ^[[1m^[[31m1 failed^[[39m^[[22m^[[2m | ^[[22m^[[1m^[[32m2 passed^[[39m^[[22m^[[90m (3)^[[39m
          ^[[90m   | ^[[39m                                 ^[[31m^^[[39m
      ^[[2m   Start at ^[[22m 02:34:29
          ^[[90m943| ^[[39m}
      ... 16 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/f4719942-b5b7-4d12-84db-26f8e6282ee6' before making global git config changes
      ```

  - Last successful Full regression run: [#74](https://github.com/timurproko/a1/actions/runs/40255894675) on `fa24f0d`; 6 `develop` commits since:
    - `939b152` fix: pad session status bar (#841)
    - `9525032` docs: require one-line cd commands for the user (#840)
    - `f465468` Unify startup and progress accents with Settings (#836)
    - `e9340bc` fix(session): tolerate stale worktree registrations in inventory (#839)
    - `1f02b2e` docs(agents): stale worktree entries never block delivery (#838)
    - `4be74e6` fix(resident): isolate hosts by immutable release (#835)

- Focused reproduction on candidate head `f881daa` with Windows Node 24 reproduced 23 failures across the 12 recorded test files:
  - exact parity rows differed only at the intentional semantic accent (`167;152;215`/`38;5;140` pinned purple versus `130;160;241`/`38;5;111` A1 blue);
  - the delivery skill contained 649 whitespace-delimited words against the unchanged `<600` contract; and
  - the installer cancellation fixture inherited the local profile's cyan accent, confirming that its environment was not isolated.
- The isolated update-performance test passed locally on Windows Node `v24.22.0` in 9.21 seconds with the 30-second budget unchanged. The failed run's Windows Node 22 package shard also passed in 13.25 seconds, while only Windows Node 24 reported a 40.58-second activation.
- Focused implementation evidence on reconciled head `1808ba7`:
  - `npm run typecheck` passed;
  - the 13 affected Vitest files passed with 146 tests passing and 2 platform skips, including update activation in 8.29 seconds; and
  - `openspec validate fix-nightly-regression-2026-10-27 --strict` passed.
- Pre-finalization observation: the generated repair remains draft, so Development validation and PR Full regression are correctly absent before completion. No known implementation gap remains; the finalization-triggered selected exact-head PR Full regression must still pass before handoff.
