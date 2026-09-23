## 1. Capture Complete-Frame Selection Behavior

- [x] 1.1 Add neutral frame-selection fixtures for transcript, transient tail, blank alignment, notice, widget, prompt, autocomplete, and footer/status rows; verify forward/reverse cross-boundary ranges, one-grapheme endpoints, wide/combining text, and click-without-drag behavior fail against the document-only implementation.
- [x] 1.2 Add shell pointer-routing fixtures for drags beginning above and below the viewport/dock boundary, editor clicks versus drags, control-origin gestures, modal/overlay ownership, links, right-click paste, wheel input, resize, focus loss, reset, and disposal.
- [x] 1.3 Add copy fixtures proving release-time automatic submission includes exactly the selected visible glyphs and row boundaries while excluding ANSI/OSC controls, cursor markers, unselected padding, scrollbar glyphs, and covered cells; retain separate `/copy` and keyboard prompt-copy expectations.
- [x] 1.4 Extend terminal-paint evidence at 192x54 to record selected cells, frame revisions, recomputed rows, terminal writes, copy payloads, and acknowledgement presentation across streaming and long-session cases.

## 2. Introduce a Complete Frame Row Contract

- [x] 2.1 Define a bounded visible-frame row model carrying rendered source text, terminal coordinates, row kind, useful visual bounds, and optional transcript identity without changing persistence or model context.
- [x] 2.2 Compose transcript, transient, and dock rows into that model before selection painting while retaining existing scroll allocation, sticky/bottom controls, scrollbar overlay order, modal coverage, and dock-only reuse safety.
- [x] 2.3 Generalize selection state from semantic document coordinates to complete-frame display boundaries and preserve ordered half-open grapheme ranges, word/line modes, forward/reverse equivalence, and one-grapheme reversal behavior.
- [x] 2.4 Extend bounded row caches and frame descriptors so selection-only changes reuse stable viewport and dock rows and conservatively invalidate on content, geometry, theme, hyperlink, control, surface, and overlay changes.

## 3. Route Whole-Frame Pointer Gestures

- [x] 3.1 Replace transient/dock suppression with pending whole-frame selection ownership for ordinary primary presses, latching one owner through motion and release without allowing fallback Pi selection.
- [x] 3.2 Preserve modal/overlay and explicit viewport-control ownership, right-click paste, wheel routing, sticky and bottom-control activation, scrollbar dragging, and hyperlink clicks while allowing an active frame drag to cross those regions without activation.
- [x] 3.3 Defer ordinary editor click handling until a no-drag release while promoting distinct editor-origin motion to frame selection; preserve caret/focus behavior, autocomplete geometry, and keyboard prompt selection.
- [x] 3.4 Keep the visible transcript position stable during an active frame drag and clear pending/retained state on unrelated input, focus loss, resize remapping failure, input-surface handoff, session reset/replacement, and disposal.

## 4. Copy Selected Visible Text Responsively

- [x] 4.1 Extract plain visible text from the normalized complete-frame range with exact selected graphemes and visual newlines, including selected status/footer chrome while excluding presentation controls and padding.
- [x] 4.2 Capture an immutable literal copy snapshot on nonempty release and submit it through the existing response-copy coordinator without clearing the highlight or blocking the input handler.
- [x] 4.3 Add copied-character success acknowledgement and retain bounded failure/timeout presentation, newest-copy supersession, paste-after-copy fencing, helper isolation, payload-free diagnostics, and safe shutdown.
- [x] 4.4 Preserve `Ctrl+C` re-copy-and-clear behavior for retained frame selection and keep `/copy`, prompt copy/cut/paste, and no-selection interrupt behavior unchanged.

## 5. Prove Compatibility and Bounded Work

- [x] 5.1 Verify stable-row reuse and selection lookup remain bounded by visible frame height for short and long transcripts, pointer bursts publish only the latest endpoint, and stream or dock updates cannot restore stale selection paint or change a captured payload.
- [x] 5.2 Verify source foreground/style/link attributes, dark-blue background, full-width interior rows, scrollbar foreground, overlays above selection, resize recovery, cursor placement, and terminal restoration through component and terminal-replay evidence.
- [x] 5.3 Verify `a1 pi`, regular-mode terminal selection, untouched pinned Pi behavior, installed package identity, architecture boundaries, and semantic response-copy routes remain unchanged.
- [x] 5.4 Run focused component, viewport-controller, shell-selection, response-copy, runtime, and terminal-paint tests plus typecheck, build, architecture/documentation checks, strict OpenSpec validation, and diff checks without running a forbidden local full suite.

## 6. Exact-Candidate Physical Acceptance

- [x] 6.1 Build the exact candidate and provide color-preserving `./scripts/dev` and `./scripts/dev pi` handoff commands for Windows Terminal.
- [x] 6.2 Prepare the user-controlled acceptance handoff for transcript-to-footer and footer-to-transcript drags, each transient/dock row kind, prompt click versus drag, automatic copy text and acknowledgement, controls/modals, streaming, resize, styling, and comparison behavior; keep the candidate unmerged if any physical finding contradicts automation.
