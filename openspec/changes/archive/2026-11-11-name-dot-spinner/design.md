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

## Implementation and Evidence

- The settings formatter presents the internal current choice as dots in both the row and dropdown. Declaration order is current, circle, diamond, square, none; default resolution and rendering code are unchanged.
- Focused settings-app tests cover aligned animated previews, cancellation and timer cleanup, every existing saved selection, accepting dots and reloading its persisted representation, and bidirectional row cycling.
- Passed 130 tests across test/ui/settings/declarations.test.ts, test/ui/settings/manager.test.ts, and test/features/owned-ui/settings-app.test.ts using the pinned local dependencies.
- Passed npm run build, npm run typecheck, strict OpenSpec validation for name-dot-spinner, and git diff --check.
- Initial exact-head CI passed affected unit owners and rendering validation, but finalized delivery validation reported delivery-artifact-missing because the planning artifacts lacked .openspec.yaml. Added the required spec-driven change metadata to the existing archive; trusted automation will regenerate its manifest and validate the repaired candidate.
- No known implementation gaps. Interactive manual validation remains optional; required exact-head CI is owned by trusted automation.
