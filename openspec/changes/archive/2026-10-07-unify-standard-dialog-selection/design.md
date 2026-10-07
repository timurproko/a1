## Context

The supplied captures show inconsistent selection treatment across three bare-A1 standard selectors, Resume Session, Session Tree, the Settings screen, and the slash-command menu. Models and Skills assemble rows directly, while Thinking Level and autocomplete delegate row layout to Pi TUI's `SelectList`. Resume Session establishes the desired blue `selectedBg` palette, but a later hierarchy alignment left its full-row selection purple; its selected title also needs the checkmark-green success role without becoming bold. Session Tree's first blue-palette refinement forced selected entry labels to white and erased role colors. Every surface must keep its existing arrow, ordinary text weight, and intended foreground roles.

The surfaces have different row content. Models combines scope and active-state markers with an identifier and provider badge. Skills has a command label and a separate selected description below the list. Thinking Level aligns a level, current marker, default marker, and description in one row. Session Tree combines hierarchy, entry labels, role labels, descriptions, and clipped-edge markers. Settings aligns labels, values, optional steppers, and structured sub-dialog rows. The command menu aligns command names and descriptions. Selection styling must not flatten those semantic roles or alter interaction state.

## Goals / Non-Goals

**Goals:**

- Give Models, Skills, Thinking Level, Resume Session, Session Tree, Settings, and the slash-command menu one blue selection treatment while preserving existing arrows, text weight, and semantic foregrounds.
- Limit the highlight to the rendered item span without wrapping or exceeding narrow terminals.
- Keep text, descriptive, success, dim, and muted roles legible on the blue background.
- Establish a reusable owned rendering boundary and focused style tests for future maintenance.

**Non-Goals:**

- Changing options, ordering, search, filters, keybindings, selection/default/scope persistence, counters, descriptions, or dialog lifecycle.
- Restyling generic extension prompts, trust, startup trust, other session workflows, or the explicit `a1 pi` comparison profile.
- Changing theme color definitions or replacing the Session Tree's specialized hierarchy and horizontal viewport.

## Decisions

### 1. Treat Resume Session as the palette contract

A selected owned row will preserve its existing cursor, ordinary text weight, and supporting text while applying `selectedBg`. Models, Skills, Thinking Level, Settings, and command autocomplete use an accent `→` with a normal-`text` primary label. Session Tree retains its item-specific foreground roles; Resume Session uses the success-green role for its selected title and muted metadata. Selection will not introduce bold styling. Item-bounded surfaces will not fill unused content width; Resume Session retains its established full-row geometry. Unselected rows keep their current appearance.

Adopting Resume Session's cursor icon or full-width geometry elsewhere was rejected because the request is for its visual clarity, while each covered surface's established arrow and the prior item-bounded decision remain authoritative. The lower-intensity `customMessageBg` role was rejected after visual review in favor of `selectedBg`; Resume Session keeps full-row geometry but now uses that blue role too.

### 2. Centralize width-safe selected-row painting

An owned dialog-row helper/component will receive already-semantic row fragments and the render width, truncate them with ANSI-aware utilities, and apply the background only to the resulting item span. The helper will not discover selection by inspecting rendered text, add trailing selected cells, or own dialog state or input dispatch.

Each dialog will continue to assemble its own domain-specific fragments. Models retains scope and active markers, Skills retains `skill:<name>`, and Thinking retains its aligned level/current/default/description columns. This keeps behavioral controllers specialized while sharing only the visual invariant.

Duplicating `theme.bg("selectedBg", ...)` in each component was rejected because direct `Text` children do not share a clipping invariant and would drift on truncation. Padding the highlight to the frame edge was rejected because unused dialog space is not part of the selected item. Rewriting final rendered dialog rows by matching `→` was rejected because rendered-string substitution is not a semantic component boundary.

### 3. Adapt Thinking without changing its controller behavior

Thinking Level will preserve its authoritative item list, filtering, selected value, focus propagation, wrap navigation, Enter selection, Space default persistence, and aligned columns. Its row presentation will pass through the owned selected-row boundary so the same clipped item-span background contract applies to its composite row.

Replacing the full Thinking workflow was rejected. Any small owned list adapter must delegate or reproduce only the existing `SelectList` row/navigation behavior required to expose the semantic selected row, with tests proving unchanged filtering and actions.

### 4. Apply the same semantic palette to the command menu

The bare-A1 editor theme will style selected slash-command rows with an accent `→`, a normal-text command label, a muted aligned description, and the shared `selectedBg` painter. Pi's `SelectList` already emits only the rendered item span, so this adds no trailing selected cells. The explicit comparison profile continues to receive the pinned Pi theme unchanged.

### 5. Change only Session Tree's selected palette

Session Tree will replace its purple `customMessageBg` selection with blue `selectedBg`, retain the accent `→`, and preserve each entry's existing foreground roles when selected. User, assistant, system, tool, bash, error, entry-label, timestamp, and description colors therefore remain identical as selection moves. Hierarchy, horizontal clipping, and selected ellipsis coverage remain unchanged.

Adopting Resume Session's full-width geometry was rejected: the tree keeps its established visible-fragment highlight and specialized horizontal viewport.

### 6. Remove selection-only bold from Resume Session

Resume Session uses the blue `selectedBg` full-row background, accent `→` cursor, success-green selected title, muted metadata, and existing result-row geometry. Selection does not wrap the title in bold; delete confirmation retains the error role instead of success green.

The owned Resume Session frame also omits its component-level leading spacer. A retained prompt-adjacent command notice is therefore separated from the dialog's top rule by the shell's single empty row, matching the notice-to-editor spacing after the dialog closes instead of adding a second empty row. Internal title, content, footer, and rule spacing remains unchanged.

Changing Resume Session search, scope, sort, rename/delete, navigation, or result-row geometry was rejected.

### 7. Reuse the owned Settings highlight boundary

The shared Settings list row and structured-value panel will keep their existing `→`, render selected labels as normal `text`, retain muted values and pointer affordances, and pass only the rendered item through the theme's `highlight` role. The Pi-backed Settings route maps that role to `selectedBg`, so list rows, structured rows, and existing floating choices share the blue surface without padding it across unused screen width.

Changing Settings navigation, values, scrolling, filtering, pointer regions, or persistence was rejected because this refinement is presentation-only.

### 8. Pin semantic roles and geometry, not RGB snapshots

Focused tests will assert the `selectedBg` role, accent arrow, normal-text primary label, muted descriptions, retained success/dim markers, absence of bold selection, absence of trailing selected cells, and bounded narrow rendering. Existing behavioral tests remain authoritative for actions and state changes; shell-level coverage will verify that dialogs, Settings, Session Tree, and the command menu still open and transition normally.

Literal RGB snapshots were rejected because themes and terminal color modes legitimately resolve semantic roles differently. Plain-text snapshots alone were rejected because they cannot detect the missing selection background.

## Risks / Trade-offs

- **[Background styling changes visible row width]** → Never pad selected rows; clip the semantic item first and verify the highlighted span ends with the final visible item cell.
- **[Nested ANSI foreground resets drop the background]** → Apply background after semantic fragments are assembled and assert representative cells across Models, Thinking, Settings, and Session Tree rows.
- **[Thinking list adaptation changes navigation or filtering]** → Keep its existing state transitions and add focused wrap, filter, Enter, Space, and selected-value regressions around the styled renderer.
- **[Theme colors evolve]** → Bind the contract to semantic roles (`selectedBg`, accent arrow, text primary, muted description, no bold) rather than literal RGB values.

## Migration Plan

No persisted data or configuration migration is required. The selection-treatment adaptations can be rolled back together without changing sessions, settings values, model scope, thinking defaults, skills, or keybindings.
