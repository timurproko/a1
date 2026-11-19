## Context

See `proposal.md` for motivation. At base `2680a318`, `PromptChipStore.transformPastedContent` recognizes images, URLs, and existing paths but returns other text unchanged. `PromptSelectionInterceptor` resolves asynchronous clipboard reservations by replacing editor lines directly, while its older clipboard fallback calls `insertTextAtCursor`. Neither invokes Pi's large-paste registry. Untransformed complete bracketed pastes can instead reach Pi's native handler, so behavior depends on the paste route and selection.

The pinned `@earendil-works/pi-tui` 0.84.2 editor and A1's source-derived `upstream/history/editor-core.ts` already demonstrate the requested labels and thresholds. Native handling normalizes CRLF/CR, expands tabs, decodes supported CSI-u control encodings, filters nonprintable controls except newlines, then checks `split("\n").length > 10 || text.length > 1000`. The screenshot's `+136` is the full logical-line count, not 136 lines hidden after a preview.

A1 already owns asynchronous paste identities, draft/selection remapping, pending submission readiness, semantic chip expansion, and atomic-range hooks. Persistent history requires expanded reusable text and restoration of live draft backing. Preserve those seams rather than introducing another clipboard acquisition or persistence mechanism.

## Goals / Non-Goals

**Goals:** Use one A1 text-chip owner across all default-editor paste routes; keep rendering small while retaining immutable text payloads; reuse existing pending-paste and selection ownership; test both history-enabled and history-disabled editors.

**Non-Goals:** No new collapse setting, expandable preview UI, transcript folding, arbitrary typed/programmatic-text collapsing, new clipboard worker, history database migration, or change to native `a1 pi`. Existing image preparation, admission limits, and terminal cleanup remain unchanged.

## Decisions

### 1. Own large-text semantics alongside existing A1 chips

Extend `PromptChipStore` with a text-paste record and a pure pinned-compatible normalization/classification helper. Preserve existing specialized content classification before ordinary-text collapsing, so a long URL remains a URL chip and path lists retain their current interpretation. Use Pi-style labels and a monotonically allocated numeric identity that does not overwrite another recoverable text chip. IDs need not be renumbered after deletion; matching Pi here means the specified labels, thresholds, atomic interaction, and payload behavior, not its private counter implementation.

Register only qualifying pasted text, not every string set on the editor. Count JavaScript string length, not bytes or graphemes, to match the oracle. Cover normalized trailing newlines, tabs, and Unicode at the boundaries. Store the normalized payload once; do not recompute it during rendering.

Alternative rejected: sending a synthetic bracketed-paste event at clipboard completion. That acts at the current caret rather than the reserved position and separates the payload from existing waiting submissions and copy/history resolution. Reaching into Pi's private paste map also adds a second state owner and undermines typed history adaptation.

### 2. Route paste actions through the same transformation boundary

Keep `beginPaste` and its captured-position completion as the asynchronous clipboard path; its text result becomes a ready text chip when eligible. The clipboard fallback and complete bracketed-paste path use the same transformation. Ensure A1's bracketed-paste interception assembles fragmented input before classification, including framing splits, without interpreting pasted newlines as submission. Preserve any input after the closing delimiter in receipt order. Do not add a second terminal stdin listener.

For bare A1 with the semantic store installed, every qualifying text paste must reach this owner before the native editor can independently allocate an identically shaped marker. Otherwise native `[paste #1]` and A1 `[paste #1]` could refer to different payloads. Keep the standalone/comparison editor's native behavior intact where the A1 store is not installed.

The existing invisible text-read reservation remains invisible until resolved; this change must not flash an image chip while reading text. Completion updates only its reservation and recoverable snapshots, preserving newer typing, action order, selection, cancellation, and generation guards. Reuse existing pending-submission readiness rather than submitting text early.

### 3. Expand semantic input once, without parsing inserted payloads again

Resolve text chips through the same submission, copy/cut, and history preparation boundary as other A1 chips. Build expanded output from original draft spans and registered records in one pass; emitted payload strings are terminal values, not another draft to scan. Resolve pending markers to their records within that operation. This prevents pasted code containing another chip's label from expanding recursively, accidentally attaching an image, or losing literal image-looking text during history preparation.

Text records do not create attachments, and repeated occurrences contribute their payload each time. Preserve existing image deduplication for actual semantic image chips and existing outer trimming at submission/history boundaries. Unregistered marker-looking strings remain ordinary text. Queued/captured drafts must retain their payload backing independently of clearing or editing the current editor; restored undo/redo and history drafts must resolve the same records. Do not recycle identities while those references remain recoverable. Keep retention session-local and dispose it with the shell; this change adds no durable paste archive. Existing durable-history limits still apply to expanded text, without blocking a larger valid submission.

Alternative rejected: regex replacement repeatedly over the changing output, or persisting compact labels. Both can silently change prompt meaning; labels also cannot recover text after restart.

### 4. Reuse atomic editing and validate against the pinned oracle

Extend registered atomic ranges to cover live text chips, including rendering/wrapping and pointer selection, without making arbitrary unregistered marker-looking text atomic. Exercise existing selection replacement, deletion, undo/redo, copy/cut, and history navigation rather than adding parallel editing commands. Use the public/owned editor seams; installed dependencies and native Pi remain untouched.

Add pure store tests for classification and opaque expansion, component tests for each paste route and both editor variants, and shell tests for actual dispatched text, waiting submissions, queue recovery, and durable recall. Compare boundary labels and normalized payloads against the pinned editor, including 10/11 lines and 1,000/1,001 code units. Test the supplied 136-line shape without retaining private screenshot or clipboard content in fixtures.

## Risks / Trade-offs

- [Two paste registries reuse the same visible ID] → Route all qualifying A1 paste events, including fragmented frames and selection replacements, through one owner; test mixed clipboard/terminal actions.
- [Async completion or undo restores a label without backing] → Preserve immutable records across captured drafts and recoverable snapshots, and test deletion, cancellation, out-of-order reads, and session replacement.
- [Payload text looks like other chip labels] → One-pass semantic expansion with opaque emitted payloads, including history's image omission path.
- [Narrow rendering or caret mapping regresses] → Cover widths shorter than a label, Unicode around chips, pointer selection, and both default-editor variants.
- [More text remains in process memory] → Share each immutable payload rather than duplicating it per render/snapshot; retain it only within the existing shell lifetime and do not create persistent paste caches.

## Migration Plan

No persisted state migration is required. After this specification integrates and implementation is explicitly authorized, implement in a separate stream citing this change. Required CI validates the implementation; focused local tests are debugging aids, not a replacement gate. Physical Windows Terminal/Git Bash review compares clipboard shortcuts, right-click, and terminal paste against native Pi, including a 136-line paste, a long single line, short text, chip deletion/undo, and exact submitted content. Build before launching through `./scripts/dev` or `./scripts/dev pi`. Record user acceptance before archival; rolling back code restores prior paste presentation without rewriting history.
