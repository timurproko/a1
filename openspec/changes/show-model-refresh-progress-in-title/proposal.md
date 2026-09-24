## Why

Opening the Models dialog currently consumes a body row with `Refreshing model catalogs…` before transitioning to the compact title acknowledgement. Routine refresh progress should use the same title area so the model list and footer are not interrupted by a non-actionable sentence.

## What Changes

- Show a muted `(refreshing)` marker beside the Models title while the automatic catalog refresh is running instead of rendering the full progress sentence in the body.
- Transition the title from `(refreshing)` to the existing success-colored `(refreshed)` acknowledgement when refresh succeeds, then dismiss `(refreshed)` on its existing bounded timer.
- Compose refresh state with `(unsaved)` without clearing dirty scope state, and remove `(refreshing)` when a timeout or failure replaces it with actionable warning details in the body.
- Keep model-catalog execution, timeout behavior, warning text, row reconciliation, and dialog-disposal safety unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Present routine Models-dialog refresh progress in the title while reserving the dialog body for actionable refresh failures.

## Impact

- Models-dialog refresh-state presentation in `src/integrations/pi/components/models-dialog.ts`.
- Focused component and shell coverage for initial progress, dirty-state composition, success transition, warning transition, and disposal.
- No changes to provider authentication, catalog refresh execution, CLI workflow output, comparison-profile model surfaces, dependencies, or public package APIs.
