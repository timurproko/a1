## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #87](https://github.com/timurproko/a1/actions/runs/42439758364) (attempt 1, schedule) on `c42a37a` at 2026-11-08T02:43:51Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/foundation/release/update-launch.test.ts ^[[2m(^[[22m^[[2m20 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 33989^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m launch selection across update completion^[[2m > ^[[22mlaunches the previous release without reading npm's tree during shutdown-intent^[[32m 117^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m launch selection across update completion^[[2m > ^[[22mlaunches the previous release without reading npm's tree during ownership-released^[[32m 119^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m launch selection across update completion^[[2m > ^[[22mlaunches the previous release without reading npm's tree during package-installed^[[32m 124^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m launch selection across update completion^[[2m > ^[[22mlaunches the previous release without reading npm's tree during materialized^[[32m 114^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m launch selection across update completion^[[2m > ^[[22mdoes not promote installed candidate bytes after an update is failed^[[32m 107^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m launch selection across update completion^[[2m > ^[[22mdoes not promote installed candidate bytes after an update is rolled-back^[[32m 143^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m launch selection across update completion^[[2m > ^[[22mlaunches the target only after success (journal removed: false)^[[32m 128^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m launch selection across update completion^[[2m > ^[[22mlaunches the target only after success (journal removed: true)^[[32m 103^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m launch selection across update completion^[[2m > ^[[22mkeeps ordinary launch on a newer active release when invoked from an older installation^[[32m 98^[[2mms^[[22m^[[39m
      ^[[31m     → Test timed out in 30000ms.
      If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".^[[39m
      ... 44 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/c4045210-0f9b-41e7-8a0b-25653a83a197' before making global git config changes
      ```

  - Last successful Full regression run: [#85](https://github.com/timurproko/a1/actions/runs/42158016762) on `111a66b`; 11 `develop` commits since:
    - `c42a37a` refactor(architecture): decouple the shell from Pi and right-size the tests (#879)
    - `2912427` fix(openspec): let finalized-delivery validation accept retired specs (#881)
    - `e9c99ad` fix(openspec): let finalization accept a declared capability retirement (#880)
    - `9f0307c` refactor(launch): make the single-agent terminal the only product (#878)
    - `4560b55` fix(cleanup): handle branch-only discard and named links (#877)
    - `7e6559c` fix(cli): show all version channels on stable (#875)
    - `fdbfdda` style(ui): refine transparent tab bar (#872)
    - `39d7362` chore(ci): right-size development validation (#873)
    - `2ac8757` docs(workflow): support agents outside A1 (#874)
    - `7f9f16d` fix(ui): complete compaction progress (#871)
    - `fc4a258` fix: recover startup after forced process termination (#870)
