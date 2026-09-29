## 1. Declare the presentation policy and worker boundary

- [ ] 1.1 Add an explicit bare-A1 submitted-image policy that selects bounded Windows cell rendering while preserving reliable native paths, hidden-image behavior, and `a1 pi`.
- [ ] 1.2 Extend the owned image worker with a cancellable preview request/result bounded by source bytes, decoded pixels, columns, rows, terminal bytes, concurrency, and deadline.
- [ ] 1.3 Cover platform/capability routing, aspect preservation, color pairing, transparency, malformed input, limits, cancellation, and payload-free failures.

## 2. Present retained user attachments without blank reservations

- [ ] 2.1 Add a mounted submitted-image presenter with bounded pending, ready, unavailable, and hidden states.
- [ ] 2.2 Cache derived rows by retained asset and effective presentation inputs, recompute after width/theme changes, and discard stale completion after update, removal, replacement, or disposal.
- [ ] 2.3 Integrate the presenter beneath bare-A1 submitted prompts without changing original bytes, MIME type, chips, text, history, model delivery, or image preparation.

## 3. Verify terminal and comparison behavior

- [ ] 3.1 Prove Windows fallback frames contain bounded ordinary cell rows and no Kitty, iTerm2, Sixel, or base64 payload while preserving surrounding transcript content.
- [ ] 3.2 Preserve native non-Windows rendering, hidden/unavailable text, tool-result rendering, and independent `a1 pi` output with focused regressions.
- [ ] 3.3 Record focused evidence and any known gap, then build and physically review initial paint, later updates, scroll-away/return, resize, visibility changes, and input responsiveness in Windows WezTerm and Windows Terminal.
