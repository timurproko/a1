## 1. Presentation

- [x] 1.1 Make `renderListRow` derive the value role from pointer hover alone (muted at rest, plain when pointed at) while the cursor and label keep the selection accent; verify list-view tests assert a selected value is muted at rest, unpainted on hover, and never accent, and that they fail against the current accent value.
- [x] 1.2 Add a settings-screen test that renders through a naming `UiTheme` and asserts the selected row's label carries the accent, its value carries the muted role, and a pointer report over the value brightens it without the accent.

## 2. Parity and Provenance

- [x] 2.1 Rework the pinned settings presentation parity test to keep byte parity for the unselected row and the selected row's cursor-and-label prefix, and to assert the owned selected value is muted while the pinned one is accent, in every parity colour mode and width.
- [x] 2.2 Name the selected-value presentation as a declared product difference in `docs/architecture/ui-reference-provenance.md` and in the `settings-app.ts` entry of `config/baselines/pi-session-shell-provenance.json`; verify provenance and docs governance checks pass.

## 3. Validation

- [x] 3.1 Run the list-view, settings-screen, pinned settings parity, provenance governance, and docs governance scopes plus typechecking; record passing evidence or explicitly disposition every observed gap before finalization.
- [x] 3.2 Hand off the exact built candidate for a physical check that the selected row shows a cyan label with a grey value that brightens under the pointer; record the outcome.
