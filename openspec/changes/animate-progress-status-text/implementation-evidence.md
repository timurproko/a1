# Implementation evidence

## Presentation behavior

Bare A1 now resolves every live built-in or extension working label through one custom-viewport presentation policy. Terminal ASCII periods and legacy Unicode markers normalize to one `…`. A grapheme-aware two-cell accent band crosses otherwise muted label text once every three existing spinner updates, then remains fully muted for an equal-length pause. The ellipsis stays muted and stationary, stripped text and display width are identical in every phase, and no animation timer was added.

The owned indicator is selected only for the custom viewport. Pinned presentation continues to use the source-synchronized `WorkingStatusIndicator` with three periods, preserving `a1 pi`. Status replacement reuses the current indicator only when its presentation mode still matches; changing modes or leaving live placement disposes the old spinner before constructing the next component.

Focused coverage proves punctuation normalization, pinned-marker compatibility, every-third-update movement, pause behavior, stationary ellipsis styling, wide/combining/emoji grapheme integrity, stable width, timer cleanup, built-in and extension replacement, measured compaction progress, lifecycle settlement, and byte-equivalent pinned status-indicator behavior.

## Validation

- Focused component, shell, lifecycle, extension, parity, provenance, customization, and timer-cleanup tests — passed: 12 files, 190 tests.
- `npm run build` — passed.
- `npm run typecheck` — passed.
- `npm run check:architecture` — passed after repinning the reviewed startup source-byte total from 1,478,064 to 1,480,974; file count, optional-module exclusions, and Pi artifact limits are unchanged.
- `npm run check:code-documentation` — passed.
- `npm run check:code-documentation:changed` — passed.
- `openspec validate animate-progress-status-text --strict` — passed.
- `git diff --check` — passed.

No broad local fast, full, or release test tier was completed. Required exact-head CI remains the integration gate.

## Known gaps

None. Interactive comparison of animation subtlety in bare A1 and unchanged pinned presentation remains the maintainer acceptance step.
