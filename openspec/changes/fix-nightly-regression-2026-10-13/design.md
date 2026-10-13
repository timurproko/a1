## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #60](https://github.com/timurproko/a1/actions/runs/38343910153) (attempt 1, schedule) on `986b04e` at 2026-10-13T03:54:34Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 866^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 2034^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 775^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22mawaits termination of a busy real worker during disposal ^[[33m 1073^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22maborts active off-thread conversion and releases the slot for subsequent work ^[[33m 918^[[2mms^[[22m^[[39m
       ^[[31m❯^[[39m test/repository-governance/pinned-pi-public-api.test.ts ^[[2m(^[[22m^[[2m5 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 4425^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m pinned Pi public API baseline^[[2m > ^[[22mrecords the package-root export surface of both pinned packages with kinds, hashes, and consumers^[[32m 32^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m pinned Pi public API baseline^[[2m > ^[[22mis what the installed packages and the source tree produce (`--check`)^[[39m^[[33m 2456^[[2mms^[[22m^[[39m
      ^[[31m     → public API drift: consumers of @earendil-works/pi-coding-agent keyText differ
      : expected 1 to be +0 // Object.is equality^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m pinned Pi public API baseline^[[2m > ^[[22mcollects the same surface again from the declaration entries ^[[33m 1935^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi public API delta^[[2m > ^[[22mlists added, removed, and changed exports with the consumers of each removed or changed one^[[32m 0^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi public API delta^[[2m > ^[[22msummarizes tsc output per file with counts and codes, most errors first^[[32m 0^[[2mms^[[22m^[[39m
      ... 32 more lines in the run log
      ```

  - Lane Full regression / Complete regression required failed in job `Full regression / Complete regression required` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
        if (jobsResult !== "success" || records.length !== FULL_LANES.length) throw new Error("complete-regression jobs or evidence are incomplete");
                                                                                    ^
      Error: complete-regression jobs or evidence are incomplete
          at requireFullLanes (file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:123:79)
          at file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:166:20
          at ModuleJob.run (node:internal/modules/esm/module_job:561:25)
          at async node:internal/modules/esm/loader:647:26
      ##[error]Process completed with exit code 1.
      Post job cleanup.
      [command]/usr/bin/git version
      git version 2.55.0
      Temporarily overriding HOME='/home/runner/work/_temp/6993220e-b604-4b7a-91ea-1f002b27a2a3' before making global git config changes
      ```

  - Last successful Full regression run: [#59](https://github.com/timurproko/a1/actions/runs/38196674772) on `af5db5c`; 5 `develop` commits since:
    - `986b04e` fix(ui): align tool expand shortcut hint (#762)
    - `0c77164` fix(session): persist the first prompt (#763)
    - `d6cf677` feature(tabs): resident tabs milestone 3 — failure isolation (#747)
    - `b4b6780` style(ui): align read ranges with accent (#761)
    - `b007d4e` style: align input bars with accent (#760)
