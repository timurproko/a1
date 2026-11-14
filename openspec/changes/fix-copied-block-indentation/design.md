## Root cause

`TranscriptViewport.selectedText()` extracts selected rendered rows with `textSelectionText()`. For ordinary assistant rows it uses `usefulTextLineContent(row)` without information distinguishing output padding, quote borders, or source indentation. The first row starts at the pointer column, while intermediate rows start at display column zero. `captureSelectedText()` then calls `text.trim()` once on the complete payload and stores it as `literal: true`; the copy helper intentionally makes no further changes. Consequently leading presentation whitespace disappears from the first payload row but survives on later rows. Quote borders are ordinary characters in this representation and also survive.

A read-only reproduction against the current viewport, using rows ` │ Diagnose the worker-close refusal.`, ` │ Capture the exact error and trace ownership.`, and ` │ Do not merge anything.`, produces `│ Diagnose the worker-close refusal.\n │ Capture the exact error and trace ownership.\n │ Do not merge anything.`. Existing shell selection tests even expect `abcd\n   efgh` when the underlying fenced code has no indentation, documenting the current renderer-padding leak. The pinned Markdown renderer adds a `│ ` prefix to each rendered blockquote row.

`prepareTextPaste()` normalizes line endings, tabs, and control characters, but does not invent leading spaces. Fixing paste with trim-per-line or generic dedent would conceal the copy defect and destroy legitimate code/list indentation or externally supplied text.

## Decision

Carry explicit copy-content boundaries for owned assistant presentation rows through the transcript/document/frame projection to extraction. Identify renderer-owned prefixes from their presentation owner, not from regex matching arbitrary row text. Quote content should copy without its visual quote border; genuine border characters in source/code remain content. Remove only known presentation prefixes before interpreting selected ranges, retaining the original display coordinates for pointer/grapheme clipping. Keep visual selection painting unchanged and reuse one extraction path for automatic and explicit copy.

Preserve visible row breaks in this change; logical soft-wrap reconstruction is not required to repair the offset and would alter the broader frame-copy contract. Preserve source indentation, internal blank lines, Unicode graphemes, literal draft copy/cut, existing clipboard ordering/cancellation/limits, footer/application selection, and mixed-range prompt policy. Unknown extension/custom rendering without trustworthy provenance retains literal extraction rather than heuristic stripping. Keep metadata aligned with width, revision, scrolling, output padding, and streaming invalidation so stale provenance cannot remove unrelated text.

The canonical frame-copy rule preserving internal whitespace remains the default; the new requirement makes known renderer-only assistant prefixes an explicit exception. Tests that classify renderer padding as code indentation must be corrected without weakening assertions for real source indentation.

## Delivery outcome

1. Preserve copied assistant block alignment by excluding known rendering prefixes and retaining real content indentation, through the shared frame-copy path and focused regression tests.

## Validation approach

Run only owner-level tests covering changed presentation/extraction and shell copy/paste, TypeScript checks, and strict OpenSpec validation. Cover the reported multiline quote, ordinary paragraph and fenced code padding, genuine nested code indentation, literal `│` source text, forward/reverse and partial selections, Unicode, blank lines, mixed rows, scrolling/reflow/streaming invalidation, and automatic/explicit payload parity. A real Herdr desktop round trip remains optional manual confirmation, not evidence already obtained.

## Known gaps

Implementation has not begun; this is a planning-only draft awaiting plan approval and implementation authorization. No physical clipboard or screenshot-session reproduction has been performed. Renderer-prefix leakage is reproduced directly against the current viewport; exact screenshot clipboard bytes were not available.
