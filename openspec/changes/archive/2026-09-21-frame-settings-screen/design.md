## Context

See `proposal.md` for motivation and `specs/owned-ui-settings/spec.md` for the visual contract. The settings app currently gives its full rectangle to list content plus a variable footer. Its first visible row comes from list top padding, section headers use the generic accent role, and mouse/scrollbar coordinates assume the list begins at screen row zero. The owned theme seam exposes border and accent roles but no semantic heading role. The `What's New` presentation already establishes the desired visual palette: border-colored rules, an accent title, and Markdown headings.

## Goals / Non-Goals

**Goals:**

- Compose the settings frame from semantic theme roles already represented by the active Pi theme.
- Keep every list and footer interaction aligned while the title scrolls below a fixed top rule and the footer remains fixed.
- Make exact frame geometry and ANSI roles directly assertable without relying on a physical terminal screenshot.

**Non-Goals:**

- Change settings inventory, values, persistence, navigation, search semantics, footer wording, menus, or dialogs.
- Restyle the session transcript, reference screens, pinned selectors, or the `a1 pi` comparison surface.
- Hard-code RGB escape sequences or make dark-theme colors apply unchanged to every custom/light theme.

## Decisions

### 1. Compose a settings-owned frame around the shared list and footer

The settings app will permanently reserve one row for the full-width top rule and initially reserve one more for the inset title. Once list scroll is positive, only the title disappears and the list expands upward beneath the fixed rule. The ordinary full-width content/footer divider and status remain fixed. During search, the established shared input keeps its top rule, prompt, and bottom rule; its top rule takes the ordinary divider's place so the divider is not duplicated. The title and settings-owned rules use the owned theme seam and fit the pane width.

This keeps list rendering, menus, dialogs, inputs, and status lines in the shared component layer while letting the application own the meaning and placement of its screen chrome. Reusing the read-only reference-screen app was rejected because its document scrolling and input lifecycle are incompatible with the interactive settings list.

### 2. Add an owned semantic heading role mapped to the active theme's Markdown heading

Extend the vendor-neutral owned UI theme token set with the existing cross-theme `mdHeading` role. The Pi-backed theme adapter can pass that role through directly, while plain/test themes continue to supply it through the existing `fg` seam. `renderGroupHeader` will use the heading role and bold weight; border rules continue to use `border`, and the main title uses `accent`.

Using `warning` was rejected because section names are hierarchy, not warning state. Hard-coding the dark theme's yellow was rejected because it would break custom and light themes. Mapping to `mdHeading` deliberately aligns the section color with the yellow `### Added` headings in the supplied `What's New` reference.

### 3. Make the list origin explicit in every screen-coordinate calculation

Define the fixed top-rule height, optional title height, and one-column list inset once, then derive the current list origin from title visibility. Use that origin when recording visible row placements, scrollbar track origin, pointer lookup, menu anchors, and footer/dialog boundaries. At scroll zero the ordinary composition is top rule, title, inset list body, divider, then footer. At positive scroll the active section pins directly below the still-visible rule while the divider/footer stays fixed. The rail has no extra top inset, so it begins at the top of whichever list rectangle is visible. Search substitutes the shared input's top rule for the divider. Every composition finalizes to the exact pane rectangle.

Duplicating ad hoc offsets in individual input branches was rejected because search, wheel, rail drag, menus, and structured dialogs would drift independently. Keeping the old body height and simply prepending rows was rejected because it would overflow the pane and hide footer content.

### 4. Verify semantic roles and geometry at component and screen levels

Focused tests will use the naming theme to assert `border`, `accent`, and `heading` roles independently of concrete ANSI bytes, and the Pi-backed route will assert those roles resolve to the expected dark-theme colors. Settings fixtures will cover ordinary, overflowing/sticky, search, menu, structured-dialog, pointer, scrollbar, narrow-width, and short-height frames. Existing behavior assertions remain unchanged except for their expected vertical coordinates.

A screenshot-only test was rejected because it would not distinguish a correct-looking hard-coded color from the required theme semantics and would provide weak diagnostics for geometry regressions.

## Risks / Trade-offs

- **[Risk] The optional title leaves one fewer row at scroll zero and changes height when it scrolls away.** → Reserve the top rule independently, recompute layout from current title visibility, and preserve exact frame finalization for degenerate sizes.
- **[Risk] Pointer and rail tests encode one fixed list origin.** → Derive the origin from title visibility and verify visible-row, rail, menu, and dialog hit testing before and after scrolling.
- **[Risk] A custom theme's heading is not literally yellow.** → Use the theme's `mdHeading` semantic role; the built-in dark theme matches the requested yellow while custom themes retain authority over their palette.
- **[Risk] Search prompt chrome can duplicate the settings divider.** → Keep the shared ruled input intact but omit the settings-owned divider while search is active, so the input's top rule occupies that boundary.
- **[Risk] A horizontal inset can desynchronize visible values from pointer and menu columns.** → Add the inset at settings composition time and include it in recorded screen coordinates.

## Migration Plan

No stored settings or user data migration is required. Deploy the presentation and theme-seam additions together. Rollback removes the fixed chrome and heading role use without changing persisted values or engine settings.

## Implementation Evidence

- Strict OpenSpec validation passes for this refined change.
- Typechecking passes under supported Node 24 after the build generated the TypeScript distribution.
- Focused settings, list/menu component, route-host, terminal-color, owned-run, workflow, and pinned-row tests pass (89 assertions), covering aligned content/guidance, the restored ruled search component, the fixed top rule, the title scrolling away, section-only pinning, and a top-origin scrollbar.
- Startup architecture, product-identity, and package-identity checks pass locally after recovering the 14-byte startup budget reported by the first exact-head run. The chained local architecture command then reaches a CRLF-sensitive pinned-source hash mismatch on this Windows checkout even though the tracked blobs are unchanged; renewed clean exact-head CI remains authoritative for the ledger check.
- The supported local build completed environment validation, cleaning, TypeScript compilation, and Pi metadata/startup generation, then stopped at the unchanged native process-guardian build because this host has no MSVC linker or Windows SDK; Git's unrelated `link.exe` is the only linker on `PATH`. The first exact-head run built successfully, and renewed exact-head CI remains the authoritative final supported-toolchain evidence.
