## 1. Queued chip presentation

- [ ] 1.1 Apply shared reversible canonical-chip wrap protection only to custom-viewport queued-input text, restore exact visible rows after width wrapping, and verify pinned presentation remains unchanged.
- [ ] 1.2 Refresh protected text and its restoration state together when submissions or dequeue keybindings change, and verify queue updates render only current labels and guidance.
- [ ] 1.3 Preserve the existing display-width-safe fallback for chips wider than a full row and verify every rendered row remains within its requested width without splitting a grapheme.

## 2. Regression coverage

- [ ] 2.1 Add focused queued-input component cases for all canonical chip families, forced next-row wrapping, adjacent/repeated chips, ANSI-visible labels, ordinary bracketed text, oversized fallback, dynamic updates, and pinned isolation; verify the focused component suite passes.
- [ ] 2.2 Add an owned-shell custom-viewport regression reproducing the screenshot's pending `Steering:` row and verify a fitting screenshot chip appears whole on exactly one continuation row while queue order, hint placement, and scrolling remain intact.

## 3. Validation and acceptance

- [ ] 3.1 Run focused component and shell tests, typecheck, build, architecture governance, strict OpenSpec validation, and diff hygiene; record passing evidence without weakening unrelated assertions.
- [ ] 3.2 Build and launch with `./scripts/dev`, queue text ending near the right edge followed by an image chip, and physically verify the fitting chip moves intact to a new row while an oversized chip remains width-safe.
