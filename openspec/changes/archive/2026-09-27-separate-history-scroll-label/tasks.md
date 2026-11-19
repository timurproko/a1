## 1. Border composition

- [x] 1.1 Let the editor overflow-border helper reserve a left-side history span while preserving the existing upper/lower centered and narrow-width rendering without a reservation; verify ordinary input and bottom-overflow fixtures remain unchanged.
- [x] 1.2 Compose recalled-history position as an independent dim left span that stays visible, shifting a complete overflow cue right on collision or omitting only that cue when both cannot fit; verify no dot or combined suffix remains and editor row geometry is unchanged.

## 2. Focused regression evidence

- [x] 2.1 Extend owned editor tests for wide history-plus-overflow rendering, style boundaries, no-overflow history, shifted collision widths, history-preserving cue omission, resize recovery, and complete fixed-width rows; verify the focused history editor suite passes.
- [x] 2.2 Extend shell-level prompt tests to prove the upper cue centers like the lower cue after A1 prefix composition, retains history at narrow widths, and leaves the pinned comparison path unchanged; verify the focused editor placement and shell suites pass.
- [x] 2.3 Run strict OpenSpec validation and the bounded focused type/test commands selected for the touched editor components; update implementation evidence with the refinement outcomes.
- [x] 2.4 Apply manual-review repairs so cursor placement retains the multiline history counter and recalled multiline content stays expanded rather than becoming a text-paste chip; verify core, prompt-chip, and fresh durable-history regressions.
