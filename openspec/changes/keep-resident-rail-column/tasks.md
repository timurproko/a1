## 1. Reproduction

- [ ] 1.1 Add a native test that feeds recorded Windows ConPTY output of a rail-hover scroll session into the resident terminal model, capturing incrementally, and asserts every retained row equals a complete capture and keeps the rail in the gutter column.
- [ ] 1.2 Record which boundary first diverges (ConPTY re-render, retained row damage, composer output, or outer terminal) in implementation evidence.

## 2. Repair

- [ ] 2.1 Repair the divergent boundary so resident rows keep scrollbar track and thumb cells in the final gutter column after controls move, labels change, and streamed rows scroll.
- [ ] 2.2 Keep row-bounded differential repaint, overlay clipping, styles, links, and cursor placement unchanged, and verify the existing resident parity tests still pass.
