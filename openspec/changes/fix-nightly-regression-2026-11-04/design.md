## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- The deterministic failures came from Pi 1.5.0 adoption in `4716452`: A1's copied provider-default table still named Pi 1.4-era models, so login parity expected `gpt-6.1-sol` while the owned workflow selected or reported `gpt-5.5`. Keep the complete owned table equal to Pi 1.5.0's resolver instead of patching only the OpenAI cases.
- The public API baseline missed `default-model-setting.ts`, introduced by `3eb4c68`, as a `SettingsManager` consumer. Regenerate the baseline from the installed pin and current source tree rather than weakening its consumer comparison.
- The Node 22 predecessor failure is environmental evidence from the failed run: the identical Windows Node 24 predecessor shard passed, while the deterministic parity and baseline failures reproduced locally. The selected exact-head PR Full regression must rerun the Node 22 predecessor shard; no timeout or assertion is relaxed.

## Evidence

- Run [Full regression #83](https://github.com/timurproko/a1/actions/runs/41766480393) (attempt 1, schedule) on `19a43af` at 2026-11-04T03:20:17Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node22 (resource shard), windows-2025-node24 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/foundation/supervision/foreground-terminal-lease.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/repository-governance/local-cleanup.test.ts`, `test/foundation/storage/storage.test.ts`, `test/foundation/release/cohort-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/foundation/release/update-live-cohort.test.ts`, and 13 more
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/command-outcome-parity.test.ts ^[[2m(^[[22m^[[2m4 tests^[[22m^[[2m | ^[[22m^[[31m2 failed^[[39m^[[2m)^[[22m^[[33m 45794^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m independent command outcome parity^[[2m > ^[[22mmatches real command outputs in truecolor with only the named exceptions^[[39m^[[33m 19867^[[2mms^[[22m^[[39m
      ^[[31m     → command message differences: expected [ …(24) ] to deeply equal []^[[39m
      ^[[31m   ^[[31m×^[[31m independent command outcome parity^[[2m > ^[[22mmatches real command outputs in 256color with only the named exceptions^[[39m^[[33m 19002^[[2mms^[[22m^[[39m
      ^[[31m     → command message differences: expected [ …(24) ] to deeply equal []^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m independent command outcome parity^[[2m > ^[[22mfails on malformed producer input and terminates a nonresponsive producer ^[[33m 791^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m independent command outcome parity^[[2m > ^[[22muses the native missing-executable shape and refuses to widen the wording exception ^[[33m 6133^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/integrations/pi/components/editor-text-paste.test.ts ^[[2m(^[[22m^[[2m28 tests^[[22m^[[2m)^[[22m^[[33m 3170^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m isolated terminal paste with history=false^[[2m > ^[[22mpreserves split closing delimiters, Unicode pairs, opaque controls and following input without a native read ^[[33m 610^[[2mms^[[22m^[[39m
      ^[[31m⎯⎯⎯⎯⎯⎯⎯^[[39m^[[1m^[[41m Failed Tests 2 ^[[49m^[[22m^[[31m⎯⎯⎯⎯⎯⎯⎯^[[39m
      ^[[41m^[[1m FAIL ^[[22m^[[49m test/app/session-shell/command-outcome-parity.test.ts^[[2m > ^[[22mindependent command outcome parity^[[2m > ^[[22mmatches real command outputs in truecolor with only the named exceptions
      ^[[41m^[[1m FAIL ^[[22m^[[49m test/app/session-shell/command-outcome-parity.test.ts^[[2m > ^[[22mindependent command outcome parity^[[2m > ^[[22mmatches real command outputs in 256color with only the named exceptions
      ... 35 more lines in the run log
      ```

  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Error: Cannot find module '/Users/runner/work/a1/a1/src/foundation/launch-guardian/exit-watcher.js'
          at Module._resolveFilename (node:internal/modules/cjs/loader:1564:15)
          at wrapResolveFilename (node:internal/modules/cjs/loader:1118:27)
          at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1142:10)
       ^[[32m✓^[[39m test/foundation/launch-guardian/launch-guardian.test.ts ^[[2m(^[[22m^[[2m12 tests^[[22m^[[2m)^[[22m^[[32m 150^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 894^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 2265^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 343^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 917^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mrecovers from corrupt codec input and never forwards arbitrary error text ^[[33m 327^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m merged branch cleanup workflow^[[2m > ^[[22mfails on deletion API errors and failed post-delete verification ^[[33m 320^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/foundation/resident-tabs/terminal-host-artifact.test.ts ^[[2m(^[[22m^[[2m5 tests^[[22m^[[2m)^[[22m^[[32m 64^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/features/launch/pi-tui-identity.test.ts ^[[2m(^[[22m^[[2m8 tests^[[22m^[[2m)^[[22m^[[32m 47^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/integrations/pi/tui-runtime/input-frame-observation.test.ts ^[[2m(^[[22m^[[2m2 tests^[[22m^[[2m)^[[22m^[[33m 408^[[2mms^[[22m^[[39m
      ... 40 more lines in the run log
      ```

  - `vitest-update-predecessor` (`update-predecessor`) failed on windows-2025-node22 (predecessor shard) with exit 1.
    - Tests: `test/foundation/release/update-predecessor.integration.test.ts`
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/foundation/release/update-predecessor.integration.test.ts ^[[2m(^[[22m^[[2m2 tests^[[22m^[[2m | ^[[22m^[[31m2 failed^[[39m^[[2m)^[[22m^[[33m 154541^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m update from every recent published release^[[2m > ^[[22mmaterializes and warms the candidate with each predecessor's own release code^[[39m^[[33m 146267^[[2mms^[[22m^[[39m
      ^[[31m     → three published Agents did not become ready^[[39m
      ^[[31m   ^[[31m×^[[31m update from every recent published release^[[2m > ^[[22mreplaces and activates the candidate through direct and bridged published updaters^[[39m^[[32m 5^[[2mms^[[22m^[[39m
      ^[[31m     → immediate predecessor compatibility did not retain its installed tree: expected '' not to be '' // Object.is equality^[[39m
      ^[[31m⎯⎯⎯⎯⎯⎯⎯^[[39m^[[1m^[[41m Failed Tests 2 ^[[49m^[[22m^[[31m⎯⎯⎯⎯⎯⎯⎯^[[39m
      ^[[41m^[[1m FAIL ^[[22m^[[49m test/foundation/release/update-predecessor.integration.test.ts^[[2m > ^[[22mupdate from every recent published release^[[2m > ^[[22mmaterializes and warms the candidate with each predecessor's own release code
      ^[[31m^[[1mError^[[22m: three published Agents did not become ready^[[39m
      ^[[36m ^[[2m❯^[[22m until test/support/resident-predecessor.ts:^[[2m81:9^[[22m^[[39m
          ^[[90m 79| ^[[39m  ^[[35mconst^[[39m deadline ^[[33m=^[[39m ^[[33mDate^[[39m^[[33m.^[[39m^[[34mnow^[[39m() ^[[33m+^[[39m timeout^[[33m;^[[39m
          ^[[90m 80| ^[[39m  while (Date.now() < deadline) { const result = await probe(); if (re…
      ^[[41m^[[1m FAIL ^[[22m^[[49m test/foundation/release/update-predecessor.integration.test.ts^[[2m > ^[[22mupdate from every recent published release^[[2m > ^[[22mreplaces and activates the candidate through direct and bridged published updaters
      ^[[31m^[[1mAssertionError^[[22m: immediate predecessor compatibility did not retain its installed tree: expected '' not to be '' // Object.is equality^[[39m
      ^[[36m ^[[2m❯^[[22m test/foundation/release/update-predecessor.integration.test.ts:^[[2m96:109^[[22m^[[39m
      ... 27 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/768f6641-4315-4409-b077-8d95ed3b108a' before making global git config changes
      ```

  - Last successful Full regression run: [#82](https://github.com/timurproko/a1/actions/runs/41575837206) on `78670a3`; 7 `develop` commits since:
    - `19a43af` fix: notify older sessions after updates (#864)
    - `32afd4b` fix(release): recover duplicate tlog publish (#863)
    - `3c5a7ef` fix(models): separate current and default selection (#862)
    - `ebe579a` fix(update): hide satisfied restart notice (#861)
    - `3864d17` fix(update): retry blocked activation safely (#860)
    - `4716452` upgrade(pi): upgrade pinned Pi to 1.5.0 (#859)
    - `3eb4c68` fix(tabs): preserve agents across updates (#858)

## Focused implementation evidence

- Before the fix, `npx vitest run test/app/session-shell/command-outcome-parity.test.ts` reproduced 24 login-message mismatches in both color modes, and `npx vitest run test/repository-governance/pinned-pi-public-api.test.ts` reproduced the missing `SettingsManager` consumer.
- The owned provider-default table now exactly matches Pi 1.5.0's `defaultModelPerProvider`, with a regression test comparing every provider entry. Login fixtures use the pin's `gpt-6.1-sol` default without changing unrelated model workflow cases.
- `npx vitest run test/app/session-shell/command-outcome-parity.test.ts` passes all 4 tests after the fix.
- `npx vitest run test/integrations/pi/engine/workflow-support.test.ts test/repository-governance/pinned-pi-public-api.test.ts` passes all 6 tests, and `node scripts/pi/update-pinned-pi-public-api.mjs --check` reports 643 current exports.
- Draft repair candidates intentionally run no Development suites before finalization. The exact-head selected PR Full regression remains the required cross-platform observation, including the previously failed Windows Node 22 predecessor shard.
- Known gaps: none. The prior orchestration failure was downstream of failed owner lanes and remains covered by the selected aggregate.
