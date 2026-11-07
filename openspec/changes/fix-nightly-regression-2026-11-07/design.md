## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- The failure is deterministic rather than environmental. Commit `39d7362` added exact-input terminal-host cache reuse to Development validation, but left `validation-receipt-workflows.test.ts` expecting every candidate to compile the host unconditionally.
- Preserve the cache behavior and repair the stale prerequisite-receipt assertion so it requires a compile on cache misses while retaining the existing build-before-receipt invariant.

## Evidence

- Focused local reproduction on the candidate base: `npx vitest run test/repository-governance/validation-receipt-workflows.test.ts` failed only the terminal-host candidate assertion because the expected packing condition omitted `steps.release-terminal-host.outputs.cache-hit != 'true'`.
- The repaired receipt test requires candidate compilation on a cache miss, reuse on a cache hit, and native-artifact verification after either path but before the build receipt. The focused file passes all 6 tests; `npm run typecheck` and strict OpenSpec validation also pass.
- Pre-finalization observation: the generated repair remains draft, so policy correctly defers Development validation and PR Full regression. The immutable failed-run provenance selects PR Full regression after finalization; the failed core owners and orchestration lane remain recorded below. Known gaps: none.

- Run [Full regression #86](https://github.com/timurproko/a1/actions/runs/42333115612) (attempt 1, schedule) on `fdbfdda` at 2026-11-07T03:14:58Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Error: Cannot find module '/Users/runner/work/a1/a1/src/foundation/launch-guardian/exit-watcher.js'
          at Module._resolveFilename (node:internal/modules/cjs/loader:1564:15)
          at wrapResolveFilename (node:internal/modules/cjs/loader:1118:27)
          at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1142:10)
          at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1169:12)
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 1003^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 1814^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 751^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22mawaits termination of a busy real worker during disposal ^[[33m 998^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m bounded preparation lifecycle^[[2m > ^[[22maborts active off-thread conversion and releases the slot for subsequent work ^[[33m 985^[[2mms^[[22m^[[39m
       ^[[31m❯^[[39m test/repository-governance/validation-receipt-workflows.test.ts ^[[2m(^[[22m^[[2m6 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[32m 65^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m workflow prerequisite receipts^[[2m > ^[[22mrecords build identity after installation and verifies it in every active build matrix cell^[[32m 24^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m workflow prerequisite receipts^[[2m > ^[[22mverifies the build immediately before packing and then binds the exact package receipt^[[32m 0^[[2mms^[[22m^[[39m
      ^[[31m   ^[[31m×^[[31m workflow prerequisite receipts^[[2m > ^[[22mbuilds the release terminal host into every packed candidate before recording the build^[[39m^[[32m 21^[[2mms^[[22m^[[39m
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
      Temporarily overriding HOME='/home/runner/work/_temp/8cd777e5-9af2-4b27-9ad9-771f5c8e04c6' before making global git config changes
      ```

  - Last successful Full regression run: [#85](https://github.com/timurproko/a1/actions/runs/42158016762) on `111a66b`; 5 `develop` commits since:
    - `fdbfdda` style(ui): refine transparent tab bar (#872)
    - `39d7362` chore(ci): right-size development validation (#873)
    - `2ac8757` docs(workflow): support agents outside A1 (#874)
    - `7f9f16d` fix(ui): complete compaction progress (#871)
    - `fc4a258` fix: recover startup after forced process termination (#870)
