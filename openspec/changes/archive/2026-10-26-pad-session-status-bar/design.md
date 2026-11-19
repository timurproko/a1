# Design

## Context

`OwnedUiSessionShellRoot.#renderFooter()` chooses either the built-in `SessionFooter` or an extension-provided footer component and currently renders that component at the full terminal width. The built-in footer can produce path, usage/model, and merged extension-status rows. An extension `setFooter()` component can produce any number of rows and replaces the built-in footer. Applying padding inside `SessionFooter` would miss custom footers, while changing the extension API would make plugins responsible for a product-level layout rule.

## Goals / Non-Goals

**Goals:** Give every bare-A1 session status-bar row one blank terminal cell of left and right space; apply the same rule to built-in and extension-owned rows; preserve width-safe ANSI output, footer row count, selection ownership, and footer lifecycle; retain explicit Pi comparison bytes.

**Non-goals:** Changing footer text, colors, row ordering, extension status merging, custom footer factories, widgets, editor padding, transient working/status notices, Settings status lines, or the pinned `a1 pi` profile.

## Decisions

### 1. Apply the inset at the shared footer composition boundary

Keep footer components unaware of the outer product gutter. In bare A1, render the currently selected footer component against the inner width left after reserving one cell on each side, ANSI-safely bound every returned row to that inner width, and prefix the visible row with the left gutter. The unoccupied terminal cell after the bounded row is the right gutter. Because `#renderFooter()` is shared by the custom viewport dock and the pinned layout-part adapter, one rule covers built-in rows, merged extension statuses, and every custom footer row without changing plugin code.

### 2. Preserve comparison behavior and narrow-width safety

Gate the inset on the existing bare-A1/custom-viewport profile decision. The `a1 pi` comparison route continues rendering its footer at the full width with unchanged bytes. At widths that cannot contain two gutters plus content, retain the footer's row allocation but expose no content in an edge cell; no row may exceed the terminal width or leak ANSI state into another row.

### 3. Test through public extension and shell boundaries

Add focused shell coverage that inspects the visible terminal cells for the built-in path and usage rows, a merged `setStatus()` row, and every row of a multi-line `setFooter()` component. Assert one blank cell at both terminal edges after terminal-width projection, verify the custom footer receives the reduced width, cover tiny widths, and keep a comparison-profile assertion unchanged. Existing footer selection tests continue proving the rows remain selectable through the common dock geometry.

## Risks / Trade-offs

- **[Reducing width changes truncation sooner]** → This is intentional: footer content must fit inside the two gutters. Reuse each component's width-aware rendering and add constrained-width assertions.
- **[A custom component ignores its width argument]** → Bound each returned row ANSI-safely at the shell boundary before adding the left gutter.
- **[Tiny terminals cannot show content and two gutters]** → Prefer the requested gutters and stable row geometry over drawing content in an edge cell.
- **[Comparison parity regresses]** → Scope the wrapper to bare A1 and assert the pinned profile remains byte-compatible.
