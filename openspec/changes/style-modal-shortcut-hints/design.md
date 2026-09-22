## Context

See `proposal.md` for motivation. Modal instruction rows are assembled in several ways today: public `keyHint`/`rawKeyHint` calls already distinguish dim keys from muted action text, while owned Models, Thinking, session, tree, and startup surfaces also build whole-line strings or fixed ANSI text. Separators vary between two spaces, `·`, and `•`. The modal transition inventory defines the source-reachable built-in and extension-hosted surface set, and the pre-resource trust prompt cannot depend on the post-trust theme or component graph. The `a1 pi` route remains the pinned comparison profile and must not inherit this A1 customization.

## Goals / Non-Goals

**Goals:**
- Make the Skills footer the visual reference for every bare-A1 modal shortcut row: dim shortcut, muted action name, and two spaces between adjacent entries.
- Keep shortcut labels derived from each surface's effective keybindings and preserve platform-aware labels.
- Cover top-level and nested modal branches through one inventory-backed rule, including narrow-width behavior and theme invalidation.
- Preserve the startup trust boundary with a byte-light equivalent of the same semantic roles.

**Non-Goals:**
- Restyle non-modal startup help, transcript/status text, the session footer, or `/hotkeys` tables.
- Remove punctuation that is part of an action description or ordinary prose rather than a separator between shortcut entries.
- Change key assignments, modal wording, modal geometry, or controller transitions.
- Modify installed Pi package files or alter the `a1 pi` comparison presentation.

## Decisions

### 1. Represent a hint row as semantic entries

Introduce ordered semantic entries containing a shortcut label and action name. The A1 UI component layer and Pi component adapter each expose a thin boundary-local renderer for that same shape because architecture policy forbids either presentation layer importing the other. Both paint shortcuts with the existing dim key role, action names with the muted text role, and join entries with exactly two unstyled spaces; shared behavioral tests lock the two renderers to the same policy. Entries with no effective key are omitted unless the surface intentionally supplies a keyless instruction such as `type to search`.

This keeps color boundaries and separators structural instead of relying on replacing rendered strings. Continuing to concatenate pre-styled strings at each call site or crossing presentation-layer boundaries for code reuse was rejected because either choice permits drift or violates the dependency policy.

### 2. Adapt every bare-A1 modal producer at its ownership boundary

Use the modal transition inventory and modal construction routes to enumerate shortcut-bearing surfaces. Owned and source-synchronized components will consume the shared semantic formatter directly. Public package components used by bare A1 will be wrapped or minimally source-synchronized at the existing A1 component boundary where their instruction rows cannot be configured; installed dependency bytes will not be patched. The pinned `a1 pi` factories continue to instantiate public pinned components.

This is broader than changing the obvious Models and Thinking dialogs, but avoids claiming “all modals” from a few snapshots. A terminal-output postprocessor was rejected because ANSI-aware text rewriting is fragile, cannot reliably distinguish separators from prose, and violates the owned presentation boundary.

### 3. Keep layout behavior with chunk-aware width handling

The shared presentation will expose entry boundaries so modal components can truncate or wrap without splitting ANSI sequences or counting style bytes. Existing surfaces that intentionally use one clipped row remain clipped; multiline help surfaces continue wrapping at entry boundaries. Removing a one-cell separator glyph is a presentation change, not permission to alter border placement, indentation, or viewport height beyond the natural wrapping reduction.

### 4. Preserve startup isolation with equivalent tokens

The pre-resource project-trust prompt will use its existing fixed dim and muted ANSI constants to render the same key/action distinction and two-space grouping. It will not import the themed Pi component helper, preserving the rule that no project resource is consulted before trust is resolved.

### 5. Make completeness testable

Focused semantic-role tests will assert separate key/action ANSI roles and absence of `·`/`•` separators for representative selector, searchable, nested confirmation, editor/input, and startup surfaces. An inventory-backed audit will ensure each shortcut-bearing bare-A1 modal node is either covered by the shared formatter or explicitly has no shortcut row. Existing interaction tests remain the authority for effective bindings and lifecycle behavior.

## Risks / Trade-offs

- **[Public Pi components hardcode their own hint rows]** → Adapt them only behind existing A1 factories, keep source provenance, and leave comparison-profile constructors untouched.
- **[A broad punctuation search changes prose such as `default` annotations or regex help]** → Convert typed hint separators, not arbitrary rendered middle dots, and retain punctuation inside action text.
- **[Narrow terminals wrap differently after structural formatting]** → Preserve each surface's clipping/wrapping policy and add width-focused snapshots with ANSI-safe measurements.
- **[The Pi renderer grows the eager startup graph]** → Keep it in the already-reachable theme façade, re-pin only the measured source-byte total (151 files / 1,442,925 bytes), and use the isolated fixed-color equivalent for pre-resource trust.
- **[Theme changes leave pre-baked colors stale]** → Compute role styling during render or rebuild styled child content during invalidation, following the TUI invalidation contract.

## Migration Plan

No stored-data migration is required. Land the shared presentation and modal adaptations atomically; rollback restores the prior per-surface hint construction without affecting settings, keybindings, or sessions.
