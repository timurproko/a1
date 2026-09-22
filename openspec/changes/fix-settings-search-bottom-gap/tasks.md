## 1. Correct grouped-list bottom geometry

- [x] 1.1 Add a focused shared grouped-list regression where bottom clamping lands on a section spacer represented by an outgoing sticky heading; verify the viewport is filled with available rows and still ends at the final item.
- [x] 1.2 Adjust shared grouped-list clamping/layout so a consumed boundary spacer does not reserve body capacity, while preserving ordinary section spacing, sticky headings, selection reveal, and constrained-height behavior.

## 2. Verify settings search composition

- [x] 2.1 Add settings-screen regressions that reach the final search result by wheel and `Ctrl+End`; verify the final setting is immediately above the search input's top rule with no padded empty row.
- [x] 2.2 Verify the corrected bottom frame retains the existing ruled input, footer guidance, sticky section heading, exact rectangle, and scrollbar position/thumb geometry.

## 3. Validate the change

- [x] 3.1 Run strict OpenSpec validation, focused grouped-list and settings-app tests, typechecking, and the supported build; record any host-toolchain limitation without weakening the behavioral assertions.
- [x] 3.2 Hand off the exact candidate for a physical-terminal check that search wheel scrolling reaches the final setting with no trailing gap and with the scrollbar presentation unchanged.
