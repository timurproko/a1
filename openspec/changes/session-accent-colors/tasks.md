## 1. Ordered seven-color palette

- [ ] 1.1 Define the shared ordered inventory blue, green, orange, pink, purple, cyan, grey and extend the neutral accent contract.
- [ ] 1.2 Add appearance-aware neutral grey and its semantic projection, previews, and generated progress palette forms.
- [ ] 1.3 Add focused tests for ordering/default, grey neutrality/contrast, appearance and terminal-mode projection, previews, and generated palette consistency.

## 2. Independent blue-start session color

- [ ] 2.1 Route Accent color through authoritative session-local settings state without writing or importing the legacy profile value.
- [ ] 2.2 Preserve session color through shared refresh and unrelated writes while retaining existing shared behavior for other settings.
- [ ] 2.3 Start interactive bare A1 blue and reset only on successful active-session replacement; preserve the old color on failure.
- [ ] 2.4 Keep Settings sections, effective values, live theme/background application, cancel, and undo consistent with the session-local state.
- [ ] 2.5 Add focused settings/composition/lifecycle tests for same-profile peer isolation, legacy values, reload/write isolation, blue start/reset, failed replacement, and pinned comparison behavior.

## 3. External session color API

- [ ] 3.1 Add always-JSON CLI inventory/get/set commands without an output-format flag, with explicit external session targeting, exact shell-environment targeting, help, and capability discovery.
- [ ] 3.2 Implement bounded identity-checked local runtime request handling and applied-value acknowledgement through the same settings change path.
- [ ] 3.3 Reject malformed, stale, stopped, ambiguous, replaced, unverifiable, and comparison targets; expire timed-out requests and release runtime records on disposal.
- [ ] 3.4 Document stable request/response/error shapes, exit codes, color identifiers/order/default, lifecycle semantics, and Herdr integration examples.
- [ ] 3.5 Add focused CLI/runtime tests and a two-runtime integration fixture for default JSON success/error output, targeting/isolation, acknowledgement, invalid colors/selectors, concurrent writes, timeout non-application, replacement, and disposal.
