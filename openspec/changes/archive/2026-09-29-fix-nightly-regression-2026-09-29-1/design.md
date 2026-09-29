## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- darwin-node24 failed `shell-components.test.ts › keeps adjacent queued chips individually atomic…`, introduced by #621. The test fixed the dequeue binding to `alt+up` and asserted `Alt+Up` on one 40-column row, but Pi labels Alt as `Option` on macOS, and ` ↳ Option+Up to edit all queued messages` exceeds the 38-column content width and wraps. Use a platform-neutral `ctrl+up` binding there; platform labelling stays asserted by the live-binding test above it. This is the same test change as `fix-nightly-regression-2026-09-29`.
- linux-node24 failed `session-shell-selection.test.ts › continuously auto-scrolls an active selection held at a viewport edge` with `fastDistance` 0. The fast-speed gesture pressed the same cell as the first gesture; the real-time gap between them (150 ms + terminal replay + 130 ms) falls under the 500 ms `TEXT_SELECTION_MULTI_CLICK_MS` on a fast runner, so the press became a double-click word selection that never auto-scrolls. Slower machines exceeded the window and passed, which hid it.
- Start the fast gesture on the next row so it cannot count as a multi-click, and advance the edge-scroll windows with fake `setTimeout` so the normal/fast/high distances are tick counts rather than runner load. Terminal replay and disposal keep real timers. Every distance and ordering assertion is unchanged; no product code, budget, or timeout changes.
- The triage scaffolded this second same-day change with `created: 2026-09-29-1`, which OpenSpec rejects as change metadata, so `skip_specs` was not honoured and validation failed. The scaffold now writes only the calendar date of the candidate stamp, and this change's metadata is corrected to `2026-09-29`.

## Evidence

- Rendering the queued status at 40 columns with `process.platform` set to `darwin` reproduced the chip-test failure: `alt+up` wrapped to `[" ↳ Option+Up to edit all queued", " messages"]`; `ctrl+up` stays on one row.
- With fake edge-scroll timers alone (collapsing the real gap), the auto-scroll test failed deterministically with CI's `expected 0 to be greater than 3`. Instrumentation showed the second press carrying `previousClick` on the same line and column 79 ms earlier, and no motion reaching edge auto-scroll. Starting the gesture on the next row passes.
- Both changed files (113 tests) passed six consecutive local runs on Windows/Node 24; `tsgo -p tsconfig.json --noEmit` and `check-code-documentation --mode full` pass.

- Run [Publish #1](https://github.com/timurproko/a1/actions/runs/36552387091) (attempt 1, schedule) on `dade587` at 2026-09-29T09:56:21Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on darwin-node24, linux-node24 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/integrations/pi/components/shell-components.test.ts ^[[2m(^[[22m^[[2m43 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[32m 205^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mmatches Pi's queued steering rows and derives the dequeue hint from live bindings^[[32m 19^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mmoves a fitting queued chip intact to its next custom-viewport row: [paste #1 1001 chars]^[[32m 2^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mmoves a fitting queued chip intact to its next custom-viewport row: [📷 screenshot-0123456789]^[[32m 1^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mmoves a fitting queued chip intact to its next custom-viewport row: [📁 C:/workspace/folder]^[[32m 1^[[2mms^[[22m^[[39m
      ^[[31m     → expected false to be true // Object.is equality^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mellipsizes an oversized queued chip on one row and leaves pinned queue wrapping unchanged^[[32m 2^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22madapts editor input and focus through owned contracts^[[32m 4^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mrenders and accepts a bare-A1 contextual suggestion without changing or submitting empty text^[[32m 2^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m Pi shell public component adapters^[[2m > ^[[22mkeeps a contextual suggestion behind draft text and repaints it once the draft is cleared^[[32m 1^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 852^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 1756^[[2mms^[[22m^[[39m
      ... 20 more lines in the run log
      ```

  - Lane Publication result failed in job `Publication result` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
      ##[error]Process completed with exit code 1.
      ```

  - No successful Publish run is retained on `develop`; the suspect range is unbounded, start from the failed head.
