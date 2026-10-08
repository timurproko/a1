# Tasks

## 1. Simplify value and status presentation

- [x] 1.1 Render scalar Settings rows from the selected/stored value only, remove inline effective/application decoration, and verify focused tests cover pending, completed, and reopened deferred states.
- [x] 1.2 Keep declaration-derived shortcut guidance after successful scalar, structured, and undo operations while preserving failure notices, and verify focused tests cover each outcome.

## 2. Keep Settings content scrollable behind dialogs

- [x] 2.1 Route mouse-wheel input over Settings content through the existing configured scroll policy before the structured-dialog pointer barrier, while continuing to consume clicks and wheel input outside the content area.
- [x] 2.2 Add focused interaction coverage proving the list scrolls behind an unchanged open structured dialog and non-wheel pointer reports remain blocked.

## 3. Integration validation

- [x] 3.1 Run the focused Settings tests and repository typecheck permitted by policy, then record exact results and any known-gap disposition in implementation evidence.
- [x] 3.2 Build the interactive candidate and hand off a color-preserving `/settings` check covering concise deferred values, stable shortcut guidance, failure feedback, and wheel scrolling with a structured dialog open.
