## 1. Establish dialog cancellation ownership

- [ ] 1.1 Add focused regressions that reproduce ignored, filter-clearing, and advertised Ctrl+C behavior across the Thinking, Models, adapted selector, nested, overlay, and extension dialog families.
- [ ] 1.2 Introduce one owned dialog-input adaptation that routes raw Ctrl+C to the active surface's existing cancel callback before search, form, or underlying editor handling.
- [ ] 1.3 Apply the adaptation to every dismissible replacement-input and overlay dialog boundary while excluding nondismissible progress surfaces and full-screen applications.

## 2. Keep the close alias implicit

- [ ] 2.1 Normalize dialog cancellation hint entries so Escape/Esc remains visible and Ctrl+C is omitted without changing action wording, semantic styling, spacing, clipping, or wrapping.
- [ ] 2.2 Verify dialogs with configured or component-specific cancellation keys preserve their ordinary advertised close key and all non-cancel shortcut hints.

## 3. Prove lifecycle and isolation

- [ ] 3.1 Verify one Ctrl+C closes each representative dialog exactly once, does not select, submit, clear input first, or append cancellation output, and restores the expected parent surface and focus.
- [ ] 3.2 Verify Ctrl+C retains existing behavior in the ordinary agent editor and non-dialog owned applications, and other dialog navigation, save, filter, and Escape paths remain unchanged.
- [ ] 3.3 Run focused component and session-shell tests, build, source/bin typechecking, changed-file documentation governance, strict OpenSpec validation, and diff checks; record exact evidence and any known gaps.
- [ ] 3.4 Reconcile current `origin/develop`, prepare implementation-specific acceptance scenarios, and provide a build-first terminal handoff covering Thinking, Models with a populated filter, a nested flow, and an extension dialog.
