## 1. Lock the white-highlight contract

- [ ] 1.1 Update focused progress-frame cases to describe the moving band as a generic highlight while retaining cadence, pause, punctuation, width, and grapheme assertions.
- [ ] 1.2 Add shell evidence that the animated band uses the theme text role, differs from the accent spinner in the default theme, and leaves surrounding text and the ellipsis muted.
- [ ] 1.3 Retain focused evidence that pinned `a1 pi` and non-spinner text do not receive the bare-A1 animation styling.

## 2. Apply the neutral white animation style

- [ ] 2.1 Rename the neutral frame presenter's moving-band callback from `accent` to `highlight` without changing its phase or segmentation algorithm.
- [ ] 2.2 Inject the existing theme text role for the bare-A1 moving band while keeping the spinner accent-coloured and all inactive label content muted.
- [ ] 2.3 Preserve built-in, measured-compaction, extension-override, replacement, settlement, mode-change, and disposal behavior.

## 3. Validate the candidate

- [ ] 3.1 Run focused progress component, shell animation, pinned parity, presentation-boundary, and timer-cleanup tests.
- [ ] 3.2 Run typecheck, build, applicable architecture/governance checks, strict OpenSpec validation, and diff hygiene.
- [ ] 3.3 Physically verify through `./scripts/dev` that the text band is white, the spinner remains cyan/accent, motion remains restrained, and work settlement removes the row cleanly.
- [ ] 3.4 Compare `./scripts/dev pi` and confirm pinned spinner text, styling, cadence, and geometry remain unchanged.
