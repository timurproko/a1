## 1. Activation geometry

- [ ] 1.1 Send the attach terminal's current resize frame immediately after every requested tab view so the newly selected holder receives the active geometry.
- [ ] 1.2 Reapply current geometry during startup attachment to an already-running selected tab without broadcasting one client's size to unrelated holders.

## 2. Coherent presentation

- [ ] 2.1 Preserve the existing stale-surface barrier until the selected holder publishes a complete current-geometry frame.
- [ ] 2.2 Add focused native regression coverage for resize-then-switch and resized reattachment ordering and presentation.
