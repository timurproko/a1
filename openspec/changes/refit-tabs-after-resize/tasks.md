## 1. Activation geometry

- [x] 1.1 Send the attach terminal's current resize frame immediately after every requested tab view so the newly selected holder receives the active geometry.
- [x] 1.2 Reapply current geometry during startup attachment to an already-running selected tab without broadcasting one client's size to unrelated holders.

## 2. Coherent presentation

- [x] 2.1 Preserve the existing stale-surface barrier until the selected holder publishes a complete current-geometry frame.
- [x] 2.2 Add focused native regression coverage for resize-then-switch and resized reattachment ordering and presentation.

## 3. Background fitting refinement

- [ ] 3.1 Forward an authoritative outer resize to globally hidden, unclaimed holders without affecting tabs viewed or controlled by another client.
- [ ] 3.2 Carry current geometry in each view request and queue target resize before fresh surface subscription, removing the redundant post-selection resize.
- [ ] 3.3 Add native regression coverage for hidden-holder pre-fitting, resize-before-subscription activation ordering, and spectator isolation.
