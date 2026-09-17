## 1. Settings

- [ ] 1.1 Declare `quitAnimation` (`Exit animation`, boolean, default `true`, live) at the head of the owned declarations in a `Generic` section, and narrow `quitEffect` to `fall`, `dissolve`, `starburst`, `waves`; verify declaration tests pin the id order, the `Generic` section, the boolean default, and the four animation choices.
- [ ] 1.2 Advance the owned settings version to 6 with a migration that maps a stored `quitEffect` of `off` to `quitAnimation: false` and removes the stored effect, passing every other document through; verify migration tests cover the `off` mapping, an unchanged non-`off` document, and the contiguous chain ending at 6.
- [ ] 1.3 Verify section and settings-screen tests show `Generic` as the first section with the `Exit animation` row, `Quit` offering only animation choices, and section jumps addressing sections by id rather than position.

## 2. Quit Integration

- [ ] 2.1 Add `enabled` to `OwnedUiQuitOutroSettings`, drop `off` from `OwnedUiQuitEffect`, read `quitAnimation` in the composition snapshot, and gate `#captureQuitOutroFrame` on `enabled`; verify the session-shell quit fixture that previously used an `off` effect now uses a disabled toggle and still proves a single alternate-screen leave with no paint, and that an enabled toggle with the default effect plays the outro.

## 3. Validation

- [ ] 3.1 Run the focused owned-settings, settings-conformance, settings-screen, session-shell quit, and composition scopes plus typechecking; record passing evidence or explicitly disposition every observed gap before finalization.
- [ ] 3.2 Hand off the exact built candidate for a physical check that the `Generic` section opens first, toggling `Exit animation` off returns to the terminal immediately on `/quit` and the second `Ctrl+C`, and toggling it back on restores the effect; record the outcome.
