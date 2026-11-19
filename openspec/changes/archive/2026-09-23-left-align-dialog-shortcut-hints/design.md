## Context

See `proposal.md` for motivation. The shared semantic hint renderer accepts a caller-selected indent, while Pi modal producers can also apply horizontal padding through their `Text` container. Several current surfaces use the content-row convention of two leading cells for their shortcut row even though their title begins at column zero or one. The visible mismatch is especially clear in Thinking Level: `Thinking Level` starts at the frame edge, list rows reserve two cells for the selection marker, and the footer incorrectly follows those rows instead of the heading.

The recently integrated shared shortcut presentation already inventories top-level, nested, extension-hosted, startup, and full-screen surfaces. It owns key/action roles, display casing, whitespace-only entry separation, and ANSI-safe width behavior. This refinement changes only placement. The explicit `a1 pi` route remains a pinned comparison profile.

## Goals / Non-Goals

**Goals:**
- Give each shortcut-bearing bare-A1 dialog one horizontal chrome edge shared by its heading and shortcut row.
- Keep list markers, field labels, search inputs, descriptions, and editor bodies at their existing content insets.
- Make alignment explicit and testable across the existing modal inventory, including narrow-width and wrapped rows.
- Preserve the isolated pre-resource trust prompt and every existing semantic shortcut style.

**Non-Goals:**
- Force every dialog heading to absolute terminal column zero or remove a surface's established one-cell heading inset.
- Change shortcut wording, key assignments, entry order, semantic colors, separators, wrapping policy, or clipping policy.
- Restyle ordinary footer/status/help rows outside dialog ownership.
- Change modal transitions, focus, selection, persistence, or the pinned comparison profile.

## Decisions

### 1. Align to the surface heading, not to a global column

For each dialog, define the first visible heading/title cell as its chrome left edge. The first visible shortcut-hint cell will begin at that same display column. A dialog with a one-cell title inset keeps one cell on both rows; a dialog whose title starts at the frame edge places the hint there too. This satisfies the requested visual relationship without flattening established dialog composition.

Using absolute column zero everywhere was rejected because extension-hosted and full-screen surfaces intentionally inset their titles. Following the selectable-row prefix was rejected because it reproduces the current mismatch.

### 2. Keep semantic formatting independent from geometric placement

The shared formatter continues to own shortcut capitalization, key/action roles, omission, ordering, and spacing between entries. Surface composition owns one horizontal placement value and applies it consistently to heading and hint. Where a component framework already supplies `Text` padding, the hint text will not add a second hidden indent; direct-render surfaces will use their declared chrome inset exactly once.

This avoids embedding dialog-specific geometry in semantic entries and prevents double indentation from string prefixes plus container padding.

### 3. Cover every dialog branch through the existing inventory

Update the inventory-backed coverage to assert heading/hint start-column equality for every shortcut-bearing bare-A1 node or route, including Models, Thinking, Skills, tree and session nested editors, project trust, extension selector/input/editor, authentication flows, Settings structured panels, and Changelog/Hotkeys reference screens. Surfaces whose rows wrap retain the heading edge on each continuation according to their existing wrapping policy; narrow clipping remains ANSI-safe.

The pre-resource trust selector keeps its fixed-color implementation but removes its content-oriented hint inset. The `a1 pi` constructors continue to instantiate pinned components and are excluded from this alignment customization.

### 4. Preserve content geometry and behavior

Only shortcut-row leading placement changes. Selection-marker columns, search/editor width, list/value alignment, pointer regions, borders, spacers, viewport height, and dialog lifecycle remain unchanged. Focused render tests will compare title and hint display columns as well as representative complete frames so accidental content movement or row-count changes fail.

## Risks / Trade-offs

- **[Removing a string indent leaves a framework inset in place]** → Measure visible display columns after all container padding and assert equality with the heading, rather than testing raw strings alone.
- **[A broad replacement moves content rows]** → Change only shortcut-row placement and retain representative full-frame snapshots for lists, nested inputs, and full-screen dialogs.
- **[Wrapped hints restart at an inconsistent column]** → Preserve each surface's wrap strategy while asserting continuation placement follows its declared chrome edge.
- **[Startup alignment pulls in themed code]** → Keep the trust prompt's fixed-color path isolated and test its emitted ANSI output directly.
- **[Comparison parity drifts]** → Exercise bare A1 and `a1 pi` separately and retain the installed-package identity checks.

## Migration Plan

No persisted-data migration is required. Land placement updates and focused coverage atomically. Rollback restores the previous hint indents without affecting settings, sessions, keybindings, or installed Pi packages.
