## 1. Align startup trust presentation

- [x] 1.1 Update the startup-safe trust renderer to mirror the standard dark dialog's accent, border, text, muted, and dim roles without importing post-trust presentation; verify focused ANSI assertions identify each role.
- [x] 1.2 Restructure the startup shortcut row as `↑↓ navigate`, `Enter select`, and `Esc exit` with two-space entry gaps and verify heading alignment, full-width rules, preferred footer adjacency, and constrained-terminal fallback.

## 2. Align in-session trust presentation

- [x] 2.1 Render saved-decision and current-session labels as muted spans with normal-text values, and verify exact styled boundaries for direct, inherited, trusted, and untrusted states.
- [x] 2.2 Remove saved-marker rendering so every selected option renders `→ <label>` with one space and the choice list never displays a checkmark; verify exact saved choices remain initially selected and status text retains persisted-state meaning.
- [x] 2.3 Remove the trailing footer spacer so the bottom rule immediately follows the shared shortcut row, and verify title, selection, border, shortcut roles, and complete rendered row geometry match standard dialogs.

## 3. Preserve behavior and delivery evidence

- [x] 3.1 Run focused startup-prompt and project-trust component/engine tests, source typechecking, strict OpenSpec validation, and applicable startup-graph checks; record results and any explicit known gap in implementation evidence.
- [x] 3.2 Build the interactive checkout and prepare a physical-terminal comparison covering first-launch trust, the in-session trust selector, short-terminal fallback, navigation, confirmation, exit/cancel, and unchanged `a1 pi` presentation.
