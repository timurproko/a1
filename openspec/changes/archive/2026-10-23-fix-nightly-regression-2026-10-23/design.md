## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- **What failed:** one case in `environment-probe.test.ts`, `resolves quoted Windows PATH entries and PATHEXT without invoking a shell`, returned `null` on macos-15 and ubuntu-24.04; Windows passed. The `vitest-full-without-isolated` child therefore exited 1, every owner scope it carries failed together, and `Complete regression required` saw incomplete lane evidence. The `Cannot find module …/exit-watcher.js` stderr line is pre-existing noise that also appears in the last green run (#70) and is not a failure.
- **Why:** introduced by `ad06d91` (#812). `locateExecutable` started resolving with `path.win32` whenever the requested platform is `win32`, but the test still built its PATH directory and expected executable with the host's `resolve`. On a POSIX host the expected value is `/…/fixture tool/rustc.EXE` while the probe correctly tries `\…\fixture tool\rustc.EXE`, so the injected `exists` never matches. Windows hosts hide the mismatch because both flavors agree there, and #812's bounded PR validation did not run the POSIX Full lanes. The non-Windows branch had the mirror defect: it used the host's `resolve`, so an injected POSIX platform resolved with Windows semantics on a Windows host.
- **Fix:** path semantics now follow the requested platform in both directions (`win32` for Windows, `posix` otherwise). On real hosts the default platform equals the host, so runtime behavior is unchanged. The Windows case now uses a Windows-absolute fixture and expects a `win32`-joined path, keeping quoted PATH entries and PATHEXT ordering under test on every host. A new POSIX case proves host-independent POSIX resolution, including skipping a missing PATH entry. No assertion, budget, timeout, or coverage was reduced, and no requirement changed, so `skip_specs` stays.

## Evidence

- Run [Full regression #71](https://github.com/timurproko/a1/actions/runs/39887150255) (attempt 1, schedule) on `ad06d91` at 2026-10-23T02:00:12Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Error: Cannot find module '/Users/runner/work/a1/a1/src/foundation/launch-guardian/exit-watcher.js'
          at Module._resolveFilename (node:internal/modules/cjs/loader:1564:15)
          at wrapResolveFilename (node:internal/modules/cjs/loader:1118:27)
          at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1142:10)
          at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1169:12)
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 805^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 1834^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 660^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22mawaits termination of a busy real worker during disposal ^[[33m 1077^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22maborts active off-thread conversion and releases the slot for subsequent work ^[[33m 952^[[2mms^[[22m^[[39m
       ^[[31m❯^[[39m test/repository-governance/environment-probe.test.ts ^[[2m(^[[22m^[[2m24 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[32m 173^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m build prerequisite executable probes^[[2m > ^[[22mresolves quoted Windows PATH entries and PATHEXT without invoking a shell^[[39m^[[32m 5^[[2mms^[[22m^[[39m
      ^[[31m     → expected null to be '/Users/runner/work/a1/a1/fixture tool…' // Object.is equality^[[39m
         ^[[32m✓^[[39m build prerequisite executable probes^[[2m > ^[[22mdoes not spawn when the executable is missing^[[32m 1^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m build prerequisite executable probes^[[2m > ^[[22mretains the deadline and directly executes binaries with argument vectors^[[32m 1^[[2mms^[[22m^[[39m
      ... 35 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/dd315353-d171-4f41-b414-50fd4fb3cced' before making global git config changes
      ```

  - Last successful Full regression run: [#70](https://github.com/timurproko/a1/actions/runs/39708423610) on `8791e02`; 1 `develop` commit since:
    - `ad06d91` build(windows): bootstrap native prerequisites (#812)
- Focused implementation evidence on Windows with the fix (Node 24), before finalization:
  - The run #71 failed-job log contains exactly one failing test on both POSIX lanes (`Test Files 1 failed | 447 passed | 4 skipped`): the Windows PATH case above.
  - Reproduction: `path.win32.resolve` of the test's POSIX directory yields a backslash path, while the test expects the `path.posix` form, so the probe returns `null`. The mirror POSIX case returns `null` with the `ad06d91` probe on this Windows host and the expected path with the fix.
  - `npx vitest run` over `environment-probe`, `environment-prerequisites`, and `native-build-environment` passed (83 tests). `naming-inspection`, `code-documentation`, and `build-script-stdout-policy` passed (74 tests). `npm run typecheck` passed.
- Pre-finalization PR Full regression observations: none, because generated repair drafts run no Development suites before finalization.
- Known gap: no local macOS or Linux run. The finalized-head PR Full regression lanes provide the POSIX evidence and must pass before handoff.
