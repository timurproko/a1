## Why

A successful model-catalog refresh currently leaves the full `Model catalogs refreshed.` sentence at the bottom of the Models dialog for as long as the dialog remains open. This makes a completed background action look persistent and consumes a body row for feedback that only needs brief acknowledgement.

## What Changes

- Replace the persistent bottom success sentence with a transient `(refreshed)` marker immediately after the Models title state.
- Automatically remove the success marker after a short bounded interval while keeping the dialog open and its model, query, selection, scope, and dirty state unchanged.
- Keep in-progress refresh feedback and actionable timeout/failure details in the dialog body; a simultaneous `(unsaved)` marker remains visible independently of the transient refresh acknowledgement.
- Clear refresh-dismissal timers when the dialog is disposed so a closed or replaced dialog cannot request a later render.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Refine successful Models-dialog refresh feedback from a persistent body sentence to a transient title marker without changing catalog refresh or scope-management behavior.

## Impact

- Models-dialog presentation and lifecycle behavior in `src/integrations/pi/components/models-dialog.ts` and its owned component boundary.
- Focused component and shell tests for title composition, timed dismissal, warning retention, and disposal.
- No changes to model refresh execution, authenticated catalog authority, CLI refresh output, comparison-profile presentation, dependencies, or public package APIs.
