## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- The run had two independent failures; the recorded log excerpt shows only the passing neighbours of the second. Every lane failed `pinned-pi-public-api.test.ts` because #621 added `truncateToWidth` consumers without refreshing `config/baselines/pinned-pi-public-api.json`. `f9100403` (merged with #624 at `dade587`) already refreshed that baseline, so merging current `develop` resolves it without a change here.
- Only macOS also failed `shell-components.test.ts › keeps adjacent queued chips individually atomic…`, introduced by #621. The test fixed the dequeue binding to `alt+up` and asserted `Alt+Up` on one 40-column row, but Pi labels Alt as `Option` on macOS, and ` ↳ Option+Up to edit all queued messages` exceeds the 38-column content width and wraps. Product rendering is correct and platform-specific labelling is already asserted by the live-binding test above it.
- Use a platform-neutral `ctrl+up` binding in the chip-wrapping test, so every platform asserts the same one-row hint. The chip-count, refresh, and rebinding assertions are unchanged; no product code, budget, or timeout changes.

## Evidence

- Rendering the queued status at 40 columns with `process.platform` set to `darwin` reproduced the failure: `alt+up` produced `[" ↳ Option+Up to edit all queued", " messages"]`, while `ctrl+up` produced the one-row ` ↳ Ctrl+Up to edit all queued messages`.
- `pinned-pi-public-api.test.ts` passes on the merged `develop` head; it failed only before `f9100403`.
- `shell-components.test.ts` (43 tests), `tsgo -p tsconfig.json --noEmit`, and `check-code-documentation --mode full` pass locally on Windows/Node 24.

- Run [Full regression #44](https://github.com/timurproko/a1/actions/runs/36546666153) (attempt 1, schedule) on `f11d40d` at 2026-09-29T09:03:25Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22, windows-2025-node24 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/integrations/pi/components/shell-components.test.ts ^[[2m(^[[22m^[[2m43 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 334^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mmatches Pi's queued steering rows and derives the dequeue hint from live bindings^[[32m 31^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mmoves a fitting queued chip intact to its next custom-viewport row: [paste #1 1001 chars]^[[32m 7^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mmoves a fitting queued chip intact to its next custom-viewport row: [📷 screenshot-0123456789]^[[32m 1^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mmoves a fitting queued chip intact to its next custom-viewport row: [📁 C:/workspace/folder]^[[32m 1^[[2mms^[[22m^[[39m
      ^[[31m     → expected false to be true // Object.is equality^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mellipsizes an oversized queued chip on one row and leaves pinned queue wrapping unchanged^[[32m 2^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22madapts editor input and focus through owned contracts^[[32m 6^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mrenders and accepts a bare-A1 contextual suggestion without changing or submitting empty text^[[32m 3^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mkeeps a contextual suggestion behind draft text and repaints it once the draft is cleared^[[32m 1^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 1049^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 2391^[[2mms^[[22m^[[39m
      ... 57 more lines in the run log
      ```

  - Lane Full regression / Complete regression required failed in job `Full regression / Complete regression required` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
        if (jobsResult !== "success" || records.length !== FULL_LANES.length) throw new Error("complete-regression jobs or evidence are incomplete");
                                                                                    ^
      Error: complete-regression jobs or evidence are incomplete
          at requireFullLanes (file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:44:79)
          at file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:67:20
          at ModuleJob.run (node:internal/modules/esm/module_job:561:25)
          at async node:internal/modules/esm/loader:647:26
      ##[error]Process completed with exit code 1.
      Post job cleanup.
      [command]/usr/bin/git version
      git version 2.55.0
      Temporarily overriding HOME='/home/runner/work/_temp/7daf1226-8749-4776-a7e7-049af582d31c' before making global git config changes
      ```

  - Last successful Full regression run: [#43](https://github.com/timurproko/a1/actions/runs/36400505675) on `51e8492`; 11 `develop` commits since:
    - `f11d40d` Merge pull request #621 from timurproko/fix/keep-queued-chips-unbroken
    - `7c25be1` Merge pull request #620 from timurproko/docs/use-npm-x-installer-command
    - `694c884` Update README.md (#618)
    - `8a019ce` Merge pull request #617 from timurproko/feature/draft-release-note-review
    - `be0668b` Update README.md (#616)
    - `a9bc0c2` chore(release): review 0.2.2 (#615)
    - `8cd4600` Merge pull request #613 from timurproko/feature/release-changelog-review
    - `6ed84ba` Update README.md (#614)
    - `406da23` Merge pull request #612 from timurproko/chore/rename-release-workflow
    - `28b223f` Merge pull request #610 from timurproko/fix/cleanup-blocked-worktrees
    - `eeece4f` chore(release): open 0.2.2-dev (#611)
