## 1. Ordered seven-color palette

- [x] 1.1 Define the shared ordered inventory blue, green, orange, pink, purple, cyan, grey and extend the neutral accent contract.
- [x] 1.2 Add appearance-aware neutral grey and its semantic projection, previews, and generated progress palette forms.
- [x] 1.3 Add focused tests for ordering/default, grey neutrality/contrast, appearance and terminal-mode projection, previews, and generated palette consistency.

## 2. Saved default and independent current session color

- [x] 2.1 Add persisted Default color with blue fallback and rename the session-local accent setting Current color; present both ordered menus and their storage/application scopes.
- [x] 2.2 Preserve Current color through shared refresh, Default color changes, and unrelated writes; ignore and retain the legacy shared accent without importing it.
- [x] 2.3 Initialize Current color from the latest Default color on interactive startup and successful active-session replacement, including safe early appearance; preserve the old current color on failure.
- [x] 2.4 Keep Settings sections, stored/effective and pending values, live theme/background application, cancel, and undo consistent with each setting's scope.
- [x] 2.5 Add focused settings/composition/lifecycle tests for default persistence/fallback, default changes not recoloring live sessions, latest-default initialization, same-profile current-color isolation, legacy values, reload/write isolation, failed replacement, and pinned comparison behavior.

## 3. External session color API

- [x] 3.1 Add always-JSON CLI inventory/get/set commands without an output-format flag, with explicit external session targeting, exact shell-environment targeting, help, and capability discovery.
- [x] 3.2 Implement bounded identity-checked local runtime request handling and applied-value acknowledgement through the same settings change path.
- [x] 3.3 Reject malformed, stale, stopped, ambiguous, replaced, unverifiable, and comparison targets; expire timed-out requests and release runtime records on disposal.
- [x] 3.4 Document stable request/response/error shapes, exit codes, color identifiers/order, Default versus Current color lifecycle semantics, and Herdr integration examples; keep API get/set limited to Current color.
- [x] 3.5 Add focused CLI/runtime tests and a two-runtime integration fixture for default JSON success/error output, targeting/isolation, acknowledgement, invalid colors/selectors, concurrent writes, timeout non-application, replacement, and disposal.
