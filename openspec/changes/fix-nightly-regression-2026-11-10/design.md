## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #89](https://github.com/timurproko/a1/actions/runs/42758129019) (attempt 1, schedule) on `8c5a4d0` at 2026-11-10T04:48:05Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 1116^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 2791^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 395^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 949^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22mawaits termination of a busy real worker during disposal ^[[33m 1354^[[2mms^[[22m^[[39m
       ^[[31m❯^[[39m test/repository-governance/pinned-pi-public-api.test.ts ^[[2m(^[[22m^[[2m5 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 6779^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m pinned Pi public API baseline^[[2m > ^[[22mrecords the package-root export surface of both pinned packages with kinds, hashes, and consumers^[[32m 57^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m pinned Pi public API baseline^[[2m > ^[[22mis what the installed packages and the source tree produce (`--check`)^[[39m^[[33m 4044^[[2mms^[[22m^[[39m
      ^[[31m     → public API drift: consumers of @earendil-works/pi-coding-agent AgentSession differ
      public API drift: consumers of @earendil-works/pi-coding-agent AgentSessionRuntime differ
      : expected 1 to be +0 // Object.is equality^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m pinned Pi public API baseline^[[2m > ^[[22mcollects the same surface again from the declaration entries ^[[33m 2676^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi public API delta^[[2m > ^[[22mlists added, removed, and changed exports with the consumers of each removed or changed one^[[32m 0^[[2mms^[[22m^[[39m
      ... 40 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/fbfd1675-48e5-4695-9077-7995adf0b2c0' before making global git config changes
      ```

  - Last successful Full regression run: [#88](https://github.com/timurproko/a1/actions/runs/42553939886) on `47397a0`; 6 `develop` commits since:
    - `8c5a4d0` style: increase scrollbar stroke weight (#897)
    - `0783454` feat: add session name format choices (#896)
    - `5611d63` fix: omit hidden image blocks (#895)
    - `21ddae8` feature(session): restore context-aware auto-naming (#894)
    - `3af62d0` fix(session): register bare A1 runtimes with the production process inspector (#893)
    - `747f0f7` feature(shell): publish session names as terminal titles (#892)
