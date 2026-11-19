## Context

See `proposal.md` for the measured symptom and the two delta specs for observable requirements.

`stabilize-streaming-rendering` shipped an A1-owned adapter over the pinned Pi fullscreen terminal port. The owned viewport composes a semantic frame descriptor, arms the adapter with it, and the adapter validates the corresponding pinned write before replacing a broad positional rewrite with bounded transcript-region movement.

Three separate mechanisms in that adapter consult hyperlink state, and all three currently consume the same row inspection result:

1. `#hasLinkRisk(transcript)` rejects a frame when any cached row in the transcript rectangle reports ranges, producing `unsafe-terminal-content`.
2. `hasUnsafeTerminalContent` rejects the incoming write when any row inside the transcript rectangle reports ranges.
3. The write path requests hyperlink cleanup when a previously link-bearing row's paint signature changes, and a cleanup frame is synthesized with an erase-display prefix followed by every screen row.

`readVisibleHyperlinks` returns two kinds of range. An `explicit` range comes from a real OSC 8 sequence. A `candidate` range comes from a deliberately conservative text pattern whose comment already states that it is a cleanup detector rather than a link-activation parser. That pattern matches any dotted identifier and any relative or drive-qualified path, so `obj.method`, `package.json`, and `./src/index.ts` are all candidates. Code blocks consist almost entirely of such tokens.

The cleanup concern is real and was accepted for a specific reason: Windows Terminal can leave its own native hover underline behind when the viewport moves a link away from a stationary pointer, and deleting an editor URL chip must overwrite terminal link cells in the same frame. Both are pointer-driven and both already have explicit request sites in the viewport controller. The streaming signature check is a third, content-driven request site with no pointer involved.

The real-damage budget is the second defect. The adapter allows `verticalShiftRows + 2 + dock rows` painted rows before declaring `excessive-real-damage`. The two-row slack was chosen for "one active tail source row plus one sticky boundary row". A live assistant block is not one row: a fenced code block, a table, or a wrapped paragraph re-renders every row it owns on each streamed update, and the semantic frame already knows how many rows the live tail occupies.

## Goals / Non-Goals

**Goals:**

- Make followed streaming of code and link-bearing content use the same bounded movement that settled prose already gets.
- Remove undeclared whole-screen clears from ordinary streaming.
- Keep hover cleanup working for the pointer-driven cases it was introduced for.
- Make the regression visible to automation before it is fixed.

**Non-Goals:**

- Changing what text a terminal host decides to underline, or introducing an A1 link-activation parser.
- Removing the fail-closed contract, the pinned write grammar, or the conformance pinning.
- Changing Markdown rendering, code-block presentation, theme roles, or transient tail layout.
- Reverting bare A1 to regular mode or removing the custom viewport.
- Making bare A1 byte-identical to regular-mode Pi.

## Decisions

### 1. Give candidate and explicit ranges different authority

The row inspection result keeps both kinds but reports them separately, so each consumer states which one it needs.

- Movement safety consults explicit ranges and replay safety only. Moving a row that merely contains `obj.method` changes nothing a terminal tracks; there is no link state to relocate. A row carrying a real OSC 8 range keeps its current conservative treatment because the terminal holds per-cell link identity that a region scroll can misattribute.
- Hover cleanup continues to consult candidate ranges, because the Windows Terminal underline it repairs is drawn from the host's own text heuristic rather than from OSC 8.

Alternative considered: keep one combined signal and narrow the candidate pattern instead. Rejected because any pattern narrow enough to exclude code would also stop repairing the host underline that motivated the pattern, and because a text heuristic cannot be made to agree with an unknown host's heuristic. Separating authority fixes the classification error without weakening either concern.

Alternative considered: disable candidate detection inside code blocks. Rejected because the adapter must not infer transcript semantics from bytes, and the viewport descriptor does not currently carry per-row block kind.

### 2. Stop content streaming from requesting whole-screen cleanup

The streaming signature comparison is removed as a cleanup request site. Cleanup remains requested from the pointer-hover transition and the editor link-deletion path that the accepted requirements describe, and from presentation invalidation where a real link state was discarded.

When a cleanup frame is required, it repaints the rows whose link state must be overwritten and the rows the terminal is known to have stale, rather than prefixing an erase-display and republishing every row. An erase-display remains permitted only for initial entry, structural reset, resize, and image-protocol cases, matching the already accepted allowance.

Alternative considered: keep the streaming request but make its synthesized frame clearless. Rejected because the request itself also suppresses bounded painting through `pending-hyperlink-cleanup` and forces an extra render through the recovery callback, so the frame shape is only part of the cost.

### 3. Derive the damage allowance from the live tail the frame already declares

The viewport frame descriptor gains the live-tail extent in visible rows: the number of visible rows belonging to the block that is currently streaming, which the document layout already distinguishes from settled blocks. The adapter's allowance becomes the shift plus that live-tail extent plus the existing sticky-boundary row plus the dock rows it already counts.

This keeps the budget honest. A settled transcript still permits only the small slack it permits today, so a frame that repaints stable settled rows still fails closed. A live code block is allowed to repaint itself and nothing else.

Alternative considered: raise the fixed slack to a larger constant. Rejected because a constant either stays too small for a tall live block or becomes large enough to hide a genuine stable-row regression.

Alternative considered: let the adapter measure the live tail from the write. Rejected because the descriptor is the authority on transcript semantics and the adapter must not derive meaning from bytes.

### 4. Prove the regression before repairing it

New deterministic workloads are added to the existing streaming workload set and driven through the existing producer, replay, and budget support:

- a fenced code block that opens, accumulates path-bearing lines, closes, and settles;
- prose containing a file path and a dotted identifier, streamed while following an overflowing transcript;
- a live tail taller than the current fixed slack, streamed while following.

Their budgets assert no mid-stream full-screen clear, no `unsafe-terminal-content` or `pending-hyperlink-cleanup` decision caused solely by candidate text, bounded movement for each proven safe shift, and no repaint of stable settled rows. The failing artifacts are captured before the implementation changes any production path.

## Risks / Trade-offs

- **[A moved row with a real OSC 8 link still misdraws on some host]** → Explicit ranges keep their current conservative rejection, so this change does not widen that case.
- **[The host underline repair regresses because a streaming request site is removed]** → The pointer-hover and link-deletion request sites are retained and covered by the existing accepted scenarios; add focused coverage that a hover transition over a link that a followed frame moved still repairs.
- **[A live-tail-derived allowance hides a stable-row regression]** → The allowance counts only rows the descriptor attributes to the live tail; settled rows stay under the existing slack, and the budgets assert stable-row repaint separately.
- **[The descriptor gains a field the viewport cannot compute honestly]** → Derive the live-tail extent from the same document layout that already separates finalized blocks from live ones, and fail closed to the current fixed slack when it is unavailable.
- **[The pinned Pi write grammar changes]** → Unchanged from the accepted contract: the grammar stays pinned to package identity and drift fails the rendering gate.

## Migration Plan

1. Add the code-block, link-bearing-prose, and tall-live-tail workloads with budgets and capture the failing evidence without changing production rendering.
2. Separate candidate and explicit authority in the row inspection result and its adapter consumers.
3. Remove the streaming cleanup request site and bound the cleanup frame.
4. Add the live-tail extent to the frame descriptor and derive the damage allowance from it.
5. Run focused typechecking, architecture, viewport, adapter, and rendering-evidence checks for debugging, then push and use CI as the required gate.
6. Hand off exact-artifact comparison through `./scripts/dev` and `./scripts/dev pi` in Windows Terminal, streaming a long answer containing fenced code, file paths, and a real hyperlink. If acceptance fails, retain the evidence and leave the pull request unmerged rather than weakening the budgets.
