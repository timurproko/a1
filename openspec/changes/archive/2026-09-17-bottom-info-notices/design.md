# Design

## What v2 did and what stays

The v2 `ui/toasts` extension patched Pi's `showStatus` so the dim `Spacer(1)` + `Text` pair Pi builds for a status message landed in `statusContainer`, the dock slot between the working indicator and the editor, instead of `chatContainer`. It cleared the previous toast before showing the next one, removed the toast when `chatContainer.addChild` was next called, and left Pi's message text and styling alone. Bare A1 no longer runs Pi's `InteractiveMode`, but its owned dock already has the same slot: `#renderDockLayout` places the non-live status rows from `createPiShellStatus` before the above-editor widgets, and the live working indicator sits in the bottom-aligned transient viewport tail immediately above that dock. Putting the notice at the head of the dock therefore reproduces the v2 order exactly: working status, notice, editor.

## Routing

`appendWorkflowStatus` is the single funnel for informational text: `messageKind: "status"` workflow results, `/reload` completion, generic completed results, `kind: "status"` workflow messages, and `addExtensionNotification(..., "info")` all end there. In the custom-viewport route it stops creating a `workflow-status-N` anchored transcript component and instead stores the message as the current notice and invalidates the dock. The pinned route keeps the existing anchored component and its back-to-back replacement rule, so `a1 pi` fixtures do not move.

The notice is rendered through `renderPiShellStatusText` with the configured output pad, so the text keeps its dim theme colour and left padding. One blank row precedes it, matching the spacer Pi emits and the existing `""` the above-editor widget block already adds after it; the result on screen is blank, message, blank, editor border, which is what the v2 captures show. Long messages wrap at the dock width like any dock row.

## Dismissal and replacement

A newer informational message replaces the current notice in place. The notice is cleared when:

- `applyTranscriptBlock` or `#syncTranscript` mounts a block whose id is new (a submitted prompt, a new assistant, thinking, or tool block, a compaction record); a revision update to an existing block, such as streamed text, does not dismiss it, so a model switch made mid-stream stays visible until the next block appears, as in the v2 capture;
- a non-informational workflow presentation is appended (`error`, `warning`, `accent`, `new`, `name`, `debug`, session info, hotkeys, changelog, and the celebratory components), because those still land in the transcript and would otherwise sit below a stale acknowledgement;
- `resetWorkflowPresentation` runs, which already covers `/new`, `/resume`, `/fork`, `/tree`, and session replacement.

Nothing else times it out: an idle screen keeps showing the last acknowledgement, exactly as v2 did, and the working indicator starting or stopping does not touch it.

## Layout consequences

Dock rows are already measured every frame, so a notice changes `dockRows.length` and the viewport composer allocates the transcript area, the fitting alignment gap for the working tail, and the bottom-control row from the new dock height; the jump-to-bottom control keeps floating immediately above the complete dock. The dock-only reuse path compares `dockLength`, so a notice appearing or disappearing forces a full composition once and then ordinary dock-only reuse resumes. The notice is not part of `documentRows`, so it is never selectable, never copied, never counted by prompt navigation, never persisted, and never included in the transcript order that `#syncTranscript` rebuilds. `editorOffset` includes the notice rows so pointer frames for the editor stay correct.

## Alternatives considered

Placing the notice in the bottom-aligned transient viewport tail beside the working indicator would let it scroll away with the content when the viewport overflows, which is not what v2 did and would reintroduce the "lost in the feed" problem for the one case the notice exists to solve. Keeping the transcript row and adding a duplicate dock copy would double the message and leave the transcript growing with acknowledgements. Removing the messages entirely would drop confirmations people rely on, such as the model and thinking level after `/model`.
