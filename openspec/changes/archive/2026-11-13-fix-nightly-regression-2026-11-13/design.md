## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- `28161cb` (#918) changed the trust-prompt call to include invocation color but left `startup-descriptor.test.ts` asserting the previous exact source string. Preserve the descriptor graph assertions and cover the current prompt wiring instead of reverting the new behavior.
- `c39a955` (#917) placed Unix session sockets beneath the full runtime directory. macOS runner temp roots make the resulting pathname exceed Darwin's 104-byte `sockaddr_un.sun_path`, causing `listen EINVAL`. Keep discovery in the private runtime directory, but use a short, private, owner-checked Unix transport directory and a hashed socket name only when the original path exceeds 103 UTF-8 bytes; preserve working short Unix endpoints, Windows named pipes, and request identity fencing.
- `28161cb` (#918) rejects every symlink ancestor in Herdr binding paths. macOS's OS-selected temp root traverses `/var` (a system alias for `/private/var`), so reservation returns undefined before reporting. Canonicalize the OS-selected temp root only, continuing to reject caller-selected links below it and unsafe binding records.
- Keep two detailed task groups matching the generated PR's two unchanged Implementation outcomes. Focused evidence belongs to the repair group, not a third outcome.

## Evidence

### Focused implementation evidence

- Windows/Node 24: `npm run typecheck` passed. The focused command `npx vitest run test/repository-governance/startup-descriptor.test.ts test/foundation/lifecycle/session-control.test.ts test/foundation/lifecycle/session-control-address.test.ts test/features/owned-ui/herdr-binding.test.ts test/features/owned-ui/herdr-reporter.test.ts test/composition/herdr-colors.integration.test.ts test/composition/session-colors.integration.test.ts test/composition/startup-color.test.ts` passed all 35 tests in eight files.
- New transport fixtures exercise Darwin address selection on every platform, including UTF-8 byte length, short-path compatibility, restrictive permissions, and rejection before publication of foreign, linked, permissive, non-directory, or redirected transport roots. The long-path integration case exercises actual local IPC on every platform and, on Unix, also checks socket permissions and disposal.
- New binding fixtures reproduce an OS-selected temp alias with a real symlink/junction, retain canonical generation fencing, and reject both a linked descendant and an unrelated alias without writing to their targets.
- `npm run check:architecture`, `npm run check:names`, strict OpenSpec validation, and the final delivery-body check passed. No assertion, timeout, performance budget, or coverage selection was reduced.
- Pre-finalization PR observation: #920 remains draft, so Development suites and PR Full regression are skipped; the generated App-authored proposal and immutable failed-run provenance remain unchanged. Full regression has not been claimed to pass locally. Trusted finalization must select the exact-head native lanes before validated handoff.

### Known-gap disposition

- No unresolved implementation gaps. Native macOS/Linux execution is not available on this Windows workstation; the selected PR Full regression owns that evidence. Mocked Darwin boundary tests and Windows junction fixtures are focused evidence, not a claim of native macOS success. Numbered-package nightly publication recovery remains independent and is not claimed by this repair.

### Investigation

- On Windows/Node 24, `npm ci --ignore-scripts --no-audit --no-fund`, `npm run build:core`, then `npx vitest run test/repository-governance/startup-descriptor.test.ts` reproduced the exact failure at line 34: one failed and one passed test.
- Read the complete failed logs of run 43360249051, attempt 1. Ubuntu Node 24 and Windows Node 22/24 core each fail only the stale startup assertion. macOS Node 24 has that failure plus seven Herdr reporter failures, five session-control failures, and the two color subprocess integration failures (15 failures in five files total).
- The macOS session-color host reports `listen EINVAL` for `/private/var/folders/2s/vty41l455yv698g4xkgfv7z00000gn/T/session-color-api-CGAqhZ/runtime/session-controls/3ca29f04-5c27-4c7d-9d64-e527488bb902.sock`, beyond Darwin's socket pathname capacity. Herdr's subprocess reports `fixture reservation failed`; inspection of its ancestor guard explains the system-temp alias rejection.
- The Windows core-shard aggregate and final complete-regression aggregate fail because their prerequisite lane failed; no independent orchestration defect is present. Retain all original failed owners and lanes below. No Full suite was rerun locally or dispatched during investigation.


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
