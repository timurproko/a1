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

### Finalized-head CI repair

- Development run `42992984669` on finalized head `f5c4bc07012bb931607c9ca7530d53110b89e6cb` passed ordinary targeted, resource-sensitive, rendering, release/resume, naming, documentation, and finalized-delivery checks. The native macOS, Ubuntu, and Windows Node 22/24 core Full jobs each exposed the same three stale expectations after reconciling continuity change `5541bb5d` from `develop`; Windows resource/rendering/package jobs passed. The predecessor jobs were still running when the failures were inspected.
- `npx vitest run test/repository-governance/package-suite-ownership.test.ts test/repository-governance/validation-ownership.test.ts test/app/session-shell/transcript-attachment-ownership.test.ts` reproduced all three failures locally (3 failed, 29 passed), then passed all 32 tests after the repairs below. Both TypeScript configurations and the unchanged final PR body check also pass.
- Package-suite ownership now explicitly names the added legacy-root retention scenario and requires exactly eight scenarios across the same two successor files. Shared-support ownership now requires the new composition consumer, its exact dependency reason, and selection of its test, alongside the existing release and Pi owners. No owner or scenario is removed.
- The attachment-pressure fixture was written for the old lazy-marker sealing path. Exact immutable snapshots now allow authoritative replacement before the obsolete snapshots trigger bounded recovery, so expecting 32 obsolete tool results in the final view contradicted the accepted history model. The replacement assertion now checks all 32 live tool blocks before replacement, every queued block's exact id/order/text and resolvable image during delivery, the one final authoritative user block, release of the obsolete asset, and an empty zero-byte queue after recovery. The original error, overload count, and 8-MiB backlog-budget assertions remain intact.
- No production policy, assertions of retained behavior, budgets, timeouts, required checks, acceptance scenarios, or Full-lane selection are weakened. These are conformance-test repairs within the existing repair outcome; trusted automation must re-finalize and revalidate the changed candidate. No unresolved implementation gap is identified, and this local evidence does not claim the successor exact-head Full CI result.

### Current-target conflict reconciliation

- Reconciled `origin/develop` at `e536c1158996668749ef67184cb97fb6963b08f0`, which integrates Pi 1.5.2. Conflicts were limited to the owned changelog selector, its independent comparison cases, and the pinned command-outcome fixture.
- Kept the current-target leading-version parser and version-neutral provenance comment; combined both branches' prefixed, prerelease, whitespace, partial-version, and invalid-version cases. Preserved the upgraded fixture's started owned runtime, missing-folder choices, and transformer effect boundary rather than rebinding a helper over that boundary. All earlier package-summary and CI-repair outcomes remain intact.
- Installed the reconciled lockfile. Build, source/bin typecheck, architecture, writer guard, identity, source-ledger, and public-API checks pass against Pi 1.5.2. Retained the startup source-byte budget, shortening a redundant contract comment rather than relaxing the allowance.
- Focused command: `npx vitest run test/app/session-shell/command-outcome-parity.test.ts test/cli/package-message-parity.test.ts test/integrations/pi/engine/changelog.test.ts test/repository-governance/package-suite-ownership.test.ts test/repository-governance/validation-ownership.test.ts test/app/session-shell/transcript-attachment-ownership.test.ts test/integrations/pi/engine/package-integration.test.ts test/contracts/agent-engine/package-ports.test.ts test/cli/packages.test.ts` — 9 files, 87 tests passed on Windows x64, Node `v24.21.0`.
- No new implementation gap or acceptance change. Trusted automation must re-finalize against this target and validate the changed exact head; no PR integration is authorized or claimed.

### Asynchronous release-claim teardown repair

- Development run `42998483022` on `a8e502a40738fe9a47dee65bf66489eb82c29570` failed only the Windows Node 22 resource shard's old-process lazy-import test in `release-gc.test.ts`: fixture removal reported `ENOTEMPTY` for its temporary `data` directory. The Windows lane collector, Full aggregate, and required Development check failed downstream of that shard; the other native lanes passed. Current automation had already reconciled the branch with `19bec492` before this repair.
- The standalone local file initially passed all 28 tests, so the intermittent filesystem error is not claimed as locally reproduced. Inspection identified the missing lifecycle barrier: a child's close handler schedules an asynchronous release-state write, while awaiting `close` alone lets fixture teardown remove the same directory before that write finishes.
- `acquireReleaseUse().track()` now returns the handoff-and-release completion promise. `spawnReleaseEntry()` exposes it as `releaseSettled`, keeps a rejection handler for detached callers, and lets awaited callers observe release failures. Successful startup warmup awaits the same release barrier. The real old/successor-process test waits for both children and both durable releases before final collection and fixture teardown, and asserts that no use claims remain.
- Added a deterministic regression that pauses the release-state update after child close, proves the completion promise remains pending and the running claim is still present, then permits the write and requires both promise completion and an empty claims map. No sleep, deletion retry, skipped assertion, budget increase, or timeout increase substitutes for settlement.
- Focused validation: `npx vitest run test/foundation/release/release-gc.test.ts test/foundation/release/warmup.test.ts test/foundation/release/release-state.test.ts` passed 3 files and 45 tests on Windows x64, Node `v24.21.0`. Build, source/bin typecheck, architecture, writer guard, identity, and source-ledger checks pass. The original lazy-import, retention, and cleanup assertions remain unchanged. Extending the focused run to `update-launch.test.ts` and `update-activation.test.ts` passed 5 files and 69 tests; documentation governance, the unchanged final body check, and the re-finalization inspection also pass.
- No unresolved implementation gap is identified. Re-finalization and renewed exact-head cross-platform Full CI remain trusted-automation evidence; the local result is not a claim that the Windows Node 22 CI rerun has passed.

### Worktree adapter type-safety and inventory repair

- Development run `43004486869` on `d0447ac560103317dae3f2a57ccaf49670196790` failed the same two governance tests in macOS, Ubuntu, and Windows Node 22/24 core Full jobs. The customization prerequisite rejected the `as unknown as ToolDefinition[]` escape introduced in `19bec492`'s worktree wrapper; the public-API check found missing consumers for seven built-in tool factories and `ToolDefinition`. Lane and required-aggregate failures were downstream of those two checks, not additional test defects.
- Local reproduction: `npx vitest run test/repository-governance/owned-ui-customization-prerequisite.test.ts test/repository-governance/pinned-pi-public-api.test.ts` reproduced both failures (2 failed, 14 passed).
- Replaced the adapter escape with pinned Pi's documented public `defineTool` helper, which preserves each wrapper's schema/details/state inference through the SDK's heterogeneous custom-tools collection. Added that public helper to the bundled startup facade. Cwd verification, cancellation, native rendering, defaults, and all seven tool factories remain unchanged; the architecture gate and its negative fixtures are not edited.
- Regenerated `pinned-pi-public-api.json` with the repository updater. Only consumer arrays change, including the new `defineTool` consumers; all 646 export identities and declaration hashes remain unchanged.
- Focused command: `npx vitest run test/repository-governance/owned-ui-customization-prerequisite.test.ts test/repository-governance/pinned-pi-public-api.test.ts test/integrations/pi/engine/worktree-tools.test.ts test/integrations/pi/engine/runtime-integration.test.ts` — 4 files, 38 tests passed on Windows x64, Node `v24.21.0`. Product build, the supported source/bin `npm run typecheck`, architecture, writer guard, identity, and source-ledger checks pass without allowance changes.
- An initial ad hoc TypeScript 5.9 test-tree check reported existing self-referential timer inference errors in `test/features/owned-ui/event-frame-clock.ts`; that alternate compiler invocation is not the repository's test-tree typecheck. The supported `tsgo` checks and production `tsc` build pass. The unrelated timer fixture is unchanged.
- No unresolved implementation gap or acceptance change is identified. Current `origin/develop` remains reconciled at `19bec492`; trusted re-finalization and renewed exact-head Full CI must validate this candidate. No test, gate, budget, timeout, or required lane was weakened.

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
