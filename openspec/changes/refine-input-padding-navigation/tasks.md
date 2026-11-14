## 1. Ctrl+Shift section and prompt navigation

- [x] 1.1 Change Settings section shortcuts, terminal decoding, routing, and hints to Ctrl+Shift+Up/Down.
- [x] 1.2 Change Agent prompt/compaction navigation routing and effective shortcut help to Ctrl+Shift+Up/Down, removing obsolete Shift-only and Ctrl-only jump aliases while preserving input ownership and boundary behavior.
- [x] 1.3 Add focused regression tests for the new chords, old-chord non-jumps, hints, mixed prompt/compaction targets, and overlay ownership.

## 2. Shared full-height input gutters

- [ ] 2.1 Give the shared owned input a minimum one-cell left and right body gutter, including wrapped, multiline, empty, and placeholder rows, without double-padding existing editor content or changing full-width rules.
- [ ] 2.2 Align Agent prompt and Settings search wrapping, caret, selection, pointer mapping, and completion placement with the shared content rectangle while preserving semantic copy/submission text and comparison-profile behavior.
- [ ] 2.3 Add focused shared-input and consumer tests for both gutters, multiline continuation rows, narrow widths, wide characters, effective larger editor padding, and input interaction geometry.
