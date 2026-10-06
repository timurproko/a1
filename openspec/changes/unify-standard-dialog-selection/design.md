## Context

The supplied captures show weak selection treatment in three bare-A1 standard selectors and the slash-command menu. Models and Skills assemble rows directly, while Thinking Level and autocomplete delegate row layout to Pi TUI's `SelectList`. The new Resume Session reference establishes the desired palette: blue `selectedBg`, normal text for the selected label, muted metadata, and an accent cursor. Models, Skills, Thinking Level, and the command menu must retain their existing `→` rather than adopt Resume Session's `›`.

The surfaces have different row content. Models combines scope and active-state markers with an identifier and provider badge. Skills has a command label and a separate selected description below the list. Thinking Level aligns a level, current marker, default marker, and description in one row. The command menu aligns command names and descriptions. Selection styling must not flatten those semantic roles or alter interaction state.

## Goals / Non-Goals

**Goals:**

- Give Models, Skills, Thinking Level, and the slash-command menu the Resume Session selection palette while preserving their existing arrow.
- Limit the highlight to the rendered item span without wrapping or exceeding narrow terminals.
- Keep text, descriptive, success, dim, and muted roles legible on the blue background.
- Establish a reusable owned rendering boundary and focused style tests for future maintenance.

**Non-Goals:**

- Changing options, ordering, search, filters, keybindings, selection/default/scope persistence, counters, descriptions, or dialog lifecycle.
- Restyling generic extension prompts, session/resume, trust, startup trust, Settings applications, or the explicit `a1 pi` comparison profile.
- Changing theme color definitions or replacing the Session Tree's specialized hierarchy and horizontal viewport.

## Decisions

### 1. Treat Resume Session as the palette contract

A selected owned row will preserve its accent `→`, render its primary selectable label in normal `text`, retain muted supporting text and existing semantic state colors, and apply `selectedBg` only around the rendered item span. It will not fill unused content width or bold the complete row. Unselected rows keep their current appearance.

Adopting Resume Session's `›` icon or full-width geometry was rejected because the request is for its color scheme, while the established standard-dialog and command-menu arrow and the prior item-bounded decision remain authoritative. The lower-intensity purple `customMessageBg` was rejected after visual review in favor of the supplied blue selection reference.

### 2. Centralize width-safe selected-row painting

An owned dialog-row helper/component will receive already-semantic row fragments and the render width, truncate them with ANSI-aware utilities, and apply the background only to the resulting item span. The helper will not discover selection by inspecting rendered text, add trailing selected cells, or own dialog state or input dispatch.

Each dialog will continue to assemble its own domain-specific fragments. Models retains scope and active markers, Skills retains `skill:<name>`, and Thinking retains its aligned level/current/default/description columns. This keeps behavioral controllers specialized while sharing only the visual invariant.

Duplicating `theme.bg("selectedBg", ...)` in each component was rejected because direct `Text` children do not share a clipping invariant and would drift on truncation. Padding the highlight to the frame edge was rejected because unused dialog space is not part of the selected item. Rewriting final rendered dialog rows by matching `→` was rejected because rendered-string substitution is not a semantic component boundary.

### 3. Adapt Thinking without changing its controller behavior

Thinking Level will preserve its authoritative item list, filtering, selected value, focus propagation, wrap navigation, Enter selection, Space default persistence, and aligned columns. Its row presentation will pass through the owned selected-row boundary so the same clipped item-span background contract applies to its composite row.

Replacing the full Thinking workflow was rejected. Any small owned list adapter must delegate or reproduce only the existing `SelectList` row/navigation behavior required to expose the semantic selected row, with tests proving unchanged filtering and actions.

### 4. Apply the same semantic palette to the command menu

The bare-A1 editor theme will style selected slash-command rows with an accent `→`, a normal-text command label, a muted aligned description, and the shared `selectedBg` painter. Pi's `SelectList` already emits only the rendered item span, so this adds no trailing selected cells. The explicit comparison profile continues to receive the pinned Pi theme unchanged.

### 5. Pin semantic roles and geometry, not RGB snapshots

Focused tests will assert the `selectedBg` role, accent arrow, normal-text primary label, muted descriptions, retained success/dim markers, absence of bold selection, absence of trailing selected cells, and bounded narrow rendering. Existing behavioral tests remain authoritative for actions and state changes; shell-level coverage will verify that the dialogs and command menu still open and transition normally.

Literal RGB snapshots were rejected because themes and terminal color modes legitimately resolve semantic roles differently. Plain-text snapshots alone were rejected because they cannot detect the missing selection background.

## Risks / Trade-offs

- **[Background styling changes visible row width]** → Never pad selected rows; clip the semantic item first and verify the highlighted span ends with the final visible item cell.
- **[Nested ANSI foreground resets drop the background]** → Apply background after semantic fragments are assembled and assert representative cells across the full Models and Thinking rows.
- **[Thinking list adaptation changes navigation or filtering]** → Keep its existing state transitions and add focused wrap, filter, Enter, Space, and selected-value regressions around the styled renderer.
- **[Theme colors evolve]** → Bind the contract to semantic roles (`selectedBg`, accent arrow, text primary, muted description, no bold) rather than literal RGB values.

## Migration Plan

No persisted data or configuration migration is required. The presentation helper and three dialog adaptations can be rolled back together without changing sessions, model scope, thinking defaults, skills, or keybindings.
