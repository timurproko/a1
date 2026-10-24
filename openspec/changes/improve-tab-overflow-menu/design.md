## Context

The resident host calculates `StripFrame.hidden_tabs` in `roles/strip.rs` and passes that list to `Popup::overflow` in `core/attach/mod.rs`. The original popup iterated only hidden IDs and marked the viewed tab; the first implementation now lists all shown tabs and checks visible chips. A bottom-positioned popup draws rows above the strip, but the new five-row screenshot shows a click on the named second row activating another tab: the visual-row-to-action mapping must be proven against actual terminal coordinates, including pointer motion and resize. A separate A1 footer path uses a dim `…` for truncated usage, but path/PR-badge truncation still uses `...`, and the usage width allocation can sacrifice the entire model name to fit the left side.

## Decisions

### Represent visibility without changing tab identity

Use the current strip frame's visible tab hits (or a derived visible-ID set) to build the overflow popup from the full ordered tab registry whenever overflow exists. Render `✓` only for tab IDs that have a visible chip in the current strip frame. Do not use the viewed tab as a proxy for visibility: the user may see multiple tabs, and some narrow widths can hide any particular tab. Keep the existing stable ID action per row and use the same popup navigation, hover, clipping, dismissal, and overlay rules. Refresh or dismiss stale popup rows when topology or width changes; never send a view action for a removed tab. If there is no overflow, do not expose the chooser.

### Preserve narrow-strip geometry

Retain the existing width allocation, no-wrap behavior, viewed-chip priority when feasible, trailing `+`, single-column `…` glyph, and strip muted foreground. The popup's checkmark does not reserve strip cells; it represents the chips actually drawn, not all open tabs or active selection. Test very narrow widths explicitly rather than assuming a chip always fits.

### Map bottom popup clicks to visual rows

Derive bottom popup pointer normalization from the same terminal-row calculation used to draw each visible popup row, rather than independently counting rows from the strip. Account for clamping when the popup has more items than available body rows, and leave top-strip and keyboard selection unchanged. Bind each row action to its stable tab ID; add tests that click the second named entry from a five-row bottom popup after hover, and verify it selects that exact tab rather than the first. Test a popup after a resize/reorder and ensure no entry outside the displayed rows can act on a different tab.

### Make every A1 footer truncation marker semantic and reserve the model

Use one Unicode ellipsis cell in the semantic dim role in both A1 footer path and usage truncation, including the path/branch prefix before the complete PR badge and tiny-width fallback. Preserve hyperlink termination and the existing PR-badge reservation policy. For the A1 usage row, omit optional provider first, then allocate enough right-hand space for the full model name when it fits, clipping left usage with the dim single-cell marker before clipping model text. Show a thinking-level suffix only when space remains without truncating the model; retain its distinct level color. At widths too narrow for the model itself, truncate safely to available width. Scope changes to the A1 profile, update the copied-component provenance ledger, and retain Pi comparison behavior and ordinary-width rendering.

## Verification approach for implementation

Add focused Rust popup/strip/attach tests for full ordered menu membership, multiple checked visible tabs, hidden tabs unchecked, resize and reorder transitions, named bottom-row click identity, selection of hidden entries, removal, and extreme widths. Add focused TypeScript footer tests for both path and usage single-cell dim markers, model retention at constrained widths, adjacent ANSI style boundaries, tiny widths, ordinary-width unchanged behavior, and linked PR badges. Run only the touched tests and typecheck locally before pushing; CI owns full validation after implementation readiness.

## Scope boundaries

No tab visibility preference, tab pinning, new menu-opening shortcut, active-tab marker, global footer redesign, or change to the Windows Terminal chrome is included. The visible/hidden checkmark meaning is specific to the resident A1 strip, not the operating system's own tab bar.
