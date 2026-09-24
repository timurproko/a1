## 1. Lock the right-edge behavior

- [ ] 1.1 Add focused decoded-cell fixtures that distinguish semantic content width from the final-column gutter and reproduce the unselected stripe on whole, interior, and boundary-ending selected rows.
- [ ] 1.2 Cover forward and reverse ranges, an endpoint that deliberately excludes the final source grapheme, source backgrounds, links, wide and combining graphemes, and unchanged copied text.

## 2. Extend selection paint beneath the rail

- [ ] 2.1 Project only viewport selection ranges that reach `contentWidth` through the reserved gutter during paint, while leaving selection endpoints, selected rows, and copy snapshots semantically bounded to source content.
- [ ] 2.2 Preserve visible thin/thick track and thumb foregrounds over the projected selection background and preserve the same selected blank cell when an automatic rail is idle.
- [ ] 2.3 Keep hidden-mode and dock-row selection, content wrapping, rail hit geometry and gesture ownership, modal coverage, and bounded row reuse unchanged; ensure cache and damage evidence reflects the effective painted range.

## 3. Prove integrated behavior

- [ ] 3.1 Exercise first, repeated, reveal, hover, drag, expiry, and hidden frames and verify the gutter switches only between the correct ordinary and selection backgrounds without stale paint.
- [ ] 3.2 Run focused viewport, frame-selection, session-shell, and terminal-paint tests plus build, typecheck, strict OpenSpec, changed-documentation, and diff validation; record exact evidence without weakening prior scrollbar assertions.
- [ ] 3.3 Reconcile current `origin/develop`, document any known gap, and prepare the exact Windows Terminal handoff for multiline selection across the rail in `auto`, `always`, and `hidden` modes before trusted finalization.
