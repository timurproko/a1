## 1. Border composition

- [x] 1.1 Expose the editor overflow border's plain-cell label range and preserve the existing upper/lower centered and narrow-width rendering; verify ordinary input and bottom-overflow fixtures remain unchanged.
- [x] 1.2 Compose recalled-history position as an independent dim left span over the top overflow border, omitting it on range collision instead of joining labels; verify no dot or combined suffix remains and editor row geometry is unchanged.

## 2. Focused regression evidence

- [x] 2.1 Extend owned editor tests for wide history-plus-overflow rendering, style boundaries, no-overflow history, collision widths, resize recovery, and complete fixed-width rows; verify the focused history editor suite passes.
- [x] 2.2 Extend shell-level prompt tests to prove the upper cue centers like the lower cue after A1 prefix composition while the pinned comparison path stays unchanged; verify the focused editor placement and shell suites pass.
- [x] 2.3 Run strict OpenSpec validation and the bounded focused type/test commands selected for the touched editor components; record the commands and successful outcomes in implementation evidence.
