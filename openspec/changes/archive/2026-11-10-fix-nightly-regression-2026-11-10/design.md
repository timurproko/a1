## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- The failure is deterministic consumer-inventory drift, not a Pi API declaration change or an environmental failure. Commit `21ddae82` (#894) added `src/integrations/pi/engine/session-naming.ts` as a consumer of `AgentSession` and `AgentSessionRuntime`; commit `5611d633` (#895) removed the `getImageDimensions` and `imageFallback` imports from `src/integrations/pi/components/upstream/components/tool-execution.ts`. Neither updated the public API baseline.
- Regenerate `config/baselines/pinned-pi-public-api.json` from the pinned installation and current source tree. Review the diff to require only those consumer changes; retain package versions, exported names, declaration hashes, and the strict existing drift assertion.
- The Windows shard aggregators and Complete regression required failed because the core test command failed. Preserve their failure behavior rather than changing orchestration or treating missing evidence as success.
- No product requirement changes; retain the scaffolded `skip_specs: true` and no specification delta.

## Evidence

### Focused reproduction

- On the untouched PR head `a233910d`, `npm ci --ignore-scripts` followed by `npx vitest run test/repository-governance/pinned-pi-public-api.test.ts` reproduced the recorded failure: four tests passed and the `--check` test failed with consumer drift for `AgentSession`, `AgentSessionRuntime`, `getImageDimensions`, and `imageFallback`.
- Reviewing the complete failed logs from run `42758129019` confirmed the same four drift diagnostics as the sole test failure on macOS Node 24, Ubuntu Node 24, and Windows Node 22/24 core shards. The Windows aggregate and final aggregate errors follow those failed shards.
- Generating a candidate baseline into ignored worktree artifacts changes only the four consumer records described above. Git history identifies #894 and #895 as the introducing commits; installed Pi versions and declaration signatures did not change.

### Repair evidence and pre-finalization observations

- After merging `origin/develop` at `0786d541`, regenerated the baseline with `node scripts/pi/update-pinned-pi-public-api.mjs`. Its diff adds the naming consumer to two exports and removes the obsolete image consumer from two exports; all 643 exports, package versions, kinds, and declaration hashes remain unchanged.
- `npx vitest run test/repository-governance/pinned-pi-public-api.test.ts`: all five existing tests pass, including the unchanged strict installed-package/source-tree `--check` assertion that failed before the repair. That assertion already covers this regression; no duplicate test or weaker assertion is needed.
- `npm run build:core` and `npm run typecheck` pass. The first typecheck attempt before building lacked generated `dist/` modules because installation intentionally skipped prepare scripts; building restored those prerequisites without source changes.
- `npx openspec validate fix-nightly-regression-2026-11-10 --strict` and `git diff --check` pass.
- Pre-finalization PR observation: #899 remains draft during implementation, so Development suites have not run. Its immutable bot-created failed-Full provenance selects PR-attached Full regression after trusted finalization; the failed owners and platform lanes recorded below remain required. No standalone dispatch substitutes for that exact-head run, and no final run identity is committed into this design.
- Known gaps: none in the consumer-inventory repair. Cross-platform Full regression and its protected aggregate remain CI handoff gates, not claims of local validation or numbered-package nightly recovery.

### Original failed owners and lanes

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
