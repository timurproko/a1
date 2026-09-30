## 1. Declare the presentation policy and worker boundary

- [x] 1.1 Add an explicit bare-A1 submitted-image policy that selects bounded Windows cell rendering while preserving reliable native paths, hidden-image behavior, and `a1 pi`.
- [x] 1.2 Extend the owned image worker with a cancellable preview request/result bounded by source bytes, decoded pixels, columns, rows, terminal bytes, concurrency, and deadline.
- [x] 1.3 Cover platform/capability routing, aspect preservation, high-density quadrant/color pairing, transparency, malformed input, limits, cancellation, and payload-free failures.

## 2. Present retained user attachments without blank reservations

- [x] 2.1 Add a mounted submitted-image presenter with bounded pending, ready, unavailable, and hidden states.
- [x] 2.2 Cache derived rows by retained asset and effective presentation inputs, recompute after width/theme changes, and discard stale completion after update, removal, replacement, or disposal.
- [x] 2.3 Integrate the presenter beneath bare-A1 submitted prompts without changing original bytes, MIME type, chips, text, history, model delivery, or image preparation.

## 3. Verify terminal and comparison behavior

- [ ] 3.1 Prove known Windows hosts forward one complete, non-truncated Sixel DCS with color-plane data after its reserved rows, unknown hosts contain bounded ordinary cells, and neither path contains Kitty image transmission/placement, iTerm2 image, or base64 payload while preserving surrounding transcript content.
- [x] 3.2 Preserve native non-Windows rendering, hidden/unavailable text, tool-result rendering, and independent `a1 pi` output with focused regressions.
- [ ] 3.3 Record focused evidence and any known gap, then build and physically review initial paint, later updates, scroll-away/return, resize, visibility changes, and input responsiveness in Windows WezTerm and Windows Terminal.

## 4. Repair preview fidelity after physical review

- [x] 4.1 Add a bundled in-process Sixel encoder path for declared Windows Terminal and WezTerm hosts, bounded by pixel dimensions, rows, encoded bytes, deadline, and worker lifetime.
- [ ] 4.2 Keep validated Sixel outside Pi's width-counted row text, place a short lifecycle-owned marker on the final reserved row, and expand it only at the terminal adapter after fullscreen clearing and damage composition.
- [ ] 4.3 Cover full-stream preservation beyond terminal width, marker registration/release, stale and clipped marker suppression, row ordering, later paints, resize/remount, protocol isolation, package inventory, and byte-identical attachment delivery.

## Evidence

- Historical automated evidence: 234 related tests passed for the worker, bundled package, presenter, terminal composition, clipping safety, attachment, viewport, native path, tool image, and pinned path. That evidence matched only the DCS header/framing and did not prove the complete color-plane body survived Pi's row-width truncation, so tasks 3.1 and 4.2–4.3 are reopened.
- Historical gates passed: `npm run build`, `npm run typecheck`, `npm run check:architecture`, changed-code documentation governance, strict OpenSpec validation, and `git diff --check`. Renew these after terminal-boundary marker expansion is implemented.
- Manual Windows Terminal review rejected the initial cell preview as too coarse. The first Sixel candidate showed a black rectangle; changing background selection then showed nothing. Inspection proved both were the same header-only stream: Pi counted the printable DCS body as row text and truncated it at terminal width before forwarding. The black rectangle was solid raster background fill, not rendered image data. Physical review remains pending after the marker/terminal-boundary repair, so task 3.3 stays open.
