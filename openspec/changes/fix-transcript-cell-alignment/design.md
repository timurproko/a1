## Context and root cause

The supplied screenshots show row-dependent rail offsets, including a command and its output containing `🖼`. `src/ui/components/text.ts` returns two cells for every code point from U+1F300 through U+1F64F. This includes U+1F5BC FRAME WITH PICTURE, whose unqualified text presentation occupies one cell under pinned Pi's width policy. The RGI-emoji check does not correct this: the bare symbol is not an RGI emoji, so measurement falls through to the over-broad range.

`padRowPreservingBackground` and `ViewportRowCaches.paintRow` use that measurement to pad a row and overlay the rail. Each miscounted symbol removes one required padding cell. `overlaySpan`, selection, and truncation also consume the same incorrect geometry. This is shared code, not an individual agent or transcript-cache failure.

A disposable investigation compared A1, pinned Pi, and independent headless terminal replay. For `🖼 filename.png #id`, A1 reports 19 cells and Pi reports 18. Padding the row to 50 cells and appending a rail paints the rail at zero-based column 49 instead of 50. An ASCII row reaches column 50. Repeated symbols should compound the error and will be included in durable regression coverage during implementation.

## Decision

Use standards-based East Asian Width data for ordinary base characters, retaining explicit RGI emoji handling for emoji-presentation and joined sequences. Do not infer width from a broad supplementary-plane block. Match the pinned renderer's relevant grapheme policy through a vendor-neutral implementation and an explicit data dependency rather than importing Pi into `src/ui/components`, patching Pi, or adding special-case spacing to scrollbar rows or image labels.

Keep all shared geometry operations consistent: measurement, grapheme-aligned slicing, padding, truncation, overlay replacement, selection, and copy column boundaries. Retain the ASCII fast path, zero-width ANSI/image controls, and existing tab policy. Do not widen this repair into a general terminal-tab normalization change.

## Delivery outcome

1. Correct shared pictograph cell geometry and preserve aligned transcript rails and selection across affected rows.

`tasks.md` contains one corresponding implementation group. This PR remains planning-only until the maintainer approves this plan and requests implementation.

## Validation approach

- Compare focused Unicode fixtures against independent pinned Pi width results: bare and emoji-qualified pictographs, repeated pictographs, true wide emoji, CJK, combining text, and styled variants.
- Exercise padding, truncation, span placement, and selection/copy boundaries using explicit expected columns rather than deriving expectations from A1's helper.
- Replay affected viewport rows through the existing headless terminal boundary and assert the rail stays in its declared last column during relevant repaint/scroll transitions.
- Run changed test files, typecheck, and strict OpenSpec validation only; no broad local suite or physical desktop automation.

## Known gaps and boundaries

Headless xterm's default legacy Unicode table does not model every modern emoji sequence. Use independent terminal replay for the narrow pictographs that reproduce this defect and pinned Pi conformance for modern emoji geometry; do not report legacy-table differences as fixed by this change. Terminal hosts configured with a genuinely different Unicode policy remain an environmental compatibility boundary. No screenshot evidence alone proves every row-level anomaly has this cause; implementation regressions must establish the shared-width repair directly.
