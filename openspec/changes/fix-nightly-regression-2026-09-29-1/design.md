## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

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
