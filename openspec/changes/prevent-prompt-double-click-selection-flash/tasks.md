## 1. Prompt gesture ownership

- [ ] 1.1 Defer complete-frame selection when a primary press begins in the ordinary editor, retain one pending origin, and replay exactly one editor press/release pair for a no-motion click; verify focused controller tests show no active or copyable frame selection between press and release.
- [ ] 1.2 On the first distinct motion, seed frame selection from the retained prompt origin, extend it to the current cell, and cancel editor replay; verify focused tests cover same-row and cross-boundary drags plus release and lifecycle reset cleanup.

## 2. Selection presentation regressions

- [ ] 2.1 Add session-shell coverage that composes frames between prompt press and release during double-click and triple-click sequences; verify no unused prompt-row cells receive selection paint and settled editor copy returns the expected word or logical-line text.
- [ ] 2.2 Retain transcript word/line selection, prompt caret clicks, copy-on-select, controls, modal routing, right-click paste, and comparison-profile isolation; verify the existing focused selection and viewport-controller suites plus targeted regression cases pass.

## 3. Validation and handoff

- [ ] 3.1 Run typechecking and the focused session-shell, viewport-controller, transcript-viewport, and owned-editor tests; record implementation-specific evidence and disposition any known gap before finalization.
- [ ] 3.2 Build the candidate and prepare a physical-terminal check through `./scripts/dev`: double-click and triple-click prompt text, confirm selection never flashes through unused row width, then drag from the prompt into another frame row and confirm complete-frame selection still activates.
