## 1. Establish dialog cancellation ownership

- [x] 1.1 Add focused regressions that reproduce ignored, filter-clearing, exit-chord, and advertised Ctrl+C behavior across the Thinking, Models, adapted selector, nested, overlay, extension dialog, Settings, and reference-screen families.
- [x] 1.2 Introduce one owned dialog-input adaptation that routes raw Ctrl+C to the active surface's existing cancel callback before search, form, or underlying editor handling.
- [x] 1.3 Apply the adaptation to every dismissible replacement-input and overlay dialog boundary and every opted-in owned application-host boundary while excluding nondismissible progress surfaces and non-opted-in full-screen applications.

## 2. Keep the close alias implicit

- [x] 2.1 Normalize dialog cancellation hint entries so Escape/Esc remains visible and Ctrl+C is omitted without changing action wording, semantic styling, spacing, clipping, or wrapping.
- [x] 2.2 Verify dialogs with configured or component-specific cancellation keys preserve their ordinary advertised close key and all non-cancel shortcut hints.

## 3. Prove lifecycle and isolation

- [x] 3.1 Verify one Ctrl+C closes each representative dialog exactly once, does not select, submit, clear input first, or append cancellation output, and restores the expected parent surface and focus.
- [x] 3.2 Verify Ctrl+C retains existing behavior in the ordinary agent editor and non-opted-in owned applications, and other dialog navigation, save, filter, and Escape paths remain unchanged.
- [x] 3.3 Run focused component and session-shell tests, build, source/bin typechecking, changed-file documentation governance, strict OpenSpec validation, and diff checks; record exact evidence and any known gaps.
- [x] 3.4 Reconcile current `origin/develop`, prepare implementation-specific acceptance scenarios, and provide a build-first terminal handoff covering Thinking, Models with a populated filter, a nested flow, and an extension dialog.

## 4. Extend dismissal to owned full-screen applications

- [x] 4.1 Enforce the application host's close-on-interrupt policy before app-local filter, menu, structured editor, or exit-chord handling.
- [x] 4.2 Verify one Ctrl+C closes Settings, Changelog, Keyboard Shortcuts, and the shared reference-screen family while their visible hints continue to advertise only Escape.
- [x] 4.3 Verify non-opted-in application hosts retain app-local Ctrl+C consumption and the existing interrupt chord, then rerun focused validation and refresh implementation evidence.
