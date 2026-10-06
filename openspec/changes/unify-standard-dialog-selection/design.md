## Context

The supplied captures show three bare-A1 standard selectors with the same weak selection treatment: Models and Skills assemble rows directly, while Thinking Level delegates row layout to Pi TUI's `SelectList`. All use an accent arrow and accent primary text, but none paints the selected row. The Session Tree redesign establishes the intended treatment: `customMessageBg` behind the visible selected span, an accent menu arrow and primary label, muted descriptive text, and no whole-row bolding.

The three dialogs have different row content. Models combines scope and active-state markers with an identifier and provider badge. Skills has a command label and a separate selected description below the list. Thinking Level aligns a level, current marker, default marker, and description in one row. Selection styling must not flatten those semantic roles or alter interaction state.

## Goals / Non-Goals

**Goals:**

- Give Models, Skills, and Thinking Level the same selected-row treatment as Session Tree.
- Make the highlight fill the available modal content width without wrapping or exceeding narrow terminals.
- Keep primary, descriptive, success, dim, and muted roles legible on the purple background.
- Establish a reusable owned rendering boundary and focused style tests for future maintenance.

**Non-Goals:**

- Changing options, ordering, search, filters, keybindings, selection/default/scope persistence, counters, descriptions, or dialog lifecycle.
- Restyling generic extension prompts, session/resume, trust, startup trust, Settings applications, autocomplete, or the explicit `a1 pi` comparison profile.
- Changing theme color definitions or replacing the Session Tree's specialized hierarchy and horizontal viewport.

## Decisions

### 1. Treat Session Tree as the visual contract

A selected standard-dialog row will begin with the accent `→`, render its primary selectable label in accent, retain muted supporting text and existing semantic state colors, and apply `customMessageBg` across the available content width. It will not bold the complete row. Unselected rows keep their current appearance.

Using `selectedBg` was rejected because the owned theme maps it to the stronger blue selection surface; the Session Tree intentionally uses the lower-intensity purple `customMessageBg`. Accent-only selection was rejected because it is the inconsistency reported in the captures.

### 2. Centralize width-safe selected-row painting

An owned dialog-row helper/component will receive already-semantic row fragments and the render width, truncate them with ANSI-aware utilities, pad the selected row to the available content width, and then apply the background. The helper will not discover selection by inspecting rendered text, and it will not own dialog state or input dispatch.

Each dialog will continue to assemble its own domain-specific fragments. Models retains scope and active markers, Skills retains `skill:<name>`, and Thinking retains its aligned level/current/default/description columns. This keeps behavioral controllers specialized while sharing only the visual invariant.

Duplicating `theme.bg("customMessageBg", ...)` in each component was rejected because direct `Text` children do not share a width-fill invariant and would drift on truncation. Rewriting final rendered rows by matching `→` was rejected because rendered-string substitution is not a semantic component boundary.

### 3. Adapt Thinking without changing its controller behavior

Thinking Level will preserve its authoritative item list, filtering, selected value, focus propagation, wrap navigation, Enter selection, Space default persistence, and aligned columns. Its row presentation will pass through the owned selected-row boundary rather than relying solely on `SelectListTheme.selectedText`, which does not paint unused row width.

Replacing the full Thinking workflow was rejected. Any small owned list adapter must delegate or reproduce only the existing `SelectList` row/navigation behavior required to expose the semantic selected row, with tests proving unchanged filtering and actions.

### 4. Pin semantic roles and geometry, not RGB snapshots

Focused tests will assert the background role, accent arrow/primary text, muted descriptions, retained success/dim markers, absence of bold selection, full available-width highlight, and bounded narrow rendering. Existing behavioral tests remain authoritative for actions and state changes; shell-level coverage will verify that the dialogs still open and transition normally.

Literal RGB snapshots were rejected because themes and terminal color modes legitimately resolve semantic roles differently. Plain-text snapshots alone were rejected because they cannot detect the missing selection background.

## Risks / Trade-offs

- **[Background padding changes visible row width]** → Pad only inside the width already supplied by the shared modal frame and verify every rendered row remains bounded at narrow widths.
- **[Nested ANSI foreground resets drop the background]** → Apply background after semantic fragments are assembled and assert representative cells across the full Models and Thinking rows.
- **[Thinking list adaptation changes navigation or filtering]** → Keep its existing state transitions and add focused wrap, filter, Enter, Space, and selected-value regressions around the styled renderer.
- **[The pending Session Tree branch evolves]** → Bind the contract to semantic roles (`customMessageBg`, accent primary, muted description, no bold) rather than copying unstable row internals.

## Migration Plan

No persisted data or configuration migration is required. The presentation helper and three dialog adaptations can be rolled back together without changing sessions, model scope, thinking defaults, skills, or keybindings.
