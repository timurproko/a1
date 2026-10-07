## Context

See `proposal.md` for motivation. The shared semantic shortcut renderer already paints a supplied `key` with the quiet key role, display-capitalizes it, and paints its `action` with the muted action role. Models and Session Tree now provide the split typing guidance, while Skills, Thinking Level, and Resume Session expose searchable inputs but omit that guidance from their semantic footers.

## Goals / Non-Goals

**Goals:**
- Represent typing guidance structurally as the pseudo-key `Type` and action `search` on all five bare-A1 searchable dialog surfaces.
- Keep each surface's existing semantic renderer and responsive layout behavior.
- Verify both visible wording and separate ANSI roles.

**Non-Goals:**
- Changing the shared renderer, physical keybindings, search behavior, or input presentation.
- Restyling prose that mentions typing outside semantic shortcut rows.
- Changing the pinned `a1 pi` comparison profile.

## Decisions

### Use an explicit pseudo-key rather than special-case text styling

Models, Skills, Thinking Level, and Resume Session will declare `{ key: "Type", action: "search" }`; Session Tree's help declaration carries the same semantic distinction through its existing adapter. The explicit display-case cue is necessary because shared key normalization preserves unrecognized multi-letter labels; this lets the established formatter produce `Type search` and the correct role boundary without adding string matching or a renderer exception.

Keeping `type to search` and splitting it into styled substrings was rejected because `to` is not part of the requested wording and would preserve a one-off grammar. Adding a global renderer rule for keyless text was rejected because other keyless instructions remain legitimate action prose.

### Keep surface-local layout policies

Models will continue using its clipped one-line footer with a reserved close suffix. Skills and Thinking Level will prepend one semantic entry to their existing one-line rows, Resume Session will prepend it to the first of its two ordinary footer rows, and Session Tree will continue wrapping complete help items at entry boundaries. Existing entries keep their relative order and every surface retains its narrow-width ownership.

## Risks / Trade-offs

- **[`type` is a typing cue rather than a physical key]** → Treat it as intentional semantic shortcut data only on searchable dialogs and cover the exact wording and role split in focused tests.
- **[The five searchable dialog declarations could drift again]** → Assert `Type search` and its role boundary in each focused component suite and retain the cross-surface specification.

## Migration Plan

No data migration is required. Apply the declaration and expectation updates atomically; rollback restores the prior keyless phrases without affecting user state.
