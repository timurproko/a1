## 1. Model surface-relative frame selection

- [ ] 1.1 Add bounded row provenance for scrollable document rows and pinned frame surfaces, including the metadata needed to map terminal pointer cells into stable selection anchors.
- [ ] 1.2 Replace screen-row-only endpoints with surface-qualified anchors and project document, pinned, mixed, and clipped ranges into each current frame without scanning off-screen transcript history.
- [ ] 1.3 Stop selection creation from detaching an otherwise followed viewport while preserving explicit navigation, edge auto-scroll, grapheme boundaries, copy capture, reset, and conservative invalidation behavior.

## 2. Make copy acknowledgement layout-neutral

- [ ] 2.1 Remove acknowledgement from dock row allocation while retaining latest-intent ordering, replacement, timer, whitespace, failure, and disposal behavior.
- [ ] 2.2 Compose the right-aligned accent acknowledgement over the existing row immediately above the editor with bounded width and frame-owned damage/restoration.
- [ ] 2.3 Preserve viewport/dock rectangles, visible document range, editor/footer geometry, controls, pointer regions, selection anchors, and immutable copied payload while acknowledgement appears, changes, and expires.

## 3. Prove movement, geometry, and compatibility

- [ ] 3.1 Add focused viewport tests for followed document movement, pinned stationary selection, mixed endpoint projection, detached navigation, off-screen clipping, ambiguous-source clearing, resize, and bounded selection damage.
- [ ] 3.2 Add shell and terminal-replay tests proving acknowledgement show/replace/expiry causes no row allocation or content jump and restores underlying current cells without stale paint.
- [ ] 3.3 Verify streaming, status/footer, prompt/widget, modal, scrollbar, jump-control, automatic/explicit copy, and `a1 pi` compatibility paths remain intact.
- [ ] 3.4 Run focused component and session-shell tests, source typechecking, architecture/documentation checks, strict OpenSpec validation, and applicable rendering evidence; record exact results and any explicit environment limitation in `evidence.md`.
