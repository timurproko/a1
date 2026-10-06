## Context

See `proposal.md` for motivation. Bare A1 has two trust presentations with different constraints. The startup selector runs before trust resolution and therefore uses a self-contained ANSI renderer that cannot import the post-trust theme or component graph. The in-session `/trust` selector runs inside the owned Pi component layer and already uses semantic theme roles and the shared modal frame, but its status lines are styled as one muted span and its list reserves a two-cell saved-marker slot even when no marker exists.

The shared dialog family resolves the built-in dark theme to accent violet, border blue, normal text, muted text, and dim shortcut-key roles. Its compact modal geometry places the bottom rule immediately after the shortcut component; no extra spacer belongs below that row.

## Goals / Non-Goals

**Goals:**
- Make both bare-A1 trust surfaces visibly belong to the existing standard dialog family.
- Preserve the pre-resource import and data boundary while matching the standard fixed dark-theme roles.
- Make list markers and status-value emphasis structural and independently testable.
- Keep focused tests sensitive to ANSI roles, visible spacing, and exact row geometry.

**Non-Goals:**
- Changing trust outcomes, persistence, default policy, ancestor inheritance, key dispatch, or startup restoration.
- Making pre-resource presentation configurable from a project theme.
- Restyling the `a1 pi` comparison surface or changing unrelated dialogs.

## Decisions

### 1. Mirror standard dark-theme roles in the isolated startup renderer

The startup renderer will retain local fixed ANSI constants but update them to the resolved colors used by the standard dark dialog family: accent for title and selected option, border for both full-width rules, normal text where emphasis is required, muted for explanatory/context text, and dim for shortcut keys. Its shortcut row will use the same concise key/action entry structure as ordinary dialogs (`↑↓ navigate`, `Enter select`, `Esc exit`) with two spaces between entries.

Importing the theme was rejected because trust must be decided before project-derived presentation can load. Keeping the older fixed colors was rejected because it is the visible inconsistency being corrected.

### 2. Compose in-session status lines from semantic spans

`Saved decision:` and `Current session:` remain muted labels. Their values, including inherited-path detail, will be emitted through the normal text role. The working-directory context remains muted. This follows the established `Label: value` hierarchy without changing wording or data.

Styling each complete line as normal text was rejected because labels would become too prominent; leaving each complete line muted was rejected because the decision itself is the information users need to scan.

### 3. Emit only marker spacing that has semantic content

The in-session selector will build each row from a selection prefix, an optional saved marker, and the label. A selected row with no saved marker will be exactly `→ <label>` in visible text. A matching saved row may render `✓ ` after the arrow or unselected indent, but nonmatching rows will not reserve an invisible marker slot.

Retaining a fixed marker column was rejected because it creates the reported multi-space gap. Removing the saved marker entirely was rejected because it communicates persisted state independently from selection.

### 4. Use the shared footer boundary without a trailing spacer

The in-session trust dialog will keep the shared semantic shortcut formatter and heading alignment, but its bottom rule will directly follow the shortcut component, matching Thinking and other compact standard dialogs. The startup renderer will likewise keep its hint directly adjacent to the bottom rule in preferred geometry.

Changing body spacing above the option list or shortcut row was rejected because the request concerns the extra space after the hints, not the dialog's content grouping.

### 5. Assert rendered roles and geometry, not only plain text

Focused tests will verify resolved ANSI colors for startup title, selected option, rules, and hint roles; visible one-space arrow geometry; independently styled status labels/values; and the absence of a blank row between hints and the bottom rule. Existing interaction and terminal-restoration tests remain in place to prove behavior did not change.

## Risks / Trade-offs

- **[Fixed startup colors can drift from a future built-in theme revision]** → Keep role values explicit and test them against the reviewed standard dark-dialog values; a future theme update must deliberately update the startup-safe mirror.
- **[Removing the empty marker slot changes option-label columns]** → Limit the change to trust rows and retain the check marker only where it carries saved-state meaning.
- **[Compact footer geometry could hide hints on short terminals]** → Preserve the existing bounded fallback order and add row-level assertions for preferred and constrained frames.
- **[ANSI assertions can become brittle]** → Assert semantic spans and visible row relationships only for the trust surfaces, while retaining plain-text interaction assertions.

## Migration Plan

No stored-data migration is required. Land both trust-surface presentation updates and focused tests together. Rollback restores the previous colors and spacing without changing trust records, session state, or resource-loading behavior.
