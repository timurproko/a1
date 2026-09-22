## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- Maintainer approval: on 2026-09-22 the maintainer requested “fix publishing and consolidate 536 and 538” after the diagnosis. Continue in #536's existing branch/history, reconcile current develop, and preserve #538's evidence here before closing it as superseded. Do not delete its remote branch.
- Publication run 35754423252 stopped before Windows package validation. `check-environment.mjs` used a 15-second version probe and converted absence, timeout, spawn error, nonzero exit, and unparseable output into the same null result. The log cannot establish which failure occurred. Provision and exercise Rust explicitly before CI builds and retain structured probe failures; keep the existing 15-second deadline and fail-closed build gate.
- #529 added the owned thinking selector and moved upstream consumers without updating the public-API consumer record. Its list uses upstream `getSelectListTheme()` while its labels use owned `piTheme()`; `applyPiTheme(..., "truecolor")` does not pass that explicit mode to upstream initialization. Give list and borders owned semantic color callbacks, leave the pinned comparison selector unchanged, and cover both themes and color modes.
- Recheck the API baseline after the current develop merge (#537 already regenerated it); regenerate only actual implementation-derived records.
- Release #148 also timed out in the Windows Node 22 update-CLI beforeAll hook, which copies and compiles the entire source tree for a CLI-only isolation test. The fresh isolated reproduction passes locally (setup plus test about 10 seconds), but repeats a JavaScript TypeScript compilation under parallel hosted load. Use the repository's already-pinned native TypeScript compiler for this fixture's same full project instead, preserving real compilation, isolation, configuration, the 30-second hook and subprocess bounds, loader guards, and every assertion. This removes compiler overhead without excluding any source or trusting stale dist.
- Full regression on the completed implementation is required before handoff. Local focused evidence and the smaller develop publication package suite are not substitutes.

## Consolidated release and publication evidence

- PR #538: https://github.com/timurproko/a1/pull/538, planning-only head `c07a02b88700e708b8c9a264dbecef80e1d9fdb8`; no executable changes to integrate.
- Release #148: https://github.com/timurproko/a1/actions/runs/35705803548, attempt 1, scheduled on `6ae061516ba71675476541a958bd6e49903e280f`. Every lane failed `test/repository-governance/pinned-pi-public-api.test.ts:36` with consumer drift for DynamicBorder, getSelectListTheme, ThinkingSelectorComponent, and the selector's Pi TUI imports. Linux/macOS additionally failed `test/integrations/pi/components/prompt-input-ux.test.ts:181` (`palette:66` versus `90;128;128`). Windows Node 22 additionally timed out at `test/cli/update-cli.test.ts:16` in the 30000ms setup hook. The Publication result failure is downstream orchestration, not another root cause.
- Develop publication: https://github.com/timurproko/a1/actions/runs/35754423252, attempt 1, source `7b80f6a30cf82ae654a668fc577734bdd33dcaa5`, candidate `0.1.8-dev.537`. `Validate win32-node24` failed `npm ci` in prepare/build with `Rust compiler: rustc is not on PATH`. The preflight consumed approximately 32 seconds across all probes. Package creation on another Windows runner and Linux/macOS package validation passed. Publishing was skipped. Timeout is plausible but unproven because the existing probe discarded its diagnostic result.

## Known gaps

No product assertions, compile scope, build gates, or existing probe/test deadlines were relaxed. The original Rust probe's exact failure mode is unrecoverable from its discarded result; explicit CI provisioning/warmup and preserved diagnostics address that uncertainty without asserting a proven timeout. Publication itself still requires manual integration and a subsequent release run; do not treat Full regression as registry publication. Cross-platform Full regression evidence is pending.

## Implementation evidence

- Current baseline: after reconciling `7b80f6a3` and installing the locked Pi 0.87.0 dependencies, `update-pinned-pi-public-api.mjs --check` passed (567 exports). The original consumer drift was already repaired on develop. This change subsequently removes only the owned selector's upstream `getSelectListTheme` consumer and regenerates the matching API/source-ledger records.
- Red/green reproduction: explicit owned color mode opposite host capabilities failed all four dark/light × truecolor/256-color cases before the fix. The same cases pass with owned callbacks for selection, descriptions, markers, and borders, including list reconstruction after filtering.
- Windows local focused suite: 103 tests passed across environment prerequisites/probes, stdout discipline, prompt-input UX, update-CLI isolation, Pi API baseline, and session-shell workflows. Probe tests cover missing executables, timeout, spawn error, nonzero/signal termination, unparseable output, a real version command, advisory severity, Windows shim quoting, and redacted diagnostics. Hermetic shell tests exercise provisioning order and stop-on-failure at every Rust setup command; parsed workflows verify setup precedes every relevant build.
- Update-CLI fixture: original full-project JavaScript compilation plus test took 10.14 seconds locally; the same isolated project compiled with the already-pinned native TypeScript compiler plus unchanged assertions took 4.48 seconds under the broader focused run. Both 30000ms limits remain unchanged.
- Build, source and bin typecheck, architecture, product identity, source-ledger provenance/currentness, full code-documentation audit, full internal-naming audit, and diff whitespace checks passed. An additional 39 tests passed for release workflow/runbook policy, validation suites, Pi parity evidence, and source-ledger governance.

## Evidence

- Run [Full regression #33](https://github.com/timurproko/a1/actions/runs/35702168801) (attempt 1, schedule) on `6ae0615` at 2026-09-22T07:56:47Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22, windows-2025-node24 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/integrations/pi/components/prompt-input-ux.test.ts ^[[2m(^[[22m^[[2m15 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[32m 93^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned shared input and status presentation^[[2m > ^[[22mmatches search and submitted-prefix foreground in dark^[[32m 31^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned shared input and status presentation^[[2m > ^[[22mmatches search and submitted-prefix foreground in light^[[32m 3^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned shared input and status presentation^[[2m > ^[[22mkeeps owned rules neutral across every level and bash mode while preserving pinned borders^[[32m 4^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned shared input and status presentation^[[2m > ^[[22mkeeps pointer selection aligned with the shared content inset and never copies chrome^[[32m 2^[[2mms^[[22m^[[39m
      ^[[31m     → expected { foreground: 'palette:66', …(1) } to deeply equal { foreground: '90;128;128', …(1) }^[[39m
         ^[[32m✓^[[39m owned level and model keybindings^[[2m > ^[[22mcycles once without opening model selection for "\f"^[[32m 2^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned level and model keybindings^[[2m > ^[[22mcycles once without opening model selection for "\u001b[108;5u"^[[32m 1^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned level and model keybindings^[[2m > ^[[22mcycles once without opening model selection for "\u001b[27;5;108~"^[[32m 1^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m owned level and model keybindings^[[2m > ^[[22mleaves reverse Tab "\u001b[Z" unassigned and inert for drafts and suggestions^[[32m 3^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 804^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 1831^[[2mms^[[22m^[[39m
      ... 44 more lines in the run log
      ```

  - Last successful Full regression run: [#30](https://github.com/timurproko/a1/actions/runs/35576685488) on `95216f1`; 6 `develop` commits since:
    - `6ae0615` fix(ui): stabilize touchpad scroll direction (#533)
    - `5f5a349` fix(ui): correct thinking selector presentation (#529)
    - `2226c9d` fix(regression): repair the 2026-09-21 release failure (#527)
    - `ba79473` chore(pi): upgrade pinned Pi to 0.86.1 (#526)
    - `8e22b03` fix(shell): offer /thinking and order the command menu like the engine (#528)
    - `d8a3db0` chore(pi): upgrade pinned Pi to 0.86.0 (#522)
