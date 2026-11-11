## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #90](https://github.com/timurproko/a1/actions/runs/42950411894) (attempt 1, schedule) on `3d3c767` at 2026-11-11T03:05:37Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node22 (resource shard), windows-2025-node24 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/repository-governance/local-cleanup.test.ts`, `test/foundation/release/release-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/features/prompt-history/concurrency.integration.test.ts`, `test/features/prompt-history/store.test.ts`, `test/app/session-shell/command-message-parity.test.ts`, and 10 more
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/command-outcome-parity.test.ts ^[[2m(^[[22m^[[2m4 tests^[[22m^[[2m | ^[[22m^[[31m3 failed^[[39m^[[2m)^[[22m^[[33m 5470^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m independent command outcome parity^[[2m > ^[[22mmatches real command outputs in truecolor with only the named exceptions^[[39m^[[33m 1710^[[2mms^[[22m^[[39m
      ^[[31m     → Command failed: C:\hostedtoolcache\windows\node\22.23.4\x64\node.exe --import tsx D:\a\a1\a1\test\app\session-shell\command-outcome-worker.mjs pinned C:\Users\RUNNER~1\AppData\Local\Temp\a1-command-outcomes-zJJEob truecolor [{"id":"share/missing","command":"share","condition":"missin...
      D:\a\a1\a1\test\app\session-shell\command-outcome-worker.mjs:190
                  if (typeof implementation !== "function") throw new Error(`Pinned method missing: ${method}`);
                                                                  ^
      Error: Pinned method missing: findLoginProviderOptions
          at <anonymous> (D:\a\a1\a1\test\app\session-shell\command-outcome-worker.mjs:190:61)
      Node.js v22.23.4
      ^[[39m
      ^[[31m   ^[[31m×^[[31m independent command outcome parity^[[2m > ^[[22mmatches real command outputs in 256color with only the named exceptions^[[39m^[[33m 1557^[[2mms^[[22m^[[39m
      ^[[31m     → Command failed: C:\hostedtoolcache\windows\node\22.23.4\x64\node.exe --import tsx D:\a\a1\a1\test\app\session-shell\command-outcome-worker.mjs pinned C:\Users\RUNNER~1\AppData\Local\Temp\a1-command-outcomes-mb9dst 256color [{"id":"share/missing","command":"share","condition":"missing...
      D:\a\a1\a1\test\app\session-shell\command-outcome-worker.mjs:190
                  if (typeof implementation !== "function") throw new Error(`Pinned method missing: ${method}`);
                                                                  ^
      Error: Pinned method missing: findLoginProviderOptions
          at <anonymous> (D:\a\a1\a1\test\app\session-shell\command-outcome-worker.mjs:190:61)
      Node.js v22.23.4
      ^[[39m
      ... 57 more lines in the run log
      ```

  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/cli/package-message-parity.test.ts ^[[2m(^[[22m^[[2m12 tests^[[22m^[[2m | ^[[22m^[[31m4 failed^[[39m^[[2m)^[[22m^[[33m 6740^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m independent pinned package command transcripts^[[2m > ^[[22mmatches both model aliases and operational errors at color level 0 ^[[33m 2839^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m independent pinned package command transcripts^[[2m > ^[[22mmatches both model aliases and operational errors at color level 1 ^[[33m 2657^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m independent pinned package command transcripts^[[2m > ^[[22mpreserves empty list/update and distinct missing-package failures at color level 0^[[39m^[[32m 275^[[2mms^[[22m^[[39m
      ^[[31m     → expected [ …(12) ] to deeply equal [ …(12) ]^[[39m
      ^[[31m   ^[[31m×^[[31m independent pinned package command transcripts^[[2m > ^[[22mpreserves empty list/update and distinct missing-package failures at color level 1^[[39m^[[32m 234^[[2mms^[[22m^[[39m
      ^[[31m     → expected [ …(12) ] to deeply equal [ …(12) ]^[[39m
      ^[[31m   ^[[31m×^[[31m independent pinned package command transcripts^[[2m > ^[[22mpreserves successful package progress and list output at color level 0^[[39m^[[32m 36^[[2mms^[[22m^[[39m
      ^[[31m     → expected [ { id: 'install', …(3) }, …(3) ] to deeply equal [ { id: 'install', …(3) }, …(3) ]^[[39m
      ^[[31m   ^[[31m×^[[31m independent pinned package command transcripts^[[2m > ^[[22mpreserves successful package progress and list output at color level 1^[[39m^[[32m 24^[[2mms^[[22m^[[39m
      ^[[31m     → expected [ { id: 'install', …(3) }, …(3) ] to deeply equal [ { id: 'install', …(3) }, …(3) ]^[[39m
         ^[[32m✓^[[39m independent pinned package command transcripts^[[2m > ^[[22mprojects pinned explicit help onto only A1's supported grammar at color level 0^[[32m 4^[[2mms^[[22m^[[39m
      ... 117 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/168c040e-25f4-458c-beaa-1f69be6d2603' before making global git config changes
      ```

  - Last successful Full regression run: [#88](https://github.com/timurproko/a1/actions/runs/42553939886) on `47397a0`; 12 `develop` commits since:
    - `3d3c767` fix(ux): align session, sign-in, and trust dialogs (#903)
    - `5cf34be` fix(cleanup): preserve exports and handle dev processes (#902)
    - `726730e` upgrade(pi): upgrade pinned Pi to 1.5.1 (#898)
    - `2ebe07b` chore(regression): repair the 2026-11-10 full regression failure (#899)
    - `e2dd6f6` fix(ui): restore model cycling and refine Launcher (#901)
    - `0786d54` feature(ui): add Apps launcher and clearer modals (#900)
    - `8c5a4d0` style: increase scrollbar stroke weight (#897)
    - `0783454` feat: add session name format choices (#896)
    - `5611d63` fix: omit hidden image blocks (#895)
    - `21ddae8` feature(session): restore context-aware auto-naming (#894)
    - `3af62d0` fix(session): register bare A1 runtimes with the production process inspector (#893)
    - `747f0f7` feature(shell): publish session names as terminal titles (#892)
