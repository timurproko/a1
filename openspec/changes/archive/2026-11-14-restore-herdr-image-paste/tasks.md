## 1. Separate raw image acquisition from terminal-owned text-copy routing

- [x] 1.1 Add an independent paste-access policy that preserves known-remote restrictions, selects image-only raw Herdr acquisition, and leaves response-copy destination unchanged; table cases cover native, Herdr/emulator variants, and remote markers.
- [x] 1.2 Carry image-only acquisition through the native helper protocol without native text/file-drop fallback; source and emitted helper cases observe only hermetic image operations.
- [x] 1.3 Preserve explicit clipboard ports, captured predecessor ordering, supplied text, and cancellation; production-source shell cases cover a raw image chip, exact text once, and copied text followed by paste.
- [x] 1.4 Report unavailable or empty screenshot acquisition as “Couldn’t paste screenshot—try again.” without draft loss or host-text fallback; shell cases cover recoverable failure and later typing.

## 2. Prepare supplied screenshot files as usable image attachments

- [x] 2.1 Prepare exactly one supplied supported image-file path inside the existing isolated pipeline with bounded file intake and actual image validation; helper cases cover quoted/spaced paths, source limits, invalid data, and read failure.
- [x] 2.2 Adopt prepared file images as attachment-backed screenshot chips with existing count limits and serialized conversion; shell cases assert exact image bytes once on submission and zero native clipboard reads.
- [x] 2.3 Preserve non-image files, URLs, ordinary text, folders, mixed/multiple path lists, history/undo, reservations, cancellation, and helper cleanup; owning focused cases cover those boundaries and emitted preparation.

## 3. Document independent copy, supplied-content, and raw-image paste contracts

- [x] 3.1 Update clipboard architecture documentation with native image-only paste, actual supplied-file attachments, retry feedback, and the remaining ambiguous raw-remote-image limitation; retain archived PR #922 history.
- [x] 3.2 Reconcile the specification deltas and durable implementation evidence with delivered behavior, limits, non-goals, and unperformed physical acceptance; keep the markerless raw-paste exception explicit rather than claiming locality detection.
