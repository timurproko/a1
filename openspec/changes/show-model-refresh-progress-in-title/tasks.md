## 1. Models dialog refresh presentation

- [ ] 1.1 Add focused component coverage for `Models (refreshing)`, `Models (unsaved) (refreshing)`, absence of the full body progress sentence, transition to timed `(refreshed)`, retained warning details, and disposal without late rendering.
- [ ] 1.2 Map muted catalog-refresh status to title progress state while preserving success dismissal, warning-body presentation, title ordering, and existing dialog lifecycle cleanup.

## 2. Shell integration and handoff

- [ ] 2.1 Update shell refresh-flow coverage to verify the dialog opens with `(refreshing)`, preserves query/selection/scope state through success, transitions to `(refreshed)` and then no refresh suffix, and clears progress for failures and timeouts.
- [ ] 2.2 Run focused typechecking, Models-dialog and shell tests, build, and a color-preserving `/models` manual handoff; record implementation evidence and any known gap before finalization.
