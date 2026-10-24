## Context

The resident host calculates `StripFrame.hidden_tabs` in `roles/strip.rs` and passes that list to `Popup::overflow` in `core/attach/mod.rs`. The popup currently iterates only those hidden IDs and marks the viewed tab; since the viewed chip normally stays on the strip, that mark does not describe visibility. A separate A1 footer path uses `truncateToWidth(..., "...")` for a usage-line left segment before dimming its output. The screenshot shows that marker bright white at narrow widths.

## Decisions

### Represent visibility without changing tab identity

Use the current strip frame's visible tab hits (or a derived visible-ID set) to build the overflow popup from the full ordered tab registry whenever overflow exists. Render `✓` only for tab IDs that have a visible chip in the current strip frame. Do not use the viewed tab as a proxy for visibility: the user may see multiple tabs, and some narrow widths can hide any particular tab. Keep the existing stable ID action per row and use the same popup navigation, hover, clipping, dismissal, and overlay rules. Refresh or dismiss stale popup rows when topology or width changes; never send a view action for a removed tab. If there is no overflow, do not expose the chooser.

### Preserve narrow-strip geometry

Retain the existing width allocation, no-wrap behavior, viewed-chip priority when feasible, trailing `+`, single-column `…` glyph, and strip muted foreground. The popup's checkmark does not reserve strip cells; it represents the chips actually drawn, not all open tabs or active selection. Test very narrow widths explicitly rather than assuming a chip always fits.

### Make the A1 footer truncation marker semantic

Use one Unicode ellipsis cell for the truncated usage segment and paint it in the same dim role as the adjacent A1 footer text. Keep the result display-width-bounded and ANSI-safe, including a colored context segment or right-hand thinking-level name. Scope any change in the pinned-component adaptation to the A1 profile and update the component's deviation/provenance notes if required; retain comparison Pi behavior and current path/badge hyperlink truncation policy.

## Verification approach for implementation

Add focused Rust popup/strip/attach tests for full ordered menu membership, multiple checked visible tabs, hidden tabs unchecked, resize and reorder transitions, selection of hidden entries, removal, and extreme widths. Add focused TypeScript footer rendering tests for single-cell dim marker, adjacent ANSI style boundaries, and ordinary-width unchanged behavior including linked PR badges. Run only the touched tests and typecheck locally before pushing; CI owns full validation after implementation readiness.

## Scope boundaries

No tab visibility preference, tab pinning, new menu-opening shortcut, active-tab marker, global footer redesign, or change to the Windows Terminal chrome is included. The visible/hidden checkmark meaning is specific to the resident A1 strip, not the operating system's own tab bar.
