## 1. Establish the visual and semantic boundary

- [ ] 1.1 Add focused decoded-cell fixtures that reproduce the neutral stripe beside default and colored transcript/tool rows, and verify the fixture distinguishes row background from source foreground, links, emphasis, and selection.
- [ ] 1.2 Retain semantic fixtures for the final content grapheme, wide/combining boundaries, copied text, and rail-origin gestures; verify the reserved gutter remains non-source and non-copyable.

## 2. Restore background continuity safely

- [ ] 2.1 Compose the reserved gutter from the row's effective full-row background while terminating source glyph, foreground, OSC 8, emphasis, and selection state; verify idle `auto` rows continue their background through the blank final cell.
- [ ] 2.2 Overlay existing thin/thick track and thumb foregrounds without clearing the prepared gutter background; verify reveal, hover, drag, expiry, and repeated cached frames preserve the same underlying surface.
- [ ] 2.3 Preserve current content width, wrapping, hidden-mode reflow, selection bounds, copy output, hit geometry, dock/modal width, and transient-row layout; verify focused component and shell regressions cover each boundary.

## 3. Prove integrated behavior

- [ ] 3.1 Exercise mixed message, tool, prompt, linked, selected, transient, default-background, and colored-background rows at narrow and representative wide terminal sizes; verify the rail appears over a visually continuous row background with no hidden source cell or stale paint.
- [ ] 3.2 Run focused viewport, session-shell, selection, link, controller, and terminal-paint tests plus build and typecheck; record exact passing evidence without weakening existing scrollbar correctness assertions.
- [ ] 3.3 Complete strict OpenSpec and changed-documentation validation, reconcile current `origin/develop`, document any known gap, and prepare implementation-specific acceptance scenarios for trusted finalization.

## 4. Delivery readiness

- [ ] 4.1 Prepare a Windows Terminal handoff for `auto`, `always`, and `hidden` with thin/thick rails over mixed background blocks; verify the checklist covers scrolling, hover, expiry, selection/copy, and unchanged dock behavior.
- [ ] 4.2 Keep the phase-free PR free of automatic merge mechanisms and verify all substantive tasks and evidence are complete before marking the candidate ready.
