## Context

See `proposal.md` for motivation and `specs/custom-session-viewport/spec.md` for observable behavior. The current owned shell composes semantic transcript rows followed immediately by live status rows, while pending steering rows remain in the dock. `TranscriptViewport` then pads the visible slice after those rows. With short content this places `Working...` next to the growing response instead of above the input, and each newly rendered row changes its terminal position. Docked steering also remains visible when the reader detaches.

The v2 viewport produced the requested presentation by reserving a fitting status at the bottom of the content area and treating Pi's pending-message container as transcript-side content. That implementation depended on Pi's private child-tree shape. The owned shell now has semantic row boundaries and can reproduce the behavior without restoring that dependency.

The accepted main specification and the active `stabilize-streaming-rendering` change currently require queued rows to remain docked. Their placement clauses must be reconciled before implementation starts.

## Goals / Non-Goals

**Goals:**
- Reproduce v2's visible placement with owned semantic composition.
- Keep a fitting live status stationary immediately above the input while transcript growth consumes only unused space.
- Make pending steering and overflowing working rows scroll out through actual viewport movement.
- Preserve semantic transcript identity, selection/copy boundaries, detached positions, follow navigation, and bounded rendering evidence.

**Non-Goals:**
- Restoring private Pi child-tree inspection or v2 extension internals.
- Persisting steering/status rows or turning them into transcript messages.
- Changing queue acceptance, `Alt+Up`, status wording/animation, extension lifecycle, or pinned `a1 pi` output.
- Moving widgets, replacement inputs, non-working status, or the footer out of the dock.

## Decisions

### Compose three semantic row classes plus a fitting alignment gap

The custom shell will compose:

```text
semantic transcript
pending steering rows
status alignment gap (only while live status exists and everything fits)
live working rows
---------------- pinned boundary
non-working status and above-editor widgets
input or replacement surface
below-editor widgets
footer
```

The shell will render semantic transcript, pending steering, and live working rows separately. The viewport input will identify the semantic selectable length and transient segments explicitly. If

```text
semantic rows + steering rows + live status rows <= viewport height
```

and live status rows exist, the shell or neutral viewport will insert exactly the unused row count before the status. The resulting scrollable sequence fills the viewport without overflowing: semantic and steering rows stay top-anchored, the status stays bottom-aligned, and transcript growth shrinks only the gap. If the sum exceeds viewport height, the gap is zero and ordinary follow-tail scrolling keeps the status at the bottom.

This retains one viewport owner for the status rather than literally moving it between dock and transcript at the fit boundary. It reproduces v2's visible behavior while avoiding the old ownership discontinuity and private-tree dependency.

Alternative: put the fitting status back in the dock and move it into the viewport only on overflow. Rejected because a height-dependent owner switch complicates frame identity, pointer regions, dock-only reuse, and damage classification.

Alternative: always append status immediately after semantic content, as today. Rejected because it produces the reported movement and does not keep the status above input while content fits.

### Treat pending steering as transient viewport content, not semantic history

Render the queue's existing blank prefix, ordered `Steering:` rows, and edit hint after semantic transcript rows and before status alignment. Include them in scroll extent, but keep the semantic/selectable count at the true transcript boundary. Queue updates therefore invalidate transient viewport composition rather than changing dock allocation or transcript persistence.

This matches v2's placement of the pending-message container among transcript roots while preserving the owned shell's stronger semantic boundary. `Alt+Up` remains an input command and does not depend on row visibility.

Alternative: keep steering docked and hide it whenever follow mode detaches. Rejected because visibility would depend on a state flag rather than actual row position and would not scroll naturally.

Alternative: create synthetic user messages. Rejected because it would duplicate accepted/queued distinctions and pollute resume, export, prompt anchors, selection, and completed-message accounting.

### Generalize transient-tail hit and selection boundaries

The viewport will treat steering rows, alignment rows, and working rows as non-selectable transient content. A left-button sequence beginning on any visible transient row outside a viewport control will latch transient suppression until release/reset. Existing transcript selections may approach the tail but painting and copied text remain clamped to semantic rows. Wheel input over transient rows continues to scroll normally, and scrollbar, sticky prompt, and jump-to-bottom controls retain hit-test priority.

The current semantic row count already provides the copy boundary. Transient hit metadata must cover every visible transient segment, including the flexible gap, rather than only rendered working rows.

Alternative: allow steering text selection because it contains user input. Rejected because pending steering is mutable, non-persistent presentation and v2 behavior is being restored as transient chrome; accepted steering still appears through its normal semantic user-message event.

### Preserve follow and detached positions from real extents

While fitting, the alignment gap makes total viewport content exactly equal to available height, so maximum scroll remains zero and no synthetic follow movement occurs. At the first overflowing row the gap is already exhausted; ordinary end following advances by actual overflow while leaving status and dock coordinates stable. Scrolling upward detaches and naturally clips steering and status rows.

When detached, queue/status changes preserve `scrollTop` whenever valid. Tail removal or terminal resize may clamp an invalid position using the existing rules. If shrinking content makes everything fit, the viewport resumes the only legal end position. Alignment rows are recomputed from current viewport height and are never persisted or included in prompt anchors.

### Include transient layout identity in reuse and damage evidence

Visible-frame reuse must distinguish semantic rows, queue identity, status identity, alignment-gap height, dock rows, viewport geometry, follow state, and interaction revisions. A keyboard-only editor frame may use dock-only reuse only when every transient input and its computed gap are unchanged. Queue edits are viewport changes, not dock-only changes. Status animation may replace the affected visible status row without recomposing settled transcript blocks, but a status height or gap change must invalidate geometry conservatively.

Frame descriptors and rendering evidence will report complete viewport/dock rectangles and visible transient row counts. A fitting gap shrink is not a followed vertical shift; an overflowing followed advance may use existing damage-aware movement only when the resulting descriptor proves it safe. The `fit-overflow-boundary` workload must distinguish expected transcript movement at real overflow from the rejected short-content status jump.

Alternative: key reuse only by combined row-array identity. Rejected because newly allocated equivalent arrays defeat reuse, while unchanged semantic array identity can hide queue, status, or gap changes.

### Reconcile overlapping OpenSpec artifacts before code

Before implementation, update the active `stabilize-streaming-rendering` proposal, design, delta specs, and tasks in a separate OpenSpec-only stream. Replace queued dock ownership with transient viewport ownership and describe stable viewport ownership plus bottom alignment rather than a dock-to-transcript switch. Strict validation must pass for both changes without contradictory placement clauses.

## Risks / Trade-offs

- [Flexible blank rows accidentally become selectable, copied, persisted, or prompt-addressable] -> Keep the semantic row count and prompt anchors unchanged; classify every later row as transient and add pointer/copy/reset tests.
- [Queue updates move a detached reader] -> Preserve the existing detached `scrollTop` when valid and test queue growth, editing, removal, and simultaneous status animation.
- [The fit/overflow crossing reintroduces a one-frame duplicate or omission] -> Keep status in one viewport sequence, derive gap and overflow atomically from one frame input, and test intermediate terminal writes.
- [Status appearance or disappearance damages settled rows] -> Treat gap/status identity as frame inputs, retain row-level status reuse, and use conservative repaint when height changes.
- [Moving steering out of the dock changes editor coordinates or input routing] -> Derive editor hit rows from the smaller stable dock and verify editor selection, right-click paste, replacement inputs, and `Alt+Up` at fitting and overflowing geometries.
- [Rendering-stability planning conflicts with the restored behavior] -> Complete the required OpenSpec-only reconciliation before implementation and update the deterministic workload expectation rather than weakening its damage budgets.
- [Very small terminals cannot show every transient surface] -> Use ordinary viewport clipping and end-follow semantics; never duplicate a hidden status or move steering back into the dock as a fallback.

## Migration Plan

1. Merge this OpenSpec-only proposal.
2. Reconcile the active `stabilize-streaming-rendering` planning artifacts in a separate OpenSpec-only pull request and strictly validate both changes.
3. From current `origin/develop`, implement semantic/steering/status row separation, fitting alignment, transient hit boundaries, and cache/descriptor updates in a fresh code worktree.
4. Replace docked-queue and immediate-tail fitting assertions with focused fitting, boundary, overflow, detach, completion, queue-edit, tiny-terminal, resize, pointer, copy, and deterministic paint coverage.
5. Push the code pull request, use CI as the automated gate, then hand off the exact built candidate for physical Windows Terminal acceptance.
6. Roll back by reverting the code pull request; no persisted session or settings migration is required.
