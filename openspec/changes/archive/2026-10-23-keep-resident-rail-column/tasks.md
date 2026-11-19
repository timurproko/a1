## 1. Reproduction

- [x] 1.1 Add a native test that feeds recorded Windows ConPTY output of a rail-hover scroll session into the resident terminal model through the holder write path and asserts every published state keeps the rail in the gutter column.
- [x] 1.2 Record which boundary first diverges (ConPTY re-render, retained row damage, composer output, or outer terminal) in implementation evidence.

## 2. Repair

- [x] 2.1 Repair the divergent boundary so resident rows keep scrollbar track and thumb cells in the final gutter column after controls move, labels change, and streamed rows scroll.
- [x] 2.2 Keep row-bounded differential repaint, overlay clipping, styles, links, and cursor placement unchanged, and verify the existing resident parity tests still pass.
