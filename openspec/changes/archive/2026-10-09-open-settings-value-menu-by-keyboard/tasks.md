# Tasks

## 1. Open scalar menus from the keyboard

- [x] 1.1 Route Enter on an editable enumerated scalar Settings row through the existing value-menu opening path without writing a value.
- [x] 1.2 Initialize keyboard-opened menus on the current effective choice while preserving its value marker and the pointer-opened inactive state.
- [x] 1.3 Give a keyboard-opened menu's source value the existing pointer-hover foreground and clear that synthetic state when the menu closes.
- [x] 1.4 Preserve structured dialogs, numeric stepping, closed-menu Left/Right adjustment, undo, menu anchoring, and existing pointer behavior.

## 2. Cover the keyboard menu workflow

- [x] 2.1 Add focused coverage proving the opening Enter writes nothing and renders the current effective choice active and checked.
- [x] 2.2 Prove keyboard opening brightens the source value like pointer opening and every keyboard-origin close restores its ordinary role.
- [x] 2.3 Add focused coverage for Up/Down navigation, Escape cancellation, and Enter confirmation through the owning backend.
- [x] 2.4 Retain regression coverage for pointer-opened menus having no initial active row and for specialized numeric and structured controls.

## 3. Validate the delivered behavior

- [x] 3.1 Run focused Settings tests, repository typechecking, archived-change validation through finalization, and whitespace checks permitted by policy; record exact results and any known-gap disposition in implementation evidence.
- [x] 3.2 Build the interactive candidate and hand off a color-preserving `/settings` check covering Enter open, current-choice selection, source-value brightness, arrow navigation, Escape cancellation, and Enter confirmation.
