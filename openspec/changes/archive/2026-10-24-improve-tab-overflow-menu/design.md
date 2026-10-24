## Context

The resident host calculates `StripFrame.hidden_tabs` in `roles/strip.rs` and passes that list to `Popup::overflow` in `core/attach/mod.rs`. The first implementation lists all shown tabs and checks visible chips, duplicating what the strip already displays. The refined interaction needs a menu of only undrawn tabs and a stable replacement for the previously viewed chip when selecting one. A bottom-positioned popup draws rows above the strip; its pointer-to-action mapping must continue to match physical rows after the number of menu items changes. A separate A1 footer path uses a dim `…` for truncated usage, but path/PR-badge truncation still uses `...`, and the usage width allocation can sacrifice the entire model name to fit the left side.

## Decisions

### Show only undrawn tabs without changing tab identity

Build the popup from the current strip frame's hidden IDs, in tab order. Remove checkmarks: every menu row is a tab without a drawn chip, even if that tab is viewed in an extremely narrow terminal where no chip fits. Each row reserves a one-cell status-icon slot plus one separator cell before the name. Use the same status glyph as the strip, including animation and semantic color when available; render one blank icon cell for an idle tab. Clip names by grapheme display width without allowing icon styling to bleed into text, shortcut, hover, or neighboring rows; keep popup hit width and anchor within the terminal. Keep stable ID actions and the existing keyboard, hover, clipping, dismissal, and overlay rules. Recompute rows after topology, width, or view changes and close the popup when nothing is hidden; never send a view action for a removed tab. The overflow trigger remains available only while hidden tabs exist.

### Preserve narrow-strip geometry

Retain the existing width allocation, no-wrap behavior, viewed-chip priority when feasible, trailing `+`, single-column `…` glyph, and strip muted foreground. For a hidden-tab selection, reserve its chip in the position occupied by the previously viewed chip when the previous chip was drawn and both cannot fit. Prefer retaining all other drawn chips; if a resize or minimum width prevents that, retain the viewed chip where feasible and use the existing geometry fallback. Do not reorder the registry or alter the global tab sequence to achieve a client-local visible-chip swap. Test very narrow widths explicitly rather than assuming a chip always fits.

### Map bottom popup clicks to visual rows

Derive bottom popup pointer normalization from the same terminal-row calculation used to draw each visible popup row, rather than independently counting rows from the strip. Account for clamping when the popup has more items than available body rows, and leave top-strip and keyboard selection unchanged. Bind each row action to its stable tab ID; test clicking a named hidden row after hover and verifying it selects that exact tab rather than the first. Repeat after a swap changes the popup's row count and after a resize/reorder. Test a popup after a resize/reorder and ensure no entry outside the displayed rows can act on a different tab.

### Make every A1 footer truncation marker semantic and reserve the model

Use one Unicode ellipsis cell in the semantic dim role in both A1 footer path and usage truncation, including the path/branch prefix before the complete PR badge and tiny-width fallback. Preserve hyperlink termination and the existing PR-badge reservation policy. For the A1 usage row, omit optional provider first, then allocate enough right-hand space for the full model name when it fits, clipping left usage with the dim single-cell marker before clipping model text. Show a thinking-level suffix only when space remains without truncating the model; retain its distinct level color. At widths too narrow for the model itself, truncate safely to available width. Scope changes to the A1 profile, update the copied-component provenance ledger, and retain Pi comparison behavior and ordinary-width rendering.

## Verification approach for implementation

Add focused Rust popup/strip/attach tests for hidden-only ordered rows without checkmarks, their reserved icon slot and live glyph/color, replacing a previously viewed visible chip while retaining other chips when possible, row-count and hover refresh, resize and reorder transitions, named bottom-row click identity, removal, and extreme widths. Add focused TypeScript footer tests for both path and usage single-cell dim markers, model retention at constrained widths, adjacent ANSI style boundaries, tiny widths, ordinary-width unchanged behavior, and linked PR badges. Run only the touched tests and typecheck locally before pushing; CI owns full validation after implementation readiness.

## Scope boundaries

No tab visibility setting, pinning, new menu-opening shortcut, active-tab marker, new glyph design, global footer redesign, or change to Windows Terminal chrome is included. The swap affects only the resident A1 strip; it does not reorder tabs in the shared registry.
