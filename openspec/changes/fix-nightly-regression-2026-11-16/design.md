## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- Refresh only the generated Pi API consumer paths. Commit `59da0428` (#938) split runtime integration into runtime factory/options/services and added worktree transitions without refreshing the consumer baseline. Package versions, declaration hashes, export kinds, and exports are unchanged; keep the strict drift check.
- Repair the stalled-update smoke fixture introduced by `58018652` (#948) by creating its launcher parent before writing. Unix global npm layout has separate `lib/node_modules` and `bin` siblings; creating modules does not create `bin`. Windows uses the prefix itself, so its fixture already passed. Keep every timeout, evidence assertion, platform lane, and coverage requirement unchanged.
- Retain the generated failed-owner selection and all four native Full regression lanes. The aggregate failure is downstream of the failed tests and does not justify changing orchestration.

## Evidence

### Focused diagnosis

- On the unchanged proposed head `093b56c4`, `node scripts/pi/update-pinned-pi-public-api.mjs --check` exits 1 with eight consumer-drift diagnostics. `npx vitest run test/repository-governance/pinned-pi-public-api.test.ts` reproduces exactly one failure and four passes on Windows; the failed assertion is the strict CLI check.
- A separately generated API snapshot differs only in the eight consumer lists, matching the runtime split and worktree additions in #938. It has no version, export, kind, or declaration-hash changes.
- Failed run #95 job logs inspected directly: Windows Node 22 and 24 core each fail only `pinned-pi-public-api.test.ts`; Ubuntu Node 24 and macOS Node 24 additionally fail `smoke-published-installer.test.ts`, test `records the live process set, update records, npm log identities, and stage durations when the predecessor update stalls` at line 243. Both Unix errors are ENOENT for `update-application/bin/a1`, before the fixture can return its intended simulated timeout. This is deterministic fixture setup, not an actual twenty-minute timeout or an environmental failure.
- Pre-finalization observation: #950 remains a generated draft, so Development suites do not run. Exact finalized-head PR Full regression across the preserved native lanes remains the handoff gate; local focused checks do not replace it or prove numbered-package nightly recovery.

- Run [Full regression #95](https://github.com/timurproko/a1/actions/runs/43796754492) (attempt 1, schedule) on `5801865` at 2026-11-16T03:12:26Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mdefers unknown without pretending validation failed ^[[33m 306^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mdefers dirty without pretending validation failed ^[[33m 327^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mnever merges an unstable head with stale validation ^[[33m 451^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mkeeps missing data errors fatal without recovery ^[[33m 401^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mkeeps invalid JSON errors fatal without recovery ^[[33m 306^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m documentation auto-merge state recovery^[[2m > ^[[22mdoes not hide merge refusal when refreshed PR is open ^[[33m 305^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m cancellation-safe package replacement^[[2m > ^[[22mdoes not launch a partial target when npm failed after writing its entry ^[[33m 458^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m cancellation-safe package replacement^[[2m > ^[[22mrestores the complete platform launcher set after cancellation at each launcher mutation ^[[33m 462^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m cancellation-safe package replacement^[[2m > ^[[22mrestores every launcher before acknowledging cancellation (aliased entry: false) ^[[33m 1097^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m cancellation-safe package replacement^[[2m > ^[[22mrestores every launcher before acknowledging cancellation (aliased entry: true) ^[[33m 742^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m cancellation-safe package replacement^[[2m > ^[[22mcoordinates repeated Ctrl+C requests without abandoning launcher recovery ^[[33m 908^[[2mms^[[22m^[[39m
      Published installer smoke: acquire-installer: npm failed [redacted]
      ... 98 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/c9c91bb0-3cdb-4096-a058-457d0f75e58a' before making global git config changes
      ```

  - Last successful Full regression run: [#93](https://github.com/timurproko/a1/actions/runs/43552568568) on `c362c4e`; 24 `develop` commits since:
    - `5801865` fix(release): forensics for the Windows published-pair stall (#948)
    - `52ddae3` feat(api): session lifecycle and graceful exit control (#946)
    - `a87e847` fix(release): budget and evidence for Windows published-pair stall (#947)
    - `64709ce` fix(release): update publication status in place (#945)
    - `e8c7249` fix(release): repair Windows published-pair smoke (#943)
    - `af9d8e9` fix(release): align publication failure summaries (#944)
    - `5b0c7ff` fix(release): align publication status dots (#942)
    - `3f2ed26` fix(release): restore recovery and clarify publish output (#941)
    - `59da042` feat(worktrees): attach from any location (#938)
    - `28787a4` refactor(api): unify settings integration and colors (#939)
    - `0460ab3` fix(ui): compact screenshot chip labels (#940)
    - `9893a86` fix(release): verify published tarball readiness (#936)
    - `18f387a` chore(regression): repair the 2026-11-15 full regression failure (#937)
    - `74b2e6f` fix(ui): hide attachment chip identity metadata (#934)
    - `98631e3` fix(selection): omit prompt chrome in bulk copy (#935)
    - `e7de9ab` feat(cli): make A1 Pi-compatible by default (#928)
    - `347d8fc` fix(ui): align transcript pictograph cells (#932)
    - `ad443f2` fix(ui): contain over-width terminal rows (#933)
    - `ac3f499` fix(ui): normalize content emoji presentation (#931)
    - `36e783c` fix(selection): preserve copied block alignment (#929)
    - `64a2430` fix(clipboard): preserve dropped image filenames (#930)
    - `2d5c364` fix(api): unify normal and compatible runtime integrations (#927)
    - `9ff2383` fix(clipboard): restore Herdr image paste (#926)
    - `82d030b` fix(ux): refine input padding and jump shortcuts (#925)
