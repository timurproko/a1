## 1. Establish the failing ownership path

- [x] 1.1 Add a fullscreen shell regression that sends primary press, no-button motion, and release SGR reports through the terminal fixture; verify the passive spinner reaches complete-frame selection and reproduce document-originated selection clipping at the dock side of `Working…`.
- [x] 1.2 Cover spinner-originated and dock-originated drags alongside the failing document-originated direction so component pass-through and directional symmetry are independently visible.

## 2. Restore complete-frame selection across the spinner

- [x] 2.1 Remove the anchor-origin-dependent visible-row clipping so document-, spinner-, and dock-originated ranges project across the complete visible base frame while retaining surface-qualified endpoint anchors.
- [x] 2.2 Keep ordinary spinner cells free of a mouse handler, capture, focus, or control hit region and preserve explicit control, overlay/modal, wheel, right-click paste, editor click, animation, copy-on-select, regular-mode, and `a1 pi` ownership behavior.

## 3. Prove starts, crossings, and animated rendering

- [x] 3.1 Cover a selection starting on the spinner and selections crossing it downward and upward, including no-button motion and exact paint/copy endpoints.
- [x] 3.2 Verify spinner rendering does not capture, truncate, clear, or overwrite an active valid selection, and retain focused comparison-profile isolation coverage.
- [x] 3.3 Run focused progress-status, viewport-controller, session-shell selection, and terminal-paint tests plus typechecking and strict OpenSpec validation; record implementation evidence and dispose any known gap before finalization.

## 4. Incorporate manual acceptance feedback

- [x] 4.1 Exercise held-button and no-button terminal motion from ordinary input and footer/status rows through `Working…`; retain one complete visual frame range.
- [x] 4.2 Exclude transient status, input, autocomplete, dock/status, and whitespace-only ranges from automatic and Ctrl+C clipboard submission while consuming visual-only Ctrl+C safely.
- [x] 4.3 Copy one submitted prompt as semantic prompt text without `❯`, padding, or timestamp, while preserving its visible chrome when it participates in a larger transcript range.
- [x] 4.4 Preserve the selected row background beneath the copied acknowledgement and add focused paint/clipboard regressions.
