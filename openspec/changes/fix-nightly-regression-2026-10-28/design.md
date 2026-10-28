## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

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
