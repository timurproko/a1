## Context

See `proposal.md` for the requested visual change and the capability deltas for observable behavior. Bare A1 currently injects muted and accent style functions into the shared progress-frame presenter. The accent function both matches the cyan spinner and paints the moving two-grapheme text band. The pinned `a1 pi` profile bypasses that animated frame presenter.

## Goals / Non-Goals

**Goals:**

- Paint the moving progress-text band with the theme's neutral white text role.
- Keep the spinner in its existing accent role and all non-highlighted label content muted.
- Preserve the animation's current cadence, width, pause, grapheme boundaries, display geometry, and timer ownership.
- Preserve pinned-profile rendering.

**Non-Goals:**

- Changing spinner colour, status wording, punctuation, animation timing, or progress-state lifecycle.
- Adding a theme role, literal ANSI/RGB white, user setting, or terminal-capability branch.
- Modifying source-synchronized Pi status components or pinned comparison behavior.

## Decisions

### 1. Use the existing theme text role as white

The bare-A1 adapter will inject `piTheme().fg("text", value)` for the animated band. This is the established theme-aware neutral white foreground on dark themes and its corresponding readable foreground on light themes. The spinner remains `piTheme().fg("accent", spinner)`, while the rest of the label and ellipsis remain muted.

A literal white terminal colour was rejected because it would ignore theme adaptation and the existing requirement against literal terminal colours. Reusing accent was rejected because that is the cyan behavior the user asked to remove.

### 2. Name the neutral presenter style by function, not its former colour

The shared progress-frame style contract will describe the moving band as `highlight` rather than `accent`. This keeps the neutral component independent of Pi theme names and prevents callers or tests from treating spinner accent matching as part of the API. The frame algorithm itself remains unchanged.

Keeping the property named `accent` while passing white was rejected as misleading and likely to regress during later maintenance.

### 3. Verify style separation without changing animation mechanics

Focused tests will assert that the band uses the text role, differs from the accent spinner colour in the default theme, and still advances over muted text at the existing phase boundaries. Existing width, grapheme, pause, punctuation, pinned-profile, and disposal evidence remains applicable and will be retained.

## Risks / Trade-offs

- **[Risk] White may be interpreted as literal bright white.** → Use the theme's established `text` role so the highlight stays readable and theme-aware while appearing white in the default dark theme.
- **[Risk] A broad replacement could recolour the spinner too.** → Keep spinner and label style callbacks separate and assert their distinct roles.
- **[Risk] Renaming the style callback could miss a caller.** → Typecheck and focused component/shell tests cover all frame presenter call sites.

## Migration Plan

1. Rename the shared moving-band style callback from `accent` to `highlight` and update focused tests.
2. Inject the theme text role for bare-A1 animated labels while retaining the spinner's accent role.
3. Validate focused presentation, pinned-profile isolation, typechecking, and the exact candidate interactively.

Rollback is a normal commit revert. No data, settings, protocol, dependency, or migration state changes.
