## 1. Establish the failing ownership path

- [ ] 1.1 Add focused component-dispatch coverage for primary press, drag/move, and release on the progress status; verify ordinary spinner cells return no handled, capture, or focus result while wheel and explicit-control behavior remain unchanged.
- [ ] 1.2 Add a fullscreen shell regression that sends SGR reports through the terminal fixture and reproduces a selection failing to begin on the rendered `Working…` row before the fix.

## 2. Restore complete-frame selection across the spinner

- [ ] 2.1 Change only the status-component or hit-routing seam identified by the failing tests so ordinary spinner cells leave primary drag events unhandled and complete-frame selection owns the full sequence.
- [ ] 2.2 Preserve explicit control, overlay/modal, wheel, right-click paste, editor click, animation, copy-on-select, regular-mode, and `a1 pi` ownership behavior.

## 3. Prove starts, crossings, and animated rendering

- [ ] 3.1 Cover a selection starting on the spinner and selections crossing it downward and upward, including no-button motion and exact paint/copy endpoints.
- [ ] 3.2 Verify spinner ticks and status replacement do not capture, truncate, clear, or overwrite an active valid selection, and retain focused comparison-profile isolation coverage.
- [ ] 3.3 Run focused progress-status, viewport-controller, session-shell selection, and terminal-paint tests plus typechecking and strict OpenSpec validation; record implementation evidence and dispose any known gap before finalization.
