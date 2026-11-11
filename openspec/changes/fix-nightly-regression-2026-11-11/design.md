## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- Introducing commit `726730e263055d034f77466a9464dbf2a9f12e98` upgraded pinned Pi from 1.5.0 to 1.5.1 without reconciling the command-outcome fixture, package update summaries, or changelog version selection. Pi 1.5.1 uses a module-local provider matcher rather than `InteractiveMode.findLoginProviderOptions`; its package CLI now distinguishes offline, unchanged, warned, and changed updates; changelog selection accepts a leading version with a prerelease suffix and returns no selection for invalid saved versions.
- Remove the obsolete private-method binding from the independent pinned producer and bind its newly required changelog helpers. Retain fail-fast checks for every bound method and all command scenarios and comparisons.
- Carry package update summaries and warning severity through the vendor-neutral package contract. Collect Pi's result/progress events per update, mirror the non-public offline predicate inside the Pi adapter, and reproduce summary wording, styling, order, and counts without changing package policy or user-only scope.
- Match pinned changelog selection for invalid versions, leading `v`, whitespace, and prerelease versions. Update the independent expected-result type to reflect Pi's actual optional result and explicitly assert that invalid and current prerelease versions show no new notes.
- Commit `3d3c7679` introduced a deferred-selector frame hold without checking whether the runtime was running, and added source consumers without refreshing the public API inventory. Gate holds on both attachment and running state, preserving live-selector holds. Regenerate the reviewed consumer inventory; export identities and declaration hashes remain unchanged.
- These are conformance repairs to existing transcript, changelog, presentation-lifecycle, and inventory requirements, so no requirement changes or specification deltas are needed. No assertions, budgets, timeouts, or coverage are reduced.

## Evidence

### Local reproduction

- On Windows x64, Node `v24.21.0`, from generated head `edf79ea0867daa30d6ef5164f7b0b29086f47b7f`, `npx vitest run test/app/session-shell/command-outcome-parity.test.ts test/cli/package-message-parity.test.ts` reproduced 7 failures: 3 command-outcome cases stopped at `Pinned method missing: findLoginProviderOptions`, and 4 package-transcript cases compared unconditional `Updated ...` against `Skipped package updates (offline mode)` (both color levels).
- The pinned 1.5.1 changelog explicitly documents update result events, the new summary variants, and prerelease changelog version handling. Its interactive implementation calls module-local `findMatchingProviders`; the removed method is not a fixture dependency anymore. Once that blocker was removed, the same command-outcome tests exposed the missing `createChangelogMarkdown` binding, then the pre-start deferred trust-selector hold from `3d3c7679`; all four command-outcome tests pass after those fixes.
- Reading the full failed log identified two additional failed files outside the bounded triage excerpt: `test/integrations/pi/engine/changelog.test.ts` and `test/repository-governance/pinned-pi-public-api.test.ts`. A focused local run reproduced both failures (2 failed, 5 passed). The generated API refresh changes only consumer arrays, matching the source consumers added by the UX dialog change; it preserves all export identities and declaration hashes.
- The failed required Full aggregate follows missing failed-lane evidence; it is not independent evidence of an orchestration defect. Preserve all recorded owners and native lanes for the trusted exact-head PR Full selection.

### Focused implementation evidence and pre-finalization observations

- Merged current `origin/develop` before final local checks. Build and both TypeScript configurations pass. Architecture, session-writer guard, identity boundaries, and pinned source-ledger checks pass without changing their budgets or baselines; the contract introduction was shortened rather than raising the startup source-byte allowance.
- Focused command: `npx vitest run test/app/session-shell/command-outcome-parity.test.ts test/app/session-shell/shell-host.test.ts test/app/session-shell/session-shell-workflows.test.ts test/cli/package-message-parity.test.ts test/cli/packages.test.ts test/integrations/pi/engine/package-integration.test.ts test/integrations/pi/engine/changelog.test.ts test/contracts/agent-engine/package-ports.test.ts test/repository-governance/pinned-pi-public-api.test.ts` — 9 files, 88 tests passed on Windows x64, Node `v24.21.0`.
- Added independent direct/compatibility transcript comparisons at both color levels for offline values, unchanged updates, source-specific warnings, singular/plural changed-package lists, mixed warning/change outcomes, and subsequent empty updates. Adapter tests cover ignored non-update results, failure recovery, and result isolation; neutral contract tests cover immutable summary snapshots. Changelog parity adds prerelease, leading-v, whitespace, partial-version, and invalid-version cases. Existing pre-start command-outcome cases and live shell workflows cover both sides of the frame-hold guard.
- Strict validation: `npx openspec validate fix-nightly-regression-2026-11-11 --strict` passed.
- Before finalization, PR #907 remains a draft; its Development readiness, selection, and product jobs are skipped, as required. Its immutable App author and unchanged `regression-provenance.json` identify failed Full regression run #90 on `3d3c7679`; the trusted finalized-head PR selection must retain all four native Full lanes and all recorded failed owners. No standalone Full dispatch or broad local suite was used as substitute evidence.
- Known gaps: no unresolved implementation gaps. Exact-finalized-head cross-platform PR Full regression and required aggregate results remain future CI evidence, not local test claims or implementation tasks. Numbered-package nightly publication recovery remains independent and is not claimed by this repair.

### Original triage

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
