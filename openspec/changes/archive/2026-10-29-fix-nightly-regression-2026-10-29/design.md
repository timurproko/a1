## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- The failures are stale test expectations, introduced by `0ec0a4f` (#847), which deliberately switched the default transcript selection from white (`ESC[47m`) to shared blue (`ESC[48;2;38;79;120m`) and made empty last-message copies silent. Preserve the production behavior: assert the new selected-row style without changing semantic copy assertions, and allow exactly the empty-copy case in the independent pinned/owned parity test while asserting Pi's exact error, A1's silence, and rejection of a spurious A1 message. Do not loosen any other parity cases or test budgets.

## Evidence

- Reproduced locally on the draft head `77876740` with `npx vitest run test/ui/components/transcript-viewport.test.ts test/app/session-shell/command-outcome-parity.test.ts`: five viewport failures asserting the obsolete white SGR plus two command-parity failures, all eight frame variants of `/copy/empty/`. Directly captured the pinned copy error `Error: No agent messages to copy yet.` against A1's empty rows across dark/light, padding 0/1, widths 80/28. `git show 0ec0a4f -- src/ui/components/text-selection.ts src/ui/components/transcript-viewport.ts` identifies the selection introduction; #847 also intentionally silenced empty copies. The failed Full regression aggregate is downstream of these owner failures, not a separate orchestration defect.
- After the test corrections, the same focused run passes (66 tests across two files). `npx tsc -p tsconfig.build.json && node scripts/pi/build-startup-public.mjs && npm run typecheck` passes, as does `npx openspec validate fix-nightly-regression-2026-10-29 --strict`. The first bare `npm run typecheck` failed because this fresh worktree lacked generated `dist/` modules; the generated build resolves it. No Full regression dispatch was started on the draft; exact-head PR-selected Full regression remains the post-finalization gate. No known gaps in the two reproduced failures; numbered-package nightly recovery is independent.

- Run [Full regression #77](https://github.com/timurproko/a1/actions/runs/40809187157) (attempt 1, schedule) on `7b590f0` at 2026-10-29T02:55:22Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node22 (resource shard), windows-2025-node24 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/foundation/supervision/foreground-terminal-lease.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/repository-governance/local-cleanup.test.ts`, `test/foundation/storage/storage.test.ts`, `test/foundation/release/cohort-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/foundation/release/update-live-cohort.test.ts`, and 13 more
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/command-outcome-parity.test.ts ^[[2m(^[[22m^[[2m4 tests^[[22m^[[2m | ^[[22m^[[31m2 failed^[[39m^[[2m)^[[22m^[[33m 47606^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m independent command outcome parity^[[2m > ^[[22mmatches real command outputs in truecolor with only the named exceptions^[[39m^[[33m 19965^[[2mms^[[22m^[[39m
      ^[[31m     → command message differences: expected [ 'dark/0/copy/empty/80', …(7) ] to deeply equal []^[[39m
      ^[[31m   ^[[31m×^[[31m independent command outcome parity^[[2m > ^[[22mmatches real command outputs in 256color with only the named exceptions^[[39m^[[33m 20395^[[2mms^[[22m^[[39m
      ^[[31m     → command message differences: expected [ 'dark/0/copy/empty/80', …(7) ] to deeply equal []^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m independent command outcome parity^[[2m > ^[[22mfails on malformed producer input and terminates a nonresponsive producer ^[[33m 800^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m independent command outcome parity^[[2m > ^[[22muses the native missing-executable shape and refuses to widen the wording exception ^[[33m 6445^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/integrations/pi/components/editor-text-paste.test.ts ^[[2m(^[[22m^[[2m28 tests^[[22m^[[2m)^[[22m^[[33m 3367^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m isolated terminal paste with history=false^[[2m > ^[[22mpreserves split closing delimiters, Unicode pairs, opaque controls and following input without a native read ^[[33m 677^[[2mms^[[22m^[[39m
      ^[[31m⎯⎯⎯⎯⎯⎯⎯^[[39m^[[1m^[[41m Failed Tests 2 ^[[49m^[[22m^[[31m⎯⎯⎯⎯⎯⎯⎯^[[39m
      ^[[41m^[[1m FAIL ^[[22m^[[49m test/app/session-shell/command-outcome-parity.test.ts^[[2m > ^[[22mindependent command outcome parity^[[2m > ^[[22mmatches real command outputs in truecolor with only the named exceptions
      ... 36 more lines in the run log
      ```

  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/ui/components/transcript-viewport.test.ts ^[[2m(^[[22m^[[2m62 tests^[[22m^[[2m | ^[[22m^[[31m5 failed^[[39m^[[2m)^[[22m^[[32m 207^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m transcript viewport^[[2m > ^[[22mreturns an exact-height frame with a top gap and a rail through the final content row^[[32m 4^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m transcript viewport^[[2m > ^[[22mbottom-aligns a fitting transient status without shifting earlier rows^[[32m 1^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m transcript viewport^[[2m > ^[[22mreuses established transcript rows for a same-height dock-only frame and fails closed on geometry or selection^[[32m 2^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m transcript viewport^[[2m > ^[[22mdescribes initial, followed-shift, detached, geometry, selection, and reset damage without inspecting rows^[[32m 3^[[2mms^[[22m^[[39m
      ^[[31m     → expected '\u001b[48;2;38;79;120mnext footer  \u…' to contain '\u001b[47m'^[[39m
         ^[[32m✓^[[39m transcript viewport^[[2m > ^[[22mexcludes base-frame cells covered by an owning overlay^[[32m 0^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m transcript viewport^[[2m > ^[[22mkeeps paint-only row transforms out of transcript copying^[[32m 0^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m transcript viewport^[[2m > ^[[22muses matching normal and hover surface roles for sticky and bottom controls^[[32m 1^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m transcript viewport^[[2m > ^[[22mderives bottom hover from current geometry in one frame, including boundaries and absent positions^[[32m 4^[[2mms^[[22m^[[39m
      ^[[31m     → expected false to be true // Object.is equality^[[39m
      ^[[31m   ^[[31m×^[[31m transcript viewport^[[2m > ^[[22mkeeps an active status-to-content drag anchored while the spinner glyph advances^[[39m^[[32m 2^[[2mms^[[22m^[[39m
      ^[[31m     → expected '⠙ Worki\u001b[48;2;38;79;120mng...   …' to contain '\u001b[47m'^[[39m
      ... 90 more lines in the run log
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
      git version 2.56.0
      Temporarily overriding HOME='/home/runner/work/_temp/19049c09-6229-4390-9ec9-689ac862a423' before making global git config changes
      ```

  - Last successful Full regression run: [#74](https://github.com/timurproko/a1/actions/runs/40255894675) on `fa24f0d`; 14 `develop` commits since:
    - `7b590f0` fix(update): install channel releases automatically (#848)
    - `0ec0a4f` fix(tabs): centralize tab bar behavior (#847)
    - `81d81ad` chore(regression): repair the 2026-10-28 full regression failure (#846)
    - `0d83608` fix(release): version development previews monotonically (#844)
    - `35c1aad` fix(tabs): start a new Agent when every resident tab has stopped (#845)
    - `41369d4` feat(tabs): run utility tabs as slim processes (#828)
    - `10e3a7f` chore(regression): repair the 2026-10-27 full regression failure (#842)
    - `9d34264` fix: show new Agent tab immediately (#837)
    - `939b152` fix: pad session status bar (#841)
    - `9525032` docs: require one-line cd commands for the user (#840)
    - `f465468` Unify startup and progress accents with Settings (#836)
    - `e9340bc` fix(session): tolerate stale worktree registrations in inventory (#839)
    - `1f02b2e` docs(agents): stale worktree entries never block delivery (#838)
    - `4be74e6` fix(resident): isolate hosts by immutable release (#835)
