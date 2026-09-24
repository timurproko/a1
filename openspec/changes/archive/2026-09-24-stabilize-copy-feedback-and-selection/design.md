## Context

See `proposal.md` for motivation. Bare A1 currently inserts copy acknowledgement into `dockRows` before the input component. That increases dock height by one, reduces viewport height by one, changes the document range and bottom-control row, and then reverses all of those changes when the one-second timer expires.

Complete-frame selection currently stores both endpoints as visible frame-row/display-column coordinates. Making a range copyable also turns off end following. This keeps the painted rows stationary, but it disconnects a selection over transcript output from the document rows that produced it. The same representation is useful for pinned rows, whose terminal positions should not move merely because the transcript advances. The compositor already knows the visible document range, viewport/dock rectangles, selection revision, and exact base rows needed to distinguish those spaces.

## Goals / Non-Goals

**Goals:**

- Keep acknowledgement appearance, accent styling, replacement semantics, duration, and clipboard completion ordering while making its appearance layout-neutral.
- Represent each selection boundary in the coordinate space of the surface that produced it and project it into the latest frame before painting or copying.
- Let followed transcript growth move selected agent output by exactly the same terminal-row delta as its source content, while pinned selections remain attached to pinned frame content.
- Preserve precise grapheme boundaries, cross-surface ranges, bounded visible-row work, immutable copy capture, and conservative invalidation.
- Prove final terminal cells and geometry, not only component return values.

**Non-Goals:**

- Change what text a completed selection copies, the automatic-copy setting, copy failure presentation, or clipboard transport.
- Keep selection attached through an arbitrary rewrite when the selected source row can no longer be identified safely.
- Make transient feedback persistent, interactive, or part of transcript history.
- Change manual scrolling, jump-to-bottom activation, selection edge auto-scroll speed, modal ownership, `a1 pi`, or regular-mode behavior.

## Decisions

### 1. Compose acknowledgement as paint-only frame feedback

The shell will keep acknowledgement state and timer ownership, but it will no longer append an acknowledgement row to the dock. Dock layout will expose the current editor boundary, and complete-frame composition will place the right-aligned, width-bounded accent text over the existing row immediately above that boundary. Showing, replacing, or expiring the text therefore changes only the affected cells and feedback revision; viewport height, dock height, editor geometry, scroll position, visible document range, hit regions, and selection anchors remain unchanged.

The feedback layer will be composed after base-row layout and selection and before the final frame is emitted. It will not mutate the immutable snapshot whose successful delivery caused the acknowledgement. Existing rapid-copy intent ordering remains the authority for whether feedback may appear.

Keeping the message as an ordinary dock component was rejected because every appearance necessarily reallocates the viewport. Adding a permanently reserved blank row was rejected because it would waste a row even when no feedback exists. Writing directly to the terminal outside frame composition was rejected because later renders could erase or resurrect stale text and damage tracking would lose authority.

### 2. Give selection endpoints surface-qualified anchors

The frame row model will distinguish scrollable document rows from pinned frame rows before selection begins. A press maps its terminal cell to an anchor containing the surface identity, row identity in that surface, and grapheme-aligned display column. Scrollable rows use document-relative identity; pinned rows use the stable pinned surface/frame-row identity supplied by dock composition. Motion updates the moving endpoint in the coordinate space under the pointer while retaining the original anchor's space, so a range may still cross the viewport/dock boundary.

At each composition, the viewport projects both anchors into current terminal coordinates. Followed document growth changes the projected terminal row of a document anchor with the visible document range. Pinned anchors are projected from current pinned geometry and therefore do not inherit transcript scroll deltas. Interior selection rows are derived from the two projected boundaries and clipped to the visible frame without rewriting the stored anchors.

Continuing to store only terminal rows was rejected because it cannot distinguish content motion from stationary chrome. Applying one global row delta to the whole selection was rejected because mixed viewport-to-dock selection has endpoints with different motion. Maintaining separate independent selections was rejected because it would break one-range copy ordering and reversal symmetry.

### 3. Selection does not itself disable end following

Creating or retaining a frame selection will no longer be treated as a scroll-away action. If the viewport was following, subsequent agent output may advance the visible document range and document-anchored selection moves with it. If the reader explicitly scrolls away, existing detached behavior remains in force. A selection over a pinned row neither detaches nor acquires the transcript's movement.

This replaces the earlier stabilization strategy that froze visible rows whenever a nonempty range existed. That strategy avoided projection work but produced the reported screen-fixed highlight. Clearing selection on every transcript update was rejected because it would make streaming text effectively unselectable and would discard a valid retained copy range.

### 4. Preserve source identity conservatively across content changes

Frame composition will carry enough bounded row provenance to verify that an anchor still names the same source row when transcript or dock content changes. Appending rows and ordinary follow scrolling preserve existing source identities. If reflow, replacement, resize, surface removal, or modal geometry makes an endpoint ambiguous, selection is cleared or clipped from paint according to existing lifecycle rules rather than being transferred to text that merely occupies the old terminal cell.

Only visible anchors and their small amount of provenance are retained; implementation must not search the complete transcript on each render or pointer motion. Existing selection revision and row-damage metadata will cover anchor reprojection, and unchanged rows remain reusable.

Blindly preserving an absolute row number was rejected because upstream reflow can make that number identify different text. Retaining full transcript snapshots was rejected because selection is a visible-frame feature and must remain bounded by visible work.

### 5. Validate geometry and surface-relative movement independently

Focused viewport tests will establish document-only, pinned-only, and mixed endpoint projection under followed growth, explicit detached scrolling, append, resize, and invalidation. Shell tests will assert that acknowledgement show/replace/expiry leaves viewport and dock rectangles, visible document range, editor rows, control hit regions, and selected source identity unchanged. Terminal replay will verify that transcript selection moves with the same cells as streamed content, pinned footer/status selection stays with its source, feedback paints in accent without allocating a row, and stale cells are removed on expiry.

`a1 pi` comparison evidence remains unchanged and must show no A1 feedback or anchor projection path.

## Risks / Trade-offs

- **[Acknowledgement overlaps useful right-edge content]** → Keep the existing right-aligned, width-bounded label and make overlay precedence explicit; geometry remains stable even when cells are temporarily covered.
- **[A mixed selection endpoint leaves the viewport]** → Retain its surface anchor, clip paint to the current frame, and never remap it onto the dock or another document row.
- **[Streaming reflow changes a selected row's identity]** → Validate bounded row provenance and clear uncertain selection instead of highlighting unrelated text.
- **[Anchor reprojection expands selection damage]** → Reuse the existing visible-row caches and recompute only rows whose projected range or overlay cells changed.
- **[Feedback timer races a newer copy]** → Retain timer identity and latest-copy-intent checks; an older completion or timer cannot remove newer feedback.
- **[Pinned surface geometry changes]** → Reproject from current surface metadata when identity remains valid and use existing conservative selection reset when it does not.

## Migration Plan

No persisted-data migration is required. Land the row-provenance contract, surface-qualified selection projection, paint-only acknowledgement, and focused evidence atomically behind the existing bare-A1 custom-viewport gate. Rollback restores screen-coordinate selection and the row-allocating acknowledgement without changing sessions, settings, clipboard data, or dependency bytes.
