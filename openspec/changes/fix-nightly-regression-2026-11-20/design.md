## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #99](https://github.com/timurproko/a1/actions/runs/44673836985) (attempt 1, schedule) on `e983726` at 2026-11-20T04:21:19Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node22 (resource shard), windows-2025-node24 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/foundation/release/release-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/features/prompt-history/concurrency.integration.test.ts`, `test/features/prompt-history/store.test.ts`, `test/app/session-shell/command-message-parity.test.ts`, `test/app/session-shell/command-outcome-parity.test.ts`, and 9 more
    - Log excerpt:

      ```text
      @timurproko/a1: gh --version timed out after 15000ms; the executable was found on PATH (fix: run `gh --version` directly to diagnose the toolchain before retrying the build)
      > @timurproko/a1@0.2.7-dev build:managed
      > npm run clean && tsc -p tsconfig.build.json && node scripts/release/generate-release-notes-resource.mjs && node scripts/pi/build-pi-settings-metadata.mjs && node scripts/pi/build-startup-public.mjs
      > @timurproko/a1@0.2.7-dev clean
      > node scripts/clean.mjs
       ^[[31m❯^[[39m test/app/session-shell/session-shell-paste.test.ts ^[[2m(^[[22m^[[2m84 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 31673^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mreserves and settles the cold first Ctrl+V exactly once before any mouse paste^[[32m 169^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrecords first terminal-owned inline paste through truthful framing, insertion, and settlement^[[32m 16^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (native) ^[[33m 736^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (terminal) ^[[33m 747^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps a failed waiting prompt recoverable and never sends its text alone^[[32m 104^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps an invalid image editor submission recoverable instead of rejecting its callback^[[32m 10^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mretains a real image chip and its bytes across rejection and explicit retry^[[32m 240^[[2mms^[[22m^[[39m
      ... 43 more lines in the run log
      ```

  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Published installer smoke: acquire-installer: npm failed [redacted]
      Published installer smoke: install-application: npm failed [redacted]
      Published installer smoke: verify-manifest: published installer selected the wrong application package
      Published installer smoke: launch-application: npm failed [redacted]
      Published installer smoke: install-application: published installer transcript is invalid
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke: update-predecessor: replacement failed
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] update-predecessor failed (1ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (1ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (1ms)
      [published installer] acquire-installer failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (1ms)
      [published installer] update-predecessor failed (3ms)
      ... 220 more lines in the run log
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
      git version 2.56.1
      Temporarily overriding HOME='/home/runner/work/_temp/47c56527-f546-4404-8f6a-f631ae0a4a91' before making global git config changes
      ```

  - Last successful Full regression run: [#93](https://github.com/timurproko/a1/actions/runs/43552568568) on `c362c4e`; 0 `develop` commits since:
- Run [Full regression #100](https://github.com/timurproko/a1/actions/runs/44865447585) (attempt 1, schedule) on `5256a6b` at 2026-11-21T04:18:24Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node22 (resource shard), windows-2025-node24 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/foundation/release/release-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/features/prompt-history/concurrency.integration.test.ts`, `test/features/prompt-history/store.test.ts`, `test/app/session-shell/command-message-parity.test.ts`, `test/app/session-shell/command-outcome-parity.test.ts`, and 9 more
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/session-shell-paste.test.ts ^[[2m(^[[22m^[[2m84 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 33019^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mreserves and settles the cold first Ctrl+V exactly once before any mouse paste^[[32m 180^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrecords first terminal-owned inline paste through truthful framing, insertion, and settlement^[[32m 18^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (native) ^[[33m 824^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (terminal) ^[[33m 840^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps a failed waiting prompt recoverable and never sends its text alone^[[32m 88^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps an invalid image editor submission recoverable instead of rejecting its callback^[[32m 8^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mretains a real image chip and its bytes across rejection and explicit retry^[[32m 251^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mleaves Pi fullscreen selection and copying available in the comparison profile^[[32m 20^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mpreserves newer editor input when a pending submission is rejected^[[32m 9^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrejects unsafe source size with a removable failed chip and preserves surrounding input^[[32m 106^[[2mms^[[22m^[[39m
      ... 40 more lines in the run log
      ```

  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Published installer smoke: acquire-installer: npm failed [redacted]
      Published installer smoke: install-application: npm failed [redacted]
      Published installer smoke: verify-manifest: published installer selected the wrong application package
      Published installer smoke: launch-application: npm failed [redacted]
      Published installer smoke: install-application: published installer transcript is invalid
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke passed on darwin/arm64.
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke: update-predecessor: replacement failed
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] acquire-installer failed (0ms)
      Published installer smoke: acquire-installer: spawn ENOENT
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (1ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] update-predecessor failed (2ms)
      ... 221 more lines in the run log
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
      git version 2.56.1
      Temporarily overriding HOME='/home/runner/work/_temp/c719e5ab-235f-492c-9570-ee1c31e33347' before making global git config changes
      ```

  - Last successful Full regression run: [#93](https://github.com/timurproko/a1/actions/runs/43552568568) on `c362c4e`; 0 `develop` commits since:
- Run [Full regression #101](https://github.com/timurproko/a1/actions/runs/44980916084) (attempt 1, schedule) on `266e555` at 2026-11-22T03:30:08Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node22 (resource shard), windows-2025-node24 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/foundation/release/release-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/features/prompt-history/concurrency.integration.test.ts`, `test/features/prompt-history/store.test.ts`, `test/app/session-shell/command-message-parity.test.ts`, `test/app/session-shell/command-outcome-parity.test.ts`, and 9 more
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/session-shell-paste.test.ts ^[[2m(^[[22m^[[2m84 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 33500^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mreserves and settles the cold first Ctrl+V exactly once before any mouse paste^[[32m 178^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrecords first terminal-owned inline paste through truthful framing, insertion, and settlement^[[32m 18^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (native) ^[[33m 831^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (terminal) ^[[33m 840^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps a failed waiting prompt recoverable and never sends its text alone^[[32m 88^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps an invalid image editor submission recoverable instead of rejecting its callback^[[32m 8^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mretains a real image chip and its bytes across rejection and explicit retry^[[32m 248^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mleaves Pi fullscreen selection and copying available in the comparison profile^[[32m 19^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mpreserves newer editor input when a pending submission is rejected^[[32m 10^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrejects unsafe source size with a removable failed chip and preserves surrounding input^[[32m 115^[[2mms^[[22m^[[39m
      ... 37 more lines in the run log
      ```

  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Published installer smoke: acquire-installer: npm failed [redacted]
      Published installer smoke: install-application: npm failed [redacted]
      Published installer smoke: verify-manifest: published installer selected the wrong application package
      Published installer smoke: launch-application: npm failed [redacted]
      Published installer smoke: install-application: published installer transcript is invalid
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke: update-predecessor: replacement failed
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (1ms)
      [published installer] acquire-installer failed (1ms)
      Published installer smoke: acquire-installer: spawn ENOENT
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] update-predecessor failed (1ms)
      ... 227 more lines in the run log
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
      git version 2.56.1
      Temporarily overriding HOME='/home/runner/work/_temp/cf29686d-4f5b-4ecc-929a-cbb988b1dda3' before making global git config changes
      ```

  - Last successful Full regression run: [#93](https://github.com/timurproko/a1/actions/runs/43552568568) on `c362c4e`; 0 `develop` commits since:
- Run [Full regression #102](https://github.com/timurproko/a1/actions/runs/45109334922) (attempt 1, schedule) on `266e555` at 2026-11-23T04:01:25Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node22 (resource shard), windows-2025-node24 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/foundation/release/release-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/features/prompt-history/concurrency.integration.test.ts`, `test/features/prompt-history/store.test.ts`, `test/app/session-shell/command-message-parity.test.ts`, `test/app/session-shell/command-outcome-parity.test.ts`, and 9 more
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/session-shell-paste.test.ts ^[[2m(^[[22m^[[2m84 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 26890^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mreserves and settles the cold first Ctrl+V exactly once before any mouse paste^[[32m 163^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrecords first terminal-owned inline paste through truthful framing, insertion, and settlement^[[32m 14^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (native) ^[[33m 599^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (terminal) ^[[33m 619^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps a failed waiting prompt recoverable and never sends its text alone^[[32m 72^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps an invalid image editor submission recoverable instead of rejecting its callback^[[32m 6^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mretains a real image chip and its bytes across rejection and explicit retry^[[32m 195^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mleaves Pi fullscreen selection and copying available in the comparison profile^[[32m 16^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mpreserves newer editor input when a pending submission is rejected^[[32m 7^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrejects unsafe source size with a removable failed chip and preserves surrounding input^[[32m 114^[[2mms^[[22m^[[39m
      ... 39 more lines in the run log
      ```

  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Published installer smoke: acquire-installer: npm failed [redacted]
      Published installer smoke: install-application: npm failed [redacted]
      Published installer smoke: verify-manifest: published installer selected the wrong application package
      Published installer smoke: launch-application: npm failed [redacted]
      Published installer smoke: install-application: published installer transcript is invalid
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke: update-predecessor: replacement failed
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (1ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] acquire-installer failed (1ms)
      Published installer smoke: acquire-installer: spawn ENOENT
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] update-predecessor failed (2ms)
      ... 224 more lines in the run log
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
      git version 2.56.1
      Temporarily overriding HOME='/home/runner/work/_temp/f18d841e-86db-4d32-b702-4c51cc472939' before making global git config changes
      ```

  - Last successful Full regression run: [#93](https://github.com/timurproko/a1/actions/runs/43552568568) on `c362c4e`; 0 `develop` commits since:
- Run [Full regression #103](https://github.com/timurproko/a1/actions/runs/45345522477) (attempt 1, schedule) on `266e555` at 2026-11-24T07:07:08Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node22 (resource shard), windows-2025-node24 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/foundation/release/release-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/features/prompt-history/concurrency.integration.test.ts`, `test/features/prompt-history/store.test.ts`, `test/app/session-shell/command-message-parity.test.ts`, `test/app/session-shell/command-outcome-parity.test.ts`, and 9 more
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/session-shell-paste.test.ts ^[[2m(^[[22m^[[2m84 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 31383^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mreserves and settles the cold first Ctrl+V exactly once before any mouse paste^[[32m 172^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrecords first terminal-owned inline paste through truthful framing, insertion, and settlement^[[32m 18^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (native) ^[[33m 755^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (terminal) ^[[33m 764^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps a failed waiting prompt recoverable and never sends its text alone^[[32m 104^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps an invalid image editor submission recoverable instead of rejecting its callback^[[32m 10^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mretains a real image chip and its bytes across rejection and explicit retry^[[32m 243^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mleaves Pi fullscreen selection and copying available in the comparison profile^[[32m 20^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mpreserves newer editor input when a pending submission is rejected^[[32m 12^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrejects unsafe source size with a removable failed chip and preserves surrounding input^[[32m 140^[[2mms^[[22m^[[39m
      ... 37 more lines in the run log
      ```

  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Published installer smoke: acquire-installer: npm failed [redacted]
      Published installer smoke: install-application: npm failed [redacted]
      Published installer smoke: verify-manifest: published installer selected the wrong application package
      Published installer smoke: launch-application: npm failed [redacted]
      Published installer smoke: install-application: published installer transcript is invalid
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke: update-predecessor: replacement failed
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (1ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (1ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] acquire-installer failed (0ms)
      Published installer smoke: acquire-installer: spawn ENOENT
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] update-predecessor failed (2ms)
      ... 214 more lines in the run log
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
      git version 2.56.1
      Temporarily overriding HOME='/home/runner/work/_temp/324772b5-3e58-438c-8898-648c624c1e08' before making global git config changes
      ```

  - Last successful Full regression run: [#93](https://github.com/timurproko/a1/actions/runs/43552568568) on `c362c4e`; 0 `develop` commits since:
- Run [Full regression #104](https://github.com/timurproko/a1/actions/runs/45555402914) (attempt 1, schedule) on `266e555` at 2026-11-25T05:42:12Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node22 (resource shard), windows-2025-node24 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/foundation/release/release-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/features/prompt-history/concurrency.integration.test.ts`, `test/features/prompt-history/store.test.ts`, `test/app/session-shell/command-message-parity.test.ts`, `test/app/session-shell/command-outcome-parity.test.ts`, and 9 more
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/session-shell-paste.test.ts ^[[2m(^[[22m^[[2m84 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 32073^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mreserves and settles the cold first Ctrl+V exactly once before any mouse paste^[[32m 182^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrecords first terminal-owned inline paste through truthful framing, insertion, and settlement^[[32m 16^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (native) ^[[33m 739^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (terminal) ^[[33m 762^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps a failed waiting prompt recoverable and never sends its text alone^[[32m 105^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps an invalid image editor submission recoverable instead of rejecting its callback^[[32m 9^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mretains a real image chip and its bytes across rejection and explicit retry^[[32m 249^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mleaves Pi fullscreen selection and copying available in the comparison profile^[[32m 22^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mpreserves newer editor input when a pending submission is rejected^[[32m 13^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrejects unsafe source size with a removable failed chip and preserves surrounding input^[[32m 162^[[2mms^[[22m^[[39m
      ... 37 more lines in the run log
      ```

  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Published installer smoke: acquire-installer: npm failed [redacted]
      Published installer smoke: install-application: npm failed [redacted]
      Published installer smoke: verify-manifest: published installer selected the wrong application package
      Published installer smoke: launch-application: npm failed [redacted]
      Published installer smoke: install-application: published installer transcript is invalid
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke: update-predecessor: replacement failed
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (2ms)
      [published installer] update-predecessor failed (1ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (2ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (2ms)
      [published installer] acquire-installer failed (0ms)
      Published installer smoke: acquire-installer: spawn ENOENT
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] update-predecessor failed (1ms)
      ... 223 more lines in the run log
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
      git version 2.56.1
      Temporarily overriding HOME='/home/runner/work/_temp/5fcdba0c-5df3-4f40-a2e8-10d9e5d32bef' before making global git config changes
      ```

  - Last successful Full regression run: [#93](https://github.com/timurproko/a1/actions/runs/43552568568) on `c362c4e`; 0 `develop` commits since:
- Run [Full regression #105](https://github.com/timurproko/a1/actions/runs/45761882398) (attempt 1, schedule) on `266e555` at 2026-11-26T05:29:01Z:
  - `vitest-fast-resource-sensitive` (`fast-resource-sensitive`) failed on windows-2025-node22 (resource shard), windows-2025-node24 (resource shard) with exit 1.
    - Tests: `test/repository-governance/validation-impact.test.ts`, `test/repository-governance/naming-selection.test.ts`, `test/repository-governance/pr-full-regression-history.test.ts`, `test/foundation/launch-context/cutover.test.ts`, `test/foundation/lifecycle/session-repository-context.test.ts`, `test/repository-governance/code-documentation.test.ts`, `test/foundation/release/release-state.test.ts`, `test/foundation/release/release-gc.test.ts`, `test/features/prompt-history/concurrency.integration.test.ts`, `test/features/prompt-history/store.test.ts`, `test/app/session-shell/command-message-parity.test.ts`, `test/app/session-shell/command-outcome-parity.test.ts`, and 9 more
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/session-shell-paste.test.ts ^[[2m(^[[22m^[[2m84 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 33674^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mreserves and settles the cold first Ctrl+V exactly once before any mouse paste^[[32m 182^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrecords first terminal-owned inline paste through truthful framing, insertion, and settlement^[[32m 15^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (native) ^[[33m 865^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mbounds near-limit URL presentation without losing its value (terminal) ^[[33m 841^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps a failed waiting prompt recoverable and never sends its text alone^[[32m 90^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mkeeps an invalid image editor submission recoverable instead of rejecting its callback^[[32m 8^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mretains a real image chip and its bytes across rejection and explicit retry^[[32m 248^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mleaves Pi fullscreen selection and copying available in the comparison profile^[[32m 18^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mpreserves newer editor input when a pending submission is rejected^[[32m 9^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell paste and clipboard^[[2m > ^[[22mrejects unsafe source size with a removable failed chip and preserves surrounding input^[[32m 121^[[2mms^[[22m^[[39m
      ... 37 more lines in the run log
      ```

  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Published installer smoke: acquire-installer: npm failed [redacted]
      Published installer smoke: install-application: npm failed [redacted]
      Published installer smoke: verify-manifest: published installer selected the wrong application package
      Published installer smoke: launch-application: npm failed [redacted]
      Published installer smoke: install-application: published installer transcript is invalid
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke: update-predecessor: replacement failed
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      Published installer smoke: update-predecessor: published smoke command timed out after 1200000ms
      [published installer] install-application passed (1ms)
      Published installer smoke: update-predecessor: replacement failed
      [published installer] launch-application started (timeout=30000ms)
      [published installer] launch-application passed (0ms)
      [published installer] launch-application started (timeout=30000ms)
      Published installer smoke: update-predecessor: replacement failed
      [published installer] launch-application passed (0ms)
      [published installer] resolve-predecessor started (timeout=30000ms)
      [published installer] resolve-predecessor passed (0ms)
      [published installer] install-predecessor started (timeout=300000ms)
      ... 227 more lines in the run log
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
      git version 2.56.1
      Temporarily overriding HOME='/home/runner/work/_temp/52fd2c11-3fc1-419d-9556-dff96b7ad3ef' before making global git config changes
      ```

  - Last successful Full regression run: [#93](https://github.com/timurproko/a1/actions/runs/43552568568) on `c362c4e`; 0 `develop` commits since:
