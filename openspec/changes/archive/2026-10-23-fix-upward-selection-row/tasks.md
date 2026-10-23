## 1. Upward endpoint projection

- [x] 1.1 Add focused failing coverage for an upward drag whose pointer stops on the top transcript content row beside prompt-owned chrome; assert the pointed row and column are selected while the prompt row is not.
- [x] 1.2 Correct frame-to-transcript endpoint projection so upward selection uses the content row under the pointer without a one-row downward offset or an extra row beyond the pointer.

## 2. Selection behavior preservation

- [x] 2.1 Cover forward and reverse gestures over identical transcript cells and assert matching inclusive grapheme bounds, partial endpoint-row paint, and copied text.
- [x] 2.2 Preserve held-edge auto-scroll, sticky-row clipping, prompt/editor clicks and selection, controls, overlays, regular-mode ownership, and `a1 pi` isolation through focused regression coverage.
- [x] 2.3 Copy every selected transcript row when held-edge auto-scroll grows an upward drag beyond one screen, including rows past either viewport edge and beneath the jump-to-bottom control, with paint still clipped to visible rows.
- [x] 2.4 Hold a detached downward content drag on the last visible content row while auto-scroll reaches the transcript end, then let it continue into dock rows.
- [x] 2.5 Keep a held drag's press anchor on its document row when streaming restyles or reflows it, instead of following the live tail or clearing the selection.

## 3. Delivery evidence

- [x] 3.1 Record focused typecheck and selection-test results plus explicit known-gap disposition in implementation evidence.
