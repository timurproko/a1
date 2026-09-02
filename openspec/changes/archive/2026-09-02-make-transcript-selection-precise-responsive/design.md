## Context

See `proposal.md` for motivation and the two delta specs for observable requirements.

Bare A1 owns transcript selection because its custom fullscreen viewport enables SGR mouse reporting and keeps transcript coordinates separate from the pinned dock and controls. The neutral selection model currently records one-based pointer cells and treats both ordered endpoints as inclusive. Equal endpoints are discarded unless the selection was created as a word or full-row range. Since ordinary terminal motion reports expose cell coordinates rather than a sub-cell drag boundary, the first distinct report normally names the adjacent cell; inclusive endpoints therefore make two cells the smallest ordinary drag.

Selection motion already bypasses the 33 ms stream-presentation coalescer and calls the runtime render request used by input. The remaining latency is dominated by frame work: every report composes the complete visible viewport, repeatedly measures padded rows, and reapplies a grapheme-aware background to every visible selected row. A diagnostic workload with 1,000 rows at 192 columns by 54 rows measured selection composition at about 28.9 ms average and 48.7 ms maximum before Pi's row diff and terminal paint, while an unselected compose still averaged about 10.9 ms. Motion can therefore arrive faster than frames are produced even though event routing is cooperative.

The custom fullscreen viewport, public Pi TUI runtime, A1-owned damage-aware terminal boundary, shared components, ANSI/link preservation, and comparison paths must remain. Selection-active vertical movement currently fails closed to Pi's complete differential write; unknown terminal grammar must continue to fail closed.

## Goals / Non-Goals

**Goals:**

- Give drag selection explicit display-boundary semantics that can represent exactly one grapheme without turning an ordinary click into a selection.
- Make rendering and copy extraction consume one normalized range for forward, reverse, same-row, and multiline selections.
- Keep selection presentation at the immediate runtime cadence with at most the newest unpublished pointer endpoint.
- Reduce selection-only composition to changed visible row ranges while retaining correct invalidation for content, style, geometry, controls, and viewport movement.
- Prove logical selection damage and final terminal cells deterministically, then require exact-artifact physical acceptance.

**Non-Goals:**

- Replacing bare A1's custom fullscreen viewport with regular mode or terminal-native selection.
- Changing editor selection, double-click word segmentation, triple-click line selection, clipboard transport, scrollbar speed, or auto-scroll cadence.
- Modifying Pi packages, using private/deep Pi imports, patching the runtime, or changing `a1 pi` and untouched Pi.
- Making pointer painting synchronous for every raw motion report; superseded reports should be dropped rather than multiplied.
- Optimizing unrelated full shell rendering or weakening the damage adapter's fail-closed safety rules.

## Decisions

### 1. Represent ordinary drags as boundaries, not inclusive pointer cells

The neutral selection state will distinguish the pressed anchor cell, whether a distinct drag motion occurred, and the active display boundary. For ordinary drags, the anchor boundary is the outer edge of the anchor cell in the drag direction and the active boundary is the edge of the reported pointer cell nearest the anchor. Moving into an adjacent cell therefore spans only the anchor cell. Reversing direction recomputes boundary orientation while retaining the anchor and active-end identity.

The ordered range consumed by paint and copy will be half-open. Display-column slicing will align both ends to complete grapheme boundaries. Word and full-row selections will continue to create their semantic ranges directly rather than being reinterpreted as ordinary motion.

Alternative considered: mark equal inclusive endpoints as a one-cell selection. Rejected because the first reported adjacent cell would still create a two-cell range and an unextended click would become ambiguous.

Alternative considered: infer a drag from press duration when press and release name one cell. Rejected because duration cannot distinguish a held click from sub-cell motion and would make selection terminal/timing dependent.

Alternative considered: enable terminal pixel mouse mode. Rejected because support and cell-pixel discovery vary, the current public input contract is cell-based, and it would broaden coordinate handling for every viewport control.

### 2. Keep one normalized range authoritative for paint and copy

Selection ordering will return a normalized range with row-local half-open display-column bounds. The same result will drive background spans and plain-text extraction. Multiline extraction will add newlines only between source rows; it will never derive copied content from padded or overlaid frame rows. The active endpoint remains separately identifiable so extension, reversal, and edge auto-scroll do not lose direction.

Alternative considered: adjust only copied text or only the painted endpoint by one cell. Rejected because highlight and clipboard output could diverge, particularly after reversal and across wide graphemes.

### 3. Cache stable visible base rows and row selection variants

The transcript viewport will retain bounded row-level composition state keyed by the source row identity/value, rectangle and viewport position, source-paint revision, theme/selection revision, and overlay geometry. Each frame derives the normalized selected range per visible row. A selection-only revision compares those row ranges with the prior frame:

- unchanged rows reuse their final row strings;
- a moving endpoint recomputes its old and new endpoint rows;
- a newly crossed or unselected row is computed once when its range changes;
- stable interior selected rows are not repeatedly measured or repainted;
- the scrollbar rail is overlaid after selection so it remains visible.

Base padding/display-width results and selected variants will use a viewport-related capacity rather than an unbounded key history. Content, width, height, document range, sticky row, scrollbar state, theme, hyperlink-hold styling, resize, or replacement surface changes invalidate only the affected cache when safely identifiable and otherwise invalidate the complete visible cache.

Alternative considered: optimize grapheme width calculation alone. Rejected as insufficient: a diagnostic cheap-width substitution still left complete viewport composition above a reliable one-frame budget, and every already-selected row would continue to be traversed.

Alternative considered: cache only complete frames. Rejected because every endpoint changes the selection revision and would invalidate the whole frame without exposing reusable row damage.

### 4. Use the public runtime's normal immediate scheduler with latest-pointer state

Pointer routing will update a monotonically increasing selection revision and request the ordinary immediate input render, not the stream coalescer and not a forced full reset. The runtime may coalesce reports arriving before its next frame, but state storage retains only the newest endpoint. If motion arrives during composition, one subsequent render is requested from the newest revision; obsolete endpoint frames are never deliberately replayed.

Selection interaction will continue to preempt pending stream presentation. The next semantic frame is composed from current transcript and selection revisions so an older stream snapshot cannot remove newer highlighting. This preserves runtime cursor/diff state and avoids the cost of forcing a complete redraw for every report.

Alternative considered: synchronously force-render every motion report. Rejected because pointer floods would serialize expensive full resets, increase terminal writes, and worsen lag under load.

Alternative considered: lower streaming cadence globally. Rejected because selection already bypasses that cadence and the measured bottleneck is selection composition.

### 5. Keep terminal transformation conservative and classify selection damage in evidence

For a fixed viewport position, Pi's public fullscreen differential remains responsible for emitting changed selection rows. The A1 terminal adapter will continue to fail closed rather than applying the followed-transcript regional-scroll optimization while selection safety is unproven. Selection evidence will arm authoritative row-damage metadata so tests can classify addressed rows, stale endpoints, clears, final cells, and cursor restoration without inferring selection semantics from ANSI bytes.

Edge auto-scroll legitimately moves transcript cells and may damage more rows than endpoint-only motion. A future selection-aware regional move would require a separate proven grammar; this change will not broaden terminal rewriting merely to satisfy an artificial byte target.

Alternative considered: rewrite selection ANSI directly at the terminal adapter. Rejected because it would duplicate source style/link handling and make terminal bytes, rather than neutral selection state, authoritative.

### 6. Gate correctness deterministically and perceived latency physically

Component tests will cover exact normalized ranges, one-grapheme forward/reverse drags, wide/combining graphemes, multiline extraction, shrink/reversal, word/line modes, and bounded cache eviction. Shell tests with fake scheduling will prove latest-pointer-wins behavior, stream preemption, auto-scroll, resize, modal ownership, and cleanup. Terminal-paint replay at representative 192x54 geometry will assert recomputed-row and addressed-row damage, final cell highlights, copy bytes, absence of stale endpoint frames, and unchanged comparison producers.

Wall-clock measurements will be retained as diagnostics, not the sole CI oracle because host contention varies. The deterministic gate will enforce bounded recomputation and pending-frame counts; exact built bytes in Windows Terminal provide the final perceived-latency verdict against vanilla Pi.

## Risks / Trade-offs

- **[The pointer cell is not a physical pixel boundary]** → Use the edge nearest the anchor as a deterministic cell-protocol approximation, cover both directions, and require physical acceptance; do not guess from timing.
- **[Cached rows retain stale ANSI, links, rail, or theme state]** → Key or invalidate on every presentation revision that can affect bytes, keep overlay order explicit, and add mutation/resize/theme fixtures.
- **[Cache bookkeeping costs more than it saves on tiny viewports]** → Keep comparison row-local and bounded; correctness does not depend on a cache hit and tiny-frame benchmarks remain diagnostic.
- **[Motion arrives during a slow render]** → Retain only the newest revision and request one follow-up frame, rather than queueing every report.
- **[Selection plus auto-scroll causes broad legitimate damage]** → Separate endpoint-only budgets from viewport-movement budgets and preserve fail-closed full differential output.
- **[A terminal or Pi TUI version changes mouse/write behavior]** → Keep cell input and terminal grammar conformance fixtures pinned, fail closed, and leave comparison paths untouched.

## Migration Plan

1. Add failing boundary, copy, row-damage, scheduler, and terminal-replay fixtures that reproduce the two-character minimum and growing per-motion work.
2. Introduce normalized boundary selection while retaining semantic word/full-row modes and existing clipboard behavior.
3. Add bounded stable-row and selected-variant reuse, then connect selection revisions to the ordinary immediate runtime scheduler.
4. Run focused component, shell, terminal, architecture, type, build, and strict OpenSpec validation; use CI as the required automated gate.
5. Build and run the exact implementation worktree through `./scripts/dev`, compare one-grapheme and sustained multiline drags with `./scripts/dev pi`/vanilla Pi in Windows Terminal, and record acceptance before manual merge authorization.
6. If physical acceptance fails, retain the evidence and leave the code pull request unmerged; disable the new fast path if necessary without reverting boundary correctness or changing comparison producers.
