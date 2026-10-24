## 1. Resident overflow popup

- [x] 1.1 Build overflow rows only from ordered tabs with no drawn chip, without checkmarks; refresh as visibility changes.
- [x] 1.2 Keep the popup coherent across resize, create, close, reorder, and view changes; preserve keyboard/mouse selection, hidden-tab activation, and existing overlay behavior.
- [x] 1.3 Add focused Rust strip and attach tests for hidden-only rows, ordering, resize, removed entries, and hidden-tab activation.
- [x] 1.4 Align bottom-popup mouse coordinates with the actual rendered row for each named tab, including clamped rows.
- [x] 1.5 Update bottom-popup mouse tests for the named hidden row after hover, resize, reorder, and a row-count change.

- [x] 1.6 Swap a selected hidden tab into the currently active chip's slot when space is limited, preserving other visible chips when feasible without changing registry order.
- [x] 1.7 Add strip and attach tests for one-chip and two-chip swaps, displaced menu entries, stable chip positions, keyboard switching, and geometry limits.
- [x] 1.8 Reserve a stable status icon and separator before each hidden-tab name, using the strip's live glyph and semantic color without changing row actions.
- [x] 1.9 Add focused tests for idle and active icon slots, color and style boundaries, hover, name clipping, and mouse coordinates at narrow widths.
- [x] 1.10 Resolve Alt+number from the currently drawn strip chips in visual order, leaving out-of-range numbers inert without pending jumps.
- [x] 1.11 Avoid a transient old-chip or stale hidden-title animation during a pending hidden-tab swap without changing later auto-naming.
- [x] 1.12 Add focused shortcut and strip-transition tests for swaps, resizes, reordered/identically named tabs, in-flight views, and out-of-range Alt+number.
- [x] 1.13 Render centered `⋯` on the overflow control without changing its hit geometry, muted color, or name truncation.
- [x] 1.14 Project Alt+- and Alt+= to the existing overflow and add popups through the native/owned shortcut declarations, honoring rebindings and owned-key reservations.
- [x] 1.15 Add focused Rust and TypeScript tests for the centered glyph, popup behavior, the unshifted Alt+= key and explicitly rebound shift-plus encoding, absent overflow, geometry, and shortcut projection.

- [x] 1.16 Prioritize the committed active chip over an unrelated pending view when replacing a visible chip from the hidden-tab popup; keep subsequent pending swaps stable.
- [x] 1.17 Add focused tests for a hidden selection during an unrelated pending view and its committed/pending chip slots.

- [ ] 1.18 Reproduce the reported missing Alt+-/Alt++ menu activation in the actual launched host (or distinguish a stale checkout), repair the input route if needed, and cover the reproduced event with a regression test.

## 2. A1 footer truncation

- [x] 2.1 Use a single-column dim ellipsis for narrow A1 footer usage truncation without coloring adjacent content or changing the Pi comparison profile.
- [x] 2.2 Add focused footer tests for ANSI boundaries, width constraints, ordinary-width preservation, and PR badge hyperlinks.
- [x] 2.3 Use one dim ellipsis for A1 path truncation and reserve complete model identity ahead of lower-priority usage at narrow widths.
- [x] 2.4 Add focused tests for path/badge, model/level priority, tiny widths, A1 semantic colors, and Pi comparison isolation.

## 3. Delivery evidence

- [x] 3.1 Record focused typecheck and touched-test results with any known gaps in implementation evidence after approval and implementation.
- [x] 3.2 Record the earlier refinement's focused checks and gap disposition in the implementation evidence.
- [x] 3.3 Record hidden-only menu and swap checks and any remaining geometry limits.
- [x] 3.4 Record icon-slot rendering and interaction checks and any remaining limits.
- [x] 3.5 Record visible-shortcut and stable-swap checks and any remaining limits.
- [x] 3.6 Record the requested keyboard-menu and glyph refinement's focused checks and any remaining limits.
- [x] 3.7 Record the centered control and committed-active-slot repair checks, with any remaining limits.
- [ ] 3.8 Disposition the reported physical Alt+-/Alt++ shortcut gap against the exact candidate head.
