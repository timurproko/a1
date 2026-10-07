## Context

See `proposal.md` for motivation. Resume Session currently derives foreground styling from two independent concepts—keyboard selection and the active session path—but gives keyboard selection precedence by forcing the selected title to `success` and selected metadata to `muted`. Session Tree already demonstrates the desired invariant: semantic foreground fragments are assembled first, then `selectedBg` is painted without replacing those foregrounds.

The selector is an owned port of pinned Pi code, so its provenance note and focused ANSI-role tests must describe every deliberate presentation deviation. Existing full-width background composition reasserts the background after nested ANSI sequences and must remain intact.

## Goals / Non-Goals

**Goals:**

- Make selection affect only the Resume Session arrow and full-width background.
- Keep active-session identity visible in success green whether or not that row has keyboard focus.
- Preserve stable title and metadata foregrounds as focus moves.
- Retain deletion priority, width-safe background coverage, and current interaction behavior.

**Non-Goals:**

- Adding a checkmark glyph or changing the row's text, columns, padding, or arrow.
- Changing Session Tree or any other selector.
- Changing search, scope, filtering, sorting, rename/delete behavior, keybindings, or session persistence.
- Changing theme role definitions or literal colors.

## Decisions

### 1. Resolve semantic foregrounds independently of keyboard selection

The title role will follow state precedence: delete confirmation uses `error`, the active session uses `success`, a named session uses `warning`, and an ordinary unnamed session uses normal text. Metadata will use `error` during delete confirmation and its ordinary `dim` role otherwise. Keyboard selection will add the accent arrow and existing `selectedBg` painter only.

This mirrors Session Tree's composition model and ensures moving focus cannot mutate content colors. Keeping `success` on keyboard selection was rejected because it visually represents navigation as persisted state. Keeping the active session in `accent` was rejected because the requested active-state reference is the success-green checkmark role.

### 2. Retain the existing full-row background compositor

The ANSI-aware background reassertion helper will remain responsible for covering the complete fitted row, including padding after embedded foreground resets. The change will occur before that final background pass by removing selection from title and metadata role decisions.

Replacing the compositor or routing Resume Session through the item-bounded shared helper was rejected because this change does not alter the accepted full-width geometry and would expand presentation risk unnecessarily.

### 3. Test role stability across state transitions

Focused component assertions will compare representative title and metadata cells before and after moving selection. Coverage will distinguish active, named, ordinary, and delete-confirmation states, assert the accent arrow and `selectedBg`, and retain full-width and no-bold checks.

Plain-text snapshots or literal RGB assertions were rejected because neither proves semantic foreground stability across themes and terminal capabilities.

## Risks / Trade-offs

- **[Dim metadata may have insufficient contrast on the blue surface]** → The system theme already defines semantic `dim` contrast on `selectedBg`; test semantic roles rather than introducing a one-off selected role.
- **[Nested foreground escapes can clear the selected background]** → Keep the existing background reassertion helper and its full-row cell-count regression.
- **[Active and delete states can conflict]** → Preserve `error` as the highest-priority title and metadata state; current-session deletion remains behaviorally blocked.
- **[Copied-source documentation drifts]** → Update the provenance modification summary together with the implementation and role tests.

## Migration Plan

No persisted-data or configuration migration is required. Deploy the presentation and regression updates together. Rollback restores the prior selection-driven foreground branches without affecting sessions or settings.
