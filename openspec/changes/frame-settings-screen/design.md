## Context

See `proposal.md` for motivation and `specs/owned-ui-settings/spec.md` for the visual contract. The settings app currently gives its full rectangle to list content plus a variable footer. Its first visible row comes from list top padding, section headers use the generic accent role, and mouse/scrollbar coordinates assume the list begins at screen row zero. The owned theme seam exposes border and accent roles but no semantic heading role. The `What's New` presentation already establishes the desired visual palette: border-colored rules, an accent title, and Markdown headings.

## Goals / Non-Goals

**Goals:**

- Compose the settings frame from semantic theme roles already represented by the active Pi theme.
- Keep every list and footer interaction aligned after fixed header and divider rows reduce the list rectangle.
- Make exact frame geometry and ANSI roles directly assertable without relying on a physical terminal screenshot.

**Non-Goals:**

- Change settings inventory, values, persistence, navigation, search semantics, footer wording, menus, or dialogs.
- Restyle the session transcript, reference screens, pinned selectors, or the `a1 pi` comparison surface.
- Hard-code RGB escape sequences or make dark-theme colors apply unchanged to every custom/light theme.

## Decisions

### 1. Compose a settings-owned frame around the shared list and footer

The settings app will reserve fixed rows for a full-width top rule, an inset title, and a full-width content/footer divider. The list layout will receive only the remaining body height, while the existing footer remains responsible for status, search, and structured-dialog content. The title and rules will be rendered directly from the owned theme seam and fitted to the pane width.

This keeps list rendering, menus, dialogs, inputs, and status lines in the shared component layer while letting the application own the meaning and placement of its screen chrome. Reusing the read-only reference-screen app was rejected because its document scrolling and input lifecycle are incompatible with the interactive settings list.

### 2. Add an owned semantic heading role mapped to the active theme's Markdown heading

Extend the vendor-neutral owned UI theme token set with `heading`. The Pi-backed theme adapter will map it to Pi's `mdHeading` color, while plain/test themes continue to supply it through the existing `fg` seam. `renderGroupHeader` will use the heading role and bold weight; border rules continue to use `border`, and the main title uses `accent`.

Using `warning` was rejected because section names are hierarchy, not warning state. Hard-coding the dark theme's yellow was rejected because it would break custom and light themes. Mapping to `mdHeading` deliberately aligns the section color with the yellow `### Added` headings in the supplied `What's New` reference.

### 3. Make the list origin explicit in every screen-coordinate calculation

Define the fixed header height once and use it when recording visible row placements, scrollbar track origin, pointer lookup, menu anchors, and footer/dialog boundaries. Scrolling and sticky headers continue to operate in list-local coordinates; conversion to screen coordinates happens only where a pointer or overlay placement needs it. The rendered composition remains top rule, title, list body, divider rule, then active footer, finalized to the exact pane rectangle.

Duplicating ad hoc offsets in individual input branches was rejected because search, wheel, rail drag, menus, and structured dialogs would drift independently. Keeping the old body height and simply prepending rows was rejected because it would overflow the pane and hide footer content.

### 4. Verify semantic roles and geometry at component and screen levels

Focused tests will use the naming theme to assert `border`, `accent`, and `heading` roles independently of concrete ANSI bytes, and the Pi-backed route will assert those roles resolve to the expected dark-theme colors. Settings fixtures will cover ordinary, overflowing/sticky, search, menu, structured-dialog, pointer, scrollbar, narrow-width, and short-height frames. Existing behavior assertions remain unchanged except for their expected vertical coordinates.

A screenshot-only test was rejected because it would not distinguish a correct-looking hard-coded color from the required theme semantics and would provide weak diagnostics for geometry regressions.

## Risks / Trade-offs

- **[Risk] Fixed chrome leaves fewer rows for settings on short terminals.** → Recompute layout from the reduced body height and preserve exact frame finalization for degenerate sizes.
- **[Risk] Existing pointer tests encode the former zero-row list origin.** → Centralize the origin and verify visible-row, rail, menu, and dialog hit testing after the shift.
- **[Risk] A custom theme's heading is not literally yellow.** → Use the theme's `mdHeading` semantic role; the built-in dark theme matches the requested yellow while custom themes retain authority over their palette.
- **[Risk] Footer-owned rules can visually sit near the new divider in search/dialog states.** → Preserve shared footer composition and test the complete state rather than altering its established controls as part of this visual-only change.

## Migration Plan

No stored settings or user data migration is required. Deploy the presentation and theme-seam additions together. Rollback removes the fixed chrome and heading role use without changing persisted values or engine settings.
