## 1. Models dialog presentation

- [ ] 1.1 Add focused controlled-timer component coverage for progress, `Models (refreshed)`, `Models (unsaved) (refreshed)`, automatic dismissal, retained warning details, timer replacement, and disposal without a late render request; verify the Models-dialog test file passes.
- [ ] 1.2 Implement component-owned successful-refresh title state and one-second dismissal, including cancellation and disposal cleanup; verify success no longer renders the full body sentence while progress and warnings remain body statuses.

## 2. Shell integration and handoff

- [ ] 2.1 Update the shell refresh-flow coverage to assert the transient title marker, preserved query/selection/scope state, timed disappearance, warning retention, and safe late completion after close; verify the focused shell model test passes.
- [ ] 2.2 Run focused typechecking and affected Models-dialog/shell tests, then build and manually open `/models` to verify the successful marker appears beside the title and disappears while timeout/failure details remain readable; record any known gap before finalization.
