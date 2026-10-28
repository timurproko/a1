## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- **What failed.** Three source-shape tests that the bounded pull-request validation of #828 (`feat(tabs): run utility tabs as slim processes`) did not select, so they first ran in the nightly Full regression: `test/foundation/release/bootstrap-boundary.test.ts` expected the literal `if (trustExit) return terminateOwnedUiProcess(error.exitCode);` in `bin/ui.js`, `test/repository-governance/prompt-history-boundary.test.ts` expected the settings-manager construction lines in `src/composition/owned-ui.ts`, and `test/repository-governance/pinned-pi-public-api.test.ts` found the pinned Pi public API baseline stale. The failure is the same on every lane and is not environmental.
- **Why.** #828 refactored `bin/ui.js` so both the Agent run and the new slim utility-tab run complete through one `completeRun(run, terminate)` helper that is passed `terminateOwnedUiProcess`; the trust-prompt exit now reads `if (trustExit) return terminate(error.exitCode);`. It also moved the shared settings-manager construction into `src/composition/owned-settings.ts`, and added `src/integrations/pi/engine/offline-settings-port.ts`, a new consumer of two pinned Pi exports that the baseline records consumers for. The behaviors the tests protect are intact; the literals and the baseline were not updated with the refactor.
- **The fix.** The boundary tests assert the new shape without losing coverage: `bin/ui.js` must complete both the Agent run and the utility run through `terminateOwnedUiProcess` and route a trust-prompt exit through the shared terminator; the prompt-history test now requires the Agent composition to import the shared settings factory and checks the profile and legacy-config directories in `owned-settings.ts`. The pinned Pi public API baseline is regenerated with `scripts/pi/update-pinned-pi-public-api.mjs`; its only change is the new consumer file on two existing export records. No assertion, budget, timeout, or coverage is weakened.
- **Observation, out of scope.** The macOS lane log also shows `Cannot find module .../src/foundation/launch-guardian/exit-watcher.js` once: the launch-guardian unit tests run `runLaunchGuardian` from the source tree, whose watcher path resolves beside the module, so the spawned watcher cannot start there. The tests that spawn it pass, and the message predates this run's suspect range, so it is noted here rather than changed in a regression repair.

## Evidence

- Run [Full regression #76](https://github.com/timurproko/a1/actions/runs/40621893660) (attempt 1, schedule) on `35c1aad` at 2026-10-28T02:36:05Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Error: Cannot find module '/Users/runner/work/a1/a1/src/foundation/launch-guardian/exit-watcher.js'
          at Module._resolveFilename (node:internal/modules/cjs/loader:1564:15)
          at wrapResolveFilename (node:internal/modules/cjs/loader:1118:27)
          at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1142:10)
          at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1169:12)
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 1013^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 2656^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 312^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 952^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22mawaits termination of a busy real worker during disposal ^[[33m 1277^[[2mms^[[22m^[[39m
       ^[[31m❯^[[39m test/foundation/release/bootstrap-boundary.test.ts ^[[2m(^[[22m^[[2m10 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[32m 24^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m mutable bootstrap boundary^[[2m > ^[[22mkeeps the supervisor internal while publishing only the a1 executable^[[32m 2^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m mutable bootstrap boundary^[[2m > ^[[22mroutes interactive launch through bootstrap and starts the owned runtime lazily^[[39m^[[32m 11^[[2mms^[[22m^[[39m
      ^[[31m     → expected '#!/usr/bin/env node\n\n// Security: t…' to contain 'if (trustExit) return terminateOwnedU…'^[[39m
      ... 119 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/6286be9e-b390-4cfe-a21b-c96a20591743' before making global git config changes
      ```

  - Last successful Full regression run: [#74](https://github.com/timurproko/a1/actions/runs/40255894675) on `fa24f0d`; 10 `develop` commits since:
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

### Implementation evidence

- Introducing commit: `41369d4` feat(tabs): run utility tabs as slim processes (#828). Its refactor of `bin/ui.js` and `src/composition/owned-ui.ts` and its new `offline-settings-port.ts` consumer are the only sources of the three failures; the nine other commits in the range touch none of the asserted files.
- Reproduced locally on the failed head's tree with `npx vitest run test/foundation/release/bootstrap-boundary.test.ts test/repository-governance/prompt-history-boundary.test.ts test/repository-governance/pinned-pi-public-api.test.ts`: the same three tests failed with the same messages as the nightly lanes.
- After the fix the same command passes all 18 tests in the three files. `scripts/pi/update-pinned-pi-public-api.mjs --check` reports the baseline current; the regenerated baseline differs only by `src/integrations/pi/engine/offline-settings-port.ts` joining the consumer lists of two existing export records.
- Known gaps: none. The exit-watcher module message noted under Decisions is pre-existing stderr noise from passing tests and is left for its own change.
