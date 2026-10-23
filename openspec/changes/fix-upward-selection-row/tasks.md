## 1. Upward endpoint projection

- [ ] 1.1 Add focused failing coverage for an upward drag whose pointer stops on the top transcript content row beside prompt-owned chrome; assert the pointed row and column are selected while the prompt row is not.
- [ ] 1.2 Correct frame-to-transcript endpoint projection so upward selection uses the content row under the pointer without a one-row downward offset or an extra row beyond the pointer.

## 2. Selection behavior preservation

- [ ] 2.1 Cover forward and reverse gestures over identical transcript cells and assert matching inclusive grapheme bounds, partial endpoint-row paint, and copied text.
- [ ] 2.2 Preserve held-edge auto-scroll, sticky-row clipping, prompt/editor clicks and selection, controls, overlays, regular-mode ownership, and `a1 pi` isolation through focused regression coverage.

## 3. Delivery evidence

- [ ] 3.1 Record focused typecheck and selection-test results plus explicit known-gap disposition in implementation evidence.
