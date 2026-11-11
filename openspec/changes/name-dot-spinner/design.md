## Context

Spinner style currently offers none, current, circle, diamond, and square. The existing current value already selects the dot animation and is the default/fallback.

## Decisions

- Use lowercase `dots` as the user-facing name, consistent with the other shape-based labels.
- Present choices in the order dots, circle, diamond, square, none for both dropdown navigation and row cycling.
- Retain `current` as the internal/persisted identifier and default. Translate it to dots in the shared settings value formatter so row, selected menu value, and menu options agree. Update descriptive help text accordingly.
- Do not reset explicit circle, diamond, square, or none selections. No settings migration or rendering change is necessary.

## Validation Plan

Focused declaration and settings-app tests cover order, initial/default display, saved current values, accepting dots, cancellation, and preservation of explicit selections. Existing manager tests continue to cover default/fallback and profile isolation. Run the typecheck and strict OpenSpec validation, without broad test suites.

## Risks

A display label must never replace the stored identifier when handling selection. Existing menu mapping must continue resolving labels to their original choice values, and preview rendering must continue receiving the internal style.
