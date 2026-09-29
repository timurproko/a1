## 1. Queued chip presentation

- [x] 1.1 Apply shared reversible canonical-chip wrap protection only to custom-viewport queued-input text, restore exact visible rows after width wrapping, and verify pinned presentation remains unchanged.
- [x] 1.2 Refresh protected text and its restoration state together when submissions or dequeue keybindings change, and verify queue updates render only current labels and guidance.
- [x] 1.3 Truncate every chip wider than a full queued or submitted content row with a grapheme-safe `…` on exactly one row; verify full source text remains unchanged and pinned comparison rendering is unaffected.
- [x] 1.4 Insert reversible wrapping boundaries around chips touching uninterrupted text and verify no visible spacing is added before or after any chip.

## 2. Regression coverage

- [x] 2.1 Add focused queued-input component cases for all canonical chip families, forced next-row wrapping, touching/adjacent/repeated chips, ANSI-visible labels, ordinary bracketed text, one-row oversized ellipsis, dynamic updates, and pinned isolation; verify the focused component suite passes.
- [x] 2.2 Add an owned-shell custom-viewport regression reproducing the screenshot's pending `Steering:` row without whitespace before the chip and verify the fitting chip appears whole on exactly one row while queue order, hint placement, and scrolling remain intact.
- [x] 2.3 Add submitted-content regressions for a chip promoted from touching queued text and for an oversized chip; verify fitting labels stay whole and oversized labels occupy one ellipsized row without changing stored text.

## 3. Validation and acceptance

- [x] 3.1 Run focused component and shell tests, typecheck, build, architecture governance, strict OpenSpec validation, and diff hygiene; record passing evidence without weakening unrelated assertions, including the exact 158-file / 1,525,486-byte startup-graph re-pin.
- [ ] 3.2 Build and launch with `./scripts/dev`, queue uninterrupted text touching an image chip, and physically verify the fitting chip never splits in either `Steering:` or submitted content while an oversized chip is ellipsized on one row.
