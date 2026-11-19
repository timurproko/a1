## Why

Model selection and Ctrl+P scope management are split across `/model` and `/scoped-models`, forcing users to switch between two different dialogs for one model-management workflow. A single `/models` surface can make the active model and its cycling scope visible and editable together, following the proven interaction from `D:/Backups/pi/v2`.

## What Changes

- **BREAKING**: Replace the built-in `/model` and `/scoped-models` commands with one `/models` command; the removed command names are not retained as aliases.
- Open one searchable Models dialog that supports `all` and `scoped` filters, Enter to switch the active model, Space to add or remove the selected model from scope, and Ctrl+S to persist scope changes.
- Show the active-model checkmark immediately after the `[provider]` badge.
- Show `(unsaved)` immediately after the `Models` title whenever the in-dialog scope differs from the last saved scope, and clear it after a successful save.
- Route model-selection actions and command arguments into the unified dialog while preserving refresh, authentication, selection, status, cancellation, and session-scope behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Replace separate model-selection and scope-management routes with the unified `/models` dialog and define its interaction, state, refresh, save, and presentation behavior.
- `ui-shortcuts`: Keep model selection discoverable through `/models` and route any explicitly configured model-selection binding to the unified dialog.
- `custom-session-viewport`: Preserve viewport/modal and transient model-switch notice behavior under the renamed unified command and dialog.
- `isolated-regression-testing`: Require regression evidence to advertise `/models` when model selection has no effective shortcut.

## Impact

- Affects Pi workflow route declarations, capability controllers, slash-command autocomplete, model-selection dispatch, shell dialog composition, model scope persistence, and model-related status handling.
- Replaces the separate pinned model and scoped-model components at the bare-A1 route with an A1-owned unified component based on the v2 reference behavior; the `a1 pi` comparison profile remains unchanged.
- Updates focused component, engine, shell, modal-inventory, command-outcome, shortcut-help, and viewport tests, snapshots, fixtures, documentation, and source/provenance declarations that name `/model` or `/scoped-models`.
- Adds no external dependency.
