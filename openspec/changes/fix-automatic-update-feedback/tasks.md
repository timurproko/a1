## 1. Windowless automatic update

- [ ] 1.1 Make the shared updater child-process launch path hide Windows child windows while preserving piped diagnostics and verify focused process-runner tests cover the launch options and captured output.
- [ ] 1.2 Exercise automatic update's detached worker and protected replacement path on Windows-compatible seams and verify no child launch path can request a visible secondary console.

## 2. Persistent restart-ready overlay

- [ ] 2.1 Add one shared renderer for `Update installed, restart to update` using only the success-green semantic role and verify exact wording, color, alignment, and narrow-width truncation.
- [ ] 2.2 Move bare A1 restart readiness from live-status rows to the existing prompt-adjacent frame overlay while retaining the pinned comparison status, and verify idle and busy layouts contain one notice without geometry changes.
- [ ] 2.3 Give copy acknowledgement priority over restart readiness and verify repeated copies restart the transient lifetime before the persistent notice returns.

## 3. Regression coverage and delivery

- [ ] 3.1 Update focused composition, footer-status, viewport, transcript, and selection tests to verify failed or current updates show no notice and restart removes the notice.
- [ ] 3.2 Run typecheck, the focused release and shell test files, and strict OpenSpec validation; disposition any concrete gaps before finalization.
