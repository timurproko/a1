## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #92](https://github.com/timurproko/a1/actions/runs/43360249051) (attempt 1, schedule) on `41ab0cf` at 2026-11-13T03:37:52Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mdefers unknown without pretending validation failed ^[[33m 448^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mdefers dirty without pretending validation failed ^[[33m 310^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/integrations/pi/tui-runtime/damage-aware-terminal.test.ts ^[[2m(^[[22m^[[2m50 tests^[[22m^[[2m)^[[22m^[[32m 50^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/app/session-shell/session-shell-lifecycle.test.ts ^[[2m(^[[22m^[[2m30 tests^[[22m^[[2m)^[[22m^[[33m 1440^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell lifecycle, quit, and restoration^[[2m > ^[[22mrestores the terminal within the cleanup deadline while a hung engine quit is still pending ^[[33m 1039^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/repository-governance/validation-tier.test.ts ^[[2m(^[[22m^[[2m26 tests^[[22m^[[2m)^[[22m^[[32m 206^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m ready pull-request refresh command^[[2m > ^[[22mreports each candidate and fails when a candidate failed ^[[33m 329^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/foundation/release/automatic-update.test.ts ^[[2m(^[[22m^[[2m17 tests^[[22m^[[2m)^[[22m^[[33m 818^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m active release observation^[[2m > ^[[22mannounces only approved newer releases on the executing channel ^[[33m 459^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/composition/session-runtime-wiring.test.ts ^[[2m(^[[22m^[[2m15 tests^[[22m^[[2m)^[[22m^[[33m 5601^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m session runtime composition wiring^[[2m > ^[[22muses the kebab format or Sentence case fallback for naming and context regeneration ^[[33m 889^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m worktree completion^[[2m > ^[[22mreports a failed cleanup with the command's output and never as removal ^[[33m 564^[[2mms^[[22m^[[39m
      ... 272 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/fd4733b4-dc62-4a60-aa27-53cd8754dc12' before making global git config changes
      ```

  - Last successful Full regression run: [#91](https://github.com/timurproko/a1/actions/runs/43154235793) on `bfbed9a`; 4 `develop` commits since:
    - `41ab0cf` fix(release): preserve warm startup payload support (#919)
    - `28161cb` feat: add setup-free Herdr session colors (#918)
    - `c39a955` feat: isolate session colors and expose control API (#917)
    - `d1c7141` docs(delivery): tick implementation outcomes while implementing (#916)
