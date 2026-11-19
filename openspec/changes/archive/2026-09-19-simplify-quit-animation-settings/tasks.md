## 1. Settings

- [x] 1.1 Remove the `quitEffect` and `quitEffectDurationMs` declarations, the `Quit` section constant, and the `QUIT_EFFECT_DURATIONS_MS` export, and relabel `quitAnimation` as `Quit animation` with a description naming the fall effect; verify declaration tests pin the id list without the two ids and the new label.
- [x] 1.2 Advance the owned settings version to 7 with a migration that deletes stored `quitEffect` and `quitEffectDurationMs` values and passes every other document through; verify migration tests cover both keys removed, an untouched document, a version-5 `off` document resolving to a disabled switch with no effect key, and the contiguous chain ending at 7.
- [x] 1.3 Verify section and settings-screen tests show the section order `Generic`, `Scroll`, `History`, `Agent` with a `Quit animation` row and no `Quit`, `Effect`, or `Duration` rows.

## 2. Quit Integration

- [x] 2.1 Narrow `OwnedUiQuitOutroSettings` to `enabled`, remove `OwnedUiQuitEffect` from the contract, read only `quitAnimation` in the composition snapshot, and have the session shell record fixed `fall` and 800 ms constants in the quit capture; verify session-shell quit tests use `{ enabled }` snapshots, the switched-off fixture still proves a single alternate-screen leave with no paint, and the enabled fixture plays the fixed fall plan for 800 ms.

## 3. Validation

- [x] 3.1 Run the focused owned-settings, settings-conformance, settings-screen, session-shell quit, and composition scopes plus typechecking; record passing evidence or explicitly disposition every observed gap before finalization.
- [x] 3.2 Hand off the exact built candidate for a physical check that the settings screen shows `Quit animation` under `Generic` and no `Quit` section, and that `/quit` plays the fall effect with the switch on and returns immediately with it off; record the outcome.
