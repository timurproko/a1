## 1. Declare the presentation policy and worker boundary

- [x] 1.1 Add an explicit bare-A1 submitted-image policy that selects bounded Windows cell rendering while preserving reliable native paths, hidden-image behavior, and `a1 pi`.
- [x] 1.2 Extend the owned image worker with a cancellable preview request/result bounded by source bytes, decoded pixels, columns, rows, terminal bytes, concurrency, and deadline.
- [x] 1.3 Cover platform/capability routing, aspect preservation, high-density quadrant/color pairing, transparency, malformed input, limits, cancellation, and payload-free failures.

## 2. Present retained user attachments without blank reservations

- [x] 2.1 Add a mounted submitted-image presenter with bounded pending, ready, unavailable, and hidden states.
- [x] 2.2 Cache derived rows by retained asset and effective presentation inputs, recompute after width/theme changes, and discard stale completion after update, removal, replacement, or disposal.
- [x] 2.3 Integrate the presenter beneath bare-A1 submitted prompts without changing original bytes, MIME type, chips, text, history, model delivery, or image preparation.

## 3. Verify terminal and comparison behavior

- [ ] 3.1 Prove known Windows hosts contain one bounded Sixel image after its reserved rows, unknown hosts contain bounded ordinary cells, and neither path contains Kitty image transmission/placement, iTerm2 image, or base64 payload while preserving surrounding transcript content.
- [x] 3.2 Preserve native non-Windows rendering, hidden/unavailable text, tool-result rendering, and independent `a1 pi` output with focused regressions.
- [ ] 3.3 Record focused evidence and any known gap, then build and physically review initial paint, later updates, scroll-away/return, resize, visibility changes, and input responsiveness in Windows WezTerm and Windows Terminal.

## 4. Repair preview fidelity after physical review

- [ ] 4.1 Add a bundled in-process Sixel encoder path for declared Windows Terminal and WezTerm hosts, bounded by pixel dimensions, rows, encoded bytes, deadline, and worker lifetime.
- [ ] 4.2 Compose validated Sixel on the final reserved row so fullscreen row clearing completes before image transmission, while retaining high-density cells for unknown Windows hosts.
- [ ] 4.3 Cover Sixel host selection, framing, bounds, row ordering, later paints, resize/remount, protocol isolation, package inventory, and byte-identical attachment delivery.

## Evidence

- Automated on Windows: 229 related tests passed after the packaged-worker fixture was updated; focused worker, presenter, terminal-composition, attachment, viewport, native-path, tool-image, and pinned-path suites are included.
- `npm run build`, `npm run typecheck`, `npm run check:architecture`, changed-code documentation governance, strict OpenSpec validation, and `git diff --check` pass.
- Manual Windows Terminal review rejected the initial 1×2 half-block preview as too coarse for text-heavy screenshots. The revised plan keeps higher-density quadrants only as an unknown-host fallback and requires bundled Sixel for the accepted Windows Terminal and WezTerm paths; tasks 3.1, 3.3, and 4.1–4.3 remain open.
