## Context

The hotkeys source serves two presentations. `createPiShellHotkeys()` supplies pinned in-feed Markdown for `a1 pi`; bare A1 supplies rows to `ReferenceScreenApp`. Settings already models sections as shared `ListRow` groups, lays them out with `layoutList()`, paints them through `renderGroupHeader()`, and pins the active group header. The first hotkeys candidate instead postprocessed rendered Markdown by matching five literal labels. That produced adjacency and semantic accent styling, but duplicated section knowledge, could not pin the active section, and raised the startup graph above its source-byte budget.

The requested refinement is that a sectioned read-only view should opt into the same reusable grouped-row UX rather than implement label-specific color, spacing, and scrolling rules.

## Goals / Non-Goals

**Goals:**
- Give every bare-A1 shortcut section the exact shared header treatment and sticky behavior used by Settings.
- Keep section headings adjacent to their table rows.
- Expose generic structured section data so future reference documents can reuse the behavior without hardcoded names.
- Remove the failed candidate's rendered-text scan from the startup graph.

**Non-Goals:**
- Make changelog prose sectioned or pin the `Keyboard Shortcuts` screen title.
- Restyle table cells or arbitrary Markdown headings.
- Change bindings, extension shortcut collection, ordering, wrapping, or the `a1 pi` presentation.

## Decisions

### 1. Reuse grouped-row layout as the section component

Use the existing grouped-list rows and layout directly. A sectioned reference document maps its title to a group row, each rendered table row to a read-only note row, and inter-section separation to a spacer; its own screen title remains a prelude note. A layout option suppresses Settings' opening padding for an embedded document while preserving the current default. `layoutList()` supplies clamping and sticky headers, while `renderGroupHeader()` remains the single styling authority, so Settings and hotkeys cannot drift in color or emphasis.

A second bespoke section widget was rejected because `ListRow`, `layoutList()`, and `renderGroupHeader()` already are the shared component requested; the missing piece is structured input at the reference boundary.

### 2. Keep section identity structured across the adapter boundary

Refactor the hotkeys generator into ordered `{ title, markdown }` sections. The pinned in-feed presenter joins those sections back into its existing bold-heading Markdown bytes. The bare-A1 composition renders each section's table Markdown independently and passes typed sections to `ReferenceScreenApp`; no rendered row is parsed and no section title is matched by presentation code.

`ReferenceScreenApp` continues its flat-row path for changelog. Its optional sectioned path uses shared grouped layout, paints ordinary/sticky headers through `renderGroupHeader()`, and includes the section rows in existing keyboard, wheel, and scrollbar geometry.

### 3. Prove pinning, theming, and profile isolation

Component tests cover padding-free grouped layout without changing Settings defaults. Reference-screen tests cover a section header becoming sticky and yielding to the next section. Presenter/composition tests cover fixed and optional hotkeys sections, accent semantics, direct header-to-table adjacency, and unchanged pinned in-feed output.

## Risks / Trade-offs

- **[Independent table rendering changes wrapping]** -> Compare every plain section row with the equivalent rows from the shared source at representative widths.
- **[Sticky rows skew scroll geometry]** -> Derive visibility, maximum scroll, and scrollbar content length through the shared layout and test keyboard, wheel, and end navigation.
- **[A generic API leaks Pi types]** -> Keep section records vendor-neutral; Pi Markdown rendering stays in the adapter and grouping/style stay in A1 UI components.
- **[Startup graph grows again]** -> Remove rendered-text scanning and run architecture validation before handoff.

## Migration Plan

Restore the finalized change to active form, replace the first candidate in the same branch and PR, and let trusted finalization regenerate the archive and canonical specification. No stored data migration is required.

## Implementation Evidence

- Six focused grouped-layout, reference-screen, composition, shell-presenter, route, and prompt-input files passed 98 tests.
- Source typechecking, TypeScript build compilation, strict OpenSpec validation, and the architecture boundary check passed.
- Startup reachability is 1,434,497 source bytes, 39 bytes below the protected maximum; the rendered-row label scanner from the first candidate is absent from the eager graph.
- The full architecture command proceeds past startup, product identity, and architecture boundaries, then encounters the target branch's pre-existing stale pinned-source-ledger hash for `pi-coding-agent:src/core/keybindings`. The unchanged primary `develop` checkout produces the same failure, so this change neither edits nor suppresses that unrelated governance evidence; exact-head CI remains blocked until the target baseline is repaired and reconciled.
- The local complete package build remains unable to link the unchanged native process guardian because this machine lacks Visual Studio C++ tools and the Windows SDK; direct TypeScript candidate compilation succeeds.
