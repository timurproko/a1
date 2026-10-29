## 1. Windowless automatic update

- [x] 1.1 Make the shared updater child-process launch path hide Windows child windows while preserving piped diagnostics and verify focused process-runner tests cover the launch options and captured output.
- [x] 1.2 Exercise automatic update's detached worker and protected replacement path on Windows-compatible seams and verify no child launch path can request a visible secondary console.

## 2. Persistent restart-ready overlay

- [x] 2.1 Capitalize the shared formatter as `Copied N chars to clipboard` and verify session, prompt, and Changelog acknowledgement tests use the exact wording.
- [x] 2.2 Add one shared renderer for `Update installed, restart to update` using only the success-green semantic role and verify exact wording, color, alignment, and narrow-width truncation.
- [x] 2.3 Move bare A1 restart readiness from live-status rows to the existing prompt-adjacent frame overlay while retaining the pinned comparison status, and verify idle and busy layouts contain one notice without geometry changes.
- [x] 2.4 Give copy acknowledgement priority over restart readiness and verify repeated copies restart the transient lifetime before the persistent notice returns.

## 3. Regression coverage and delivery

- [x] 3.1 Update focused composition, footer-status, viewport, transcript, session-selection, and Changelog tests to verify failed or current updates show no notice, restart removes the notice, and copy wording remains consistent.
- [x] 3.2 Run typecheck, the focused release and shell test files, and strict OpenSpec validation; disposition any concrete gaps before finalization.
