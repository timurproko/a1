## 1. Models dialog refresh presentation

- [x] 1.1 Add focused controlled-timer component coverage for `Models (refreshing)`, `Models (unsaved) (refreshing)`, absence of the full body progress sentence, a one-second minimum-visible interval, transition to timed `(refreshed)`, retained warning details, replacement, and disposal without late rendering.
- [x] 1.2 Map muted catalog-refresh status to title progress state and queue quick outcomes until the one-second minimum has elapsed while preserving success dismissal, warning-body presentation, title ordering, and dialog lifecycle cleanup.
- [x] 1.3 Extend the successful `(refreshed)` acknowledgement from one second to two seconds and update controlled-timer component and shell assertions for the exact boundary.

## 2. Shell integration and handoff

- [x] 2.1 Update shell refresh-flow coverage to verify the dialog starts a real background refresh, opens with `(refreshing)`, keeps quick completion visible for one second, preserves query/selection/scope state through success, transitions to `(refreshed)` and then no refresh suffix, and clears progress for failures and timeouts.
- [x] 2.2 Run focused typechecking, Models-dialog and shell tests, build, and architecture validation including the generated startup-graph baseline; prepare a color-preserving `/models` manual handoff and record implementation evidence and any known gap before finalization.
