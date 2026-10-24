## 1. Resident overflow popup

- [x] 1.1 Build overflow rows from all available ordered tabs and derive checkmarks from the chips actually drawn in the current strip frame.
- [x] 1.2 Keep the popup coherent across resize, create, close, reorder, and view changes; preserve keyboard/mouse selection, hidden-tab activation, and existing overlay behavior.
- [x] 1.3 Add focused Rust strip and attach tests for multiple visible tabs, hidden rows, ordering, narrow widths, resize, removed entries, and hidden-tab activation.
- [x] 1.4 Align bottom-popup mouse coordinates with the actual rendered row for each named tab, including clamped rows.
- [x] 1.5 Add focused bottom-popup mouse tests selecting the named second row after hover, resize, and reorder.

## 2. A1 footer truncation

- [x] 2.1 Use a single-column dim ellipsis for narrow A1 footer usage truncation without coloring adjacent content or changing the Pi comparison profile.
- [x] 2.2 Add focused footer tests for ANSI boundaries, width constraints, ordinary-width preservation, and PR badge hyperlinks.
- [x] 2.3 Use one dim ellipsis for A1 path truncation and reserve complete model identity ahead of lower-priority usage at narrow widths.
- [x] 2.4 Add focused tests for path/badge, model/level priority, tiny widths, A1 semantic colors, and Pi comparison isolation.

## 3. Delivery evidence

- [x] 3.1 Record focused typecheck and touched-test results with any known gaps in implementation evidence after approval and implementation.
- [x] 3.2 Record the refined behavior's focused checks and gap disposition in the implementation evidence.
