## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- The original nightly cause is deterministic reviewed-metadata drift, not an environmental failure or a published-installer failure. Update the stale workflow retention inventory and Pi API consumer inventory, and add focused assertions identifying the newly inventoried surface. Later selected PR validation exposed a deferred-footer fixture race and Windows registration-replacement contention; repair those causes without weakening assertions, budgets, timeouts, or coverage.
- No product or governance requirement changes: the diagnostic artifacts already retain seven days, ordinary validation artifacts retain fourteen days, and the Pi dependencies remain pinned to 1.5.2. No specification delta is required.

## Evidence

### Focused reproduction and attribution

- Inspected the failed run's Windows Node 22 core job 133836019625, Windows Node 24 core job 133836019489, Ubuntu Node 24 job 133836019342, and macOS Node 24 job 133836019362 directly. Each reports the same four failures: two in `test/repository-governance/github-repository-governance.test.ts` and two in `test/repository-governance/pinned-pi-public-api.test.ts`. The smoke error lines in the triage excerpt come from passing negative-path fixtures, not the failed assertions. The aggregate orchestration failure follows the failed native jobs and needs no independent relaxation.
- Reproduced locally on Windows Node 24.21.0 using `npx vitest run test/repository-governance/github-repository-governance.test.ts test/repository-governance/pinned-pi-public-api.test.ts`: four failures and eight passes, matching the native logs.
- Introducing commit `e449cc683579e67e225af4db71a434044f985276` (#949) added the Windows published-pair diagnostic artifact with `retention-days: 7` to `.github/workflows/ci.yml`, while `config/github-repository-governance.json` still inventories only fourteen days. Exact comparison reports the missing seven-day entry.
- Introducing commit `fe2e7e01a949688af34b920a43027bbc85e340ee` (#960) added `session-name-dialog.ts` and a `TUI` import in `shell-extension-ui.ts` without updating `config/baselines/pinned-pi-public-api.json`. The eleven drifted exports are DynamicBorder, CURSOR_MARKER, decodeKittyPrintable, getKeybindings, matchesKey, renderFakeCursor, Spacer, Text, truncateToWidth, TUI, and visibleWidth; declaration hashes and package versions are unchanged.

### Implementation evidence and pre-finalization observations

- Updated the Development validation inventory to `[7, 14]`, preserving both existing artifact lifetimes. Added an explicit inventory assertion and a negative-path comparison proving that the stale fourteen-only inventory still fails read-only comparison at the exact retention paths.
- Regenerated the Pi public API baseline with `node scripts/pi/update-pinned-pi-public-api.mjs`. The only changes are eleven consumer-path additions across 646 exports; all package versions, kinds, and declaration hashes remain unchanged. Added explicit assertions covering the session-name dialog consumers and the extension UI bridge's TUI consumer; exact collection and check-mode assertions remain intact.
- Focused tests now pass: thirteen tests across the same two files on Windows Node 24.21.0. `npm run build:core`, `npm run typecheck`, strict OpenSpec validation, and diff whitespace checks pass. The initial typecheck found a readonly fixture assignment, corrected before completion; bin typechecking then required the ordinary core build because dependencies were installed without lifecycle scripts.
- Pre-finalization PR inspection: Development run 44036077289 skips product suites, PR Full regression, and the protected aggregate while #964 is draft, as intended. The finalization owner reports a successful draft skip, not validation of this implementation. No standalone Full dispatch was used. The finalized exact head still requires selected native Full regression and Development validation required before validated handoff; final run/head/selection belong in Actions and handoff, not another evidence commit.
- Known gaps: none in this metadata repair. Full regression's recorded owner set and four native lanes remain preserved in the original triage and immutable provenance. Numbered-package nightly publication recovery remains independent and is not established by this repair.

### Repair after finalized-head macOS validation

- Selected PR Full regression run 44039771766 on finalized head 91ca24babb887fdace55da800fa00bf7a4dc10a3 reports one macOS failure in `test/app/session-shell/shell-host.test.ts`: the detached-presenter case receives a cursor-only terminal write where it expects no writes. The original governance failures are repaired; core owner validation and Windows Node 24 core pass.
- The fixture's forty-millisecond sleep does not await deferred footer initialization introduced by #960. Controlled frame timers reproduce the exact unexpected cursor write locally; tracing identifies the active presenter's asynchronous `lazyFooterNameEditing` import callback in `dialog-coordinator.ts`, not the detached presenter's render gate.
- The test file now awaits dynamic-import settlement before advancing the real TUI's throttle through the same forty-millisecond window. Real next-tick/immediate scheduling and all exact terminal-write, redraw, attach, and detached-presenter assertions remain intact. No production behavior, assertions, budgets, timeouts, or coverage were weakened.
- All five shell-host tests and typecheck pass locally on Windows Node 24.21.0. This repair is a new commit against the archived form; trusted automation must re-finalize it and native exact-head CI must run again. No old successful evidence is reused for the new candidate.

### Repair after finalized-head Windows validation

- Selected run 44042014994 on finalized head fbf91a4167ba75e30446d3e6c53dae3b2dd79bf6 fails Windows Node 24 core at `session-colors.integration.test.ts:58`: the replacement session remains unavailable. Windows Node 22 core and Ubuntu pass. The isolated integration test passes locally, so merely rerunning it does not establish a repair.
- A bounded native Windows reproduction runs fifty session replacements, each concurrent with eight discovery reads, through the real foundation public entry. Before the fix all fifty publications fail with EPERM. Discovery readers briefly hold the destination file; the one-shot atomic rename fails, and the readiness layer conservatively withholds the unpublished binding rather than advertising it. No session or nonce bytes are printed by the diagnostic.
- Session-control publication now retries only Windows EPERM, EACCES, and EBUSY within a 750 ms publication budget, with bounded backoff. It reuses the same temporary file and atomic rename, never removes the prior destination first, and retains the serialized publication/disposal queue. Permanent errors and persistent sharing violations still reject and remove only the temporary file. Client request deadlines, exact runtime/session/binding checks, and native reporter readiness are unchanged.
- Added deterministic foundation fixtures for the three retryable error codes, permanent-error refusal, persistent contention exhaustion, preservation of the prior complete record, temporary-file removal, and rejection of old identities. The four retry-specific fixtures fail against the old one-shot rename. Windows-only retry fixtures explicitly skip on other platforms rather than claiming native coverage there.
- After the fix the same native reproduction publishes all fifty replacements with zero failures. All twenty-three tests across session-control, independent-runtime color integration, and runtime API lifecycle pass locally on Windows Node 24.21.0; typecheck passes. An initial timer-driven exhaustion fixture incorrectly advanced the clock before asynchronous filesystem setup completed; it was replaced with a deterministic elapsed-clock model of three failed rename attempts, without changing any test timeout.
- No specification requirement changes: this restores the existing atomic-publication and replacement-identity contract in session-color-control. Known implementation gaps remain none; fresh trusted re-finalization and exact-head native validation are required for this new repair.

### Repair after finalized-head Ubuntu validation

- Confirmed PR #964 still names expected head ac9a8a90881b5981709f441391aba3b657c04803 and run 44045463826 attempt 1 is the latest non-superseded Development validation before editing. Read the failed Ubuntu job 133910524303 and both failed aggregate jobs 133918647631 and 133918741027 directly. The aggregate failures follow the single Ubuntu test failure and need no independent change.
- The permanent-publication-error fixture expects only a JSON file in the discovery directory. Ubuntu correctly also retains the live Unix socket, so the new test's Windows-only inventory assumption fails at line 213. Production cleanup and transport behavior are correct.
- The fixture now selects the JSON registration explicitly and compares the entire sorted post-failure directory inventory to its pre-failure inventory. Exact prior-registration byte equality, a single failed rename, no temporary-file leakage, no removal of any existing entry, and rejection of the unpublished identity remain asserted. No production code, timeout, budget, or safety assertion changes.
- All sixteen session-control tests and typecheck pass locally on Windows Node 24.21.0. No local Linux environment is installed; the native Unix socket path remains subject to fresh selected Ubuntu/macOS CI rather than being represented as locally validated. Finalization inspection and fresh exact-head CI apply to the repair head.

### Original triage evidence

- Run [Full regression #96](https://github.com/timurproko/a1/actions/runs/44022764568) (attempt 1, schedule) on `7c146a8` at 2026-11-17T05:15:03Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Published installer smoke: acquire-installer: npm failed [redacted]
      Published installer smoke: install-application: npm failed [redacted]
      Published installer smoke: verify-manifest: published installer selected the wrong application package
      Published installer smoke: launch-application: npm failed [redacted]
      Published installer smoke: install-application: published installer transcript is invalid
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke: update-predecessor: replacement failed
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (1ms)
      Published installer smoke: update-predecessor: published smoke command timed out after 1200000ms
      [published installer] resolve-predecessor started (timeout=30000ms)
      [published installer] resolve-predecessor passed (0ms)
      Published installer smoke: update-predecessor: replacement failed
      [published installer] install-predecessor started (timeout=300000ms)
      [published installer] install-predecessor passed (1ms)
      [published installer] update-predecessor started (timeout=300000ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      Published installer smoke: update-predecessor: replacement failed
      [published installer] launch-application started (timeout=30000ms)
      [published installer] launch-application passed (0ms)
      ... 151 more lines in the run log
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
      Temporarily overriding HOME='/home/runner/work/_temp/bf6f19e1-5e88-4f96-a5e9-098d1efaf045' before making global git config changes
      ```

  - Last successful Full regression run: [#93](https://github.com/timurproko/a1/actions/runs/43552568568) on `c362c4e`; 38 `develop` commits since:
    - `7c146a8` fix(ci): unify publication output boundaries (#962)
    - `fe2e7e0` fix(naming): improve session name dialog editing (#960)
    - `9c97455` fix(lifecycle): confirm Windows process liveness against the process table (#961)
    - `fb28fb8` fix(api): prune stale session control records (#959)
    - `8dc9767` fix(ci): separate publication workflow summary (#958)
    - `1b04aa6` fix(ci): budget published predecessor replacement (#957)
    - `74fd89e` fix(ci): recover develop publication with status (#956)
    - `2871e19` fix(ci): separate published install deadlines (#955)
    - `1188a5b` fix(release): include installer repair helper (#954)
    - `7a79a75` fix(ci): update publication counters while running (#953)
    - `26618ed` fix(release): fail stalled publication smoke faster (#952)
    - `a3e89fc` feat(release): show publication step progress (#951)
    - `e449cc6` fix(release): diagnose Windows publication regression (#949)
    - `cf8884d` chore(regression): repair the 2026-11-16 full regression failure (#950)
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
    - ... 8 more
