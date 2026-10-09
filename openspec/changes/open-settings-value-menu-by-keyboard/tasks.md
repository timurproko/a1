# Tasks

## 1. Open scalar menus from the keyboard

- [x] 1.1 Route Enter on an editable enumerated scalar Settings row through the existing value-menu opening path without writing a value.
- [x] 1.2 Initialize keyboard-opened menus on the first declared choice while preserving the independent effective-value marker and pointer-opened inactive state.
- [x] 1.3 Preserve structured dialogs, numeric stepping, closed-menu Left/Right adjustment, undo, menu anchoring, and existing pointer behavior.

## 2. Cover the keyboard menu workflow

- [x] 2.1 Add focused coverage proving the opening Enter writes nothing and renders the first choice active independently of the effective choice.
- [x] 2.2 Add focused coverage for Up/Down navigation, Escape cancellation, and Enter confirmation through the owning backend.
- [x] 2.3 Retain regression coverage for pointer-opened menus having no initial active row and for specialized numeric and structured controls.

## 3. Validate the delivered behavior

- [x] 3.1 Run focused Settings tests, repository typechecking, strict OpenSpec validation, and whitespace checks permitted by policy; record exact results and any known-gap disposition in implementation evidence.
- [x] 3.2 Build the interactive candidate and hand off a color-preserving `/settings` check covering Enter open, initial first-choice selection, arrow navigation, Escape cancellation, and Enter confirmation.
