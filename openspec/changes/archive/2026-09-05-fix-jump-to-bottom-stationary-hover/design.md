## Context

See `proposal.md` for motivation. `SessionViewportController.handlePreInput` currently records `#pointerPosition` and calls `setBottomHovered` only in its motion branch, using the previous frame's hit regions. Wheel events can change visibility without refreshing that boolean. `TranscriptViewport.compose` later determines the new label and hit rectangle but paints from the stored hover boolean. The controller already retains pointer coordinates for hyperlink handling and clears them through `reset` and `clearPointerState`.

The fix crosses the existing controller/component boundary, so this design records how to avoid either stale-frame hit testing or redundant composition. No vendor Pi changes are needed.

## Goals / Non-Goals

**Goals:**
- Keep pointer ownership in the focused viewport controller and geometry-dependent styling in the viewport component.
- Resolve bottom-control styling and its hit rectangle from the same frame inputs in one composition pass.
- Preserve event routing, hyperlink cleanup, selection, render reuse, and the existing theme roles.

**Non-Goals:**
- Generalizing stationary-pointer hover to every control, changing rail/sticky hover policy, or redesigning the button.
- Polling the operating-system cursor, synthesizing mouse motion, adding a timer, or changing terminal reporting modes.
- Guessing an unreported cursor location outside the terminal. “Cursor position” means the latest valid coordinates delivered by terminal mouse reporting.

## Decisions

### Retain one authoritative pointer position in the controller

Update the controller's existing pointer position from each decoded coordinate-bearing mouse report before event-kind-specific routing. Retain it through ordinary hide/show transitions, and clear it with the existing pointer-state lifecycle. Observing coordinates does not consume an event, bypass modal ownership, or activate controls. Preserve existing hyperlink transition detection when broadening coordinate updates.

Alternative: retain a separate wheel or bottom-control pointer cache. Rejected because duplicate locations can disagree after presses, releases, or resets. Motion-only tracking cannot handle a first wheel report without preceding motion.

### Derive bottom hover during current-frame composition

Pass the controller-owned pointer snapshot to viewport composition using an explicit optional input. Compute the control's rectangle once after selecting its actual label and placement; use that exact rectangle for both the hover predicate and returned hit metadata. Unknown coordinates or an absent control imply no bottom hover. Remove reliance on the motion-latched bottom-hover boolean in the owned session path, updating direct component callers/tests as appropriate.

Alternative: recompute hover against the previous frame before scrolling. Rejected because visibility, label width, and placement may change. Composing once to discover geometry and then composing again to repaint is also rejected: it adds avoidable visible-row work and risks an unhovered first frame or render loops.

### Preserve presentation invalidation and interaction semantics

Pointer-driven visual changes must participate in the existing presentation revision/render request path so dock-only reuse cannot retain stale bottom-control styling. Existing geometry and content changes must compose the updated hit rectangle; stable dock-only frames may continue reusing the transcript when those inputs are unchanged. Hover reconciliation itself must not request unconditional follow-up or forced full-screen renders.

Click hit testing continues to use published current-frame metadata. Wheel events remain scroll actions, and selection, scrollbar drag, sticky controls, editor ownership, and modal routing retain their current behavior. Keep the existing hyperlink-specific forced-redraw behavior separate from this hover fix.

Alternative: invalidate the entire screen or all transcript caches on every pointer update. Rejected because the predicate is constant-time and should not create transcript-size-dependent work.

## Risks / Trade-offs

- [Terminals do not report every external cursor movement] → Use the latest reported coordinates only; retain existing lifecycle clearing and do not promise OS-level cursor tracking.
- [A hit-region change retains a stale boolean or cached row] → Test the first composed frame after reappearance, resize/dock movement, and new-message label changes, with inside and outside positions.
- [The default component theme renders normal and hover similarly] → Use a test theme that visibly distinguishes states and shell assertions against the owned theme's styled output, not label presence alone.
- [Shared pointer tracking affects hyperlink cleanup or input ownership] → Keep their policies intact and add focused non-regression assertions for routing and reset; run relevant existing tests in CI.

## Migration Plan

No data or settings migration is required. After this planning change merges and implementation is requested, deliver the controller/component update and focused tests in a separate code pull request. CI validates the candidate; a physical-terminal check repeats stationary-cursor hide/show cycles before user acceptance and authorized merge. Rollback is a revert of that code change, with no persistent state to repair.
