## Context

See `proposal.md` for motivation. Bare A1 renders one complete fullscreen frame from two ownership regions: visible transcript/transient rows above a pinned dock, then notices, widgets, the active input, and footer rows in the dock. `TranscriptViewport` currently stores selection in semantic document coordinates, paints only rows before `selectableDocumentRowCount`, and produces a copy snapshot that deliberately strips transcript chrome. `SessionViewportController` suppresses primary-button sequences begun in transient or dock rows so Pi's outer fullscreen selection cannot appear underneath A1.

The existing model gives accurate transcript scrolling, grapheme boundaries, source styling, bounded row damage, and asynchronous clipboard delivery, but its document-only coordinate space cannot represent one range crossing into the dock. Modal and overlay bounds are already reported separately and must remain authoritative interaction regions. The `a1 pi` comparison profile does not use this custom viewport/controller.

## Goals / Non-Goals

**Goals:**

- Represent one pointer selection across every visible row owned by the bare-A1 base session frame.
- Keep selected cells and copied visible text consistent across transcript, transient, and dock row kinds.
- Preserve precise grapheme endpoints, directional symmetry, source styling, bounded repaint work, and responsive asynchronous copy.
- Retain click-only actions and explicit modal/overlay ownership without allowing Pi's fallback selection to compete with A1.

**Non-Goals:**

- Turning transient or dock text into transcript history, prompt-navigation anchors, persisted content, or model context.
- Selecting terminal title/tab chrome, content outside A1's alternate-screen frame, or cells covered by a modal/overlay that owns the gesture.
- Changing keyboard prompt selection/cut/paste, `/copy`, regular-mode terminal selection, `a1 pi`, or Pi package code.
- Replacing the custom viewport with Pi's generic fullscreen viewport or terminal-native selection.

## Decisions

### 1. Add a frame-selection model above document and dock ownership

Frame composition will supply an ordered row model for the exact visible base frame. Each row record will carry its rendered source text, terminal row, row kind, useful visual bounds, and any transcript document identity needed for stable viewport behavior. Selection points will use terminal-row/display-column boundaries over this model, so a range can begin in transcript content and end in the footer, or begin in the footer and extend upward, without changing which rows are persistent or scrollable.

The selection model will keep the existing half-open, grapheme-aligned endpoint rules and full/interior-row painting. It will paint after ordinary row composition but before foreground controls such as the scrollbar, preserving the existing overlay ordering and source foreground/style attributes. Frame rows covered by a modal or overlay remain visually hidden and are not repainted above that surface.

Alternative considered: pass ordinary drags through to Pi's public `TuiAltScreen` selection. Rejected because it would introduce a second selection owner, reverse-video styling, a different copy path, and screen-snapshot behavior that is not coordinated with A1's custom viewport controls or damage evidence.

Alternative considered: add an independent dock-only selector beside transcript selection. Rejected because a drag still could not cross the viewport/dock boundary and two active ranges would make pointer and copy precedence ambiguous.

### 2. Keep semantic ownership separate from visual copy text

The frame model will expose copy text derived from the selected visible rows, not from transcript persistence. ANSI/OSC controls and unselected right padding will be removed; selected visible glyphs such as prompt prefixes, timestamps, steering/working text, notices, widgets, and footer/status values will be included. Interior visual row boundaries become newlines, including intentionally selected blank rows. Scrollbar glyphs and cells hidden by modal/overlay composition remain presentation overlays and do not enter copied text.

The captured immutable rows will be converted to the existing literal `SelectionCopySnapshot` form at the input boundary. This keeps size bounds, helper isolation, destination selection, cancellation, supersession, diagnostics privacy, and paste-after-copy fencing unchanged. `/copy` remains the semantic last-agent-message command and keyboard selection inside the prompt retains exact editor text behavior.

Alternative considered: preserve transcript chrome stripping whenever any transcript row participates. Rejected because a cross-frame selection would then copy text different from what its highlight shows, especially around prompt timestamps and footer rows.

### 3. Copy on completed drag and keep selection visible

A released nonempty frame selection will synchronously capture its immutable visible-text snapshot, leave the highlight visible, and submit the snapshot asynchronously. Successful completion will show a concise copied-character acknowledgement; failure continues through the existing bounded copy-failure notice. Input, rendering, scrolling, and agent events do not wait for clipboard completion. `Ctrl+C` over a retained frame selection remains an explicit re-copy-and-clear path for compatibility.

A click with no accepted drag remains unselected. Any unrelated keyboard input or a new pointer gesture clears the retained frame selection according to the existing selection lifecycle. Copy acknowledgement is not itself included in the already captured payload.

Alternative considered: require `Ctrl+C` after release. Rejected because Claude Code-style selection copies on release and the requested interaction should not require a second action merely because the range includes dock content.

### 4. Arbitrate gestures before selection activation

Modal and overlay geometry remains first in pointer ownership. Scrollbar, sticky prompt, jump-to-bottom, hyperlink activation, right-click paste, and other explicit controls retain their click behavior. A primary press on ordinary base-frame content creates a pending frame-selection gesture; distinct motion activates selection. For the ordinary editor, a press/release without distinct motion is replayed to the editor as its existing click action, while a drag becomes frame selection rather than prompt-only pointer selection. Double-click word and triple-click visual-line selection use the same complete-frame row model.

Once a gesture owner is chosen, it remains latched through motion and release. This prevents a selection crossing the editor, status, or footer from activating those surfaces and prevents a control-origin gesture from turning into selection. Wheel input remains navigation rather than selection and keeps the current exposed-transcript/modal routing.

Alternative considered: always give the editor first ownership. Rejected because a drag beginning in the prompt could never select through the footer/status bar, contradicting complete-frame selection.

### 5. Preserve bounded presentation and invalidate conservatively

Selection revisions will remain part of frame provenance. Fixed-geometry motion will recompute only rows whose selected display-column range changed, including dock rows; unchanged base and selected variants remain bounded by viewport size. Changes to row content, dock allocation, resize, viewport position, transient extent, theme, hyperlinks, controls, input surfaces, or overlay geometry invalidate affected rows and fall back to complete visible-frame composition where safety is uncertain.

Starting a selection detaches followed transcript movement for the gesture so streaming cannot move the selected visible transcript rows underneath the pointer. Streaming and dock updates continue, but every presentation and eventual copy snapshot use one current frame revision. Reset, session replacement, focus loss, input-surface replacement, and disposal clear pending gestures and selection state.

## Risks / Trade-offs

- **[Animated status/footer content changes while selected]** → Bind paint and copy to the same composed frame revision and conservatively invalidate changed rows; capture immutable text at release.
- **[Delayed editor click replay changes caret behavior]** → Retain exact press/release coordinates and add focused single-click, drag, double-click, right-click, and autocomplete/editor-body fixtures.
- **[Control labels become selected accidentally]** → Latch explicit control hits before pending selection and test drags crossing controls separately from gestures beginning on them.
- **[Visual copying includes more chrome than legacy response copying]** → Limit the new behavior to pointer frame selection, keep `/copy` and keyboard prompt copy unchanged, and verify highlighted glyphs equal clipboard text.
- **[Full-frame selection increases repaint cost]** → Extend existing row-damage caches and deterministic 192x54 budgets to dock rows rather than repainting every frame row per motion.
- **[A selection is obscured by an overlay]** → Keep overlays above selection and route gestures beginning inside them to the overlay; clear stale selection state on geometry handoff.

## Migration Plan

No persisted data or settings migration is required. Implement the frame row contract and tests first, then move pointer selection/copy ownership from document-only rows to the complete base frame while retaining the old behavior behind the same bare-A1 custom-viewport gate. Validate the exact candidate in Windows Terminal by selecting from transcript through footer, from footer upward, and within each dock/transient surface while output streams. Rollback restores document-only selection without changing sessions, profiles, or Pi dependencies.
