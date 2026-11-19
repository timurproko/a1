## Context

See `proposal.md` for the requested behavior. `SessionShellRoot.#renderDockLayout` currently combines queued input and all status rows before widgets, editor, and footer. Custom-viewport composition always passes those rows as dock content. `TranscriptViewport` already distinguishes total document extent from `selectableDocumentRowCount`, making a non-selectable presentation tail possible without persisting it. Its scroll and follow calculations currently consume total document rows.

The status facade in `shell-footer-status.ts` renders both live working indicators and non-working informational/failure messages. The change must distinguish these semantically rather than move every rendered status string. The shared indicator owns its animation, working overrides, and disposal; it must not be recreated merely because the reader scrolls.

Existing tests explicitly require a docked `Working` row and queue-before-working order, including the fit boundary. They need replacement assertions for the new declared bare-A1 placement, not removal of their geometry, selection, or lifecycle coverage.

## Goals / Non-Goals

**Goals:**
- Give live status exactly one scrollable presentation owner across every fit/overflow state.
- Keep semantic transcript identity, prompt anchors, persistence, and copy boundaries separate from the ephemeral tail.
- Preserve current-state rendering and stable dock-only reuse without stale status rows or unsafe scroll optimizations.

**Non-Goals:**
- Moving queued input, widgets, notifications, idle information, failure messages, or editor/footer surfaces into history.
- Changing work lifecycle, text normalization, spinner cadence, status priority, or extension APIs.
- Hiding the indicator solely because follow mode is detached: it is clipped by its actual scroll position, not a detach flag.
- Generalizing wheel routing outside the viewport or changing the pinned comparison layout.

## Decisions

### Split live-status placement from rendering and lifecycle

Use the owned semantic working state to decide whether the existing status render belongs to the custom viewport tail. Render that surface once at the current width and retain its status-owned blank rows. For bare A1, omit those live rows from dock assembly and append them after semantic document rows for viewport composition. Keep non-working status output in its current dock location. Keep the pinned route on its current layout path.

This is a placement decision, not a new status presenter: reuse the existing status port and its live component. Do not infer ownership from text such as `Working...`, because extensions can replace the text and lifecycle labels can differ.

Alternative: move the complete status slot, including errors. Rejected as broader than the request. Alternative: move status only once content overflows, or hide it on detach. Rejected because those approaches change ownership at a fit boundary or make status disappear without scrolling its rows out of view.

### Compose a transient tail without changing transcript history

Keep the cached semantic document rows and prompt anchors unchanged. Form the viewport's scrollable row sequence from those rows plus the live status rows, with `selectableDocumentRowCount` equal to the semantic document length. The tail affects max scroll and scrollbar geometry but not message counts, prompt navigation anchors, export/resume data, or copied text.

Preserve scroll position when detached; changing tail extent only clamps a now-invalid position. Follow mode targets the complete tail. End and jump-to-bottom therefore reveal active status naturally. Removal uses the existing valid-position clamp and must not leave a status-only spacer in history. Extremely small viewports use ordinary clipping, not a duplicate dock fallback.

Alternative: insert synthetic backend transcript messages for each status update. Rejected because it would pollute persistence, copy output, prompt identity, and settled transcript caches.

### Preserve non-selectable pointer-sequence ownership

Use the semantic/selectable boundary to identify visible transient tail cells. A press there, outside a control hit region, must latch non-selectable ownership for the full left-button sequence until release/reset so a drag into transcript text cannot accidentally start selection. Existing transcript selections may extend toward the tail but must clamp their copied/highlighted range to semantic rows. Keep scrollbar and jump-control hit testing ahead of transient suppression; wheel reports over visible tail rows use normal viewport scrolling.

Alternative: rely only on `pressSelection` returning false. Rejected because that alone does not prove subsequent motion/release cannot leak to another selection owner.

### Include status content in reuse and frame-safety decisions

Retain the stable semantic document cache rather than rebuilding settled transcript blocks on every spinner tick. Tail row content/height must be an explicit input to visible-frame reuse: same-height typing may reuse an unchanged tail, but a changed status or lifecycle must invalidate affected rows even when semantic document identity is unchanged. Cache composed tail inputs by their actual row content or a reliable status revision, not newly allocated array identity alone.

Keep frame descriptors truthful about the complete scrollable extent. A tail insertion, replacement, removal, or height change must not be mistaken for a safe translation of previously stable transcript rows. Use the existing conservative presentation path when that transformation cannot be proved safe. Deterministic terminal replay should confirm that status cells are cleared and editor/footer rows remain correct, with no stale intermediate frame. Off-screen animation does not justify painting a status in the dock.

Alternative: force full-screen repaint on every status tick. Rejected because it masks invalidation errors and needlessly damages settled content.

### Keep overlapping plans explicit

`stabilize-streaming-rendering` currently specifies `Transient dock ownership is stable across overflow`, and its design/task 2.1 require working rows to stay docked. Once this proposal is accepted, this change takes precedence for live working and extension-working placement only. Its stable-owner invariant becomes: working rows always belong to the transient scrollable tail; queued and other dock rows always belong to the dock. Rendering cadence, input priority, and all unrelated stability requirements remain applicable.

Do not silently reintroduce the older dock-only clauses when applying or synchronizing that older change. Reconcile those overlapping planning clauses in an OpenSpec-only update before a later apply/archive operation consumes them; this proposal does not edit another change's artifacts. The stationary-hover change remains independent, and integration must preserve its current-frame button hit testing as available on the implementation base.

## Risks / Trade-offs

- [The live progress indicator is no longer always visible] → This is intentional; returning to the tail reveals it while active. No duplicate pinned indicator is added.
- [Queue and working status no longer have their old adjacency] → Queue order within the dock remains unchanged; document the new working-tail-before-dock relationship and cover queued streaming explicitly.
- [Status height changes affect scroll safety and detached positions] → Test valid-position preservation and required clamping for replacement, completion, tiny terminals, and resize; replay terminal writes.
- [Transient rows become selectable or persisted] → Assert copy/selection boundaries, no synthetic transcript events, and reset/resume behavior.
- [Animation defeats dock reuse or leaves stale cells] → Include tail inputs in reuse decisions and compare repeated same-height input, spinner-only frames, and status removal.

## Migration Plan

No settings or persisted session migration is required. After this proposal merges and implementation is explicitly requested, use a fresh implementation worktree based on current `origin/develop`. Deliver the custom-viewport placement update and focused tests in a separate code PR citing this change. Preserve the pinned comparison route without updating its baselines to match bare A1.

Require CI and a physical-terminal check of the exact candidate: start a long active run, scroll until the indicator leaves the viewport, return to the tail while still active, and repeat around completion and queued input. Merge only after user acceptance and explicit authorization. Rollback is a revert of the implementation; no stored conversation data needs repair.
