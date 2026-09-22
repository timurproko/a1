## Context

The settings app renders search results through the shared grouped-list layout. Inter-section spacer rows are real list rows for ordinary scrolling, but a spacer at the top boundary of a bottom-clamped viewport is represented by the outgoing sticky heading and skipped during rendering. The clamp currently computes the bottom position before accounting for that skipped row, so one body row can remain unfilled even though a preceding result is available. The settings renderer then pads the body to its fixed height, exposing the reported empty line above the search input.

## Goals / Non-Goals

**Goals:**

- Fill the search-results viewport through its last body row when real results are available.
- Preserve the final setting, sticky section context, and the existing ruled search footer.
- Keep scrollbar position, thumb geometry, wheel navigation, and keyboard end navigation derived from the same effective layout.

**Non-Goals:**

- Remove intentional spacers between sections away from the viewport boundary.
- Change search filtering, selection, footer dimensions, title scrolling, or settings presentation.
- Introduce a settings-only visual patch that disagrees with shared list geometry.

## Decisions

### 1. Correct the grouped-list layout at the geometry boundary

Adjust the shared grouped-list bottom-layout calculation so a section spacer consumed by the outgoing sticky heading does not also consume viewport capacity. The resulting clamped scroll position and visible row indexes must describe one coherent viewport rather than rendering first and hiding the discrepancy with settings-specific padding.

A settings-only removal of the final blank rendered line is rejected because it would leave selection reveal, wheel limits, and scrollbar geometry based on a different extent than the rows on screen.

### 2. Preserve intentional spacing and sticky context

Apply the correction only when the layout already treats a spacer at the scroll boundary as represented by an outgoing sticky heading. Spacers between sections remain visible during ordinary traversal, and the sticky heading remains the context row at the top of the viewport.

Removing spacer rows from filtered data is rejected because it would alter section rhythm throughout search and could change jump and selection indexes.

### 3. Bind the fix at component and settings-screen levels

Add a focused shared-list case whose previous bottom clamp produces a boundary spacer and an underfilled viewport. Add settings-screen coverage that opens search, reaches the end by wheel and `Ctrl+End`, and verifies that the final result is immediately above the input's top rule while the scrollbar remains at the bottom with valid geometry.

A screenshot-only assertion is rejected because it would not identify whether list extent, rendered rows, and rail geometry agree.

## Risks / Trade-offs

- **[Risk] Changing shared clamping could move other grouped lists by one row at the end.** → Restrict the correction to the consumed boundary-spacer case and cover ordinary top, middle, and bottom layouts.
- **[Risk] Filling the row could make the rail disagree with the visible end.** → Assert the corrected clamp and rendered indexes together, then verify settings rail placement after wheel and keyboard navigation.
- **[Risk] Very short panes may have no usable result row.** → Retain exact-height behavior and test constrained geometry separately from the ordinary overflowing case.

## Migration Plan

No data or settings migration is required. Deploy the geometry correction and regressions together. Rollback restores the prior shared-list clamp and its trailing search gap without affecting persisted settings.

## Implementation Evidence

- Shared grouped-list layout now backfills otherwise unused bottom capacity from the outgoing section when its boundary spacer is represented by the sticky heading, while retaining the clamped end position.
- Focused component and settings-screen coverage passes with 90 assertions, including wheel navigation to the final setting, immediate adjacency to the search rule, a bottom-positioned thick scrollbar thumb, and reference-screen compatibility.
- Strict OpenSpec validation, the supported build, and TypeScript typechecking pass on the implementation worktree.
- Physical-terminal confirmation remains pending under task 3.2.
