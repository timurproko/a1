## 1. Capture Selection Regressions Before Production Changes

- [x] 1.1 Add neutral selection-model tests that fail for one-grapheme forward and reverse drags, an unextended click, direction reversal, multiline ranges, and wide/combining graphemes; verify paint bounds and extracted text are asserted from the same cases.
- [x] 1.2 Add transcript-viewport instrumentation and fixtures for per-row selection ranges, recomputed rows, stable-row reuse, cache invalidation, and bounded eviction; verify a 192x54 multiline drag reproduces the current growing selected-row work without relying on wall-clock timing.
- [x] 1.3 Add shell/runtime fixtures for pointer-report bursts, selection motion overlapping a pending stream frame, motion arriving during composition, auto-scroll, resize, modal ownership, and disposal; verify the current two-cell minimum and stale/slow presentation risks are retained as failing evidence.

## 2. Introduce Boundary-Accurate Selection Semantics

- [x] 2.1 Replace ordinary inclusive-cell drag state with anchor, drag-activation, active-boundary, and normalized half-open display ranges; verify focused model tests cover forward, reverse, crossing the anchor, shrinking, and empty unextended presses.
- [x] 2.2 Make highlight ranges and plain-text extraction consume the same normalized selection, align boundaries to complete graphemes, and preserve semantic newlines without ANSI, padding, or overlay cells; verify one-grapheme, wide, combining, styled, linked, and multiline copy tests pass.
- [x] 2.3 Map transcript pointer motion to the boundary edge nearest the anchor while retaining semantic double-click word and triple-click full-row modes; verify the smallest adjacent-cell motion selects only the pressed grapheme in both directions and ordinary clicks remain unselected.
- [x] 2.4 Preserve active-end identity through reversal and edge auto-scroll; verify extension follows every scheduled scroll row at normal, fast, and high speeds and release stops further extension.

## 3. Bound Selection-Only Viewport Composition

- [x] 3.1 Add bounded reuse for stable visible source painting, display-width measurement, and padded base rows; verify repeated fixed-geometry composition does not remeasure unchanged rows and output remains byte-identical.
- [x] 3.2 Track normalized selected ranges per visible row and reuse unchanged final row strings while recomputing only changed endpoint, crossed, shrinking, or newly unselected rows; verify one-row motion does not revisit stable selected interior rows.
- [x] 3.3 Keep scrollbar glyphs above selection and invalidate affected reuse for content, reflow, width/height, document range, sticky rows, theme, hyperlink style, rail state, replacement surfaces, and reset; verify no stale highlight, ANSI style, OSC 8 link, padding, or rail survives each invalidation fixture.
- [x] 3.4 Bound retained base and selected variants relative to viewport size; verify long pointer histories and long transcripts do not grow cache memory or selection lookup work with transcript length.

## 4. Present Only the Latest Pointer State

- [x] 4.1 Carry a monotonic selection revision through the viewport controller and request the public runtime's ordinary immediate input render without forced full resets; verify several reports before a frame produce one pending latest endpoint.
- [x] 4.2 Request one follow-up render when selection changes during composition and suppress obsolete endpoint presentation; verify fake-scheduler tests never paint an older endpoint after a newer report.
- [x] 4.3 Preempt pending stream presentation with selection interaction and compose subsequent content frames from current transcript and selection revisions; verify streamed content remains current and cannot erase or regress pointer feedback.
- [x] 4.4 Preserve editor input, viewport controls, word/line selection, copy clearing, resize, auto-scroll cadence, modal bypass, and terminal restoration; verify the existing focused shell and viewport interaction suites remain green.

## 5. Prove Logical and Physical Paint Behavior

- [x] 5.1 Extend authoritative frame evidence with selection revision and row-damage classification while leaving selection-active unsafe shifts fail-closed; verify terminal replay records addressed rows, clears, cursor placement, final highlighted cells, and copy output without inferring selection semantics from ANSI.
- [x] 5.2 Add deterministic 192x54 workloads for one-grapheme drags, sustained multiline motion, reversal/shrink, long transcripts, stream overlap, auto-scroll, resize, styles, links, and scrollbar modes; verify stale frames, full-transcript scans, and recomputation of every stable selected row fail declared budgets.
- [x] 5.3 Verify `a1 pi`, untouched pinned Pi, regular-mode terminal selection, installed Pi packages, and the pinned terminal grammar remain unchanged through package-identity, comparison-producer, architecture, and provenance checks.

## 6. Automated Delivery Gate

- [x] 6.1 Run focused selection/component/viewport/shell/runtime/terminal tests, then `npm run typecheck`, `npm run build`, documentation governance, architecture governance, strict `openspec validate make-transcript-selection-precise-responsive --strict`, and `git diff --check`; record exact results without running a forbidden local full suite.
- [x] 6.2 Commit only the accepted implementation and evidence on a fresh implementation worktree/branch based on merged specification `origin/develop`, push it to its own code pull request, keep auto-merge disabled, and verify required CI succeeds before physical handoff.

## 7. Exact-Artifact Acceptance

- [x] 7.1 Provide the exact implementation worktree, branch/commit, build command, and color-preserving `./scripts/dev` and `./scripts/dev pi` comparison command with one-grapheme, reverse, multiline, copy, streaming, auto-scroll, resize, style/link, and scrollbar checks.
- [x] 7.2 Obtain user-controlled Windows Terminal acceptance of the exact built candidate, recording terminal/version, geometry, relevant viewport settings, one-grapheme copy result, multiline tracking verdict, and comparison result; keep the code pull request unmerged if any physical finding contradicts automation.
- [x] 7.3 After CI and physical acceptance, merge only with explicit user authorization, then record acceptance and archive the completed OpenSpec change in the required specification-only follow-up.
